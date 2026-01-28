/**
 * OSINT News Service
 * Provides mock news data and story correlation functionality
 */

// Country boundary data (simplified coordinates for major regions)
// Coordinates use Leaflet format: [lat, lng]
const countryBoundaries = {
    'UA': { // Ukraine
        name: 'Ukraine',
        coordinates: [[[52.4, 22.1], [52.4, 40.2], [44.4, 40.2], [44.4, 22.1], [52.4, 22.1]]]
    },
    'MD': { // Moldova  
        name: 'Moldova',
        coordinates: [[[48.5, 26.6], [48.5, 30.1], [45.5, 30.1], [45.5, 26.6], [48.5, 26.6]]]
    },
    'JP': { // Japan
        name: 'Japan',
        coordinates: [[[45.5, 129.5], [45.5, 145.8], [30.0, 145.8], [30.0, 129.5], [45.5, 129.5]]]
    },
    'TH': { // Thailand
        name: 'Thailand',
        coordinates: [[[20.5, 97.3], [20.5, 105.6], [5.6, 105.6], [5.6, 97.3], [20.5, 97.3]]]
    },
    'VN': { // Vietnam
        name: 'Vietnam',
        coordinates: [[[23.4, 102.1], [23.4, 109.5], [8.4, 109.5], [8.4, 102.1], [23.4, 102.1]]]
    },
    'FR': { // France
        name: 'France',
        coordinates: [[[51.1, -5.1], [51.1, 9.6], [41.3, 9.6], [41.3, -5.1], [51.1, -5.1]]]
    },
    'US': { // USA (continental)
        name: 'United States',
        coordinates: [[[49.4, -125.0], [49.4, -66.9], [24.4, -66.9], [24.4, -125.0], [49.4, -125.0]]]
    },
    'GB': { // United Kingdom
        name: 'United Kingdom',
        coordinates: [[[60.9, -8.6], [60.9, 1.8], [49.9, 1.8], [49.9, -8.6], [60.9, -8.6]]]
    },
    'NO': { // Norway
        name: 'Norway',
        coordinates: [[[71.2, 4.6], [71.2, 31.1], [57.9, 31.1], [57.9, 4.6], [71.2, 4.6]]]
    },
    'SCS': { // South China Sea (water region)
        name: 'South China Sea',
        coordinates: [[[25.0, 105.0], [25.0, 122.0], [5.0, 122.0], [5.0, 105.0], [25.0, 105.0]]]
    }
};

