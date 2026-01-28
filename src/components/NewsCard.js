/**
 * NewsCard Component
 * Renders individual news story cards with importance indicators
 * Now supports real news data with source URLs and breaking news flags
 */

import { formatTimeAgo } from '../services/aggregatorService.js';

/**
 * Create a news card element
 */
export function createNewsCard(event, onClickCallback) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.dataset.eventId = event.id;
  card.dataset.importance = event.importance || 2;

  // Add severity class for proper color coding
  const importance = event.importance || 2;
  if (importance >= 5) {
    card.classList.add('severity-critical');
  } else if (importance === 4) {
    card.classList.add('severity-high');
  } else if (importance === 3) {
    card.classList.add('severity-medium');
  } else {
    card.classList.add('severity-low');
  }

  // Add breaking news class
  if (event.isBreaking) {
    card.classList.add('breaking');
  }

  // Get location name, handling missing data
  const locationName = event.location?.name || 'Global';

  // Build the card HTML (compact - no summary, shows in popup)
  card.innerHTML = `
    <div class="news-card-header">
      <span class="news-source">${escapeHtml(event.source || 'Unknown')}</span>
      <span class="news-time">${formatTimeAgo(event.timestamp)}</span>
    </div>
    <h3 class="news-title">${escapeHtml(event.title || 'Untitled')}</h3>
    <div class="news-footer">
      <span class="news-location">${escapeHtml(locationName)}</span>
      ${event.isBreaking ? '<span class="breaking-badge">BREAKING</span>' : ''}
      ${event.sourceCount > 1 ? `
        <span class="correlated-badge">${event.sourceCount} sources</span>
      ` : ''}
      ${event.sourceUrl ? `
        <a href="${escapeHtml(event.sourceUrl)}" class="source-link" target="_blank" rel="noopener" title="Open source article">↗</a>
      ` : ''}
    </div>
  `;

  // Click handler - zoom map if has location, otherwise open source URL
  card.addEventListener('click', (e) => {
    // Remove active class from all cards
    document.querySelectorAll('.news-card.active').forEach(c => {
      c.classList.remove('active');
    });

    // Add active class to this card
    card.classList.add('active');

    // If has valid location, trigger map zoom
    if (event.location?.lat && event.location?.lng) {
      if (onClickCallback) {
        onClickCallback(event);
      }
    } else if (event.sourceUrl) {
      // No location but has URL - option to open source
      // For now, just trigger callback
      if (onClickCallback) {
        onClickCallback(event);
      }
    }
  });

  // Double-click to open source URL
  if (event.sourceUrl) {
    card.addEventListener('dblclick', (e) => {
      e.preventDefault();
      window.open(event.sourceUrl, '_blank');
    });
    card.title = 'Double-click to open source';
  }

  return card;
}

/**
 * HTML escape utility
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add new story animation
 */
export function animateNewStory(card) {
  card.classList.add('new-story');

  // Remove animation class after it completes
  setTimeout(() => {
    card.classList.remove('new-story');
  }, 1500);
}

export default { createNewsCard, animateNewStory };
