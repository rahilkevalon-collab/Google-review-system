/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script
 * Runs on *://*.google.com/*
 * Automatically detects Google Review modal, populates the review text, and selects stars.
 */

(function () {
  console.log('[ReviewCraft] Google content script loaded on:', window.location.href);

  // Check if there is a pending review waiting to be filled
  chrome.storage.local.get(['pendingReview'], (res) => {
    const pending = res.pendingReview;
    if (!pending || !pending.text) {
      return;
    }

    // Ignore if pending review is older than 3 minutes (180 seconds)
    const ageMs = Date.now() - (pending.timestamp || 0);
    if (ageMs > 180000) {
      console.log('[ReviewCraft] Pending review expired (>3 mins). Skipping.');
      chrome.storage.local.remove(['pendingReview']);
      return;
    }

    console.log('[ReviewCraft] Active pending review found:', pending);
    startAutoFillObserver(pending);
  });

  function startAutoFillObserver(pending) {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 350ms = ~21 seconds max waiting time
    let filled = false;

    const intervalId = setInterval(() => {
      attempts++;
      if (filled || attempts > maxAttempts) {
        clearInterval(intervalId);
        if (!filled) {
          console.log('[ReviewCraft] Timed out waiting for Google Review modal elements.');
        }
        return;
      }

      // Check if the review textarea and stars exist in DOM
      const success = attemptFill(pending);
      if (success) {
        filled = true;
        clearInterval(intervalId);
        console.log('[ReviewCraft] Successfully auto-filled review text and stars!');
        
        // Show success notification inside Google page
        showFloatingSuccessBadge(pending.rating);

        // Clear pending review so it doesn't trigger again
        chrome.storage.local.remove(['pendingReview']);
      }
    }, 350);
  }

  function attemptFill(pending) {
    const targetRating = Number(pending.rating) || 5;
    const reviewText = pending.text;

    // 1. Locate the Review Textarea
    const textarea = findReviewTextarea();
    // 2. Locate the Star Rating elements
    const starElement = findStarElement(targetRating);

    // If neither exists yet, modal is still loading
    if (!textarea && !starElement) {
      return false;
    }

    let textSet = false;
    let starClicked = false;

    // A. Populate Textarea
    if (textarea) {
      textSet = setReviewText(textarea, reviewText);
    }

    // B. Select Stars
    if (starElement) {
      starClicked = clickStar(starElement);
    }

    return textSet && starClicked;
  }

  function findReviewTextarea() {
    // Selectors for Google Review dialog text input across Search (#lrd) and Maps
    const selectors = [
      'textarea[placeholder*="experience" i]',
      'textarea[aria-label*="experience" i]',
      'textarea[data-placeholder*="experience" i]',
      'textarea[aria-label*="review" i]',
      'textarea[placeholder*="review" i]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="experience" i]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) {
        return el;
      }
    }
    return null;
  }

  function setReviewText(el, text) {
    try {
      el.focus();

      if (el.tagName === 'TEXTAREA' || 'value' in el) {
        // Try insertText first to trigger internal React/Closure listeners
        document.execCommand('selectAll', false, null);
        const execSuccess = document.execCommand('insertText', false, text);
        
        if (!execSuccess || el.value !== text) {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }
      } else {
        // Contenteditable div
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
      }

      console.log('[ReviewCraft] Review text entered into Google box.');
      return true;
    } catch (e) {
      console.warn('[ReviewCraft] Error setting textarea value:', e);
      return false;
    }
  }

  function findStarElement(targetRating) {
    // 1. Look for role="radio" with aria-posinset (e.g. aria-posinset="5")
    const posStar = document.querySelector(`[role="radio"][aria-posinset="${targetRating}"]`);
    if (posStar && isVisible(posStar)) return posStar;

    // 2. Look for role="radio" with aria-label matching target rating
    const ariaStars = Array.from(document.querySelectorAll('[role="radio"]')).filter(el => {
      const label = (el.getAttribute('aria-label') || '').toLowerCase();
      return label.includes(`${targetRating} star`) || label.includes(`rate ${targetRating}`) || label.includes(`${targetRating} of 5`);
    });
    if (ariaStars.length > 0 && isVisible(ariaStars[0])) return ariaStars[0];

    // 3. Look for radio group containing 5 stars
    const radiogroup = document.querySelector('[role="radiogroup"]');
    if (radiogroup) {
      const radioItems = Array.from(radiogroup.querySelectorAll('[role="radio"]'));
      if (radioItems.length >= 5 && isVisible(radioItems[0])) {
        const starIndex = Math.max(0, Math.min(4, targetRating - 1));
        return radioItems[starIndex];
      }
    }

    // 4. Look for all visible role="radio" items
    const allRadios = Array.from(document.querySelectorAll('[role="radio"]')).filter(isVisible);
    if (allRadios.length >= 5) {
      const starIndex = Math.max(0, Math.min(4, targetRating - 1));
      return allRadios[starIndex];
    }

    // 5. Look for data-rating attributes
    const dataStar = document.querySelector(`[data-rating="${targetRating}"]`);
    if (dataStar && isVisible(dataStar)) return dataStar;

    return null;
  }

  function clickStar(el) {
    try {
      el.focus();
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      el.click();
      console.log('[ReviewCraft] Star element clicked successfully.');
      return true;
    } catch (e) {
      console.warn('[ReviewCraft] Error clicking star:', e);
      return false;
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  }

  function showFloatingSuccessBadge(rating) {
    try {
      const existing = document.getElementById('reviewcraft-success-pill');
      if (existing) existing.remove();

      const pill = document.createElement('div');
      pill.id = 'reviewcraft-success-pill';
      pill.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999999;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 9999px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        animation: rcFadeIn 0.3s ease-out;
      `;

      pill.innerHTML = `
        <span style="font-size: 16px;">✨</span>
        <span>ReviewCraft Auto-Filled: Review text & ${rating} Stars populated!</span>
      `;

      document.body.appendChild(pill);

      setTimeout(() => {
        pill.style.transition = 'opacity 0.5s ease';
        pill.style.opacity = '0';
        setTimeout(() => pill.remove(), 500);
      }, 4500);
    } catch (e) {
      console.warn('[ReviewCraft] Could not render floating badge:', e);
    }
  }
})();
