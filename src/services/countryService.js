/**
 * Country GeoJSON Service
 * Fetches and provides actual country boundary data from Natural Earth
 */

// Cache for loaded country geometries
let countriesGeoJSON = null;
let loadingPromise = null;

/**
 * Load world countries GeoJSON from CDN
 * Using Natural Earth 110m simplified data for performance
 */
export async function loadCountriesGeoJSON() {
    if (countriesGeoJSON) {
        return countriesGeoJSON;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            // Natural Earth 110m countries - small file, good for visualization
            const response = await fetch(
                'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
            );

            if (!response.ok) {
                throw new Error(`Failed to load countries: ${response.status}`);
            }

            countriesGeoJSON = await response.json();
            console.log(`Loaded ${countriesGeoJSON.features.length} country boundaries`);
            return countriesGeoJSON;
        } catch (error) {
            console.error('Error loading country boundaries:', error);
            loadingPromise = null;
            return null;
        }
    })();

    return loadingPromise;
}

/**
 * Get country geometry by ISO Alpha-2 code
 * The GeoJSON dataset uses 'ISO3166-1-Alpha-2' for country codes
 */
export function getCountryGeometry(countryCode) {
    if (!countriesGeoJSON) {
        console.log('GeoJSON not yet loaded');
        return null;
    }

    // Find country by ISO 3166-1 Alpha-2 code (the key used in this dataset)
    const country = countriesGeoJSON.features.find(
        f => f.properties['ISO3166-1-Alpha-2'] === countryCode
    );

    if (country) {
        console.log(`Found geometry for ${countryCode}: ${country.properties.name}`);
    } else {
        console.log(`No geometry found for ${countryCode}`);
    }

    return country ? country.geometry : null;
}

/**
 * Get country name by code
 */
export function getCountryName(countryCode) {
    if (!countriesGeoJSON) {
        return countryCode;
    }

    const country = countriesGeoJSON.features.find(
        f => f.properties['ISO3166-1-Alpha-2'] === countryCode
    );

    return country ? country.properties.name : countryCode;
}

/**
 * Country code mappings for special regions
 */
export const regionMappings = {
    'SCS': null, // South China Sea - no country boundary, use custom
    'UA': 'UA',  // Ukraine
    'MD': 'MD',  // Moldova
    'JP': 'JP',  // Japan
    'TH': 'TH',  // Thailand
    'VN': 'VN',  // Vietnam
    'FR': 'FR',  // France
    'US': 'US',  // United States
    'GB': 'GB',  // United Kingdom
    'NO': 'NO',  // Norway
};

/**
 * Custom boundaries for non-country regions (water bodies, disputed areas, etc.)
 * Coordinates in Leaflet format: [lat, lng]
 */
export const customRegions = {
    'SCS': {
        name: 'South China Sea',
        type: 'Polygon',
        coordinates: [[
            [25.0, 105.0], [25.0, 122.0], [5.0, 122.0], [5.0, 105.0], [25.0, 105.0]
        ]]
    }
};
