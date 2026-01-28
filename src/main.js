/**
 * OSINT Situation Dashboard
 * Main application entry point
 * Now powered by REAL news feeds from GDELT, USGS, and major news outlets
 */

import './style.css';
import { NewsFeed } from './components/NewsFeed.js';
import { WorldMap } from './components/WorldMap.js';
import { fetchAllEvents, getCachedEvents } from './services/aggregatorService.js';

// Application state
let newsFeed = null;
let worldMap = null;
let events = [];
let isLoading = false;
let lastUpdateTime = null;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize the application
 */
async function init() {
  console.log('🛰️ OSINT Dashboard initializing...');
  showLoadingState(true);

  // Initialize world map first
  worldMap = new WorldMap('worldMap', handleMarkerClick);

  // Wait for country boundary data to load
  console.log('⏳ Loading country boundaries...');
  await worldMap.countryDataReady;
  console.log('🌍 Country boundaries loaded');

  // Initialize news feed with filter sync callback
  newsFeed = new NewsFeed('newsFeed', handleEventSelect, handleFilterChange);

  // Fetch real news data
  await refreshEvents();

  // Start clock update
  updateClock();
  setInterval(updateClock, 1000);

  // Auto-refresh events every 5 minutes
  setInterval(refreshEvents, REFRESH_INTERVAL);

  showLoadingState(false);
  console.log('✅ OSINT Dashboard ready - LIVE DATA');
}

/**
 * Refresh events from all sources
 */
async function refreshEvents() {
  if (isLoading) return;

  isLoading = true;
  console.log('🔄 Refreshing live news feeds...');

  try {
    showLoadingState(true);

    // Fetch fresh events from all sources
    events = await fetchAllEvents(true);

    // Clear and re-render
    worldMap.markers.clear();
    worldMap.zones.clear();
    worldMap.eventData.clear();

    // Clear the cluster layer too
    if (worldMap.markerClusterGroup) {
      worldMap.markerClusterGroup.clearLayers();
    }

    // Add events to map (only those with valid locations)
    worldMap.addEvents(events);

    // Render news feed
    newsFeed.render(events);

    // Update event counter and timestamps
    updateEventCounter(events.length);
    updateDataTimestamps();

    console.log(`✅ Loaded ${events.length} live events`);
  } catch (error) {
    console.error('❌ Error refreshing events:', error);
  } finally {
    isLoading = false;
    showLoadingState(false);
  }
}

/**
 * Show/hide loading state with modern spinner
 */
function showLoadingState(loading) {
  const indicator = document.getElementById('eventCount');
  if (indicator) {
    if (loading) {
      indicator.classList.add('loading');
      indicator.innerHTML = '<div class="loading-spinner"></div>';
      indicator.title = 'Loading live data...';
    } else {
      indicator.classList.remove('loading');
    }
  }
}

/**
 * Update the event counter in header
 */
function updateEventCounter(count) {
  const indicator = document.getElementById('eventCount');
  if (indicator) {
    indicator.textContent = count;
    indicator.title = `${count} live events`;
  }
}

/**
 * Update data timestamps (last update / next update)
 */
function updateDataTimestamps() {
  lastUpdateTime = new Date();

  const lastUpdateEl = document.getElementById('lastUpdate');
  const nextUpdateEl = document.getElementById('nextUpdate');

  if (lastUpdateEl) {
    lastUpdateEl.textContent = formatTime(lastUpdateTime);
  }

  if (nextUpdateEl) {
    const nextUpdate = new Date(lastUpdateTime.getTime() + REFRESH_INTERVAL);
    nextUpdateEl.textContent = formatTime(nextUpdate);
  }
}

/**
 * Format time as HH:MM:SS
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Update the header clock
 */
function updateClock() {
  const clockEl = document.getElementById('currentTime');
  if (clockEl) {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
    clockEl.textContent = formatted.toUpperCase();
  }
}

/**
 * Handle event selection from news feed
 */
function handleEventSelect(event) {
  console.log(`📍 Focusing event: ${event.id}`);
  worldMap.focusEvent(event.id);
}

/**
 * Handle marker click on map
 */
function handleMarkerClick(event) {
  console.log(`🗺️ Marker clicked: ${event.id}`);
  newsFeed.highlightEvent(event.id);
}

/**
 * Handle filter change from news feed - sync map markers
 */
function handleFilterChange(filterLevel, allEvents) {
  console.log(`🔍 Filter changed to: ${filterLevel}`);
  worldMap.filterMarkers(filterLevel);
}

// Expose refresh function for manual refresh
window.refreshOSINT = refreshEvents;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
