/**
 * News Aggregator Service
 * Combines data from GDELT, USGS, and RSS feeds into unified event stream
 * Prioritizes breaking news from the last 3 hours
 */

import { fetchGDELTEvents } from './gdeltService.js';
import { fetchEarthquakes, fetchSignificantEarthquakes, fetchMajorEarthquakes } from './usgsService.js';
import { fetchAllRSSFeeds } from './rssService.js';

// Cache for loaded events
let cachedEvents = [];
let lastFetchTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Feed health tracking
export const feedHealth = {
    gdelt: { status: 'unknown', lastCheck: null, eventCount: 0, error: null },
    usgs: { status: 'unknown', lastCheck: null, eventCount: 0, error: null },
    rss: { status: 'unknown', lastCheck: null, eventCount: 0, error: null }
};

/**
 * Detect if text is primarily English
 * Uses a simple heuristic based on common English words and character analysis
 */
function isEnglish(text) {
    if (!text) return false;

    // Check for non-Latin scripts (Cyrillic, Arabic, Chinese, Japanese, Korean, etc.)
    const nonLatinPattern = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
    if (nonLatinPattern.test(text)) return false;

    // Check for common English words
    const englishWords = /\b(the|is|are|was|were|have|has|had|been|will|would|could|should|this|that|with|from|for|and|but|not|you|all|can|her|his|they|them|its|into|your|than|then|now|out|also|back|after|just|only|some|when|where|what|which|who|how|why|more|most|any|both|each)\b/i;
    return englishWords.test(text);
}

/**
 * Filter events to only include English content
 */
function filterEnglishOnly(events) {
    return events.filter(event => {
        // Always include earthquakes (USGS) and events with no text
        if (event.eventType === 'earthquake') return true;

        // Check title and summary for English
        const titleIsEnglish = isEnglish(event.title);
        return titleIsEnglish;
    });
}

/**
 * Filter events to only include those from the last 24 hours
 */
function filterLast24Hours(events) {
    const cutoffTime = Date.now() - MAX_AGE_MS;
    return events.filter(event => {
        if (!event.timestamp) return false;
        const eventTime = event.timestamp instanceof Date ? event.timestamp.getTime() : new Date(event.timestamp).getTime();
        return eventTime > cutoffTime;
    });
}

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
            fetchMajorEarthquakes(), // M4.5+ from past day (includes non-significant)
            fetchAllRSSFeeds()
        ]);

        const allEvents = [];
        const now = new Date();

        // Process GDELT events
        if (gdeltEvents.status === 'fulfilled') {
            const count = gdeltEvents.value.length;
            console.log(`📰 GDELT: ${count} events`);
            allEvents.push(...gdeltEvents.value);
            feedHealth.gdelt = { status: count > 0 ? 'healthy' : 'empty', lastCheck: now, eventCount: count, error: null };
        } else {
            console.warn('⚠️ GDELT fetch failed:', gdeltEvents.reason);
            feedHealth.gdelt = { status: 'error', lastCheck: now, eventCount: 0, error: gdeltEvents.reason?.message || 'Unknown error' };
        }

        // Process USGS events
        if (usgsEvents.status === 'fulfilled') {
            const count = usgsEvents.value.length;
            console.log(`🌋 USGS: ${count} events`);
            allEvents.push(...usgsEvents.value);
            feedHealth.usgs = { status: count > 0 ? 'healthy' : 'empty', lastCheck: now, eventCount: count, error: null };
        } else {
            console.warn('⚠️ USGS fetch failed:', usgsEvents.reason);
            feedHealth.usgs = { status: 'error', lastCheck: now, eventCount: 0, error: usgsEvents.reason?.message || 'Unknown error' };
        }

        // Process RSS events
        if (rssEvents.status === 'fulfilled') {
            const count = rssEvents.value.length;
            console.log(`📡 RSS: ${count} events`);
            allEvents.push(...rssEvents.value);
            feedHealth.rss = { status: count > 0 ? 'healthy' : 'empty', lastCheck: now, eventCount: count, error: null };
        } else {
            console.warn('⚠️ RSS fetch failed:', rssEvents.reason);
            feedHealth.rss = { status: 'error', lastCheck: now, eventCount: 0, error: rssEvents.reason?.message || 'Unknown error' };
        }

        // Apply filters: English only, then 24 hours, then process
        const englishEvents = filterEnglishOnly(allEvents);
        console.log(`🌐 After English filter: ${englishEvents.length} events (filtered ${allEvents.length - englishEvents.length})`);

        const recentEvents = filterLast24Hours(englishEvents);
        console.log(`⏰ After 24h filter: ${recentEvents.length} events`);

        const processedEvents = processEvents(recentEvents);

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
 * Get current feed health status
 */
export function getFeedHealth() {
    return { ...feedHealth };
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
