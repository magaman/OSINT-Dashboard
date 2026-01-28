/**
 * USGS Earthquake API Service
 * Fetches real-time earthquake data with precise geolocation
 * No API key required - completely free
 * 
 * UPDATED: Only fetches M2.5+ earthquakes to reduce noise
 */

const USGS_BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

// Available feeds - using more selective ones
const FEEDS = {
    significant_month: 'significant_month',   // Significant events (M5.5+ or felt widely)
    significant_week: 'significant_week',     // Significant events past week
    m4_5_day: '4.5_day',                      // M4.5+ past day
    m2_5_day: '2.5_day',                      // M2.5+ past day
    m1_0_hour: '1.0_hour'                     // M1.0+ past hour
};

/**
 * Fetch earthquakes with magnitude filter
 * @param {Object} options - Fetch options
 * @param {number} options.minMagnitude - Minimum magnitude (default 4.0)
 * @param {string} options.feed - Feed type (default: significant_week)
 */
export async function fetchEarthquakes(options = {}) {
    const {
        minMagnitude = 4.0,
        feed = 'significant_week'
    } = options;

    try {
        const response = await fetch(`${USGS_BASE_URL}/${feed}.geojson`);

        if (!response.ok) {
            throw new Error(`USGS API error: ${response.status}`);
        }

        const data = await response.json();
        return normalizeUSGSData(data, minMagnitude);
    } catch (error) {
        console.error('USGS fetch error:', error);
        return [];
    }
}

/**
 * Fetch only significant earthquakes (default for OSINT dashboard)
 * Returns ~20-50 events maximum
 */
export async function fetchSignificantEarthquakes() {
    return fetchEarthquakes({
        feed: 'significant_week',
        minMagnitude: 4.5
    });
}

/**
 * Fetch M4.5+ earthquakes from past day
 */
export async function fetchMajorEarthquakes() {
    return fetchEarthquakes({
        feed: '4.5_day',
        minMagnitude: 4.5
    });
}

/**
 * Normalize USGS GeoJSON to our event format
 * @param {Object} data - GeoJSON data from USGS
 * @param {number} minMagnitude - Minimum magnitude to include
 */
function normalizeUSGSData(data, minMagnitude = 4.0) {
    if (!data.features || !Array.isArray(data.features)) {
        return [];
    }

    return data.features
        .filter(feature => {
            if (!feature.properties || !feature.geometry) return false;
            const mag = feature.properties.mag || 0;
            return mag >= minMagnitude;
        })
        .map(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            // GeoJSON format: [longitude, latitude, depth]
            const lng = coords[0];
            const lat = coords[1];
            const depth = coords[2];

            // Calculate importance based on magnitude
            const mag = props.mag || 0;
            let importance = 2; // default low
            if (mag >= 7.0) importance = 5; // critical
            else if (mag >= 6.0) importance = 4; // high  
            else if (mag >= 5.0) importance = 3; // medium
            else if (mag >= 4.0) importance = 2; // low

            // Determine if this is breaking (within last 3 hours)
            const timestamp = new Date(props.time);
            const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
            const isBreaking = props.time > threeHoursAgo;

            return {
                id: `usgs-${feature.id || props.code}`,
                title: `M${mag.toFixed(1)} Earthquake - ${props.place || 'Unknown Location'}`,
                summary: `Depth: ${depth?.toFixed(1) || 'N/A'}km. ${props.tsunami ? '⚠️ Tsunami warning issued.' : ''}`,
                source: 'USGS',
                sourceUrl: props.url,
                timestamp,
                importance,
                location: {
                    name: props.place || 'Unknown',
                    lat: lat,
                    lng: lng,
                    depth: depth,
                    type: 'local'
                },
                categories: ['earthquake', 'natural-disaster'],
                eventType: 'earthquake', // Special flag for unique icon
                magnitude: mag,
                tsunami: props.tsunami === 1,
                sourceCount: 1,
                isBreaking
            };
        });
}

export default { fetchEarthquakes, fetchSignificantEarthquakes, fetchMajorEarthquakes };
