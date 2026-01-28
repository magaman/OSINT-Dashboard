/**
 * Location Extraction Service
 * Extracts country/city names from news headlines and maps them to coordinates
 * Uses a comprehensive database of locations with lat/lng
 */

// Major countries with their center coordinates and common aliases
const COUNTRIES = {
    // North America
    'united states': { name: 'United States', lat: 39.8, lng: -98.5, code: 'US', aliases: ['us', 'usa', 'america', 'american'] },
    'canada': { name: 'Canada', lat: 56.1, lng: -106.3, code: 'CA', aliases: [] },
    'mexico': { name: 'Mexico', lat: 23.6, lng: -102.5, code: 'MX', aliases: ['mexican'] },

    // Europe
    'united kingdom': { name: 'United Kingdom', lat: 55.4, lng: -3.4, code: 'GB', aliases: ['uk', 'britain', 'british', 'england', 'english', 'scotland', 'wales'] },
    'france': { name: 'France', lat: 46.2, lng: 2.2, code: 'FR', aliases: ['french', 'paris'] },
    'germany': { name: 'Germany', lat: 51.2, lng: 10.5, code: 'DE', aliases: ['german', 'berlin'] },
    'italy': { name: 'Italy', lat: 41.9, lng: 12.6, code: 'IT', aliases: ['italian', 'rome'] },
    'spain': { name: 'Spain', lat: 40.5, lng: -3.7, code: 'ES', aliases: ['spanish', 'madrid'] },
    'ukraine': { name: 'Ukraine', lat: 48.4, lng: 31.2, code: 'UA', aliases: ['ukrainian', 'kyiv', 'kiev'] },
    'russia': { name: 'Russia', lat: 61.5, lng: 105.3, code: 'RU', aliases: ['russian', 'moscow', 'kremlin', 'putin'] },
    'poland': { name: 'Poland', lat: 51.9, lng: 19.1, code: 'PL', aliases: ['polish', 'warsaw'] },
    'netherlands': { name: 'Netherlands', lat: 52.1, lng: 5.3, code: 'NL', aliases: ['dutch', 'amsterdam', 'holland'] },
    'belgium': { name: 'Belgium', lat: 50.5, lng: 4.5, code: 'BE', aliases: ['belgian', 'brussels'] },
    'greece': { name: 'Greece', lat: 39.1, lng: 21.8, code: 'GR', aliases: ['greek', 'athens'] },
    'portugal': { name: 'Portugal', lat: 39.4, lng: -8.2, code: 'PT', aliases: ['portuguese', 'lisbon'] },
    'sweden': { name: 'Sweden', lat: 60.1, lng: 18.6, code: 'SE', aliases: ['swedish', 'stockholm'] },
    'norway': { name: 'Norway', lat: 60.5, lng: 8.5, code: 'NO', aliases: ['norwegian', 'oslo'] },
    'finland': { name: 'Finland', lat: 61.9, lng: 25.7, code: 'FI', aliases: ['finnish', 'helsinki'] },
    'denmark': { name: 'Denmark', lat: 56.3, lng: 9.5, code: 'DK', aliases: ['danish', 'copenhagen'] },
    'ireland': { name: 'Ireland', lat: 53.1, lng: -8.0, code: 'IE', aliases: ['irish', 'dublin'] },
    'switzerland': { name: 'Switzerland', lat: 46.8, lng: 8.2, code: 'CH', aliases: ['swiss', 'geneva', 'zurich'] },
    'austria': { name: 'Austria', lat: 47.5, lng: 14.6, code: 'AT', aliases: ['austrian', 'vienna'] },
    'czech republic': { name: 'Czech Republic', lat: 49.8, lng: 15.5, code: 'CZ', aliases: ['czech', 'prague', 'czechia'] },
    'hungary': { name: 'Hungary', lat: 47.2, lng: 19.5, code: 'HU', aliases: ['hungarian', 'budapest'] },
    'romania': { name: 'Romania', lat: 45.9, lng: 25.0, code: 'RO', aliases: ['romanian', 'bucharest'] },
    'bulgaria': { name: 'Bulgaria', lat: 42.7, lng: 25.5, code: 'BG', aliases: ['bulgarian', 'sofia'] },

    // Middle East
    'israel': { name: 'Israel', lat: 31.0, lng: 34.9, code: 'IL', aliases: ['israeli', 'jerusalem', 'tel aviv', 'netanyahu', 'gaza'] },
    'palestine': { name: 'Palestine', lat: 31.9, lng: 35.2, code: 'PS', aliases: ['palestinian', 'west bank', 'hamas'] },
    'iran': { name: 'Iran', lat: 32.4, lng: 53.7, code: 'IR', aliases: ['iranian', 'tehran', 'persian'] },
    'iraq': { name: 'Iraq', lat: 33.2, lng: 43.7, code: 'IQ', aliases: ['iraqi', 'baghdad'] },
    'syria': { name: 'Syria', lat: 34.8, lng: 39.0, code: 'SY', aliases: ['syrian', 'damascus', 'assad'] },
    'lebanon': { name: 'Lebanon', lat: 33.9, lng: 35.9, code: 'LB', aliases: ['lebanese', 'beirut', 'hezbollah'] },
    'jordan': { name: 'Jordan', lat: 30.6, lng: 36.2, code: 'JO', aliases: ['jordanian', 'amman'] },
    'saudi arabia': { name: 'Saudi Arabia', lat: 23.9, lng: 45.1, code: 'SA', aliases: ['saudi', 'riyadh'] },
    'uae': { name: 'UAE', lat: 23.4, lng: 53.8, code: 'AE', aliases: ['emirates', 'dubai', 'abu dhabi'] },
    'qatar': { name: 'Qatar', lat: 25.4, lng: 51.2, code: 'QA', aliases: ['doha'] },
    'yemen': { name: 'Yemen', lat: 15.6, lng: 48.5, code: 'YE', aliases: ['yemeni', 'houthi', 'sanaa'] },
    'turkey': { name: 'Turkey', lat: 38.9, lng: 35.2, code: 'TR', aliases: ['turkish', 'ankara', 'istanbul', 'erdogan'] },

    // Asia
    'china': { name: 'China', lat: 35.9, lng: 104.2, code: 'CN', aliases: ['chinese', 'beijing', 'shanghai', 'hong kong', 'xi jinping'] },
    'japan': { name: 'Japan', lat: 36.2, lng: 138.3, code: 'JP', aliases: ['japanese', 'tokyo'] },
    'south korea': { name: 'South Korea', lat: 35.9, lng: 127.8, code: 'KR', aliases: ['korean', 'seoul'] },
    'north korea': { name: 'North Korea', lat: 40.3, lng: 127.5, code: 'KP', aliases: ['pyongyang', 'kim jong'] },
    'india': { name: 'India', lat: 20.6, lng: 79.0, code: 'IN', aliases: ['indian', 'delhi', 'mumbai', 'modi'] },
    'pakistan': { name: 'Pakistan', lat: 30.4, lng: 69.3, code: 'PK', aliases: ['pakistani', 'islamabad', 'karachi'] },
    'afghanistan': { name: 'Afghanistan', lat: 33.9, lng: 67.7, code: 'AF', aliases: ['afghan', 'kabul', 'taliban'] },
    'indonesia': { name: 'Indonesia', lat: -0.8, lng: 113.9, code: 'ID', aliases: ['indonesian', 'jakarta'] },
    'vietnam': { name: 'Vietnam', lat: 14.1, lng: 108.3, code: 'VN', aliases: ['vietnamese', 'hanoi'] },
    'thailand': { name: 'Thailand', lat: 15.9, lng: 100.9, code: 'TH', aliases: ['thai', 'bangkok'] },
    'philippines': { name: 'Philippines', lat: 12.9, lng: 121.8, code: 'PH', aliases: ['filipino', 'manila'] },
    'malaysia': { name: 'Malaysia', lat: 4.2, lng: 101.9, code: 'MY', aliases: ['malaysian', 'kuala lumpur'] },
    'singapore': { name: 'Singapore', lat: 1.4, lng: 103.8, code: 'SG', aliases: [] },
    'myanmar': { name: 'Myanmar', lat: 21.9, lng: 95.9, code: 'MM', aliases: ['burma', 'burmese', 'yangon'] },
    'bangladesh': { name: 'Bangladesh', lat: 23.7, lng: 90.4, code: 'BD', aliases: ['bangladeshi', 'dhaka'] },
    'taiwan': { name: 'Taiwan', lat: 23.7, lng: 121.0, code: 'TW', aliases: ['taiwanese', 'taipei'] },

    // Africa
    'egypt': { name: 'Egypt', lat: 26.8, lng: 30.8, code: 'EG', aliases: ['egyptian', 'cairo'] },
    'south africa': { name: 'South Africa', lat: -30.6, lng: 22.9, code: 'ZA', aliases: ['johannesburg', 'cape town'] },
    'nigeria': { name: 'Nigeria', lat: 9.1, lng: 8.7, code: 'NG', aliases: ['nigerian', 'lagos'] },
    'kenya': { name: 'Kenya', lat: -0.0, lng: 37.9, code: 'KE', aliases: ['kenyan', 'nairobi'] },
    'ethiopia': { name: 'Ethiopia', lat: 9.1, lng: 40.5, code: 'ET', aliases: ['ethiopian', 'addis ababa'] },
    'sudan': { name: 'Sudan', lat: 12.9, lng: 30.2, code: 'SD', aliases: ['sudanese', 'khartoum'] },
    'morocco': { name: 'Morocco', lat: 31.8, lng: -7.1, code: 'MA', aliases: ['moroccan', 'rabat'] },
    'algeria': { name: 'Algeria', lat: 28.0, lng: 1.7, code: 'DZ', aliases: ['algerian', 'algiers'] },
    'libya': { name: 'Libya', lat: 26.3, lng: 17.2, code: 'LY', aliases: ['libyan', 'tripoli'] },
    'tunisia': { name: 'Tunisia', lat: 33.9, lng: 9.5, code: 'TN', aliases: ['tunisian', 'tunis'] },
    'ghana': { name: 'Ghana', lat: 7.9, lng: -1.0, code: 'GH', aliases: ['ghanaian', 'accra'] },
    'congo': { name: 'Congo', lat: -4.0, lng: 21.8, code: 'CD', aliases: ['congolese', 'kinshasa', 'drc'] },
    'somalia': { name: 'Somalia', lat: 5.2, lng: 46.2, code: 'SO', aliases: ['somali', 'mogadishu'] },

    // Oceania
    'australia': { name: 'Australia', lat: -25.3, lng: 133.8, code: 'AU', aliases: ['australian', 'sydney', 'melbourne', 'canberra'] },
    'new zealand': { name: 'New Zealand', lat: -40.9, lng: 174.9, code: 'NZ', aliases: ['kiwi', 'auckland', 'wellington'] },

    // South America
    'brazil': { name: 'Brazil', lat: -14.2, lng: -51.9, code: 'BR', aliases: ['brazilian', 'brasilia', 'sao paulo', 'rio'] },
    'argentina': { name: 'Argentina', lat: -38.4, lng: -63.6, code: 'AR', aliases: ['argentine', 'buenos aires'] },
    'chile': { name: 'Chile', lat: -35.7, lng: -71.5, code: 'CL', aliases: ['chilean', 'santiago'] },
    'colombia': { name: 'Colombia', lat: 4.6, lng: -74.3, code: 'CO', aliases: ['colombian', 'bogota'] },
    'peru': { name: 'Peru', lat: -9.2, lng: -75.0, code: 'PE', aliases: ['peruvian', 'lima'] },
    'venezuela': { name: 'Venezuela', lat: 6.4, lng: -66.6, code: 'VE', aliases: ['venezuelan', 'caracas', 'maduro'] },
    'ecuador': { name: 'Ecuador', lat: -1.8, lng: -78.2, code: 'EC', aliases: ['ecuadorian', 'quito'] },

    // Central America & Caribbean
    'cuba': { name: 'Cuba', lat: 21.5, lng: -77.8, code: 'CU', aliases: ['cuban', 'havana'] },
    'haiti': { name: 'Haiti', lat: 18.9, lng: -72.3, code: 'HT', aliases: ['haitian', 'port-au-prince'] },
    'jamaica': { name: 'Jamaica', lat: 18.1, lng: -77.3, code: 'JM', aliases: ['jamaican', 'kingston'] },
    'panama': { name: 'Panama', lat: 8.5, lng: -80.8, code: 'PA', aliases: ['panamanian'] },
    'guatemala': { name: 'Guatemala', lat: 15.8, lng: -90.2, code: 'GT', aliases: ['guatemalan'] },
    'honduras': { name: 'Honduras', lat: 15.2, lng: -86.2, code: 'HN', aliases: ['honduran'] },
    'el salvador': { name: 'El Salvador', lat: 13.8, lng: -88.9, code: 'SV', aliases: ['salvadoran'] },
    'nicaragua': { name: 'Nicaragua', lat: 12.9, lng: -85.2, code: 'NI', aliases: ['nicaraguan'] },
    'costa rica': { name: 'Costa Rica', lat: 9.7, lng: -83.8, code: 'CR', aliases: ['costa rican'] },
};

