/**
 * ReviewCraft Chrome Extension - Web App Content Script Bridge
 * Runs on website pages (localhost, local IP, custom domains).
 * 
 * Functions:
 * 1. Synchronously flags the page DOM so the React app instantly knows the extension is active.
 * 2. Writes reviews directly to chrome.storage.local without service worker wake-up latency.
 * 3. Enforces monotonic version ordering so older/stale messages never overwrite newer reviews.
 * 4. Relays messages to background service worker and provides bidirectional ACK.
 */

(function () {
  'use strict';

  // Only run on web application hosts, never on Google or accounts pages
  const hostname = (window.location.hostname || '').toLowerCase();
  if (
    hostname.includes('google.') ||
    hostname.endsWith('google.com') ||
    hostname.includes('gstatic.com') ||
    hostname === 'accounts.google.com'
  ) {
    return;
  }

  // Mark DOM element synchronously so React app can detect extension presence instantly
  try {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-reviewcraft-extension-active', '1.1.4');
    }
  } catch (e) {}

  if (window.__reviewCraftWebappBridgeInjected) return;
  window.__reviewCraftWebappBridgeInjected = true;

  console.log('[ReviewCraft Bridge] Injected & active on:', window.location.href);

  function announcePresence(additionalData = {}) {
    try {
      window.postMessage({
        type: 'REVIEW_CRAFT_EXTENSION_AVAILABLE',
        version: '1.1.4',
        timestamp: Date.now(),
        ...additionalData
      }, '*');
    } catch (e) {}
  }

  function normalizeRecord(payload, forcedStatus) {
    if (!payload || !payload.text) return null;
    const version = Number(payload.version) || Number(payload.timestamp) || Date.now();
    return {
      companyId: String(payload.companyId || ''),
      companyName: String(payload.companyName || '').trim(),
      companyLocation: String(payload.companyLocation || '').trim(),
      googlePlaceId: String(payload.googlePlaceId || '').trim(),
      googleReviewUrl: String(payload.googleReviewUrl || '').trim(),
      reviewId: String(payload.reviewId || `rev_${version}`),
      text: String(payload.text).trim(),
      rating: Math.max(1, Math.min(5, Math.round(Number(payload.rating)) || 5)),
      keyword: String(payload.keyword || '').trim(),
      timestamp: version,
      version: version,
      source: String(payload.source || 'sync'),
      status: forcedStatus || payload.status || 'synced',
      applied: false,
      updatedAt: Date.now()
    };
  }

  // Handle messages dispatched by ReviewCraft React App
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;

    const { type, payload } = event.data;

    // 1. Review Sync or AutoFill trigger
    if (type === 'REVIEW_CRAFT_SYNC' || type === 'REVIEW_CRAFT_AUTOFILL') {
      const forcedStatus = type === 'REVIEW_CRAFT_AUTOFILL' ? 'ready' : 'synced';
      const record = normalizeRecord(payload, forcedStatus);
      if (!record) return;

      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          // Compare with existing record to guarantee monotonic version ordering
          chrome.storage.local.get(['pendingReview'], (res) => {
            if (chrome.runtime?.lastError) return;
            const existing = res.pendingReview;

            // Prevent older/stale reviews from overwriting a newer review
            if (existing && existing.version && existing.version > record.version) {
              console.log('[ReviewCraft Bridge] Ignored stale review payload (newer version already in storage):', {
                currentVersion: existing.version,
                staleVersion: record.version
              });
              return;
            }

            // Persist the newest review in chrome.storage.local
            chrome.storage.local.set({
              pendingReview: record,
              lastSyncedReview: record,
              lastSyncTimestamp: Date.now()
            }, () => {
              if (chrome.runtime?.lastError) {
                console.warn('[ReviewCraft Bridge] Storage write error:', chrome.runtime.lastError.message);
              } else {
                console.log('[ReviewCraft Bridge] Saved review to extension storage:', {
                  company: record.companyName,
                  rating: record.rating + '★',
                  source: record.source,
                  version: record.version
                });

                // Send acknowledgment back to React web app
                try {
                  window.postMessage({
                    type: 'REVIEW_CRAFT_SYNC_ACK',
                    success: true,
                    reviewId: record.reviewId,
                    version: record.version,
                    status: record.status
                  }, '*');
                } catch (e) {}
              }
            });

            // Also notify background service worker if active
            if (chrome.runtime?.id) {
              chrome.runtime.sendMessage({
                action: 'SET_PENDING_REVIEW',
                payload: record
              }, () => {
                if (chrome.runtime?.lastError) {
                  // Service worker is dormant; chrome.storage.local is already updated
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn('[ReviewCraft Bridge] Save error:', err);
      }
    }

    // 2. Ping request from web app
    if (type === 'REVIEW_CRAFT_PING') {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.get(['pendingReview'], (res) => {
            announcePresence({ currentPending: res?.pendingReview || null });
          });
        } else {
          announcePresence();
        }
      } catch (e) {
        announcePresence();
      }
    }
  });

  // Listen for storage changes and broadcast to React web app
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.pendingReview?.newValue) {
          try {
            window.postMessage({
              type: 'REVIEW_CRAFT_STORAGE_UPDATED',
              payload: changes.pendingReview.newValue
            }, '*');
          } catch (e) {}
        }
      });
    }
  } catch (e) {}

  announcePresence();
  setTimeout(announcePresence, 400);
})();
