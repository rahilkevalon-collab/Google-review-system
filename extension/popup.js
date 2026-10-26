/**
 * ReviewCraft Chrome Extension - Popup Controller
 * Displays the current active synchronized review in real-time.
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const noReviewDiv = document.getElementById('no-review');
  const hasReviewDiv = document.getElementById('has-review');
  const cardCompany = document.getElementById('card-company');
  const cardStars = document.getElementById('card-stars');
  const cardText = document.getElementById('card-text');
  const cardMeta = document.getElementById('card-meta');
  const btnOpenWebapp = document.getElementById('btn-open-webapp');
  const btnClear = document.getElementById('btn-clear');

  function renderPending(pending) {
    if (!pending || !pending.text) {
      statusBadge.className = 'badge waiting';
      statusText.textContent = 'Waiting for ReviewCraft';
      noReviewDiv.style.display = 'block';
      hasReviewDiv.style.display = 'none';
      return;
    }

    statusBadge.className = 'badge';
    statusText.textContent = pending.status === 'ready' ? 'Ready to Auto-Fill on Google' : 'Synchronized with WebApp';
    noReviewDiv.style.display = 'none';
    hasReviewDiv.style.display = 'block';

    cardCompany.textContent = pending.companyName || 'Business Profile';
    
    const rating = Math.max(1, Math.min(5, Math.round(Number(pending.rating)) || 5));
    cardStars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating) + ` (${rating}.0)`;

    cardText.textContent = `"${pending.text}"`;

    const ageSec = Math.max(0, Math.round((Date.now() - (pending.timestamp || Date.now())) / 1000));
    let timeStr = 'just now';
    if (ageSec > 60) {
      timeStr = `${Math.round(ageSec / 60)}m ago`;
    } else if (ageSec > 5) {
      timeStr = `${ageSec}s ago`;
    }
    cardMeta.textContent = `Synced ${timeStr} • ${pending.keyword || 'General'}`;
  }

  // Load from chrome.storage.local
  function refresh() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['pendingReview', 'lastSyncedReview'], (res) => {
          renderPending(res.pendingReview || res.lastSyncedReview);
        });
      }
    } catch (e) {
      console.warn('Popup storage read error:', e);
    }
  }

  refresh();

  // Listen for storage changes while popup is open
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && (changes.pendingReview || changes.lastSyncedReview)) {
          const item = (changes.pendingReview ? changes.pendingReview.newValue : null) ||
                       (changes.lastSyncedReview ? changes.lastSyncedReview.newValue : null);
          renderPending(item);
        }
      });
    }
  } catch (e) {}

  // Open webapp button
  btnOpenWebapp.addEventListener('click', () => {
    try {
      if (chrome.tabs) {
        chrome.tabs.create({ url: 'http://localhost:5173/' });
      } else {
        window.open('http://localhost:5173/', '_blank');
      }
    } catch (e) {
      window.open('http://localhost:5173/', '_blank');
    }
  });

  // Clear button
  btnClear.addEventListener('click', () => {
    try {
      if (chrome.storage?.local) {
        chrome.storage.local.remove(['pendingReview'], () => {
          renderPending(null);
        });
      }
    } catch (e) {}
  });
});