// Major cities that might appear in headlines (with their country for context)
const MAJOR_CITIES = {
    // US Cities
    'new york': { name: 'New York', lat: 40.7, lng: -74.0, country: 'US' },
    'los angeles': { name: 'Los Angeles', lat: 34.1, lng: -118.2, country: 'US' },
    'chicago': { name: 'Chicago', lat: 41.9, lng: -87.6, country: 'US' },
    'houston': { name: 'Houston', lat: 29.8, lng: -95.4, country: 'US' },
    'washington': { name: 'Washington D.C.', lat: 38.9, lng: -77.0, country: 'US' },
    'san francisco': { name: 'San Francisco', lat: 37.8, lng: -122.4, country: 'US' },
    'miami': { name: 'Miami', lat: 25.8, lng: -80.2, country: 'US' },
    'boston': { name: 'Boston', lat: 42.4, lng: -71.1, country: 'US' },
    'seattle': { name: 'Seattle', lat: 47.6, lng: -122.3, country: 'US' },
    'denver': { name: 'Denver', lat: 39.7, lng: -105.0, country: 'US' },
    'atlanta': { name: 'Atlanta', lat: 33.7, lng: -84.4, country: 'US' },
    'dallas': { name: 'Dallas', lat: 32.8, lng: -96.8, country: 'US' },
    'phoenix': { name: 'Phoenix', lat: 33.4, lng: -112.1, country: 'US' },
    'las vegas': { name: 'Las Vegas', lat: 36.2, lng: -115.1, country: 'US' },
    'detroit': { name: 'Detroit', lat: 42.3, lng: -83.0, country: 'US' },
    'philadelphia': { name: 'Philadelphia', lat: 40.0, lng: -75.2, country: 'US' },

    // European Cities
    'london': { name: 'London', lat: 51.5, lng: -0.1, country: 'GB' },
    'manchester': { name: 'Manchester', lat: 53.5, lng: -2.2, country: 'GB' },
    'birmingham': { name: 'Birmingham', lat: 52.5, lng: -1.9, country: 'GB' },
    'paris': { name: 'Paris', lat: 48.9, lng: 2.4, country: 'FR' },
    'berlin': { name: 'Berlin', lat: 52.5, lng: 13.4, country: 'DE' },
    'munich': { name: 'Munich', lat: 48.1, lng: 11.6, country: 'DE' },
    'rome': { name: 'Rome', lat: 41.9, lng: 12.5, country: 'IT' },
    'milan': { name: 'Milan', lat: 45.5, lng: 9.2, country: 'IT' },
    'madrid': { name: 'Madrid', lat: 40.4, lng: -3.7, country: 'ES' },
    'barcelona': { name: 'Barcelona', lat: 41.4, lng: 2.2, country: 'ES' },
    'amsterdam': { name: 'Amsterdam', lat: 52.4, lng: 4.9, country: 'NL' },
    'brussels': { name: 'Brussels', lat: 50.9, lng: 4.4, country: 'BE' },
    'vienna': { name: 'Vienna', lat: 48.2, lng: 16.4, country: 'AT' },
    'prague': { name: 'Prague', lat: 50.1, lng: 14.4, country: 'CZ' },
    'warsaw': { name: 'Warsaw', lat: 52.2, lng: 21.0, country: 'PL' },
    'budapest': { name: 'Budapest', lat: 47.5, lng: 19.0, country: 'HU' },
    'moscow': { name: 'Moscow', lat: 55.8, lng: 37.6, country: 'RU' },
    'st petersburg': { name: 'St Petersburg', lat: 59.9, lng: 30.3, country: 'RU' },
    'kyiv': { name: 'Kyiv', lat: 50.5, lng: 30.5, country: 'UA' },
    'kharkiv': { name: 'Kharkiv', lat: 50.0, lng: 36.3, country: 'UA' },
    'odesa': { name: 'Odesa', lat: 46.5, lng: 30.7, country: 'UA' },

    // Asian Cities
    'beijing': { name: 'Beijing', lat: 39.9, lng: 116.4, country: 'CN' },
    'shanghai': { name: 'Shanghai', lat: 31.2, lng: 121.5, country: 'CN' },
    'hong kong': { name: 'Hong Kong', lat: 22.3, lng: 114.2, country: 'CN' },
    'tokyo': { name: 'Tokyo', lat: 35.7, lng: 139.7, country: 'JP' },
    'osaka': { name: 'Osaka', lat: 34.7, lng: 135.5, country: 'JP' },
    'seoul': { name: 'Seoul', lat: 37.6, lng: 127.0, country: 'KR' },
    'taipei': { name: 'Taipei', lat: 25.0, lng: 121.5, country: 'TW' },
    'delhi': { name: 'Delhi', lat: 28.7, lng: 77.1, country: 'IN' },
    'mumbai': { name: 'Mumbai', lat: 19.1, lng: 72.9, country: 'IN' },
    'bangkok': { name: 'Bangkok', lat: 13.8, lng: 100.5, country: 'TH' },
    'singapore': { name: 'Singapore', lat: 1.4, lng: 103.8, country: 'SG' },
    'jakarta': { name: 'Jakarta', lat: -6.2, lng: 106.8, country: 'ID' },
    'manila': { name: 'Manila', lat: 14.6, lng: 121.0, country: 'PH' },
    'hanoi': { name: 'Hanoi', lat: 21.0, lng: 105.9, country: 'VN' },
    'kabul': { name: 'Kabul', lat: 34.5, lng: 69.2, country: 'AF' },
    'tehran': { name: 'Tehran', lat: 35.7, lng: 51.4, country: 'IR' },
    'baghdad': { name: 'Baghdad', lat: 33.3, lng: 44.4, country: 'IQ' },
    'damascus': { name: 'Damascus', lat: 33.5, lng: 36.3, country: 'SY' },
    'istanbul': { name: 'Istanbul', lat: 41.0, lng: 29.0, country: 'TR' },
    'ankara': { name: 'Ankara', lat: 39.9, lng: 32.9, country: 'TR' },
    'dubai': { name: 'Dubai', lat: 25.2, lng: 55.3, country: 'AE' },
    'riyadh': { name: 'Riyadh', lat: 24.7, lng: 46.7, country: 'SA' },
    'tel aviv': { name: 'Tel Aviv', lat: 32.1, lng: 34.8, country: 'IL' },
    'jerusalem': { name: 'Jerusalem', lat: 31.8, lng: 35.2, country: 'IL' },
    'beirut': { name: 'Beirut', lat: 33.9, lng: 35.5, country: 'LB' },

    // African Cities
    'cairo': { name: 'Cairo', lat: 30.0, lng: 31.2, country: 'EG' },
    'johannesburg': { name: 'Johannesburg', lat: -26.2, lng: 28.0, country: 'ZA' },
    'cape town': { name: 'Cape Town', lat: -33.9, lng: 18.4, country: 'ZA' },
    'lagos': { name: 'Lagos', lat: 6.5, lng: 3.4, country: 'NG' },
    'nairobi': { name: 'Nairobi', lat: -1.3, lng: 36.8, country: 'KE' },
    'addis ababa': { name: 'Addis Ababa', lat: 9.0, lng: 38.7, country: 'ET' },
    'khartoum': { name: 'Khartoum', lat: 15.6, lng: 32.5, country: 'SD' },

    // Oceania Cities
    'sydney': { name: 'Sydney', lat: -33.9, lng: 151.2, country: 'AU' },
    'melbourne': { name: 'Melbourne', lat: -37.8, lng: 145.0, country: 'AU' },
    'brisbane': { name: 'Brisbane', lat: -27.5, lng: 153.0, country: 'AU' },
    'perth': { name: 'Perth', lat: -31.9, lng: 115.9, country: 'AU' },
    'auckland': { name: 'Auckland', lat: -36.8, lng: 174.8, country: 'NZ' },

    // South American Cities
    'sao paulo': { name: 'São Paulo', lat: -23.6, lng: -46.6, country: 'BR' },
    'rio de janeiro': { name: 'Rio de Janeiro', lat: -22.9, lng: -43.2, country: 'BR' },
    'buenos aires': { name: 'Buenos Aires', lat: -34.6, lng: -58.4, country: 'AR' },
    'santiago': { name: 'Santiago', lat: -33.4, lng: -70.7, country: 'CL' },
    'bogota': { name: 'Bogotá', lat: 4.7, lng: -74.1, country: 'CO' },
    'lima': { name: 'Lima', lat: -12.0, lng: -77.0, country: 'PE' },
    'caracas': { name: 'Caracas', lat: 10.5, lng: -66.9, country: 'VE' },
};

