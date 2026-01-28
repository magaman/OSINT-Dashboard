/**
 * GDELT API Service
 * Fetches global news events with geolocation from GDELT Project
 * No API key required - completely free
 */

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

/**
 * Fetch recent news events from GDELT
 * @param {Object} options - Query options
 * @param {number} options.maxRecords - Maximum number of records (default 50)
 * @param {string} options.timespan - Time span like "3h" for 3 hours (default "3h")
 * @param {string} options.mode - Mode: "artlist" for article list
 */
export async function fetchGDELTEvents(options = {}) {
    const {
        maxRecords = 50,
        timespan = '3h',
        theme = '',
        country = ''
    } = options;

    try {
        // Build query for breaking/important news
        const params = new URLSearchParams({
            query: buildGDELTQuery(theme, country),
            mode: 'artlist',
            maxrecords: maxRecords.toString(),
            timespan: timespan,
            format: 'json',
            sort: 'datedesc'
        });

        const response = await fetch(`${GDELT_DOC_API}?${params}`);

        if (!response.ok) {
            throw new Error(`GDELT API error: ${response.status}`);
        }

        const data = await response.json();
        return normalizeGDELTData(data);
    } catch (error) {
        console.error('GDELT fetch error:', error);
        return [];
    }
}

/**
 * Build GDELT query string for breaking news
 */
function buildGDELTQuery(theme, country) {
    const queryParts = [];

    // Prioritize breaking/urgent news themes
    queryParts.push('(tone<-5 OR tone>5)'); // Strong sentiment = important news

    if (theme) {
        queryParts.push(`theme:${theme}`);
    }

    if (country) {
        queryParts.push(`sourcecountry:${country}`);
    }

    return queryParts.join(' ') || '*';
}

/**
 * Normalize GDELT response to our event format
 */
function normalizeGDELTData(data) {
    if (!data.articles || !Array.isArray(data.articles)) {
        return [];
    }

    return data.articles.map((article, index) => {
        // Calculate importance based on tone (sentiment extremity)
        const tone = Math.abs(parseFloat(article.tone) || 0);
        let importance = 2; // default low
        if (tone > 15) importance = 5; // critical
        else if (tone > 10) importance = 4; // high
        else if (tone > 5) importance = 3; // medium

        // Extract location from article if available
        const location = extractLocation(article);

        return {
            id: `gdelt-${article.url ? hashCode(article.url) : index}-${Date.now()}`,
            title: article.title || 'Untitled',
            summary: article.seendate ? `Published ${formatTimeAgo(article.seendate)}` : '',
            source: extractDomain(article.domain) || 'GDELT',
            sourceUrl: article.url,
            timestamp: parseGDELTDate(article.seendate),
            importance,
            location,
            categories: extractThemes(article),
            tone: parseFloat(article.tone) || 0,
            sourceCount: 1,
            isBreaking: tone > 10
        };
    });
}

/**
 * Extract location from GDELT article
 */
function extractLocation(article) {
    // GDELT articles may have location in socialimage metadata or context
    // For now, return a default with country info if available
    if (article.sourcecountry) {
        return {
            name: article.sourcecountry,
            countryCode: article.sourcecountry,
            lat: null,
            lng: null,
            type: 'regional'
        };
    }

    return {
        name: 'Global',
        lat: null,
        lng: null,
        type: 'local'
    };
}

/**
 * Extract domain name for source display
 */
function extractDomain(domain) {
    if (!domain) return null;
    // Clean up domain for display
    return domain.replace(/^www\./, '').split('.')[0].toUpperCase();
}

/**
 * Extract themes/categories
 */
function extractThemes(article) {
    // GDELT may include themes in the data
    return [];
}

/**
 * Parse GDELT date format (YYYYMMDDHHMMSS)
 */
function parseGDELTDate(dateStr) {
    if (!dateStr) return new Date();

    try {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const min = dateStr.substring(10, 12);
        const sec = dateStr.substring(12, 14);

        return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
    } catch {
        return new Date();
    }
}

/**
 * Format time ago string
 */
function formatTimeAgo(dateStr) {
    const date = parseGDELTDate(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

/**
 * Simple hash code for generating IDs
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export default { fetchGDELTEvents };