// Mock news data with global events
const mockNewsData = [
    {
        id: 'evt-001',
        title: 'Major Infrastructure Disruption Reported in Eastern Europe',
        summary: 'Multiple power grid failures detected across several countries. Authorities investigating potential coordinated cyber activity.',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        location: {
            lat: 50.4501,
            lng: 30.5234,
            name: 'Kyiv, Ukraine',
            type: 'regional',
            countryCode: 'UA'
        },
        category: 'cyber',
        keywords: ['infrastructure', 'power grid', 'cyber', 'eastern europe']
    },
    {
        id: 'evt-002',
        title: 'Power Grid Outages Sweep Across Ukraine and Moldova',
        summary: 'Emergency services responding to widespread blackouts affecting millions. Similar patterns observed in neighboring regions.',
        source: 'BBC World',
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
        location: {
            lat: 47.0105,
            lng: 28.8638,
            name: 'Chisinau, Moldova',
            type: 'regional',
            countryCode: 'MD'
        },
        category: 'infrastructure',
        keywords: ['power grid', 'blackout', 'ukraine', 'moldova', 'emergency']
    },
    {
        id: 'evt-003',
        title: 'Earthquake Detected in Western Pacific Region',
        summary: '6.2 magnitude earthquake recorded 120km off the coast. Tsunami warning issued for coastal areas.',
        source: 'USGS',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        location: {
            lat: 35.6762,
            lng: 139.6503,
            name: 'Tokyo, Japan',
            type: 'local',
            countryCode: 'JP'
        },
        category: 'natural',
        keywords: ['earthquake', 'pacific', 'tsunami', 'japan']
    },
    {
        id: 'evt-004',
        title: 'Seismic Activity Alert for Japan Coastal Areas',
        summary: 'Japan Meteorological Agency confirms significant seismic event. Residents advised to move to higher ground.',
        source: 'NHK',
        timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
        location: {
            lat: 35.4437,
            lng: 139.6380,
            name: 'Yokohama, Japan',
            type: 'local',
            countryCode: 'JP'
        },
        category: 'natural',
        keywords: ['earthquake', 'seismic', 'japan', 'evacuation']
    },
    {
        id: 'evt-005',
        title: 'Large-Scale Protest Underway in Central Paris',
        summary: 'Thousands gathering near government buildings. Traffic disruptions reported throughout the city center.',
        source: 'France24',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        location: {
            lat: 48.8566,
            lng: 2.3522,
            name: 'Paris, France',
            type: 'local',
            countryCode: 'FR'
        },
        category: 'civil',
        keywords: ['protest', 'paris', 'demonstration', 'civil unrest']
    },
    {
        id: 'evt-006',
        title: 'Flash Flood Emergency Declared in Southeast Asia',
        summary: 'Heavy monsoon rains trigger widespread flooding across Vietnam and Thailand. Rescue operations underway.',
        source: 'Al Jazeera',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        location: {
            lat: 13.7563,
            lng: 100.5018,
            name: 'Bangkok, Thailand',
            type: 'regional',
            countryCode: 'TH'
        },
        category: 'natural',
        keywords: ['flood', 'monsoon', 'thailand', 'vietnam', 'emergency']
    },
    {
        id: 'evt-007',
        title: 'Monsoon Flooding Displaces Thousands in Thailand',
        summary: 'Government declares state of emergency in 12 provinces. International aid requested for relief efforts.',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
        location: {
            lat: 13.8,
            lng: 100.6,
            name: 'Bangkok Region, Thailand',
            type: 'regional',
            countryCode: 'TH'
        },
        category: 'natural',
        keywords: ['flood', 'monsoon', 'thailand', 'displacement', 'emergency']
    },
    {
        id: 'evt-008',
        title: 'Diplomatic Tensions Rise Over Arctic Shipping Routes',
        summary: 'Multiple nations contest claims to newly accessible shipping lanes. Naval presence increased in the region.',
        source: 'AP News',
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        location: {
            lat: 78.2253,
            lng: 15.6267,
            name: 'Svalbard, Norway',
            type: 'local',
            countryCode: 'NO'
        },
        category: 'geopolitical',
        keywords: ['arctic', 'shipping', 'territorial', 'military', 'diplomacy']
    },
    {
        id: 'evt-009',
        title: 'Wildfire Outbreak in Southern California',
        summary: 'Multiple fires burning across Los Angeles County. Mandatory evacuations ordered for several communities.',
        source: 'CNN',
        timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
        location: {
            lat: 34.0522,
            lng: -118.2437,
            name: 'Los Angeles, USA',
            type: 'local',
            countryCode: 'US'
        },
        category: 'natural',
        keywords: ['wildfire', 'california', 'evacuation', 'fire']
    },
    {
        id: 'evt-010',
        title: 'Market Volatility Spikes Amid Central Bank Announcements',
        summary: 'Global stock indices experiencing sharp fluctuations following coordinated monetary policy statements.',
        source: 'Bloomberg',
        timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
        location: {
            lat: 40.7128,
            lng: -74.0060,
            name: 'New York, USA',
            type: 'local',
            countryCode: 'US'
        },
        category: 'economic',
        keywords: ['markets', 'economy', 'central bank', 'volatility']
    },
    {
        id: 'evt-011',
        title: 'Cyber Attack Targets Financial Institutions',
        summary: 'Several major banks report service disruptions. Coordinated DDoS attack suspected.',
        source: 'Financial Times',
        timestamp: new Date(Date.now() - 200 * 60000).toISOString(),
        location: {
            lat: 51.5074,
            lng: -0.1278,
            name: 'London, UK',
            type: 'local',
            countryCode: 'GB'
        },
        category: 'cyber',
        keywords: ['cyber', 'attack', 'banks', 'ddos', 'financial']
    },
    {
        id: 'evt-012',
        title: 'Military Exercise Begins in South China Sea',
        summary: 'Large-scale naval maneuvers commenced. Regional allies express concern over scope of operations.',
        source: 'SCMP',
        timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
        location: {
            lat: 15.1162,
            lng: 117.2347,
            name: 'South China Sea',
            type: 'regional',
            countryCode: 'SCS'
        },
        category: 'military',
        keywords: ['military', 'naval', 'exercise', 'south china sea']
    }
];

