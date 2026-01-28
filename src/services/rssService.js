/**
 * RSS Feed Service
 * Fetches news from major outlets via CORS proxy
 * No API key required for basic functionality
 */

import { extractLocation } from './locationService.js';

// CORS proxies with fallback support
const CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
];

// Severity keywords for content-based classification
const SEVERITY_KEYWORDS = {
    critical: [
        'killed', 'dead', 'deaths', 'died', 'explosion', 'attack', 'attacks',
        'war', 'earthquake', 'tsunami', 'massacre', 'terrorist', 'terrorism',
        'bomb', 'bombing', 'casualties', 'fatalities', 'murder', 'assassin'
    ],
    high: [
        'strike', 'strikes', 'protest', 'protests', 'arrested', 'emergency',
        'crash', 'crashed', 'fire', 'shooting', 'violence', 'violent',
        'clashes', 'injured', 'wounded', 'hostage', 'siege', 'riot'
    ],
    medium: [
        'election', 'summit', 'sanctions', 'investigation', 'trial', 'accused',
        'warning', 'threat', 'crisis', 'tensions', 'conflict', 'dispute',
        'controversy', 'scandal', 'fraud', 'corruption'
    ]
};

// Major news RSS feeds - using reliable endpoints
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
    ap: {
        name: 'AP News',
        url: 'https://feedx.net/rss/ap.xml',
        category: 'world'
    },
    npr: {
        name: 'NPR',
        url: 'https://feeds.npr.org/1004/rss.xml',
        category: 'world'
    },
    france24: {
        name: 'France24',
        url: 'https://www.france24.com/en/rss',
        category: 'world'
    }
};

/**
 * Fetch and parse RSS feed with fallback proxy support
 */
export async function fetchRSSFeed(feedKey) {
    const feed = RSS_FEEDS[feedKey];
    if (!feed) {
        console.error(`Unknown feed: ${feedKey}`);
        return [];
    }

    // Try each proxy until one works
    for (const proxy of CORS_PROXIES) {
        try {
            const encodedUrl = encodeURIComponent(feed.url);
            const response = await fetch(`${proxy}${encodedUrl}`, {
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`RSS fetch error: ${response.status}`);
            }

            // Handle different proxy response formats
            const contentType = response.headers.get('content-type') || '';
            let xmlText;

            if (contentType.includes('application/json')) {
                // allorigins returns JSON with contents property
                const data = await response.json();
                xmlText = data.contents;
            } else {
                // corsproxy.io returns raw XML/text
                xmlText = await response.text();
            }

            if (!xmlText || xmlText.includes('parsererror')) {
                throw new Error('Invalid XML response');
            }

            return parseRSSXML(xmlText, feed.name);
        } catch (error) {
            console.warn(`Proxy ${proxy} failed for ${feedKey}:`, error.message);
            continue; // Try next proxy
        }
    }

    console.error(`All proxies failed for ${feedKey}`);
    return [];
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

            // Calculate importance using keyword analysis
            const cleanTitle = cleanHTML(title);
            const cleanDesc = cleanHTML(description);
            const importance = calculateSeverity(cleanTitle, cleanDesc, isBreaking, isRecent);
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
 * Calculate severity based on keyword analysis
 * Returns importance level 2-5
 */
function calculateSeverity(title, description, isBreaking, isRecent) {
    const text = (title + ' ' + description).toLowerCase();
    let score = 2; // Base score (low)

    // Check for critical keywords (+3)
    for (const keyword of SEVERITY_KEYWORDS.critical) {
        if (text.includes(keyword)) {
            score = Math.max(score, 5); // Critical
            break;
        }
    }

    // Check for high keywords if not already critical (+2)
    if (score < 5) {
        for (const keyword of SEVERITY_KEYWORDS.high) {
            if (text.includes(keyword)) {
                score = Math.max(score, 4); // High
                break;
            }
        }
    }

    // Check for medium keywords if not already high (+1)
    if (score < 4) {
        for (const keyword of SEVERITY_KEYWORDS.medium) {
            if (text.includes(keyword)) {
                score = Math.max(score, 3); // Medium
                break;
            }
        }
    }

    // Boost for breaking news annotation
    if (isBreaking && score < 5) {
        score = Math.min(score + 1, 5);
    }

    // Slight boost for very recent news (within 1 hour)
    if (isRecent && score < 4) {
        score = Math.min(score + 1, 4);
    }

    return score;
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
