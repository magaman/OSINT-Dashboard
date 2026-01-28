/**
 * NewsFeed Component
 * Scrollable feed widget with filtering by severity level
 */

import { createNewsCard, animateNewStory } from './NewsCard.js';

export class NewsFeed {
    constructor(containerId, onEventSelect, onFilterChange = null) {
        this.container = document.getElementById(containerId);
        this.onEventSelect = onEventSelect;
        this.onFilterChange = onFilterChange;
        this.events = [];
        this.filterLevel = 'all';

        this.setupFilterListeners();
    }

    /**
     * Setup filter button listeners
     */
    setupFilterListeners() {
        const buttons = document.querySelectorAll('.filter-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply filter
                this.filterLevel = btn.dataset.filter;
                this.applyFilter();

                // Notify map to sync filter
                if (this.onFilterChange) {
                    this.onFilterChange(this.filterLevel, this.events);
                }
            });
        });
    }

    /**
     * Check if an event is "developing" (truly incomplete placeholder story)
     * Note: Events without geolocation (most RSS news) are NOT developing
     * Developing means: placeholder title, no source, or explicitly marked
     */
    isDeveloping(event) {
        // Check for placeholder/incomplete content
        const hasPlaceholderTitle = !event.title ||
            event.title === 'Untitled' ||
            event.title.includes('TBD') ||
            event.title.includes('Location TBD');

        const hasPlaceholderLocation = event.location?.name === 'Location TBD';

        const hasNoSource = !event.source || event.source === 'Unknown';

        // Explicitly marked as developing
        const markedDeveloping = event.isDeveloping === true;

        return hasPlaceholderTitle || hasPlaceholderLocation || hasNoSource || markedDeveloping;
    }

    /**
     * Render all events
     */
    render(events) {
        this.events = events;
        this.container.innerHTML = '';

        // Sort by timestamp (newest first)
        const sortedEvents = [...events].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        sortedEvents.forEach(event => {
            const card = createNewsCard(event, this.onEventSelect);
            // Mark developing events
            if (this.isDeveloping(event)) {
                card.dataset.developing = 'true';
                card.classList.add('developing');
            }
            // Add eventType for filtering (e.g., 'earthquake')
            if (event.eventType) {
                card.dataset.eventType = event.eventType;
            }
            this.container.appendChild(card);
        });

        // Update event counter
        this.updateEventCount();

        // Apply current filter
        this.applyFilter();
    }

    /**
     * Apply visibility filter based on importance/severity
     */
    applyFilter() {
        const cards = this.container.querySelectorAll('.news-card');

        cards.forEach(card => {
            const importance = parseInt(card.dataset.importance);
            const isDeveloping = card.dataset.developing === 'true';
            let show = false;

            switch (this.filterLevel) {
                case 'critical':
                    show = importance >= 5 && !isDeveloping;
                    break;
                case 'high':
                    show = importance === 4 && !isDeveloping;
                    break;
                case 'medium':
                    show = importance === 3 && !isDeveloping;
                    break;
                case 'low':
                    show = (importance <= 2) && !isDeveloping;
                    break;
                case 'earthquake':
                    show = card.dataset.eventType === 'earthquake';
                    break;
                case 'developing':
                    show = isDeveloping;
                    break;
                case 'all':
                default:
                    // All shows everything except developing
                    show = !isDeveloping;
            }

            card.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Add a new event to the top of the feed
     */
    addEvent(event) {
        this.events.unshift(event);

        const card = createNewsCard(event, this.onEventSelect);

        // Mark developing events
        if (this.isDeveloping(event)) {
            card.dataset.developing = 'true';
            card.classList.add('developing');
        }

        // Insert at the top
        if (this.container.firstChild) {
            this.container.insertBefore(card, this.container.firstChild);
        } else {
            this.container.appendChild(card);
        }

        // Animate the new story
        animateNewStory(card);

        // Update counter
        this.updateEventCount();

        // Apply filter
        this.applyFilter();
    }

    /**
     * Update the event counter in header
     */
    updateEventCount() {
        const counter = document.getElementById('eventCount');
        if (counter) {
            // Count non-developing events
            const activeCount = this.events.filter(e => !this.isDeveloping(e)).length;
            counter.textContent = activeCount;
        }
    }

    /**
     * Highlight a specific event card
     */
    highlightEvent(eventId) {
        const cards = this.container.querySelectorAll('.news-card');

        cards.forEach(card => {
            if (card.dataset.eventId === eventId) {
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                card.classList.remove('active');
            }
        });
    }
}

export default NewsFeed;