/**
 * Get country boundary by code
 */
export function getCountryBoundary(countryCode) {
    return countryBoundaries[countryCode] || null;
}

/**
 * Calculate keyword similarity between two events
 */
function calculateSimilarity(event1, event2) {
    const keywords1 = new Set(event1.keywords);
    const keywords2 = new Set(event2.keywords);

    let matches = 0;
    for (const kw of keywords1) {
        if (keywords2.has(kw)) matches++;
    }

    const totalUnique = new Set([...keywords1, ...keywords2]).size;
    return matches / totalUnique;
}

/**
 * Correlate stories from multiple sources
 * Stories with similarity > threshold are marked as correlated
 */
function correlateStories(events, threshold = 0.3) {
    const correlatedEvents = events.map(event => ({
        ...event,
        importance: 2, // Default medium importance
        correlatedWith: [],
        sourceCount: 1
    }));

    // Compare each pair of events
    for (let i = 0; i < correlatedEvents.length; i++) {
        for (let j = i + 1; j < correlatedEvents.length; j++) {
            const event1 = correlatedEvents[i];
            const event2 = correlatedEvents[j];

            // Skip if same source
            if (event1.source === event2.source) continue;

            const similarity = calculateSimilarity(event1, event2);

            if (similarity >= threshold) {
                // Mark as correlated
                if (!event1.correlatedWith.includes(event2.id)) {
                    event1.correlatedWith.push(event2.id);
                    event1.sourceCount++;
                }
                if (!event2.correlatedWith.includes(event1.id)) {
                    event2.correlatedWith.push(event1.id);
                    event2.sourceCount++;
                }
            }
        }
    }

    // Update importance based on correlation
    correlatedEvents.forEach(event => {
        if (event.sourceCount >= 3) {
            event.importance = 5; // Critical
        } else if (event.sourceCount >= 2) {
            event.importance = 4; // High
        } else {
            event.importance = 2; // Low/Standard
        }
    });

    return correlatedEvents;
}

/**
 * Get all events with correlation data
 */
export function getEvents() {
    return correlateStories(mockNewsData);
}

/**
 * Get events filtered by minimum importance
 */
export function getEventsByImportance(minImportance) {
    const events = getEvents();
    return events.filter(e => e.importance >= minImportance);
}

/**
 * Get high priority events (correlated stories)
 */
export function getHighPriorityEvents() {
    return getEventsByImportance(4);
}

/**
 * Format time ago string
 */
export function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
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
        civil: '#00d4ff',
        geopolitical: '#9966ff',
        economic: '#00ff88',
        military: '#ff6600',
        infrastructure: '#ff3366'
    };
    return colors[category] || '#00d4ff';
}

/**
 * Simulate new incoming event (developing - incomplete data)
 */
export function generateRandomEvent() {
    const sources = ['Reuters', 'AP News', 'BBC', 'Al Jazeera', 'CNN', 'France24'];
    const templates = [
        { title: 'Breaking: Unrest reported in major city', category: 'civil', keywords: ['unrest', 'civil', 'protest'] },
        { title: 'Emergency services responding to incident', category: 'infrastructure', keywords: ['emergency', 'incident', 'response'] },
        { title: 'Weather alert issued for coastal region', category: 'natural', keywords: ['weather', 'alert', 'coastal'] }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];

    // Developing events have incomplete location data
    return {
        id: `evt-${Date.now()}`,
        title: template.title,
        summary: 'Developing story. More details to follow as situation unfolds.',
        source,
        timestamp: new Date().toISOString(),
        location: {
            lat: null,
            lng: null,
            name: 'Location TBD',
            type: 'local'
        },
        category: template.category,
        keywords: template.keywords,
        importance: 2,
        correlatedWith: [],
        sourceCount: 1
    };
}
