/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script
 * Runs on *://*.google.com/*
 * Automatically targets Google's Review Modal (never the main search bar),
 * fills the review text, and clicks the star rating.
 */

(function () {
  console.log('[ReviewCraft] Google review content script initialized in frame:', window.location.href);

  // 1. Check URL parameters for direct ReviewCraft payload (rc_r = rating, rc_t = review text)
  let pending = null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('rc_t')) {
      pending = {
        text: searchParams.get('rc_t') || '',
        rating: Number(searchParams.get('rc_r')) || 5,
        timestamp: Date.now()
      };
      console.log('[ReviewCraft] Loaded review payload directly from URL query parameters:', pending);
    } else if (window.location.hash && window.location.hash.includes('rc_t=')) {
      const hashStr = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashStr.includes('&') ? hashStr.substring(hashStr.indexOf('&') + 1) : hashStr);
      if (hashParams.has('rc_t')) {
        pending = {
          text: hashParams.get('rc_t') || '',
          rating: Number(hashParams.get('rc_r')) || 5,
          timestamp: Date.now()
        };
        console.log('[ReviewCraft] Loaded review payload from URL hash parameters:', pending);
      }
    }
  } catch (e) {
    console.warn('[ReviewCraft] Error reading URL parameters:', e);
  }

  if (pending && pending.text) {
    cleanUpGoogleSearchBar(pending.text);
    startObserver(pending);
  } else {
    // 2. Fallback to chrome.storage.local
    chrome.storage.local.get(['pendingReview'], (res) => {
      const storagePending = res.pendingReview;
      if (!storagePending || !storagePending.text) {
        return;
      }

      const ageMs = Date.now() - (storagePending.timestamp || 0);
      if (ageMs > 180000) {
        console.log('[ReviewCraft] Storage pending review expired (>3 mins). Skipping.');
        chrome.storage.local.remove(['pendingReview']);
        return;
      }

      console.log('[ReviewCraft] Found storage pending review for Google:', storagePending);
      cleanUpGoogleSearchBar(storagePending.text);
      startObserver(storagePending);
    });
  }

  function cleanUpGoogleSearchBar(reviewText) {
    try {
      const searchInputs = document.querySelectorAll('textarea[name="q"], #APjFqb, .gLFyf');
      for (const input of searchInputs) {
        if (input && input.value && input.value.length > 30) {
          const sample = reviewText.substring(0, 20);
          if (input.value.includes(sample)) {
            console.log('[ReviewCraft] Cleaning up review text from main Google search bar.');
            input.value = '';
          }
        }
      }
    } catch (e) {
      console.warn('[ReviewCraft] Search bar cleanup error:', e);
    }
  }

  function startObserver(pending) {
    let attempts = 0;
    const maxAttempts = 75; // ~26 seconds max
    let isFilled = false;

    const intervalId = setInterval(() => {
      attempts++;
      if (isFilled || attempts > maxAttempts) {
        clearInterval(intervalId);
        return;
      }

      const success = attemptFillReview(pending);
      if (success) {
        isFilled = true;
        clearInterval(intervalId);
        console.log('[ReviewCraft] Review text & stars successfully auto-filled into Google!');

        // Clear pending review from storage
        chrome.storage.local.remove(['pendingReview']);
      }
    }, 350);
  }

  function attemptFillReview(pending) {
    const targetRating = Number(pending.rating) || 5;
    const reviewText = pending.text;

    // 1. Locate the Review Modal dialog
    const dialog = findReviewDialog();

    // 2. Locate the Review Textarea inside the dialog (never the search bar)
    const textarea = findReviewTextarea(dialog);

    // 3. Locate the Star Rating element inside the dialog
    const starElement = findStarElement(dialog, targetRating);

    // If modal elements aren't ready yet, keep waiting
    if (!textarea && !starElement) {
      return false;
    }

    let textSet = false;
    let starSet = false;

    // A. Fill Text
    if (textarea) {
      textSet = populateText(textarea, reviewText);
    }

    // B. Select Stars
    if (starElement) {
      starSet = clickStarElement(starElement);
    }

    return textSet && starSet;
  }

  function findReviewDialog() {
    // Look for dialog wrappers
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
          // Check that this is the review dialog (contains "experience" or "post" or "cancel")
          const txt = (d.innerText || '').toLowerCase();
          if (txt.includes('experience') || txt.includes('post') || txt.includes('photos and videos')) {
            return d;
          }
        }
      }
    }

    // Fallback: look for container containing the placeholder or text
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

        // Check if placeholder matches Google's review textarea
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
      console.warn('[ReviewCraft] Error filling text:', e);
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
      console.warn('[ReviewCraft] Error clicking star element:', e);
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
