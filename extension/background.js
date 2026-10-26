/**
 * ReviewCraft Chrome Extension - Background Service Worker (Manifest V3)
 * Coordinates review payloads between ReviewCraft Web App and Google Review modals.
 * 
 * Complies with Manifest V3 service worker lifecycle:
 * - Registers top-level synchronous listeners
 * - Avoids volatile in-memory global state
 * - Persists all review state in chrome.storage.local
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ReviewCraft SW] Extension installed or updated:', details.reason);
  chrome.storage.local.get(['pendingReview'], (res) => {
    if (!res.pendingReview) {
      chrome.storage.local.set({
        extensionVersion: '1.0.9',
        initializedAt: Date.now()
      });
    }
  });
});

// Top-level synchronous message listener registration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    sendResponse({ success: false, error: 'No action provided' });
    return false;
  }

  try {
    if (message.action === 'SET_PENDING_REVIEW') {
      const payload = message.payload;
      if (!payload || !payload.text) {
        sendResponse({ success: false, reason: 'Invalid review payload' });
        return false;
      }

      const reviewRecord = {
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
        source: payload.source || 'manual',
        status: payload.status || 'ready',
        applied: false
      };

      chrome.storage.local.set({
        pendingReview: reviewRecord,
        lastSyncedReview: reviewRecord,
        lastSyncTimestamp: Date.now()
      }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[ReviewCraft SW] Set pending review in storage:', reviewRecord.companyName);
          sendResponse({ success: true, data: reviewRecord });
        }
      });
      return true; // Keep message channel open for async callback
    }

    if (message.action === 'GET_PENDING_REVIEW') {
      chrome.storage.local.get(['pendingReview'], (res) => {
        sendResponse({ success: true, data: res.pendingReview || null });
      });
      return true;
    }

    if (message.action === 'CLEAR_PENDING_REVIEW') {
      chrome.storage.local.remove(['pendingReview'], () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.action === 'MARK_APPLIED') {
      chrome.storage.local.get(['pendingReview'], (res) => {
        if (res.pendingReview) {
          const updated = {
            ...res.pendingReview,
            applied: true,
            appliedTimestamp: Date.now(),
            status: 'applied'
          };
          chrome.storage.local.set({
            pendingReview: updated,
            lastAppliedReview: updated
          }, () => {
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false });
        }
      });
      return true;
    }

    if (message.action === 'GET_STATUS') {
      chrome.storage.local.get(['pendingReview', 'lastSyncTimestamp', 'lastAppliedReview'], (res) => {
        sendResponse({
          success: true,
          version: '1.0.9',
          pendingReview: res.pendingReview || null,
          lastSyncTimestamp: res.lastSyncTimestamp || null,
          lastAppliedReview: res.lastAppliedReview || null
        });
      });
      return true;
    }

    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  } catch (err) {
    console.error('[ReviewCraft SW] Listener error:', err);
    sendResponse({ success: false, error: err.message });
    return false;
  }
});