// Regions that might appear in headlines
const REGIONS = {
    'middle east': { name: 'Middle East', lat: 29.0, lng: 41.0, type: 'regional' },
    'africa': { name: 'Africa', lat: 8.8, lng: 34.5, type: 'regional' },
    'europe': { name: 'Europe', lat: 54.5, lng: 15.3, type: 'regional' },
    'asia': { name: 'Asia', lat: 34.0, lng: 100.6, type: 'regional' },
    'latin america': { name: 'Latin America', lat: -8.8, lng: -55.5, type: 'regional' },
    'south america': { name: 'South America', lat: -8.8, lng: -55.5, type: 'regional' },
    'central america': { name: 'Central America', lat: 12.8, lng: -85.0, type: 'regional' },
    'caribbean': { name: 'Caribbean', lat: 21.5, lng: -78.0, type: 'regional' },
    'pacific': { name: 'Pacific', lat: -8.8, lng: -124.5, type: 'regional' },
    'arctic': { name: 'Arctic', lat: 71.7, lng: -42.6, type: 'regional' },
    'antarctic': { name: 'Antarctic', lat: -82.9, lng: 135.0, type: 'regional' },
    'southeast asia': { name: 'Southeast Asia', lat: 12.9, lng: 107.9, type: 'regional' },
    'east asia': { name: 'East Asia', lat: 35.9, lng: 104.2, type: 'regional' },
    'south asia': { name: 'South Asia', lat: 20.6, lng: 79.0, type: 'regional' },
    'central asia': { name: 'Central Asia', lat: 45.0, lng: 63.0, type: 'regional' },
    'northern africa': { name: 'Northern Africa', lat: 26.8, lng: 18.0, type: 'regional' },
    'sub-saharan': { name: 'Sub-Saharan Africa', lat: -2.0, lng: 23.0, type: 'regional' },
    'western europe': { name: 'Western Europe', lat: 48.0, lng: 4.0, type: 'regional' },
    'eastern europe': { name: 'Eastern Europe', lat: 50.0, lng: 30.0, type: 'regional' },
    'balkans': { name: 'Balkans', lat: 42.0, lng: 21.0, type: 'regional' },
    'mediterranean': { name: 'Mediterranean', lat: 35.0, lng: 18.0, type: 'regional' },
    'gulf': { name: 'Gulf Region', lat: 26.0, lng: 51.0, type: 'regional' },
    'red sea': { name: 'Red Sea', lat: 20.0, lng: 38.5, type: 'regional' },
};

