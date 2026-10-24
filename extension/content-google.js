/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script
 * Runs on *://*.google.com/*
 * Automatically targets Google's Review Modal for ANY company:
 * - If review modal isn't open yet, automatically finds and clicks the "Write a review" button or #lrd= link on Google ONCE.
 * - Prevents multiple clicks to avoid screen blinking/flickering.
 * - Once review modal is open, populates the review text and clicks the target star rating.
 */

(function () {
  const isTopFrame = window.top === window;
  console.log('[ReviewCraft] Google review content script initialized in frame (isTopFrame=' + isTopFrame + '):', window.location.href);

  // Actively remove any leftover notification pill from DOM if present
  try {
    const existingPill = document.getElementById('reviewcraft-success-pill');
    if (existingPill) existingPill.remove();
  } catch (e) {}

  let pending = null;
  let observerStarted = false;
  let hasTriggeredOpen = false;
  let hasClickedListingCard = false;
  let hasClickedTab = false;

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
                if (isTopFrame) {
                  cleanUpGoogleSearchBar(pending.text);
                }
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
    const maxAttempts = 100; // ~35 seconds
    let textDone = false;
    let starDone = false;
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

      // If review modal is NOT open or triggered yet, trigger it ONCE (Top frame only)
      if (isTopFrame && !dialog && !hasTriggeredOpen) {
        tryOpenReviewDialog();
      }

      // If on a regular Google search page and after ~3s no dialog exists (AI overview blocker), forward to Google Maps
      if (isTopFrame && !dialog && !hasTriggeredOpen && attempts > 8 && window.location.href.includes('/search') && !window.location.hash.includes('lrd=')) {
        console.log('[ReviewCraft] Search page has no review modal (AI Overview). Auto-forwarding to Google Maps...');
        clearInterval(intervalId);
        const comp = pending.companyName || '';
        window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(comp)}`;
        return;
      }

      // 2. Look for star element and click it (Try stars first or in parallel)
      if (!starDone) {
        const starElement = findStarElement(dialog, targetRating);
        if (starElement) {
          starDone = clickStarElement(starElement);
        }
      }

      // 3. Look for textarea and populate text
      if (!textDone) {
        const textarea = findReviewTextarea(dialog);
        if (textarea) {
          textDone = populateText(textarea, reviewText);
        }
      }

      // 4. Once completed successfully
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
   * Checks whether a review dialog, modal overlay, or review iframe is already in the DOM.
   */
  function isReviewModalPresent() {
    const modalSelectors = [
      'div[role="dialog"]',
      'dialog',
      '[aria-modal="true"]',
      'iframe[src*="review" i]',
      'iframe[title*="review" i]',
      'g-dialog',
      '.modal-dialog',
      'div.review-dialog'
    ];
    for (const sel of modalSelectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Automatically finds and triggers Google's "Write a review" button or link
   * when opening a generic business Google Search or Google Maps page.
   * Runs STRICTLY ONCE in the top frame to prevent screen blinking/flickering.
   */
  function tryOpenReviewDialog() {
    // Only top frame should ever initiate opening actions
    if (!isTopFrame) return false;

    // If already triggered or if the modal is already present, DO NOT CLICK AGAIN
    if (hasTriggeredOpen || isReviewModalPresent()) {
      return false;
    }

    try {
      // Strategy 1: Look for any anchor tag with #lrd= containing ',3,' (direct review modal action code)
      const allLinks = Array.from(document.querySelectorAll('a[href*="lrd="]'));
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        if (href.includes(',3,') || href.includes(',3,,') || /review/i.test(a.innerText || '')) {
          console.log('[ReviewCraft] Found LRD review link! Triggering modal once:', href);
          hasTriggeredOpen = true;
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
          console.log('[ReviewCraft] Found async review trigger button! Clicking once...');
          hasTriggeredOpen = true;
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
          console.log('[ReviewCraft] Found "Write a review" button! Clicking once:', text);
          hasTriggeredOpen = true;
          el.click();
          return true;
        }
      }

      // Strategy 4: If on Google Maps results list (multi-branch list like Amazon), auto-click the 1st place card ONCE
      if (window.location.href.includes('/maps')) {
        if (!hasClickedListingCard) {
          const firstCard = document.querySelector('a.hfpxzc, div[role="feed"] a[href*="/maps/place/"], div[role="article"] a');
          if (firstCard && isVisible(firstCard)) {
            hasClickedListingCard = true;
            console.log('[ReviewCraft] Auto-clicking first business listing card in Google Maps...');
            firstCard.focus();
            firstCard.click();
            firstCard.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            firstCard.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            return true;
          }
        }

        // Strategy 5: Look for Reviews tab to reveal Write a review if collapsed
        if (!hasClickedTab) {
          const reviewsTab = Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"]')).find(el => {
            if (!isVisible(el)) return false;
            const t = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
            return t.includes('reviews') && !t.includes('write');
          });
          if (reviewsTab) {
            hasClickedTab = true;
            console.log('[ReviewCraft] Switching to Reviews tab on Google Maps...');
            reviewsTab.click();
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  /**
   * Retrieves all candidate root scopes (document, dialog, same-origin child iframes).
   */
  function getCandidateRoots(dialog) {
    const roots = [];
    if (dialog) roots.push(dialog);
    roots.push(document);

    const searchScope = dialog || document;
    try {
      const iframes = searchScope.querySelectorAll('iframe');
      for (const f of iframes) {
        try {
          if (f.contentDocument && f.contentDocument.body) {
            roots.push(f.contentDocument);
          }
        } catch (e) {
          // Cross-origin: the iframe's own content-google.js script handles it directly
        }
      }
    } catch (e) {}

    return roots;
  }

  function findReviewDialog() {
    // If inside a child iframe, the document/body itself is the review dialog context
    if (!isTopFrame) {
      const body = document.body;
      if (body && (document.querySelector('textarea, div[role="textbox"], [role="radio"]') ||
          (document.body.innerText || '').toLowerCase().includes('post') ||
          (document.body.innerText || '').toLowerCase().includes('review'))) {
        return body;
      }
    }

    const dialogSelectors = [
      'div[role="dialog"]',
      'dialog',
      '[aria-modal="true"]',
      'g-dialog',
      '.modal-dialog',
      'div.review-dialog'
    ];

    for (const sel of dialogSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const d of candidates) {
        if (!isVisible(d)) continue;

        // Check 1: Contains review textarea, textbox, or star radios
        if (d.querySelector('textarea, div[role="textbox"], div[contenteditable="true"], [role="radio"], [role="radiogroup"]')) {
          return d;
        }

        // Check 2: Contains an iframe (Google Maps review modal iframe container)
        if (d.querySelector('iframe')) {
          return d;
        }

        // Check 3: Text content matches review keywords
        const txt = (d.innerText || '').toLowerCase();
        if (
          txt.includes('experience') ||
          txt.includes('post') ||
          txt.includes('photos and videos') ||
          txt.includes('review') ||
          txt.includes('rate') ||
          txt.includes('અનુભવ') ||
          txt.includes('પોસ્ટ') ||
          txt.includes('રિવ્યુ') ||
          txt.includes('अनुभव') ||
          txt.includes('पोस्ट') ||
          txt.includes('रिव्यू')
        ) {
          return d;
        }

        // Check 4: Prominent centered modal box (Google Maps review modal container)
        const rect = d.getBoundingClientRect();
        if (rect.width > 280 && rect.height > 200) {
          return d;
        }
      }
    }

    // Fallback: check all divs for specific phrases
    const allDivs = document.querySelectorAll('div');
    for (const d of allDivs) {
      if (isVisible(d)) {
        const text = (d.innerText || '').toLowerCase();
        if ((text.includes('share details') || text.includes('experience')) && 
            (text.includes('post') || text.includes('પોસ્ટ') || text.includes('पोस्ट'))) {
          return d;
        }
      }
    }

    return null;
  }

  function findReviewTextarea(dialog) {
    const roots = getCandidateRoots(dialog);

    const isSearchInput = (el) => {
      if (!el) return true;
      if (el.name === 'q' || el.id === 'APjFqb' || el.classList.contains('gLFyf')) return true;
      const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
      if (label === 'search' || label === 'શોધો' || label === 'खोजें') return true;
      return false;
    };

    for (const root of roots) {
      // 1. Textarea elements
      const textareas = Array.from(root.querySelectorAll('textarea')).filter(isVisible).filter(el => !isSearchInput(el));
      for (const ta of textareas) {
        const ph = (ta.getAttribute('placeholder') || ta.getAttribute('aria-label') || '').toLowerCase();
        if (
          ph.includes('experience') ||
          ph.includes('share') ||
          ph.includes('review') ||
          ph.includes('અનુભવ') ||
          ph.includes('વિગત') ||
          ph.includes('अनुभव') ||
          dialog || root !== document
        ) {
          return ta;
        }
      }
      if ((dialog || root !== document) && textareas.length > 0) {
        return textareas[0];
      }

      // 2. Contenteditable or role="textbox" elements
      const editables = Array.from(root.querySelectorAll('div[role="textbox"], div[contenteditable="true"], [contenteditable="true"]'))
        .filter(isVisible)
        .filter(el => !isSearchInput(el));

      for (const ed of editables) {
        const ph = (ed.getAttribute('placeholder') || ed.getAttribute('aria-label') || ed.getAttribute('data-placeholder') || '').toLowerCase();
        if (
          ph.includes('experience') ||
          ph.includes('share') ||
          ph.includes('review') ||
          ph.includes('અનુભવ') ||
          ph.includes('अनुभव') ||
          dialog || root !== document
        ) {
          return ed;
        }
      }
      if ((dialog || root !== document) && editables.length > 0) {
        return editables[0];
      }
    }

    return null;
  }

  function populateText(el, text) {
    try {
      el.focus();
      el.click();

      // 1. Native Property Setter for React/Angular/Closure forms
      const win = el.ownerDocument?.defaultView || window;
      const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }

      // 2. Dispatch input events
      el.dispatchEvent(new Event('focus', { bubbles: true }));
      el.dispatchEvent(new Event('keydown', { bubbles: true, key: ' ' }));
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true, key: ' ' }));

      // 3. Document execCommand in the element's own ownerDocument
      try {
        if (el.ownerDocument) {
          el.ownerDocument.execCommand('selectAll', false, null);
          el.ownerDocument.execCommand('insertText', false, text);
        }
      } catch (e) {}

      // 4. Contenteditable div fallback
      if (el.tagName !== 'TEXTAREA' && el.isContentEditable) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
      }

      console.log('[ReviewCraft] Successfully populated review text into input.');
      return true;
    } catch (e) {
      return false;
    }
  }

  function findStarElement(dialog, targetRating) {
    const roots = getCandidateRoots(dialog);

    for (const root of roots) {
      // 1. Look for radio items with aria-posinset (e.g. aria-posinset="5")
      const posRadios = root.querySelectorAll(`[role="radio"][aria-posinset="${targetRating}"]`);
      for (const r of posRadios) {
        if (isVisible(r)) return r;
      }

      // 2. Look for role="radiogroup" containing role="radio"
      const radiogroups = root.querySelectorAll('[role="radiogroup"]');
      for (const rg of radiogroups) {
        const radios = Array.from(rg.querySelectorAll('[role="radio"]')).filter(isVisible);
        if (radios.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return radios[idx];
        }
      }

      // 3. Look for role="radio" items inside dialog or iframe
      if (dialog || root !== document) {
        const allRadios = Array.from(root.querySelectorAll('[role="radio"]')).filter(isVisible);
        if (allRadios.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return allRadios[idx];
        }
      }

      // 4. Look for aria-label with star count inside dialog or iframe
      const starQuery = dialog ? dialog : (root !== document ? root : null);
      if (starQuery) {
        const ariaStars = Array.from(starQuery.querySelectorAll('[aria-label*="star" i], [aria-label*="Star" i], [aria-label*="તારા" i], [aria-label*="सितारे" i]')).filter(el => {
          return isVisible(el) && el.tagName !== 'TEXTAREA';
        });
        if (ariaStars.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return ariaStars[idx];
        }
      }

      // 5. Search for row of 5 star SVGs inside dialog or iframe
      const svgContainer = dialog || (root !== document ? root : null);
      if (svgContainer) {
        const allSvgs = Array.from(svgContainer.querySelectorAll('svg')).filter(isVisible);
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
      }
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
        view: el.ownerDocument?.defaultView || window,
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
    try {
      const win = el.ownerDocument?.defaultView || window;
      const style = win.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
    } catch (e) {
      return false;
    }
  }
})();
