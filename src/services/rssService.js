/**
 * RSS Feed Service
 * Fetches news from major outlets via CORS proxy
 * No API key required for basic functionality
 */

// CORS proxy that doesn't require API key
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

import { extractLocation } from './locationService.js';

// Major news RSS feeds
const RSS_FEEDS = {
    bbc: {
        name: 'BBC',
        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        category: 'world'
    },
    reuters: {
        name: 'Reuters',
        url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best',
        category: 'world'
    },
    aljazeera: {
        name: 'Al Jazeera',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'world'
    },
    npr: {
        name: 'NPR',
        url: 'https://feeds.npr.org/1004/rss.xml',
        category: 'world'
    },
    guardian: {
        name: 'Guardian',
        url: 'https://www.theguardian.com/world/rss',
        category: 'world'
    }
};

/**
 * Fetch and parse RSS feed
 */
export async function fetchRSSFeed(feedKey) {
    const feed = RSS_FEEDS[feedKey];
    if (!feed) {
        console.error(`Unknown feed: ${feedKey}`);
        return [];
    }

    try {
        const encodedUrl = encodeURIComponent(feed.url);
        const response = await fetch(`${CORS_PROXY}${encodedUrl}`);

        if (!response.ok) {
            throw new Error(`RSS fetch error: ${response.status}`);
        }

        const data = await response.json();
        const xmlText = data.contents;

        return parseRSSXML(xmlText, feed.name);
    } catch (error) {
        console.error(`RSS fetch error for ${feedKey}:`, error);
        return [];
    }
}

/**
 * Fetch all RSS feeds in parallel
 */
export async function fetchAllRSSFeeds() {
    const feedKeys = Object.keys(RSS_FEEDS);
    const results = await Promise.allSettled(
        feedKeys.map(key => fetchRSSFeed(key))
    );

    const events = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            events.push(...result.value);
        } else {
            console.warn(`Failed to fetch ${feedKeys[index]}:`, result.reason);
        }
    });

    return events;
}

/**
 * Parse RSS XML to event format
 */
function parseRSSXML(xmlText, sourceName) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');

        const items = doc.querySelectorAll('item');
        const events = [];
        const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);

        items.forEach((item, index) => {
            const title = item.querySelector('title')?.textContent || 'Untitled';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent;

            const timestamp = pubDate ? new Date(pubDate) : new Date();

            // Only include items from last 3 hours for breaking news priority
            const isRecent = timestamp.getTime() > threeHoursAgo;

            // Check if title suggests breaking news
            const isBreaking = /breaking|urgent|just in|developing|alert/i.test(title);

            // Calculate importance
            let importance = 2; // default low
            if (isBreaking) importance = 4; // high for breaking news
            else if (isRecent) importance = 3; // medium for recent

            // Extract location from headline and description
            const cleanTitle = cleanHTML(title);
            const cleanDesc = cleanHTML(description);
            const extractedLocation = extractLocation(cleanTitle) || extractLocation(cleanDesc);

            events.push({
                id: `rss-${sourceName.toLowerCase()}-${index}-${Date.now()}`,
                title: cleanTitle,
                summary: cleanDesc.substring(0, 200),
                source: sourceName,
                sourceUrl: link,
                timestamp,
                importance,
                location: extractedLocation || {
                    name: 'Global',
                    lat: null,
                    lng: null,
                    type: 'local'
                },
                categories: ['news'],
                sourceCount: 1,
                isBreaking,
                isRecent
            });
        });

        // Sort by importance (breaking first) then by time
        return events.sort((a, b) => {
            if (a.isBreaking !== b.isBreaking) return b.isBreaking - a.isBreaking;
            return b.timestamp - a.timestamp;
        });
    } catch (error) {
        console.error('RSS parse error:', error);
        return [];
    }
}

/**
 * Clean HTML tags from text
 */
function cleanHTML(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

/**
 * Get available feed sources
 */
export function getAvailableFeeds() {
    return Object.entries(RSS_FEEDS).map(([key, feed]) => ({
        key,
        name: feed.name,
        category: feed.category
    }));
}

export default { fetchRSSFeed, fetchAllRSSFeeds, getAvailableFeeds };