// Build a search index for fast lookups
const searchIndex = new Map();

// Add countries to index
Object.entries(COUNTRIES).forEach(([key, data]) => {
    searchIndex.set(key, { type: 'country', ...data });
    data.aliases.forEach(alias => {
        searchIndex.set(alias, { type: 'country', ...data });
    });
});

// Add cities to index
Object.entries(MAJOR_CITIES).forEach(([key, data]) => {
    searchIndex.set(key, { type: 'city', ...data });
});

// Add regions to index
Object.entries(REGIONS).forEach(([key, data]) => {
    searchIndex.set(key, { type: 'region', ...data });
});

/**
 * Extract location from text (headline, summary, or description)
 * @param {string} text - Text to extract location from
 * @returns {Object|null} Location object with name, lat, lng, type
 */
export function extractLocation(text) {
    if (!text) return null;

    const normalizedText = text.toLowerCase();

    // Priority order: cities first (most specific), then countries, then regions
    let bestMatch = null;
    let bestMatchLength = 0;

    // Check for matches in the search index
    for (const [key, data] of searchIndex.entries()) {
        // Use word boundary matching to avoid false positives
        const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');

        if (regex.test(normalizedText)) {
            // Prefer longer matches (e.g., "South Korea" over "Korea")
            if (key.length > bestMatchLength) {
                bestMatch = data;
                bestMatchLength = key.length;
            }
        }
    }

    if (bestMatch) {
        return {
            name: bestMatch.name,
            lat: bestMatch.lat,
            lng: bestMatch.lng,
            type: bestMatch.type === 'region' ? 'regional' : 'local',
            countryCode: bestMatch.code || bestMatch.country || null,
            confidence: bestMatchLength > 5 ? 'high' : 'medium'
        };
    }

    return null;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract location from an event object
 * Tries title first, then summary
 * @param {Object} event - Event object with title and summary
 * @returns {Object} Updated location or original
 */
export function extractEventLocation(event) {
    // Try title first
    let location = extractLocation(event.title);

    // If not found in title, try summary
    if (!location && event.summary) {
        location = extractLocation(event.summary);
    }

    if (location) {
        return location;
    }

    // Return default global location
    return {
        name: 'Global',
        lat: null,
        lng: null,
        type: 'local'
    };
}

export default { extractLocation, extractEventLocation };
