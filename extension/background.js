/**
 * ReviewCraft Chrome Extension - Background Service Worker (Manifest V3)
 * Handles lifecycle, message coordination, and storage persistence.
 * 
 * Complies with Manifest V3 service worker rules:
 * - Top-level synchronous listener registration
 * - Restores state from chrome.storage.local on restart
 * - Asynchronous message handling returns true correctly
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ReviewCraft SW] Extension installed/updated:', details.reason);
  chrome.storage.local.get(['pendingReview'], (res) => {
    if (!res.pendingReview) {
      chrome.storage.local.set({
        extensionVersion: '1.1.3',
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

      const version = Number(payload.version) || Number(payload.timestamp) || Date.now();
      const reviewRecord = {
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
        source: String(payload.source || 'manual'),
        status: String(payload.status || 'ready'),
        applied: false,
        updatedAt: Date.now()
      };

      chrome.storage.local.set({
        pendingReview: reviewRecord,
        lastSyncedReview: reviewRecord,
        lastSyncTimestamp: Date.now()
      }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[ReviewCraft SW] Updated pending review in storage:', reviewRecord.companyName, 'v=' + version);
          sendResponse({ success: true, data: reviewRecord });
        }
      });
      return true; // Keep channel open for async response
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
            sendResponse({ success: true, data: updated });
          });
        } else {
          sendResponse({ success: false, reason: 'No pending review to mark applied' });
        }
      });
      return true;
    }

    if (message.action === 'GET_STATUS') {
      chrome.storage.local.get(['pendingReview', 'lastSyncTimestamp', 'lastAppliedReview'], (res) => {
        sendResponse({
          success: true,
          version: '1.1.3',
          pendingReview: res.pendingReview || null,
          lastSyncTimestamp: res.lastSyncTimestamp || null,
          lastAppliedReview: res.lastAppliedReview || null
        });
      });
      return true;
    }

    sendResponse({ success: false, error: 'Unknown action: ' + message.action });
    return false;
  } catch (err) {
    console.error('[ReviewCraft SW] Error handling message:', err);
    sendResponse({ success: false, error: err.message });
    return false;
  }
});
