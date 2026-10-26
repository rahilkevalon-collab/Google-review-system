/**
 * ReviewCraft Chrome Extension - Web App Content Script Bridge
 * Runs on website pages (e.g. localhost, local network, production domains).
 * 
 * Captures review text & rating events dispatched by the ReviewCraft React App.
 * Writes directly to chrome.storage.local for instantaneous synchronization,
 * eliminating service worker wake-up latency and race conditions.
 */

(function () {
  'use strict';

  // Safeguard: only initialize once per page context
  if (window.__reviewCraftWebappBridgeInjected) return;
  window.__reviewCraftWebappBridgeInjected = true;

  console.log('[ReviewCraft Bridge] Initialized on', window.location.href);

  // Announce extension presence to the webapp window
  function announcePresence() {
    try {
      window.postMessage({
        type: 'REVIEW_CRAFT_EXTENSION_AVAILABLE',
        version: '1.0.9',
        timestamp: Date.now()
      }, '*');
    } catch (e) {}
  }

  // Format a clean, normalized review record
  function normalizeReviewPayload(payload, forcedStatus) {
    if (!payload || !payload.text) return null;
    return {
      companyId: payload.companyId || '',
      companyName: payload.companyName || '',
      companyLocation: payload.companyLocation || '',
      googlePlaceId: payload.googlePlaceId || '',
      googleReviewUrl: payload.googleReviewUrl || '',
      reviewId: payload.reviewId || '',
      text: String(payload.text).trim(),
      rating: Math.round(Number(payload.rating)) || 5,
      keyword: payload.keyword || '',
      timestamp: payload.timestamp || Date.now(),
      source: payload.source || 'sync',
      status: forcedStatus || payload.status || 'synced',
      applied: false
    };
  }

  // Listen for messages dispatched by ReviewCraft React App
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;

    const { type, payload } = event.data;

    // 1. Review Sync or AutoFill trigger
    if (type === 'REVIEW_CRAFT_SYNC' || type === 'REVIEW_CRAFT_AUTOFILL') {
      const forcedStatus = type === 'REVIEW_CRAFT_AUTOFILL' ? 'ready' : 'synced';
      const record = normalizeReviewPayload(payload, forcedStatus);
      if (!record) return;

      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          // Direct, instantaneous write to chrome.storage.local
          chrome.storage.local.set({
            pendingReview: record,
            lastSyncedReview: record,
            lastSyncTimestamp: Date.now()
          }, () => {
            if (chrome.runtime?.lastError) {
              console.warn('[ReviewCraft Bridge] Storage write error:', chrome.runtime.lastError.message);
            } else {
              console.log('[ReviewCraft Bridge] Synced review to extension storage:', {
                company: record.companyName,
                rating: record.rating + '★',
                source: record.source,
                status: record.status
              });

              // Send acknowledgment back to window
              try {
                window.postMessage({
                  type: 'REVIEW_CRAFT_SYNC_ACK',
                  success: true,
                  reviewId: record.reviewId,
                  status: record.status,
                  timestamp: Date.now()
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
                // Ignore sleeping service worker; storage is already written
              }
            });
          }
        }
      } catch (err) {
        console.warn('[ReviewCraft Bridge] Error saving review to extension:', err);
      }
    }

    // 2. Ping request from webapp
    if (type === 'REVIEW_CRAFT_PING') {
      announcePresence();
    }
  });

  // Listen to chrome.storage.onChanged to broadcast updates back to the webapp in real time
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

  // Announce presence on startup
  announcePresence();
  setTimeout(announcePresence, 600);
})();
