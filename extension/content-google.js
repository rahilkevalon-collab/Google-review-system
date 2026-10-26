/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script
 * Runs on *://*.google.com/*
 * 
 * Features:
 * 1. Automatic Real-time Synchronization:
 *    - Listens to chrome.storage.onChanged so new reviews trigger instantly on already-open Google tabs.
 * 2. Reliable Element Detection:
 *    - Uses MutationObserver and element polling (not fixed delays) to detect dynamic Google review modals.
 * 3. Business Verification:
 *    - Verifies page context matches the target business to prevent data from one business being used on another.
 * 4. Star Rating & Text Population:
 *    - Accurately targets Google's review textarea and star rating elements.
 * 5. Single-Trigger Safety:
 *    - Strict locks prevent duplicate clicks, blinking, or duplicate fills.
 *    - NEVER automatically submits the review.
 */

(function () {
  'use strict';

  const isTopFrame = window.top === window;
  console.log('[ReviewCraft Google] Script initialized (isTopFrame=' + isTopFrame + ') on:', window.location.href);

  // Remove any leftover notification pills from previous actions
  try {
    const existingPill = document.getElementById('reviewcraft-success-pill');
    if (existingPill) existingPill.remove();
  } catch (e) {}

  let activePending = null;
  let observerStarted = false;
  let hasTriggeredOpen = false;
  let hasClickedListingCard = false;
  let hasClickedTab = false;
  let fillSessionCompleted = false;
  let domObserver = null;

  // Maximum age for a pending review: 20 minutes (1,200,000 ms)
  const MAX_REVIEW_AGE_MS = 20 * 60 * 1000;

  /**
   * Validates whether the pending review matches the current Google page.
   */
  function isBusinessMatching(pending) {
    if (!pending || !pending.companyName) return true; // Default to true if not specified
    
    const target = pending.companyName.toLowerCase().trim();
    if (!target) return true;

    // Check 1: URL query parameters / hash
    const url = window.location.href.toLowerCase();
    if (url.includes('writereview') || url.includes('#lrd=')) return true;

    // Check tokens from company name
    const tokens = target.split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) return true;

    // Match in URL
    const urlMatches = tokens.filter(t => url.includes(encodeURIComponent(t)) || url.includes(t));
    if (urlMatches.length >= Math.ceil(tokens.length * 0.5)) return true;

    // Match in Document title or page text
    const title = (document.title || '').toLowerCase();
    const titleMatches = tokens.filter(t => title.includes(t));
    if (titleMatches.length >= Math.ceil(tokens.length * 0.5)) return true;

    // Match in Google search input or main headings
    const headings = Array.from(document.querySelectorAll('h1, h2, [role="heading"], div.SPZz6b, div.BNeawe')).map(el => (el.innerText || '').toLowerCase());
    for (const h of headings) {
      if (tokens.every(t => h.includes(t)) || h.includes(target)) return true;
    }

    // If on generic Google search without company tokens, avoid polluting unrelated search
    return url.includes('maps') || urlMatches.length > 0;
  }

  /**
   * Inspects storage for a valid pending review and starts the autofill flow.
   */
  function checkAndStart(forceCheck = false) {
    if (fillSessionCompleted && !forceCheck) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['pendingReview'], (res) => {
          if (chrome.runtime?.lastError || !res) return;
          const storagePending = res.pendingReview;

          if (storagePending && storagePending.text) {
            const ageMs = Date.now() - (storagePending.timestamp || 0);
            if (ageMs > MAX_REVIEW_AGE_MS) {
              console.log('[ReviewCraft Google] Pending review is stale (>20m). Ignoring.');
              return;
            }

            // If already applied for this exact timestamp / reviewId
            if (storagePending.applied && !forceCheck) {
              return;
            }

            // Verify business matches this Google page
            if (!isBusinessMatching(storagePending)) {
              console.log('[ReviewCraft Google] Business name does not match this page. Skipping.');
              return;
            }

            activePending = storagePending;
            if (!observerStarted) {
              observerStarted = true;
              fillSessionCompleted = false;
              console.log('[ReviewCraft Google] Starting autofill for:', activePending.companyName, activePending.rating + '★');
              startAutofillFlow(activePending);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[ReviewCraft Google] Storage check error:', e);
    }
  }

  // 1. Initial check on script load
  checkAndStart();

  // 2. Real-time storage listener: triggers immediately when ReviewCraft updates the review!
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.pendingReview?.newValue) {
          const newPending = changes.pendingReview.newValue;
          if (newPending && newPending.text) {
            console.log('[ReviewCraft Google] Real-time storage update received!');
            observerStarted = false;
            fillSessionCompleted = false;
            checkAndStart(true);
          }
        }
      });
    }
  } catch (e) {}

  // 3. Fallback polling for the first 5 seconds to catch in-flight storage writes
  let pollCount = 0;
  const initInterval = setInterval(() => {
    pollCount++;
    if (observerStarted || pollCount > 12) {
      clearInterval(initInterval);
      return;
    }
    checkAndStart();
  }, 400);

  /**
   * Main autofill loop utilizing element checks and DOM mutation events.
   */
  function startAutofillFlow(pending) {
    let attempts = 0;
    const maxAttempts = 80; // ~25 seconds
    let textDone = false;
    let starDone = false;
    const targetRating = Number(pending.rating) || 5;
    const reviewText = pending.text;

    function attemptFill() {
      if ((textDone && starDone) || attempts > maxAttempts) {
        cleanup();
        return;
      }

      attempts++;

      // 1. Locate review dialog
      const dialog = findReviewDialog();

      // If review modal is NOT open yet, trigger it ONCE in the top frame
      if (isTopFrame && !dialog && !hasTriggeredOpen) {
        tryOpenReviewDialog();
      }

      // 2. Look for star element and click it
      if (!starDone) {
        const starElement = findStarElement(dialog, targetRating);
        if (starElement) {
          starDone = clickStarElement(starElement);
        }
      }

      // 3. Look for textarea and populate review text
      if (!textDone) {
        const textarea = findReviewTextarea(dialog);
        if (textarea) {
          textDone = populateText(textarea, reviewText);
        }
      }

      // 4. Once both stars and text are filled successfully
      if (textDone && starDone) {
        cleanup();
        fillSessionCompleted = true;
        console.log('[ReviewCraft Google] Review text & stars successfully auto-filled!');

        // Mark as applied in storage
        try {
          if (chrome.storage?.local) {
            chrome.storage.local.set({
              pendingReview: {
                ...pending,
                applied: true,
                appliedTimestamp: Date.now(),
                status: 'applied'
              }
            });
          }
        } catch (e) {}

        // Show friendly user toast
        showSuccessNotification(targetRating);
      }
    }

    // Interval backup
    const intervalId = setInterval(attemptFill, 320);

    // MutationObserver on document body to detect dynamic modal injection
    try {
      domObserver = new MutationObserver(() => {
        attemptFill();
      });
      domObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) {}

    function cleanup() {
      if (intervalId) clearInterval(intervalId);
      if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
      }
    }

    // Run first attempt immediately
    attemptFill();
  }

  /**
   * Displays an elegant in-page status notification confirming auto-fill.
   */
  function showSuccessNotification(rating) {
    if (!isTopFrame) return;
    try {
      let pill = document.getElementById('reviewcraft-success-pill');
      if (!pill) {
        pill = document.createElement('div');
        pill.id = 'reviewcraft-success-pill';
        pill.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #068dcb;
          border-left: 6px solid #068dcb;
          border-radius: 14px;
          padding: 12px 18px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 30px rgba(6, 141, 203, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 10px;
          animation: rcSlideIn 0.3s ease-out;
        `;
        pill.innerHTML = `
          <span style="font-size: 18px;">✨</span>
          <div>
            <strong style="color: #034665; display: block; font-size: 13px;">ReviewCraft Auto-Filled!</strong>
            <span style="color: #64748b; font-size: 11px;">Review text and ${rating}★ selected. Please review and click <strong>Post</strong>.</span>
          </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
          @keyframes rcSlideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
        document.body.appendChild(pill);

        setTimeout(() => {
          if (pill && pill.parentNode) pill.remove();
        }, 7000);
      }
    } catch (e) {}
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
      if (el && isVisible(el)) return true;
    }
    return false;
  }

  /**
   * Automatically triggers Google's "Write a review" button or link ONCE in the top frame.
   */
  function tryOpenReviewDialog() {
    if (!isTopFrame || hasTriggeredOpen || isReviewModalPresent()) return false;

    try {
      // 1. Any anchor tag with #lrd= containing ',3,' (direct review modal action code)
      const allLinks = Array.from(document.querySelectorAll('a[href*="lrd="]'));
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        if (href.includes(',3,') || href.includes(',3,,') || /review/i.test(a.innerText || '')) {
          console.log('[ReviewCraft Google] Triggering #lrd review link once:', href);
          hasTriggeredOpen = true;
          const hashIdx = href.indexOf('#lrd=');
          if (hashIdx !== -1) {
            window.location.hash = href.substring(hashIdx);
          }
          a.click();
          return true;
        }
      }

      // 2. Async trigger buttons
      const asyncTriggers = document.querySelectorAll(
        '[data-async-trigger="reviewDialog"], [data-async-trigger*="review" i], [data-async-context*="review" i]'
      );
      for (const el of asyncTriggers) {
        if (isVisible(el)) {
          hasTriggeredOpen = true;
          el.click();
          return true;
        }
      }

      // 3. Text match for "Write a review" / "Rate and review"
      const clickables = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
      for (const el of clickables) {
        if (!isVisible(el)) continue;
        const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
        if (
          /^(write a review|rate and review|leave a review|add a review|રિવ્યુ લખો|રિવ્યુ આપો|रिव्यू लिखें)$/i.test(text) ||
          (text.length < 35 && /write a review|rate and review/i.test(text))
        ) {
          hasTriggeredOpen = true;
          el.click();
          return true;
        }
      }

      // 4. Google Maps multi-listing: auto-click first place card
      if (window.location.href.includes('/maps')) {
        if (!hasClickedListingCard) {
          const firstCard = document.querySelector('a.hfpxzc, div[role="feed"] a[href*="/maps/place/"], div[role="article"] a');
          if (firstCard && isVisible(firstCard)) {
            hasClickedListingCard = true;
            firstCard.focus();
            firstCard.click();
            firstCard.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            firstCard.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            return true;
          }
        }

        // 5. Look for Reviews tab to reveal Write a Review
        if (!hasClickedTab) {
          const reviewsTab = Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"]')).find(el => {
            if (!isVisible(el)) return false;
            const t = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
            return t.includes('reviews') && !t.includes('write');
          });
          if (reviewsTab) {
            hasClickedTab = true;
            reviewsTab.click();
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

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
        } catch (e) {}
      }
    } catch (e) {}

    return roots;
  }

  function findReviewDialog() {
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
        if (d.querySelector('textarea, div[role="textbox"], div[contenteditable="true"], [role="radio"], [role="radiogroup"]')) {
          return d;
        }
        if (d.querySelector('iframe')) return d;

        const txt = (d.innerText || '').toLowerCase();
        if (txt.includes('experience') || txt.includes('post') || txt.includes('review') || txt.includes('rate')) {
          return d;
        }

        const rect = d.getBoundingClientRect();
        if (rect.width > 280 && rect.height > 200) return d;
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
        if (ph.includes('experience') || ph.includes('share') || ph.includes('review') || dialog || root !== document) {
          return ta;
        }
      }
      if ((dialog || root !== document) && textareas.length > 0) return textareas[0];

      // 2. Contenteditable or role="textbox" elements
      const editables = Array.from(root.querySelectorAll('div[role="textbox"], div[contenteditable="true"], [contenteditable="true"]'))
        .filter(isVisible)
        .filter(el => !isSearchInput(el));

      for (const ed of editables) {
        const ph = (ed.getAttribute('placeholder') || ed.getAttribute('aria-label') || ed.getAttribute('data-placeholder') || '').toLowerCase();
        if (ph.includes('experience') || ph.includes('share') || ph.includes('review') || dialog || root !== document) {
          return ed;
        }
      }
      if ((dialog || root !== document) && editables.length > 0) return editables[0];
    }

    return null;
  }

  function populateText(el, text) {
    try {
      el.focus();
      el.click();

      // Native property setter
      const win = el.ownerDocument?.defaultView || window;
      const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }

      // Dispatch event sequence
      el.dispatchEvent(new Event('focus', { bubbles: true }));
      el.dispatchEvent(new Event('keydown', { bubbles: true, key: ' ' }));
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true, key: ' ' }));

      // execCommand fallback
      try {
        if (el.ownerDocument) {
          el.ownerDocument.execCommand('selectAll', false, null);
          el.ownerDocument.execCommand('insertText', false, text);
        }
      } catch (e) {}

      if (el.tagName !== 'TEXTAREA' && el.isContentEditable) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
      }

      console.log('[ReviewCraft Google] Populated review text.');
      return true;
    } catch (e) {
      return false;
    }
  }

  function findStarElement(dialog, targetRating) {
    const roots = getCandidateRoots(dialog);

    for (const root of roots) {
      // 1. Radio items with aria-posinset (e.g. aria-posinset="5")
      const posRadios = root.querySelectorAll(`[role="radio"][aria-posinset="${targetRating}"]`);
      for (const r of posRadios) {
        if (isVisible(r)) return r;
      }

      // 2. Radiogroups
      const radiogroups = root.querySelectorAll('[role="radiogroup"]');
      for (const rg of radiogroups) {
        const radios = Array.from(rg.querySelectorAll('[role="radio"]')).filter(isVisible);
        if (radios.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return radios[idx];
        }
      }

      // 3. Any 5 radio elements inside dialog or iframe
      if (dialog || root !== document) {
        const allRadios = Array.from(root.querySelectorAll('[role="radio"]')).filter(isVisible);
        if (allRadios.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return allRadios[idx];
        }
      }

      // 4. Aria labels with star numbers
      const starQuery = dialog || (root !== document ? root : null);
      if (starQuery) {
        const ariaStars = Array.from(starQuery.querySelectorAll('[aria-label*="star" i], [aria-label*="Star" i], [aria-label*="તારા" i], [aria-label*="सितारे" i]')).filter(el => {
          return isVisible(el) && el.tagName !== 'TEXTAREA';
        });
        if (ariaStars.length >= 5) {
          const idx = Math.max(0, Math.min(4, targetRating - 1));
          return ariaStars[idx];
        }
      }

      // 5. Star SVG icons
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

      console.log('[ReviewCraft Google] Star rating element clicked.');
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
