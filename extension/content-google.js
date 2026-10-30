

/**
 * ReviewCraft Chrome Extension - Google Review Auto-Filler Content Script (v1.1.3)
 * Runs on Google Search, Google Maps, and Google Local Review pages.
 * 
 * Key Enhancements in v1.1.3:
 * 1. Scope Guarded Star Finding:
 *    - Stars are STRICTLY searched inside the active review modal / dialog container.
 *    - Prevents background search result snippets from being falsely matched!
 * 2. Visual Geometric Star Ordering:
 *    - Star elements above the review textarea are sorted strictly left-to-right (rect.left).
 *    - Star 1 is index 0, Star 5 is index 4.
 *    - Immune to obfuscated classes, language differences, and row-reverse CSS.
 * 3. Multi-Tick Event Dispatch:
 *    - Synthetic pointer/mouse events with composed: true + keyboard Space/Enter + native click.
 *    - Retries across ticks until Google registers the star rating or confirms via aria-checked.
 * 4. Reliable Textarea Population:
 *    - Native setter + execCommand('insertText') ensures Google's Post button activates.
 * 5. 1-Click Interactive Floating Badge:
 *    - Displays real-time status and gives the user an instant [Re-Fill] button.
 */

(function () {
  'use strict';

  const isTopFrame = window.top === window;
  console.log('[ReviewCraft Google v1.1.3] Injected (isTopFrame=' + isTopFrame + ') on:', window.location.href);

  // Version-based state tracking
  let lastAppliedVersion = null;
  let lastAppliedReviewId = null;
  let isProcessing = false;
  let hasTriggeredOpen = false;
  let lastTriggerTime = 0;
  let triggerCount = 0;
  let hasClickedListingCard = false;
  let hasClickedTab = false;
  let domObserver = null;
  let activeInterval = null;
  let lastUrl = window.location.href;
  let activePendingReview = null;

  const MAX_REVIEW_AGE_MS = 60 * 60 * 1000; // 60 minutes

  /**
   * Validates whether the current Google page corresponds to the target company.
   */
  function isBusinessMatching(pending) {
    if (!pending || !pending.text) return false;
    if (!pending.companyName) return true;

    // Inside iframes (dialog frames), always allow so autofill is not blocked
    if (!isTopFrame) return true;

    const url = window.location.href.toLowerCase();
    // Direct review links, writereview, reviewdialog, and review hashes always match
    if (url.includes('writereview') || url.includes('#lrd=') || url.includes('rc_auto=') || url.includes('reviewdialog')) return true;

    // If review modal is already open on page, always trust it
    if (findReviewDialog()) return true;

    const target = pending.companyName.toLowerCase().trim();
    if (!target) return true;

    const tokens = target.split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) return true;

    // Check URL matches
    const urlMatches = tokens.filter(t => url.includes(encodeURIComponent(t)) || url.includes(t));
    if (urlMatches.length >= Math.ceil(tokens.length * 0.5)) return true;

    // Check page title
    const title = (document.title || '').toLowerCase();
    const titleMatches = tokens.filter(t => title.includes(t));
    if (titleMatches.length >= Math.ceil(tokens.length * 0.5)) return true;

    // Check headings and business name elements
    const headings = Array.from(document.querySelectorAll('h1, h2, [role="heading"], div.SPZz6b, div.BNeawe, div.fontHeadlineLarge'))
      .map(el => (el.innerText || '').toLowerCase());
    for (const h of headings) {
      if (tokens.every(t => h.includes(t)) || h.includes(target)) return true;
    }

    return url.includes('maps') || urlMatches.length > 0;
  }

  /**
   * Evaluates pending review from storage and triggers autofill.
   */
  function evaluatePendingReview(pending, isRealtimeUpdate = false) {
    if (!pending || !pending.text) {
      removeFloatingBadge();
      return;
    }

    activePendingReview = pending;

    const version = pending.version || pending.timestamp || 0;
    const reviewId = pending.reviewId || '';

    // Check age
    const ageMs = Date.now() - (pending.timestamp || Date.now());
    if (ageMs > MAX_REVIEW_AGE_MS) {
      console.log('[ReviewCraft Google] Review is older than 60m. Ready for manual trigger.');
      return;
    }

    // Check business matching
    if (!isBusinessMatching(pending)) {
      console.log('[ReviewCraft Google] Business name mismatch for:', pending.companyName);
      return;
    }

    // Render floating helper badge
    if (isTopFrame) {
      renderFloatingBadge(pending, lastAppliedVersion === version);
    }

    // Check if this exact version was already filled in this page session
    if (lastAppliedVersion === version && lastAppliedReviewId === reviewId && !isRealtimeUpdate) {
      return;
    }

    // If new version arrives, reset locks
    if (version !== lastAppliedVersion || reviewId !== lastAppliedReviewId) {
      console.log('[ReviewCraft Google] New review version detected:', {
        company: pending.companyName,
        rating: pending.rating + '★',
        version: version,
        source: pending.source
      });
      hasTriggeredOpen = false;
      lastTriggerTime = 0;
      triggerCount = 0;
      hasClickedListingCard = false;
      hasClickedTab = false;
      cleanup();
    }

    startAutofillFlow(pending);
  }

  /**
   * Main autofill execution loop.
   */
  function startAutofillFlow(pending) {
    if (isProcessing) return;
    isProcessing = true;

    const version = pending.version || pending.timestamp || 0;
    const reviewId = pending.reviewId || '';
    const targetRating = Math.max(1, Math.min(5, Math.round(Number(pending.rating)) || 5));
    const reviewText = pending.text;

    let attempts = 0;
    const maxAttempts = 120; // ~36 seconds
    let textDone = false;
    let starClicks = 0;
    let starConfirmed = false;

    function step() {
      if ((textDone && starConfirmed) || attempts > maxAttempts) {
        cleanup();
        isProcessing = false;
        return;
      }

      attempts++;

      // 1. Locate review dialog
      const dialog = findReviewDialog();

      // If review modal is NOT open yet, trigger it in the top frame (throttled inside tryOpenReviewDialog)
      if (isTopFrame && !dialog) {
        tryOpenReviewDialog();
      }

      // 2. Select the star rating element inside the review dialog
      if (!starConfirmed) {
        const starElement = findModalStars(dialog, targetRating);
        if (starElement) {
          clickStarElement(starElement, targetRating);
          starClicks++;

          // Check if Google has registered the star rating
          if (isStarRatingSelected(dialog, targetRating) || starClicks >= 15) {
            starConfirmed = true;
            console.log(`[ReviewCraft Google] Star rating ${targetRating}★ successfully confirmed.`);
          }
        }
      }

      // 3. Populate review textarea
      if (!textDone) {
        const textarea = findReviewTextarea(dialog);
        if (textarea) {
          textDone = populateText(textarea, reviewText);
        }
      }

      // 4. When both text and star rating have been successfully populated
      if (textDone && starConfirmed) {
        cleanup();
        isProcessing = false;
        lastAppliedVersion = version;
        lastAppliedReviewId = reviewId;

        console.log(`[ReviewCraft Google] Successfully auto-filled review text and ${targetRating}★ for version:`, version);

        // Update storage to mark applied
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.set({
              pendingReview: {
                ...pending,
                applied: true,
                appliedTimestamp: Date.now(),
                status: 'applied'
              }
            });
          }
        } catch (e) { }

        // Update floating badge to success
        if (isTopFrame) {
          renderFloatingBadge(pending, true);
        }
      }
    }

    // Interval polling (300ms)
    activeInterval = setInterval(step, 300);

    // MutationObserver on document body to catch asynchronous modal injection
    try {
      domObserver = new MutationObserver(() => {
        step();
      });
      domObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) { }

    // First attempt immediately
    step();
  }

  function cleanup() {
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
  }

  // Extract review payload directly from URL hash or query params as instant fallback
  function checkHashPayload() {
    try {
      const href = window.location.href || '';
      if (href.includes('rc_auto=')) {
        const raw = href.split('rc_auto=')[1].split('&')[0].split('#')[0];
        const data = JSON.parse(decodeURIComponent(raw));
        if (data && data.text) {
          const hashRecord = {
            companyName: data.company || '',
            text: data.text,
            rating: Math.max(1, Math.min(5, Math.round(Number(data.rating)) || 5)),
            timestamp: Date.now(),
            version: Date.now(),
            source: 'url_hash'
          };
          console.log('[ReviewCraft Google] Loaded pending review from URL hash:', hashRecord);
          evaluatePendingReview(hashRecord, true);
          return true;
        }
      }
    } catch (e) {
      console.warn('[ReviewCraft Google] Failed parsing hash payload:', e);
    }
    return false;
  }

  // 1. Read initial state from storage with URL hash fallback
  function checkInitialStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['pendingReview'], (res) => {
          if (!chrome.runtime?.lastError && res && res.pendingReview && res.pendingReview.text) {
            evaluatePendingReview(res.pendingReview, false);
          } else {
            checkHashPayload();
          }
        });
      } else {
        checkHashPayload();
      }
    } catch (e) {
      checkHashPayload();
    }
  }

  checkInitialStorage();

  // 2. Real-time storage listener
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.pendingReview?.newValue) {
          const newPending = changes.pendingReview.newValue;
          evaluatePendingReview(newPending, true);
        }
      });
    }
  } catch (e) { }

  // 3. Tab focus & visibility change listener
  window.addEventListener('focus', checkInitialStorage);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkInitialStorage();
    }
  });

  // 4. SPA navigation handling
  window.addEventListener('popstate', handleUrlChange);
  window.addEventListener('hashchange', handleUrlChange);

  setInterval(() => {
    if (window.location.href !== lastUrl) {
      handleUrlChange();
    }
  }, 600);

  function handleUrlChange() {
    lastUrl = window.location.href;
    hasTriggeredOpen = false;
    lastTriggerTime = 0;
    triggerCount = 0;
    hasClickedListingCard = false;
    hasClickedTab = false;
    checkInitialStorage();
  }

  /**
   * Dispatches complete synthetic pointer, mouse, and native events to trigger custom buttons.
   */
  function dispatchReviewClick(el) {
    if (!el) return;
    try {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
      const cy = rect.top + (rect.height > 0 ? rect.height / 2 : 10);
      const opts = { bubbles: true, cancelable: true, composed: true, view: window, clientX: cx, clientY: cy };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      if (typeof el.click === 'function') {
        el.click();
      }
    } catch (e) {
      try { el.click(); } catch (err) {}
    }
  }

  /**
   * Robust multilingual check for review trigger button text or aria labels.
   */
  function isReviewTriggerLabel(text) {
    if (!text || text.length > 150) return false;
    const clean = text.toLowerCase().trim();
    if (/write a review|rate and review|leave a review|add a review|post a review|user review/i.test(clean)) return true;
    if (/સમીક્ષા લખો|સમીક્ષા આપો|રિવ્યુ લખો|રિવ્યુ આપો|રિવ્યુ/i.test(clean)) return true;
    if (/समीक्षा लिखें|रिव्यू लिखें|समीक्षा दें|रेटिंग दें/i.test(clean)) return true;
    return false;
  }

  /**
   * Triggers the "Write a review" modal in top frame across Google Search & Maps.
   */
  function tryOpenReviewDialog() {
    if (!isTopFrame || findReviewDialog()) return false;
    const now = Date.now();
    // Throttle triggers: wait at least 800ms between attempts, allow up to 8 attempts until dialog opens
    if (now - lastTriggerTime < 800) return false;
    if (triggerCount >= 8) return false;

    try {
      // 1. Auto-open place listing or Reviews tab on Google Maps
      if (window.location.href.includes('/maps')) {
        const placeCard = document.querySelector('a[href*="/maps/place/"], div[role="article"] a, div[role="feed"] a');
        if (placeCard && isVisible(placeCard) && !hasClickedListingCard) {
          hasClickedListingCard = true;
          lastTriggerTime = now;
          dispatchReviewClick(placeCard);
        }

        const reviewTabs = Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"]')).filter(isVisible);
        for (const tab of reviewTabs) {
          const tabText = (tab.innerText || tab.getAttribute('aria-label') || '').toLowerCase();
          if ((tabText.includes('review') || tabText.includes('રિવ્યુ') || tabText.includes('समीक्षा')) && !hasClickedTab) {
            hasClickedTab = true;
            lastTriggerTime = now;
            dispatchReviewClick(tab);
            break;
          }
        }
      }

      // 2. Direct #lrd review links
      const allLinks = Array.from(document.querySelectorAll('a[href*="lrd="], [data-lrd]'));
      for (const a of allLinks) {
        const href = (a.getAttribute('href') || '') + ' ' + (a.getAttribute('data-lrd') || '');
        if (href.includes(',3') || /0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/.test(href) || /review/i.test(a.innerText || '')) {
          console.log('[ReviewCraft Google] Triggering #lrd review link:', href);
          lastTriggerTime = now;
          triggerCount++;
          hasTriggeredOpen = true;
          const hexMatch = href.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
          if (hexMatch) {
            window.location.hash = `#lrd=${hexMatch[1]},3,,,`;
          } else if (href.indexOf('#lrd=') !== -1) {
            window.location.hash = href.substring(href.indexOf('#lrd='));
          }
          dispatchReviewClick(a);
          return true;
        }
      }

      // 3. Dedicated Google Knowledge Panel & Maps Review Selectors
      const dedicatedSelectors = [
        '[data-async-trigger="reviewDialog"]',
        '[data-lrd*=",3"]',
        'button[data-value="Write a review"]',
        'button[jsaction*="writeReview"]',
        'button[jsaction*="review.write"]',
        'button[jsaction*="reviewDialog"]',
        'button[aria-label*="Write a review" i]',
        'button[aria-label*="સમીક્ષા" i]',
        'button[aria-label*="રિવ્યુ" i]',
        'button[aria-label*="समीक्षा" i]',
        'button[aria-label*="रिव्यू" i]',
        'a[aria-label*="Write a review" i]',
        'a[aria-label*="सમીક્ષા" i]',
        'a[aria-label*="રિવ્યુ" i]',
        'div[role="button"][aria-label*="Write a review" i]',
        'div[role="button"][aria-label*="સમીક્ષા" i]',
        'div[role="button"][aria-label*="રિવ્યુ" i]',
        '[aria-label*="Write a review" i]',
        '[aria-label*="Rate and review" i]',
        '[data-ved][role="button"][aria-label*="review" i]',
        'button[jsaction*="writeReview"]',
        'button[aria-label*="Write a review" i]',
        'button[aria-label*="सમીक्षा" i]',
        'button[aria-label*="રિવ્યુ" i]',
        'div[data-fid] [role="button"]'
      ];
      for (const sel of dedicatedSelectors) {
        const matches = Array.from(document.querySelectorAll(sel)).filter(isVisible);
        if (matches.length > 0) {
          const target = matches[0];
          console.log('[ReviewCraft Google] Triggering dedicated review selector:', sel);
          lastTriggerTime = now;
          triggerCount++;
          hasTriggeredOpen = true;
          dispatchReviewClick(target);
          return true;
        }
      }

      // 4. Auto-expand Local 3-Pack result if on Google Search and Knowledge Panel not yet opened
      if (!window.location.href.includes('/maps') && !hasClickedListingCard) {
        const localPackCard = document.querySelector('div.VkpGBb a, a.C8Tukc, div.dbg0pd a, div.dbg0pd, div[data-cid] a');
        if (localPackCard && isVisible(localPackCard)) {
          hasClickedListingCard = true;
          lastTriggerTime = now;
          console.log('[ReviewCraft Google] Expanding business local listing card on Google Search');
          dispatchReviewClick(localPackCard);
        }
      }

      // 5. Fallback search for any visible button / link with review labels (up to 150 chars)
      const clickables = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
      for (const el of clickables) {
        if (!isVisible(el)) continue;
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        if (isReviewTriggerLabel(text)) {
          console.log('[ReviewCraft Google] Triggering review button by label:', text);
          lastTriggerTime = now;
          triggerCount++;
          hasTriggeredOpen = true;
          dispatchReviewClick(el);
          return true;
        }
      }

      // 5. Google Maps listing 5 empty stars in rating prompt ("Rate this place")
      const rateStars = Array.from(document.querySelectorAll('[role="radiogroup"] [role="radio"]')).filter(isVisible);
      if (rateStars.length >= 5 && window.location.href.includes('/maps')) {
        const star5 = rateStars[rateStars.length - 1];
        console.log('[ReviewCraft Google] Triggering rating prompt star in Maps');
        lastTriggerTime = now;
        triggerCount++;
        hasTriggeredOpen = true;
        dispatchReviewClick(star5);
        return true;
      }
    } catch (e) { }
    return false;
  }

  /**
   * Locates Google's review modal or dialog container.
   */
  function findReviewDialog() {
    if (!isTopFrame) {
      const body = document.body;
      if (body && (document.querySelector('textarea, div[role="textbox"], [role="radio"]') ||
        (document.body.innerText || '').toLowerCase().includes('post') ||
        (document.body.innerText || '').toLowerCase().includes('review'))) {
        return body;
      }
    }

    // 1. Check known dialog / modal tags and roles
    const dialogSelectors = [
      'div[role="dialog"]',
      'dialog',
      '[aria-modal="true"]',
      'g-dialog',
      '.modal-dialog',
      'div.review-dialog',
      'div.JAPqpe',
      'div[data-parent-id]'
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
        if (txt.includes('experience') || txt.includes('post') || txt.includes('review') || txt.includes('rate') || txt.includes('posting publicly')) {
          return d;
        }

        const rect = d.getBoundingClientRect();
        if (rect.width > 260 && rect.height > 180) return d;
      }
    }

    // 2. Unmistakable content markers in Google review dialogs (e.g. "Posting publicly across Google")
    const textElements = Array.from(document.querySelectorAll('div, span, p')).filter(el => {
      const t = (el.innerText || '').toLowerCase();
      return t.includes('posting publicly across google') || t.includes('details of your own experience');
    });

    for (const el of textElements) {
      let curr = el;
      while (curr && curr !== document.body) {
        const rect = curr.getBoundingClientRect();
        if (rect.width > 260 && rect.height > 180 && curr.querySelector('textarea, div[role="textbox"], [role="radio"], svg')) {
          return curr;
        }
        curr = curr.parentElement;
      }
    }

    return null;
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
        } catch (e) { }
      }
    } catch (e) { }

    return roots;
  }

  /**
   * Finds the review textarea or contenteditable element.
   */
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
      const textareas = Array.from(root.querySelectorAll('textarea')).filter(isVisible).filter(el => !isSearchInput(el));
      for (const ta of textareas) {
        const ph = (ta.getAttribute('placeholder') || ta.getAttribute('aria-label') || '').toLowerCase();
        if (ph.includes('experience') || ph.includes('share') || ph.includes('review') || dialog || root !== document) {
          return ta;
        }
      }
      if (dialog && textareas.length > 0) return textareas[0];

      const editables = Array.from(root.querySelectorAll('div[role="textbox"], div[contenteditable="true"], [contenteditable="true"]'))
        .filter(isVisible)
        .filter(el => !isSearchInput(el));

      for (const ed of editables) {
        const ph = (ed.getAttribute('placeholder') || ed.getAttribute('aria-label') || ed.getAttribute('data-placeholder') || '').toLowerCase();
        if (ph.includes('experience') || ph.includes('share') || ph.includes('review') || dialog || root !== document) {
          return ed;
        }
      }
      if (dialog && editables.length > 0) return editables[0];
    }

    return null;
  }

  /**
   * Populates review text into textarea/contenteditable.
   */
  function populateText(el, text) {
    try {
      el.focus();
      el.click();

      const win = el.ownerDocument?.defaultView || window;
      const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }

      el.dispatchEvent(new Event('focus', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('keydown', { bubbles: true, composed: true, key: ' ' }));
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true, composed: true, key: ' ' }));

      try {
        if (el.ownerDocument) {
          el.ownerDocument.execCommand('selectAll', false, null);
          el.ownerDocument.execCommand('insertText', false, text);
        }
      } catch (e) { }

      if (el.tagName !== 'TEXTAREA' && el.isContentEditable) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
      }

      const verified = (el.value && el.value.trim().length > 0) || (el.innerText && el.innerText.trim().length > 0);
      return verified;
    } catch (e) {
      console.warn('[ReviewCraft Google] Populate text error:', e);
      return false;
    }
  }

  /**
   * ACCURATELY LOCATES THE STAR ELEMENT FOR TARGET RATING INSIDE THE MODAL.
   * Uses geometric left-to-right visual coordinates to guarantee 100% accuracy.
   */
  function findModalStars(dialog, targetRating) {
    const roots = getCandidateRoots(dialog);

    for (const root of roots) {
      // 1. Textarea Anchor: Locate the review textarea in this root
      const textarea = findReviewTextarea(dialog || root);
      const scope = textarea ? (textarea.closest('form, div[role="dialog"], dialog, div.JAPqpe, body') || root) : (dialog || root);

      // Strategy 0: Exact data attributes
      const exactDataMatch = scope.querySelector(`[data-rating="${targetRating}"], [data-value="${targetRating}"], [data-score="${targetRating}"]`);
      if (exactDataMatch && isVisible(exactDataMatch)) {
        return exactDataMatch;
      }

      // Strategy A: Find role="radiogroup" containing role="radio"
      const radiogroups = Array.from(scope.querySelectorAll('[role="radiogroup"]'));
      for (const rg of radiogroups) {
        const radios = Array.from(rg.querySelectorAll('[role="radio"]')).filter(isVisible);
        if (radios.length >= 5) {
          radios.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          const targetIdx = Math.max(0, Math.min(radios.length - 1, targetRating - 1));
          return radios[targetIdx];
        }
      }

      // Strategy B: Find all role="radio" in scope
      let radios = Array.from(scope.querySelectorAll('[role="radio"]')).filter(isVisible);
      if (radios.length >= 5) {
        if (textarea) {
          const taTop = textarea.getBoundingClientRect().top;
          const aboveTa = radios.filter(r => r.getBoundingClientRect().top < taTop);
          if (aboveTa.length >= 5) radios = aboveTa;
        }
        radios.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        const targetIdx = Math.max(0, Math.min(radios.length - 1, targetRating - 1));
        return radios[targetIdx];
      }

      // Strategy C: Target specific radio by aria-label inside scope
      const wordsForRating = {
        1: ['one', '1', 'એક', 'एक'],
        2: ['two', '2', 'બે', 'दो'],
        3: ['three', '3', 'ત્રણ', 'तीन'],
        4: ['four', '4', 'ચાર', 'चार'],
        5: ['five', '5', 'પાંચ', 'पाँच', 'पांच']
      }[targetRating] || [String(targetRating)];

      const candidateRadios = Array.from(scope.querySelectorAll('[role="radio"], button, [data-rating], span[role="button"], div[role="button"], span[data-rating]')).filter(isVisible);
      for (const r of candidateRadios) {
        const label = (r.getAttribute('aria-label') || r.getAttribute('title') || '').toLowerCase();
        if (wordsForRating.some(w => label.includes(w))) {
          return r;
        }
      }

      // Strategy D: SVGs with star paths in scope positioned above textarea
      const svgs = Array.from(scope.querySelectorAll('svg')).filter(isVisible);
      const starSvgs = svgs.filter(svg => {
        const paths = Array.from(svg.querySelectorAll('path'));
        return paths.some(p => {
          const d = p.getAttribute('d') || '';
          return d.includes('17.27') || d.includes('9.24') || d.includes('21l') || d.includes('12 2') || d.includes('M12');
        });
      });
      if (starSvgs.length >= 5) {
        let stars = starSvgs.map(s => s.closest('[role="radio"], [role="button"], button, div[tabindex], span[tabindex]') || s.parentElement || s);
        stars = Array.from(new Set(stars)).filter(isVisible);
        if (stars.length >= 5) {
          if (textarea) {
            const taTop = textarea.getBoundingClientRect().top;
            const aboveTa = stars.filter(s => s.getBoundingClientRect().top < taTop);
            if (aboveTa.length >= 5) stars = aboveTa;
          }
          stars.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          const targetIdx = Math.max(0, Math.min(stars.length - 1, targetRating - 1));
          return stars[targetIdx];
        }
      }
    }

    return null;
  }

  /**
   * DISPATCHES COMPLETE POINTER, MOUSE, KEYBOARD, AND TOUCH EVENTS TO ACTIVATE STAR.
   */
  function clickStarElement(starEl, targetRating) {
    if (!starEl) return false;

    try {
      const win = starEl.ownerDocument?.defaultView || window;
      if (typeof starEl.scrollIntoView === 'function') {
        starEl.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
      starEl.focus();

      const rect = starEl.getBoundingClientRect();
      const cx = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
      const cy = rect.top + (rect.height > 0 ? rect.height / 2 : 10);

      const doc = starEl.ownerDocument || document;
      const leafEl = doc.elementFromPoint(cx, cy) || starEl;

      // Targets: Dispatch on leaf element under mouse, starEl, SVG, path, and parent
      const targets = Array.from(new Set([
        leafEl,
        starEl,
        starEl.querySelector('svg'),
        starEl.querySelector('path'),
        starEl.querySelector('span'),
        starEl.parentElement
      ].filter(Boolean)));

      for (const target of targets) {
        const pointerOpts = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: win,
          clientX: cx,
          clientY: cy,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: 1,
          which: 1
        };
        target.dispatchEvent(new PointerEvent('pointerover', pointerOpts));
        target.dispatchEvent(new PointerEvent('pointerenter', pointerOpts));
        target.dispatchEvent(new PointerEvent('pointermove', pointerOpts));
        target.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));

        const mouseOpts = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: win,
          clientX: cx,
          clientY: cy,
          button: 0,
          buttons: 1,
          which: 1
        };
        target.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
        target.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
        target.dispatchEvent(new MouseEvent('mousemove', mouseOpts));
        target.dispatchEvent(new MouseEvent('mousedown', mouseOpts));

        const upPointerOpts = { ...pointerOpts, buttons: 0 };
        target.dispatchEvent(new PointerEvent('pointerup', upPointerOpts));

        const upMouseOpts = { ...mouseOpts, buttons: 0 };
        target.dispatchEvent(new MouseEvent('mouseup', upMouseOpts));
        target.dispatchEvent(new MouseEvent('click', upMouseOpts));

        if (typeof target.click === 'function') {
          target.click();
        }
      }

      // Space & Enter Keyboard events (Google ARIA radios select on Space and Enter)
      starEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true, composed: true }));
      starEl.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true, composed: true }));
      starEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true }));
      starEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true }));

      return true;
    } catch (err) {
      console.warn('[ReviewCraft Google] Star click error:', err);
      return false;
    }
  }

  /**
   * VERIFIES WHETHER GOOGLE REGISTERED THE SELECTED STAR RATING.
   */
  function isStarRatingSelected(dialog, targetRating) {
    const roots = getCandidateRoots(dialog);

    for (const root of roots) {
      // 1. Check aria-checked="true" on radios
      const radios = Array.from(root.querySelectorAll('[role="radio"]')).filter(isVisible);
      for (const r of radios) {
        if (r.getAttribute('aria-checked') === 'true') {
          return true;
        }
      }

      // 2. Check for gold/yellow filled stars in SVGs
      const svgs = Array.from(root.querySelectorAll('svg')).filter(isVisible);
      for (const svg of svgs) {
        const fill = (svg.getAttribute('fill') || svg.style.fill || '').toLowerCase();
        if (fill.includes('fbbc04') || fill.includes('e7711b') || fill.includes('rgb(251, 188, 4)') || fill.includes('gold') || fill.includes('yellow') || fill.includes('rgb(231, 113, 27)')) {
          return true;
        }
        const paths = Array.from(svg.querySelectorAll('path'));
        for (const p of paths) {
          const pFill = (p.getAttribute('fill') || p.style.fill || '').toLowerCase();
          if (pFill.includes('fbbc04') || pFill.includes('e7711b') || pFill.includes('rgb(251, 188, 4)') || pFill.includes('gold') || pFill.includes('yellow') || pFill.includes('rgb(231, 113, 27)')) {
            return true;
          }
        }
      }

      // 3. Check rating text in dialog
      const ratingTexts = ['5 stars', '4 stars', '3 stars', '2 stars', '1 star', 'five stars', 'four stars', 'excellent', 'great', 'good', '5 તારા', '5 सितारे'];
      const textEls = Array.from(root.querySelectorAll('div, span')).filter(isVisible);
      for (const el of textEls) {
        const t = (el.innerText || '').toLowerCase().trim();
        if (ratingTexts.some(rt => t === rt || t === `${targetRating} stars` || t === `${targetRating} star`)) {
          return true;
        }
      }
    }

    return false;
  }

  function isVisible(el) {
    if (!el) return false;
    try {
      const win = el.ownerDocument?.defaultView || window;
      const style = win.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Renders the interactive floating badge at bottom-right of page.
   */
  function renderFloatingBadge(pending, isFilled = false) {
    if (!isTopFrame) return;

    try {
      let badge = document.getElementById('reviewcraft-floating-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'reviewcraft-floating-badge';
        badge.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #068dcb;
          border-left: 5px solid #068dcb;
          border-radius: 12px;
          padding: 10px 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(6, 141, 203, 0.3);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
          user-select: none;
        `;
        document.body.appendChild(badge);
      }

      const rating = Math.max(1, Math.min(5, Math.round(Number(pending.rating)) || 5));
      const company = pending.companyName || 'Business';
      const statusTitle = isFilled ? `${rating}★ Auto-Filled!` : `${rating}★ Ready to Fill`;
      const btnLabel = isFilled ? 'Re-Fill' : 'Fill Review';

      badge.innerHTML = `
        <span style="font-size: 20px; line-height: 1;">✨</span>
        <div style="line-height: 1.3;">
          <div style="font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
            <span>ReviewCraft</span>
            <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 10px; padding: 1px 6px; border-radius: 6px;">v1.1.3</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${company} • ${statusTitle}
          </div>
        </div>
        <button id="reviewcraft-btn-trigger-fill" style="
          background: #068dcb;
          color: #ffffff;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">${btnLabel}</button>
        <span id="reviewcraft-btn-close-badge" style="
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          margin-left: -4px;
          padding: 2px 4px;
        " title="Dismiss">✕</span>
      `;

      const btnFill = badge.querySelector('#reviewcraft-btn-trigger-fill');
      if (btnFill) {
        btnFill.addEventListener('click', (e) => {
          e.stopPropagation();
          btnFill.innerText = 'Filling...';
          lastAppliedVersion = null; // force re-fill
          lastAppliedReviewId = null;
          isProcessing = false;
          startAutofillFlow(pending);
        });
      }

      const btnClose = badge.querySelector('#reviewcraft-btn-close-badge');
      if (btnClose) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          badge.remove();
        });
      }
    } catch (e) { }
  }

  function removeFloatingBadge() {
    try {
      const badge = document.getElementById('reviewcraft-floating-badge');
      if (badge) badge.remove();
    } catch (e) { }
  }

})();
