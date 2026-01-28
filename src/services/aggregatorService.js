/**
 * News Aggregator Service
 * Combines data from GDELT, USGS, and RSS feeds into unified event stream
 * Prioritizes breaking news from the last 3 hours
 */

import { fetchGDELTEvents } from './gdeltService.js';
import { fetchEarthquakes, fetchSignificantEarthquakes } from './usgsService.js';
import { fetchAllRSSFeeds } from './rssService.js';

// Cache for loaded events
let cachedEvents = [];
let lastFetchTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all events from all sources
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 */
export async function fetchAllEvents(forceRefresh = false) {
    // Return cached data if still valid
    if (!forceRefresh && cachedEvents.length > 0 && lastFetchTime) {
        const cacheAge = Date.now() - lastFetchTime;
        if (cacheAge < CACHE_DURATION_MS) {
            console.log('📦 Using cached events');
            return cachedEvents;
        }
    }

    console.log('🔄 Fetching fresh events from all sources...');

    try {
        // Fetch from all sources in parallel
        const [gdeltEvents, usgsEvents, rssEvents] = await Promise.allSettled([
            fetchGDELTEvents({ timespan: '3h', maxRecords: 30 }),
            fetchSignificantEarthquakes(), // M4.5+ only - reduced from ~270 to ~20-50
            fetchAllRSSFeeds()
        ]);

        const allEvents = [];

        // Process GDELT events
        if (gdeltEvents.status === 'fulfilled') {
            console.log(`📰 GDELT: ${gdeltEvents.value.length} events`);
            allEvents.push(...gdeltEvents.value);
        } else {
            console.warn('⚠️ GDELT fetch failed:', gdeltEvents.reason);
        }

        // Process USGS events
        if (usgsEvents.status === 'fulfilled') {
            console.log(`🌋 USGS: ${usgsEvents.value.length} events`);
            allEvents.push(...usgsEvents.value);
        } else {
            console.warn('⚠️ USGS fetch failed:', usgsEvents.reason);
        }

        // Process RSS events
        if (rssEvents.status === 'fulfilled') {
            console.log(`📡 RSS: ${rssEvents.value.length} events`);
            allEvents.push(...rssEvents.value);
        } else {
            console.warn('⚠️ RSS fetch failed:', rssEvents.reason);
        }

        // Process and sort events
        const processedEvents = processEvents(allEvents);

        // Update cache
        cachedEvents = processedEvents;
        lastFetchTime = Date.now();

        console.log(`✅ Total: ${processedEvents.length} events loaded`);
        return processedEvents;

    } catch (error) {
        console.error('❌ Error fetching events:', error);
        return cachedEvents; // Return stale cache on error
    }
}

/**
 * Process and sort events
 */
function processEvents(events) {
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);

    return events
        .map(event => {
            // Ensure consistent timestamp format
            const timestamp = event.timestamp instanceof Date
                ? event.timestamp
                : new Date(event.timestamp);

            // Flag events from last 3 hours as breaking
            const isRecent = timestamp.getTime() > threeHoursAgo;

            // Boost importance for recent breaking news
            let importance = event.importance || 2;
            if (event.isBreaking && isRecent) {
                importance = Math.min(importance + 1, 5);
            }

            return {
                ...event,
                timestamp,
                importance,
                isRecent,
                correlatedWith: [],
                sourceCount: event.sourceCount || 1
            };
        })
        // Sort: breaking first, then by importance, then by time
        .sort((a, b) => {
            // Breaking news first
            if (a.isBreaking !== b.isBreaking) {
                return b.isBreaking ? 1 : -1;
            }
            // Then by importance
            if (a.importance !== b.importance) {
                return b.importance - a.importance;
            }
            // Then by timestamp
            return b.timestamp - a.timestamp;
        });
}

/**
 * Get cached events (sync version for immediate access)
 */
export function getCachedEvents() {
    return cachedEvents;
}

/**
 * Clear the event cache
 */
export function clearCache() {
    cachedEvents = [];
    lastFetchTime = null;
}

/**
 * Filter events by severity/importance
 */
export function filterByImportance(events, minImportance) {
    return events.filter(e => e.importance >= minImportance);
}

/**
 * Get breaking news only
 */
export function getBreakingNews(events) {
    return events.filter(e => e.isBreaking);
}

/**
 * Get events with valid location data
 */
export function getGeolocatedEvents(events) {
    return events.filter(e =>
        e.location &&
        e.location.lat !== null &&
        e.location.lng !== null
    );
}

/**
 * Format time ago string
 */
export function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

/**
 * Get category color
 */
export function getCategoryColor(category) {
    const colors = {
        cyber: '#ff3366',
        natural: '#ffaa00',
        earthquake: '#ffaa00',
        civil: '#00d4ff',
        geopolitical: '#9966ff',
        economic: '#00ff88',
        military: '#ff6600',
        infrastructure: '#ff3366',
        news: '#00d4ff'
    };
    return colors[category] || '#00d4ff';
}

export default {
    fetchAllEvents,
    getCachedEvents,
    clearCache,
    filterByImportance,
    getBreakingNews,
    getGeolocatedEvents,
    formatTimeAgo,
    getCategoryColor
};
