/**
 * ReviewCraft Chrome Extension - Web App Content Script
 * Captures review text & rating events dispatched by ReviewCraft React App.
 */

(function () {
  try {
    // Listen for review autofill triggers from the web app
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === 'REVIEW_CRAFT_AUTOFILL' && event.data.payload) {
        try {
          if (!chrome.runtime?.id) return;
          chrome.runtime.sendMessage({
            action: 'SET_PENDING_REVIEW',
            payload: event.data.payload
          }, () => {
            // Check runtime.lastError to prevent uncaught error logging in Chrome
            if (chrome.runtime?.lastError) {
              // Silently handled
            }
          });
        } catch (err) {}
      }
    });
  } catch (e) {}
})();
