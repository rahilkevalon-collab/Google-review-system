/**
 * ReviewCraft Chrome Extension - Web App Content Script
 * Runs on http://localhost/* and http://127.0.0.1/*
 * Captures review text & rating events dispatched by ReviewCraft React App.
 */

(function () {
  console.log('[ReviewCraft Extension] WebApp bridge connected.');

  // Notify web app that the extension is installed and active
  window.postMessage({
    type: 'REVIEW_CRAFT_EXTENSION_AVAILABLE',
    version: '1.0.0',
    status: 'ACTIVE'
  }, '*');

  // Listen for review autofill triggers from the web app
  window.addEventListener('message', (event) => {
    // Only accept messages from the current window
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'REVIEW_CRAFT_AUTOFILL' && event.data.payload) {
      console.log('[ReviewCraft Extension] Received review autofill payload:', event.data.payload);
      
      chrome.runtime.sendMessage({
        action: 'SET_PENDING_REVIEW',
        payload: event.data.payload
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[ReviewCraft Extension] Error saving review payload:', chrome.runtime.lastError);
        } else {
          console.log('[ReviewCraft Extension] Review payload primed for Google Review auto-fill!');
        }
      });
    }
  });
})();
