/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script
 * Runs on *://*.google.com/*
 * Automatically targets Google's Review Modal for ANY company:
 * - If review modal isn't open yet, automatically finds and clicks the "Write a review" button or #lrd= link on Google.
 * - Once review modal is open, populates the review text and clicks the target star rating.
 */

(function () {
  console.log('[ReviewCraft] Google review content script initialized in frame:', window.location.href);

  // Actively remove any leftover notification pill from DOM if present
  try {
    const existingPill = document.getElementById('reviewcraft-success-pill');
    if (existingPill) existingPill.remove();
  } catch (e) {}

  let pending = null;
  let observerStarted = false;

  // Function to inspect storage for pending review
  function checkAndStart() {
    if (observerStarted) return;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['pendingReview'], (res) => {
          if (chrome.runtime?.lastError || !res) return;
          const storagePending = res.pendingReview;
          if (storagePending && storagePending.text) {
            const ageMs = Date.now() - (storagePending.timestamp || 0);
            if (ageMs <= 300000) { // Valid for 5 minutes
              pending = storagePending;
              if (!observerStarted) {
                observerStarted = true;
                console.log('[ReviewCraft] Found pending review to auto-fill:', pending);
                cleanUpGoogleSearchBar(pending.text);
                startObserver(pending);
              }
            }
          }
        });
      }
    } catch (e) {}
  }

  // 1. Initial check
  checkAndStart();

  // 2. Poll storage in first 4 seconds in case storage write was still in flight
  let pollAttempts = 0;
  const pollInterval = setInterval(() => {
    pollAttempts++;
    if (observerStarted || pollAttempts > 16) {
      clearInterval(pollInterval);
      return;
    }
    checkAndStart();
  }, 250);

  function cleanUpGoogleSearchBar(reviewText) {
    try {
      const searchInputs = document.querySelectorAll('textarea[name="q"], #APjFqb, .gLFyf');
      for (const input of searchInputs) {
        if (input && input.value && input.value.length > 25) {
          const sample = reviewText.substring(0, 20);
          if (input.value.includes(sample)) {
            console.log('[ReviewCraft] Cleaning up review text from main Google search bar.');
            input.value = '';
          }
        }
      }
    } catch (e) {}
  }

  function startObserver(pending) {
    let attempts = 0;
    const maxAttempts = 90; // ~31 seconds
    let textDone = false;
    let starDone = false;
    let triggerAttemptCount = 0;
    const targetRating = Number(pending.rating) || 5;
    const reviewText = pending.text;

    const intervalId = setInterval(() => {
      attempts++;
      if ((textDone && starDone) || attempts > maxAttempts) {
        clearInterval(intervalId);
        return;
      }

      // 1. Locate review dialog
      const dialog = findReviewDialog();

      // If the review dialog is NOT open yet, automatically find and click the "Write a review" button / #lrd link on the Google page!
      if (!dialog && triggerAttemptCount < 20) {
        triggerAttemptCount++;
        tryOpenReviewDialog();
      }

      // 2. Populate text if dialog or textarea exists and not already done
      if (!textDone) {
        const textarea = findReviewTextarea(dialog);
        if (textarea) {
          textDone = populateText(textarea, reviewText);
        }
      }

      // 3. Click stars if dialog or star element exists and not already done
      if (!starDone) {
        const starElement = findStarElement(dialog, targetRating);
        if (starElement) {
          starDone = clickStarElement(starElement);
        }
      }

      // Once completed successfully
      if (textDone && starDone) {
        clearInterval(intervalId);
        console.log('[ReviewCraft] Review text & stars successfully auto-filled into Google!');

        // Safely clear pending review from storage
        try {
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(['pendingReview'], () => {
              if (chrome.runtime?.lastError) {}
            });
          }
        } catch (e) {}
      }
    }, 350);
  }

  /**
   * Automatically finds and triggers Google's "Write a review" button or link
   * when opening a generic business Google Search or Google Maps page.
   */
  function tryOpenReviewDialog() {
    try {
      // Strategy 1: Look for any anchor tag with #lrd= containing ',3,' (direct review modal action code)
      const allLinks = Array.from(document.querySelectorAll('a[href*="lrd="]'));
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        if (href.includes(',3,') || href.includes(',3,,') || /review/i.test(a.innerText || '')) {
          console.log('[ReviewCraft] Found LRD review link on page! Triggering review modal:', href);
          const hashIdx = href.indexOf('#lrd=');
          if (hashIdx !== -1) {
            window.location.hash = href.substring(hashIdx);
          }
          a.click();
          return true;
        }
      }

      // Strategy 2: Look for button or clickable element with data-async-trigger="reviewDialog"
      const asyncTriggers = document.querySelectorAll(
        '[data-async-trigger="reviewDialog"], [data-async-trigger*="review" i], [data-async-context*="review" i]'
      );
      for (const el of asyncTriggers) {
        if (isVisible(el)) {
          console.log('[ReviewCraft] Found async review trigger button! Clicking...');
          el.click();
          return true;
        }
      }

      // Strategy 3: Text match for "Write a review" / "Rate and review" across buttons and links
      const clickables = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
      for (const el of clickables) {
        if (!isVisible(el)) continue;
        const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
        if (
          /^(write a review|rate and review|leave a review|add a review|રિવ્યુ લખો|રિવ્યુ આપો|रिव्यू लिखें)$/i.test(text) ||
          (text.length < 35 && /write a review|rate and review/i.test(text))
        ) {
          console.log('[ReviewCraft] Found "Write a review" button! Clicking:', text);
          el.click();
          return true;
        }
      }

      // Strategy 4: Google Maps Write a review button
      const mapsReviewBtn = document.querySelector(
        'button[aria-label*="Write a review" i], button[data-value="Write a review"], button[data-item-id="write-a-review"]'
      );
      if (mapsReviewBtn && isVisible(mapsReviewBtn)) {
        console.log('[ReviewCraft] Found Google Maps review button! Clicking...');
        mapsReviewBtn.click();
        return true;
      }
    } catch (e) {}
    return false;
  }

  function findReviewDialog() {
    const dialogSelectors = [
      '[role="dialog"]',
      '[aria-modal="true"]',
      'g-dialog',
      '.modal-dialog',
      'div.review-dialog'
    ];

    for (const sel of dialogSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const d of candidates) {
        if (isVisible(d)) {
          const txt = (d.innerText || '').toLowerCase();
          if (txt.includes('experience') || txt.includes('post') || txt.includes('photos and videos')) {
            return d;
          }
        }
      }
    }

    const allDivs = document.querySelectorAll('div');
    for (const d of allDivs) {
      if (isVisible(d)) {
        const text = (d.innerText || '');
        if (text.includes('Share details of your own experience') && text.includes('Post')) {
          return d;
        }
      }
    }

    return null;
  }

  function findReviewTextarea(dialog) {
    const root = dialog || document;
    const candidates = Array.from(root.querySelectorAll('textarea, div[role="textbox"], div[contenteditable="true"]'));

    for (const el of candidates) {
      // 100% EXCLUDE the Google Search bar
      if (el.name === 'q' || el.id === 'APjFqb' || el.classList.contains('gLFyf')) {
        continue;
      }
      if (el.getAttribute('aria-label') === 'Search' || el.getAttribute('title') === 'Search') {
        continue;
      }

      if (isVisible(el)) {
        const placeholder = (
          el.getAttribute('placeholder') || 
          el.getAttribute('aria-label') || 
          el.getAttribute('data-placeholder') || 
          ''
        ).toLowerCase();

        if (
          placeholder.includes('experience') || 
          placeholder.includes('share details') || 
          placeholder.includes('review') ||
          (dialog && dialog.contains(el))
        ) {
          return el;
        }
      }
    }

    return null;
  }

  function populateText(el, text) {
    try {
      el.focus();
      el.click();

      // 1. Native Property Setter for React/Angular/Closure forms
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }

      // 2. Dispatch events
      el.dispatchEvent(new Event('focus', { bubbles: true }));
      el.dispatchEvent(new Event('keydown', { bubbles: true, key: ' ' }));
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true, key: ' ' }));

      // 3. Document execCommand fallback
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);

      // 4. Contenteditable div fallback
      if (el.tagName !== 'TEXTAREA' && el.isContentEditable) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function findStarElement(dialog, targetRating) {
    const root = dialog || document;

    // 1. Look for radio items with aria-posinset (e.g. aria-posinset="5")
    const posRadios = root.querySelectorAll(`[role="radio"][aria-posinset="${targetRating}"]`);
    for (const r of posRadios) {
      if (isVisible(r)) return r;
    }

    // 2. Look for role="radio" items
    const allRadios = Array.from(root.querySelectorAll('[role="radio"]')).filter(isVisible);
    if (allRadios.length >= 5) {
      const idx = Math.max(0, Math.min(4, targetRating - 1));
      return allRadios[idx];
    }

    // 3. Look for aria-label with star count
    const ariaStars = Array.from(root.querySelectorAll('[aria-label*="star" i], [aria-label*="Star" i]')).filter(el => {
      return isVisible(el) && el.tagName !== 'TEXTAREA';
    });
    if (ariaStars.length >= 5) {
      const idx = Math.max(0, Math.min(4, targetRating - 1));
      return ariaStars[idx];
    }

    // 4. Search for the row of 5 star SVGs inside the review dialog
    const allSvgs = Array.from(root.querySelectorAll('svg')).filter(isVisible);
    const starSvgs = allSvgs.filter(svg => {
      const paths = Array.from(svg.querySelectorAll('path'));
      return paths.some(p => {
        const d = p.getAttribute('d') || '';
        return d.includes('17.27') || d.includes('9.24') || d.includes('21l') || d.includes('12 2');
      });
    });

    if (starSvgs.length >= 5) {
      const idx = Math.max(0, Math.min(4, targetRating - 1));
      const targetSvg = starSvgs[idx];
      return targetSvg.closest('button, [role="radio"], div[tabindex], span[tabindex]') || targetSvg.parentElement || targetSvg;
    }

    return null;
  }

  function clickStarElement(el) {
    try {
      el.focus();

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const opts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: cx,
        clientY: cy
      };

      el.dispatchEvent(new PointerEvent('pointerover', opts));
      el.dispatchEvent(new MouseEvent('mouseover', opts));
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.click();

      console.log('[ReviewCraft] Clicked star rating element.');
      return true;
    } catch (e) {
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
})();
