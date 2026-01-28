/**
 * WorldMap Component
 * Leaflet-based interactive map with event markers and REAL country boundary highlighting
 * - Local events: Pin dot markers (colored by severity)
 * - Regional events: Actual country outline shapes (not rectangles)
 * - Developing events (missing data): Not shown on map
 */

import L from 'leaflet';
import 'leaflet.markercluster';
import { loadCountriesGeoJSON, getCountryGeometry, customRegions } from '../services/countryService.js';

export class WorldMap {
    constructor(containerId, onMarkerClick) {
        this.containerId = containerId;
        this.onMarkerClick = onMarkerClick;
        this.markers = new Map(); // eventId -> marker (local events only)
        this.zones = new Map(); // eventId -> GeoJSON layer (regional events only)
        this.eventData = new Map(); // eventId -> event data
        this.countriesLoaded = false;
        this.map = null;
        this.markerClusterGroup = null; // Cluster layer for markers

        // Promise that resolves when country data is loaded
        this.countryDataReady = null;

        this.initMap();
        this.countryDataReady = this.loadCountryData();
    }

    /**
     * Initialize Leaflet map with English-only labels
     */
    initMap() {
        // Create map centered on world view
        this.map = L.map(this.containerId, {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 18,
            zoomControl: true,
            attributionControl: false
        });

        // ESRI World Dark Gray Canvas - Professional dark theme with English-only labels
        // This provides consistently English labels at all zoom levels
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16,
            attribution: '&copy; Esri'
        }).addTo(this.map);

        // Add the reference/labels layer on top (English only)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16,
            attribution: ''
        }).addTo(this.map);

        // Add subtle attribution
        L.control.attribution({
            prefix: false,
            position: 'bottomright'
        }).addAttribution('© Esri, HERE, Garmin').addTo(this.map);

        // Initialize marker cluster group with custom styling
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 50, // Cluster markers within 50px
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false, // We'll handle click ourselves
            iconCreateFunction: (cluster) => this.createClusterIcon(cluster)
        });

        // Handle cluster click - show multi-event popup
        this.markerClusterGroup.on('clusterclick', (e) => {
            const cluster = e.layer;
            const childMarkers = cluster.getAllChildMarkers();
            const events = childMarkers.map(m => m._eventData).filter(Boolean);

            if (events.length > 0) {
                const popupContent = this.createClusterPopupContent(events);
                L.popup({
                    maxWidth: 350,
                    maxHeight: 400,
                    className: 'osint-popup cluster-popup'
                })
                    .setLatLng(cluster.getLatLng())
                    .setContent(popupContent)
                    .openOn(this.map);
            }
        });

        this.markerClusterGroup.addTo(this.map);
    }

    /**
     * Load country GeoJSON data - returns promise
     */
    async loadCountryData() {
        const data = await loadCountriesGeoJSON();
        if (data) {
            this.countriesLoaded = true;
            console.log('Country boundaries ready for use');
        }
        return data;
    }

    /**
     * Check if an event has valid location data
     */
    hasValidLocation(event) {
        return (
            event.location &&
            event.location.lat !== null &&
            event.location.lng !== null &&
            event.location.name !== 'Location TBD'
        );
    }

    /**
     * Get color based on importance/severity level
     */
    getSeverityColor(importance) {
        if (importance >= 5) return { color: '#ff3366', glow: 'rgba(255, 51, 102, 0.6)', pulse: true };
        if (importance >= 4) return { color: '#ff6600', glow: 'rgba(255, 102, 0, 0.5)', pulse: true };
        if (importance >= 3) return { color: '#ffaa00', glow: 'rgba(255, 170, 0, 0.4)', pulse: false };
        // Low importance (2 and below) = green like the filter button
        return { color: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)', pulse: false };
    }

    /**
     * Create custom marker icons based on severity
     */
    createMarkerIcon(importance, isActive = false, eventType = null) {
        // Use special earthquake icon for earthquake events
        if (eventType === 'earthquake') {
            return this.createEarthquakeIcon(importance, isActive);
        }

        const severity = this.getSeverityColor(importance);
        const size = isActive ? 18 : 14;

        return L.divIcon({
            className: 'custom-marker',
            html: `
        <div class="marker-dot" 
             style="
               width: ${size}px; 
               height: ${size}px; 
               background: ${severity.color}; 
               border: 2px solid #0a0e14;
               box-shadow: 0 0 ${isActive ? '20' : '12'}px ${severity.glow};
               ${severity.pulse ? 'animation: markerPulse 1.5s ease-in-out infinite;' : ''}
             ">
        </div>
      `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }

    /**
     * Create unique earthquake icon with seismic wave symbol
     */
    createEarthquakeIcon(importance, isActive = false) {
        const severity = this.getSeverityColor(importance);
        const size = isActive ? 24 : 20;

        return L.divIcon({
            className: 'earthquake-marker',
            html: `
        <div class="earthquake-icon" 
             style="
               width: ${size}px; 
               height: ${size}px;
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: ${isActive ? '14px' : '12px'};
               filter: drop-shadow(0 0 ${isActive ? '8' : '4'}px ${severity.glow});
             ">
          🌋
        </div>
      `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }

    /**
     * Add events to the map
     */
    addEvents(events) {
        events.forEach(event => {
            this.addEvent(event);
        });
    }

    /**
     * Add a single event - either as zone (regional) or marker (local)
     */
    addEvent(event) {
        // Skip developing events with missing location data
        if (!this.hasValidLocation(event)) {
            return;
        }

        // Store event data for lookup
        this.eventData.set(event.id, event);

        if (event.location.type === 'regional' && event.location.countryCode) {
            // Regional events: Real country boundary outline
            this.addCountryZone(event);
        } else {
            // Local events: Pin dot marker
            this.addMarker(event);
        }
    }

    /**
     * Add pin marker for local events
     */
    addMarker(event) {
        const marker = L.marker(
            [event.location.lat, event.location.lng],
            { icon: this.createMarkerIcon(event.importance, false, event.eventType) }
        );

        marker._eventData = event;

        const popupContent = this.createPopupContent(event);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'osint-popup'
        });

        marker.on('click', () => {
            if (this.onMarkerClick) {
                this.onMarkerClick(event);
            }
        });

        // Add to cluster group instead of directly to map
        this.markerClusterGroup.addLayer(marker);
        this.markers.set(event.id, marker);
    }

    /**
     * Add real country boundary zone using GeoJSON
     */
    addCountryZone(event) {
        const countryCode = event.location.countryCode;
        const severity = this.getSeverityColor(event.importance);

        // Check for custom region first (like South China Sea)
        if (customRegions[countryCode]) {
            this.addCustomZone(event, customRegions[countryCode], severity);
            return;
        }

        // Get real country geometry
        const geometry = getCountryGeometry(countryCode);

        if (!geometry) {
            // Fallback to marker if no boundary data yet
            console.log(`No boundary for ${countryCode}, using marker`);
            this.addMarker(event);
            return;
        }

        // Create GeoJSON layer from country geometry
        const geoJsonLayer = L.geoJSON(geometry, {
            style: {
                color: severity.color,
                weight: 2,
                opacity: 0.9,
                fillColor: severity.color,
                fillOpacity: 0.15,
                dashArray: null // Solid line for real boundaries
            }
        });

        geoJsonLayer._eventData = event;

        // Create popup
        const popupContent = this.createPopupContent(event);
        geoJsonLayer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'osint-popup'
        });

        // Click handler
        geoJsonLayer.on('click', (e) => {
            geoJsonLayer.openPopup(e.latlng);
            if (this.onMarkerClick) {
                this.onMarkerClick(event);
            }
        });

        // Hover effects
        geoJsonLayer.on('mouseover', () => {
            geoJsonLayer.setStyle({ fillOpacity: 0.35, weight: 3 });
        });

        geoJsonLayer.on('mouseout', () => {
            geoJsonLayer.setStyle({ fillOpacity: 0.15, weight: 2 });
        });

        geoJsonLayer.addTo(this.map);
        this.zones.set(event.id, geoJsonLayer);
    }

    /**
     * Add custom zone (for water bodies, etc.) using Leaflet polygon
     */
    addCustomZone(event, regionData, severity) {
        const zone = L.polygon(regionData.coordinates, {
            color: severity.color,
            weight: 2,
            opacity: 0.8,
            fillColor: severity.color,
            fillOpacity: 0.15,
            dashArray: '5, 5' // Dashed for custom/water regions
        });

        zone._eventData = event;

        const popupContent = this.createPopupContent(event);
        zone.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'osint-popup'
        });

        zone.on('click', (e) => {
            zone.openPopup(e.latlng);
            if (this.onMarkerClick) {
                this.onMarkerClick(event);
            }
        });

        zone.on('mouseover', () => {
            zone.setStyle({ fillOpacity: 0.3, weight: 3, dashArray: null });
        });

        zone.on('mouseout', () => {
            zone.setStyle({ fillOpacity: 0.15, weight: 2, dashArray: '5, 5' });
        });

        zone.addTo(this.map);
        this.zones.set(event.id, zone);
    }

    /**
     * Create popup HTML content with themed styling
     */
    createPopupContent(event) {
        const severityLabels = { 5: 'CRITICAL', 4: 'HIGH', 3: 'MEDIUM', 2: 'LOW', 1: 'INFO' };
        const severityLabel = severityLabels[event.importance] || 'LOW';
        const severity = this.getSeverityColor(event.importance);
        const timeAgo = this.formatTimeAgo(event.timestamp);

        return `
      <div class="popup-content" style="
        font-family: 'Inter', sans-serif;
        background: #111820;
        padding: 12px;
        border-radius: 6px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; color: #00d4ff; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
            ${event.source}
          </span>
          <span style="font-size: 9px; padding: 2px 6px; background: ${severity.color}22; 
                       border: 1px solid ${severity.color}; border-radius: 3px; color: ${severity.color}; font-weight: 600;">
            ${severityLabel}
          </span>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #e8eaed; margin-bottom: 6px; line-height: 1.4;">
          ${event.title}
        </div>
        <div style="font-size: 11px; color: #9aa0a6; margin-bottom: 8px;">
          ${timeAgo}
        </div>
        ${event.summary ? `
          <div style="font-size: 11px; color: #9aa0a6; line-height: 1.5; margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #3c4043;">
            ${event.summary}
          </div>
        ` : ''}
        ${event.sourceCount > 1 ? `
          <div style="margin-top: 8px; padding: 4px 8px; background: rgba(255, 51, 102, 0.15); 
                      border: 1px solid #ff3366; border-radius: 4px; display: inline-block;
                      font-size: 10px; color: #ff3366; font-weight: 600;">
            ⚡ ${event.sourceCount} CORRELATED SOURCES
          </div>
        ` : ''}
        ${event.sourceUrl ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #3c4043;">
            <a href="${event.sourceUrl}" target="_blank" rel="noopener" 
               style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; 
                      color: #00d4ff; text-decoration: none; font-weight: 500;">
              📰 Read Full Story ↗
            </a>
          </div>
        ` : ''}
      </div>
    `;
    }

    /**
     * Format timestamp as time ago
     */
    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Recent';

        const now = new Date();
        const date = new Date(timestamp);

        // Check for invalid date
        if (isNaN(date.getTime())) return 'Recent';

        const diffMs = now - date;

        // Handle future dates or negative differences
        if (diffMs < 0) return 'Just now';

        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    /**
     * Create custom cluster icon based on severity distribution
     */
    createClusterIcon(cluster) {
        const childMarkers = cluster.getAllChildMarkers();
        const count = childMarkers.length;

        // Get highest severity in cluster
        let maxImportance = 2;
        childMarkers.forEach(m => {
            const event = m._eventData;
            if (event && event.importance > maxImportance) {
                maxImportance = event.importance;
            }
        });

        const severity = this.getSeverityColor(maxImportance);
        const size = count > 20 ? 50 : count > 10 ? 45 : 40;

        return L.divIcon({
            html: `
                <div class="cluster-icon" style="
                    width: ${size}px;
                    height: ${size}px;
                    background: ${severity.color}33;
                    border: 3px solid ${severity.color};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 14px;
                    font-weight: bold;
                    color: ${severity.color};
                    box-shadow: 0 0 15px ${severity.glow};
                    cursor: pointer;
                    transition: transform 0.2s ease;
                ">
                    ${count}
                </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: L.point(size, size),
            iconAnchor: [size / 2, size / 2]
        });
    }

    /**
     * Create popup content for clustered events
     */
    createClusterPopupContent(events) {
        const severityLabels = { 5: 'CRITICAL', 4: 'HIGH', 3: 'MEDIUM', 2: 'LOW', 1: 'INFO' };

        // Sort by importance (highest first)
        const sortedEvents = [...events].sort((a, b) => (b.importance || 2) - (a.importance || 2));

        const eventsHtml = sortedEvents.map(event => {
            const severity = this.getSeverityColor(event.importance);
            const severityLabel = severityLabels[event.importance] || 'LOW';
            const timeAgo = this.formatTimeAgo(event.timestamp);

            return `
                <div class="cluster-event-item" style="
                    padding: 10px;
                    border-bottom: 1px solid #3c4043;
                    cursor: pointer;
                    background: #111820;
                    transition: background 0.2s ease;
                " onclick="window.open('${event.sourceUrl || '#'}', '_blank')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 10px; color: #00d4ff; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${event.source}
                        </span>
                        <span style="font-size: 8px; padding: 1px 4px; background: ${severity.color}22; 
                                     border: 1px solid ${severity.color}; border-radius: 2px; color: ${severity.color}; font-weight: 600;">
                            ${severityLabel}
                        </span>
                    </div>
                    <div style="font-size: 12px; font-weight: 600; color: #e8eaed; line-height: 1.3; margin-bottom: 4px;">
                        ${event.title}
                    </div>
                    <div style="font-size: 10px; color: #9aa0a6;">
                        ${timeAgo}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="cluster-popup-content" style="font-family: 'Inter', sans-serif; background: #0a0e14;">
                <div style="padding: 10px; background: #1a2332; border-bottom: 2px solid #00d4ff;">
                    <span style="font-size: 12px; font-weight: 700; color: #00d4ff; letter-spacing: 1px;">
                        📍 ${events.length} EVENTS IN THIS AREA
                    </span>
                </div>
                <div style="max-height: 280px; overflow-y: auto;">
                    ${eventsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Focus on a specific event
     */
    focusEvent(eventId, zoom = 5) {
        const event = this.eventData.get(eventId);
        if (!event) return;

        if (event.location.type === 'regional' && this.zones.has(eventId)) {
            const zone = this.zones.get(eventId);
            this.map.flyToBounds(zone.getBounds(), { duration: 1, padding: [50, 50] });

            // Highlight this zone
            this.zones.forEach((z, id) => {
                if (id === eventId) {
                    z.setStyle({ weight: 4, opacity: 1, fillOpacity: 0.35 });
                } else {
                    z.setStyle({ weight: 2, opacity: 0.9, fillOpacity: 0.15 });
                }
            });

            zone.openPopup(zone.getBounds().getCenter());
        } else if (this.markers.has(eventId)) {
            const marker = this.markers.get(eventId);
            this.map.flyTo(marker.getLatLng(), zoom, { duration: 1 });

            this.markers.forEach((m, id) => {
                const evtData = m._eventData;
                m.setIcon(this.createMarkerIcon(evtData?.importance || 2, id === eventId));
            });

            marker.openPopup();
        }
    }

    /**
     * Add a new event with animation
     */
    addNewEvent(event) {
        if (this.hasValidLocation(event)) {
            this.addEvent(event);
        }
    }

    /**
     * Reset all marker/zone states
     */
    resetStates() {
        this.markers.forEach((marker) => {
            const evtData = marker._eventData;
            marker.setIcon(this.createMarkerIcon(evtData?.importance || 2, false));
        });

        this.zones.forEach(zone => {
            zone.setStyle({ weight: 2, opacity: 0.9, fillOpacity: 0.15 });
        });
    }

    /**
     * Fit map to show all events
     */
    fitAllEvents() {
        const allLayers = [
            ...Array.from(this.markers.values()),
            ...Array.from(this.zones.values())
        ];

        if (allLayers.length === 0) return;

        const group = new L.featureGroup(allLayers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    /**
     * Filter visible markers based on feed filter
     * @param {string} filterLevel - Filter type: 'all', 'critical', 'high', 'medium', 'low', 'earthquake', 'developing'
     */
    filterMarkers(filterLevel) {
        // Store current filter level for reference
        this.currentFilter = filterLevel;

        // Clear and rebuild cluster group for reliable filtering
        this.markerClusterGroup.clearLayers();

        this.markers.forEach((marker, eventId) => {
            const event = this.eventData.get(eventId);
            if (!event) return;

            const show = this.shouldShowEvent(event, filterLevel);

            if (show) {
                this.markerClusterGroup.addLayer(marker);
            }
        });

        this.zones.forEach((zone, eventId) => {
            const event = this.eventData.get(eventId);
            if (!event) return;

            const show = this.shouldShowEvent(event, filterLevel);

            if (show) {
                if (!this.map.hasLayer(zone)) {
                    zone.addTo(this.map);
                }
            } else {
                if (this.map.hasLayer(zone)) {
                    this.map.removeLayer(zone);
                }
            }
        });
    }

    /**
     * Determine if event should be shown based on filter
     */
    shouldShowEvent(event, filterLevel) {
        const importance = event.importance || 2;
        const isEarthquake = event.eventType === 'earthquake';
        const isDeveloping = event.isDeveloping === true ||
            !event.title ||
            event.title === 'Untitled';

        switch (filterLevel) {
            case 'critical':
                return importance >= 5 && !isDeveloping;
            case 'high':
                return importance === 4 && !isDeveloping;
            case 'medium':
                return importance === 3 && !isDeveloping;
            case 'low':
                return importance <= 2 && !isDeveloping;
            case 'earthquake':
                return isEarthquake;
            case 'developing':
                return isDeveloping;
            case 'all':
            default:
                return !isDeveloping;
        }
    }
}

export default WorldMap;
