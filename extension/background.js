/**
 * ReviewCraft Chrome Extension - Background Service Worker
 * Coordinates review payloads between ReviewCraft Web App and Google Review modals.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ReviewCraft] Extension successfully installed and initialized.');
});

// Listen for messages from content scripts with safe error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!message || !message.action) {
      sendResponse({ success: false });
      return false;
    }

    if (message.action === 'SET_PENDING_REVIEW') {
      const payload = message.payload;
      if (payload && payload.text) {
        chrome.storage.local.set({
          pendingReview: {
            text: payload.text,
            rating: Number(payload.rating) || 5,
            companyName: payload.companyName || '',
            timestamp: Date.now()
          }
        }, () => {
          sendResponse({ success: true });
        });
        return true; // Keep message channel open for async response
      }
      sendResponse({ success: false, reason: 'Invalid payload' });
      return false;
    }

    if (message.action === 'CLEAR_PENDING_REVIEW') {
      chrome.storage.local.remove(['pendingReview'], () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.action === 'GET_PENDING_REVIEW') {
      chrome.storage.local.get(['pendingReview'], (result) => {
        sendResponse({ success: true, data: result.pendingReview || null });
      });
      return true;
    }

    sendResponse({ success: false });
    return false;
  } catch (err) {
    sendResponse({ success: false, error: err.message });
    return false;
  }
});
