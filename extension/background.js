/**
 * ReviewCraft Chrome Extension - Background Service Worker
 * Coordinates review payloads between ReviewCraft Web App and Google Review modals.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ReviewCraft] Extension successfully installed and initialized.');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        console.log('[ReviewCraft] Saved pending review to extension storage:', payload);
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    }
  }

  if (message.action === 'CLEAR_PENDING_REVIEW') {
    chrome.storage.local.remove(['pendingReview'], () => {
      console.log('[ReviewCraft] Cleared pending review from extension storage.');
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
});
