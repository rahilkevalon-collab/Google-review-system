/**
 * ReviewCraft Bookmarklet Tool
 * 
 * Enables 1-Click Zero-Installation Google Review Auto-Filling on ANY computer,
 * in ANY modern browser (Chrome, Edge, Brave, Safari, Firefox), WITHOUT requiring
 * any browser extension to be installed.
 * 
 * Execution rules:
 * 1. Executes strictly on Google origins (Google Search, Maps, Local WriteReview).
 * 2. Reads the review draft and rating from the URL hash (#rc_auto=...) or clipboard.
 * 3. Geometrically targets the 5-star radio button inside Google's review dialog.
 * 4. Populates the review textarea using native setter + execCommand('insertText')
 *    so Google's "Post" button is instantly activated.
 */

export const BOOKMARKLET_RAW_CODE = `(function () {
  'use strict';

  // 1. Domain guard: Ensure bookmarklet executes ONLY on Google domains
  var host = (window.location.hostname || '').toLowerCase();
  if (host.indexOf('google.') === -1 && host !== 'goo.gl' && host.indexOf('googleusercontent.com') === -1) {
    alert('ReviewCraft Auto-Filler:\\nPlease click this bookmark on your Google Review page (Google Search or Maps)!');
    return;
  }

  var reviewText = '';
  var ratingVal = 5;

  // 2. Extract review payload from URL hash
  try {
    var hash = window.location.hash || '';
    if (hash.indexOf('rc_auto=') !== -1) {
      var raw = hash.split('rc_auto=')[1].split('&')[0];
      var data = JSON.parse(decodeURIComponent(raw));
      if (data.text) reviewText = String(data.text).trim();
      if (data.rating) ratingVal = Math.max(1, Math.min(5, Math.round(Number(data.rating)) || 5));
    }
  } catch (e) {}

  function getRoots() {
    var roots = [document];
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var f = 0; f < iframes.length; f++) {
        try {
          if (iframes[f].contentDocument && iframes[f].contentDocument.body) {
            roots.push(iframes[f].contentDocument);
          }
        } catch (e) {}
      }
    } catch (e) {}
    return roots;
  }

  function isVisible(el) {
    if (!el) return false;
    try {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (e) {
      return false;
    }
  }

  function clickTargetStar(starEl) {
    if (!starEl) return;
    try {
      var win = starEl.ownerDocument?.defaultView || window;
      if (typeof starEl.scrollIntoView === 'function') {
        starEl.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
      starEl.focus();

      var rect = starEl.getBoundingClientRect();
      var cx = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
      var cy = rect.top + (rect.height > 0 ? rect.height / 2 : 10);

      var doc = starEl.ownerDocument || document;
      var leafEl = doc.elementFromPoint(cx, cy) || starEl;

      var targets = [leafEl, starEl, starEl.querySelector('svg'), starEl.querySelector('path')].filter(Boolean);

      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        var pOpts = { bubbles: true, cancelable: true, composed: true, view: win, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, which: 1 };
        t.dispatchEvent(new PointerEvent('pointerover', pOpts));
        t.dispatchEvent(new PointerEvent('pointerdown', pOpts));

        var mOpts = { bubbles: true, cancelable: true, composed: true, view: win, clientX: cx, clientY: cy, button: 0, buttons: 1, which: 1 };
        t.dispatchEvent(new MouseEvent('mouseover', mOpts));
        t.dispatchEvent(new MouseEvent('mousedown', mOpts));

        t.dispatchEvent(new PointerEvent('pointerup', { ...pOpts, buttons: 0 }));
        t.dispatchEvent(new MouseEvent('mouseup', { ...mOpts, buttons: 0 }));
        t.dispatchEvent(new MouseEvent('click', { ...mOpts, buttons: 0 }));

        if (typeof t.click === 'function') t.click();
      }

      starEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
      starEl.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
      starEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      starEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    } catch (err) {}
  }

  function proceedWithAutofill(text, rating) {
    var attempts = 0;
    var maxAttempts = 35; // ~10.5 seconds
    var starClicked = false;
    var textDone = false;

    var interval = setInterval(function () {
      attempts++;
      var roots = getRoots();

      // Step A: Select Star Rating
      if (!starClicked) {
        for (var r = 0; r < roots.length; r++) {
          var root = roots[r];

          // Check if star rating is already confirmed
          var radios = Array.from(root.querySelectorAll('[role="radio"]')).filter(isVisible);
          for (var k = 0; k < radios.length; k++) {
            if (radios[k].getAttribute('aria-checked') === 'true') {
              starClicked = true;
              break;
            }
          }
          if (starClicked) break;

          var radiogroups = Array.from(root.querySelectorAll('[role="radiogroup"]'));
          for (var g = 0; g < radiogroups.length; g++) {
            var groupRadios = Array.from(radiogroups[g].querySelectorAll('[role="radio"]')).filter(isVisible);
            if (groupRadios.length >= 5) {
              groupRadios.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
              var targetIdx = Math.max(0, Math.min(groupRadios.length - 1, rating - 1));
              clickTargetStar(groupRadios[targetIdx]);
              break;
            }
          }

          if (radios.length >= 5) {
            radios.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
            var targetIdx2 = Math.max(0, Math.min(radios.length - 1, rating - 1));
            clickTargetStar(radios[targetIdx2]);
          }
        }
      }

      // Step B: Populate Textarea / ContentEditable
      if (!textDone && text) {
        for (var r2 = 0; r2 < roots.length; r2++) {
          var root2 = roots[r2];
          var textarea = root2.querySelector('textarea:not([name="q"]):not(#APjFqb), div[role="textbox"]:not([name="q"]):not(#APjFqb), div[contenteditable="true"]');
          if (textarea) {
            try {
              textarea.focus();
              textarea.click();

              var proto = textarea.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
              var nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value');
              if (nativeSetter && nativeSetter.set) {
                nativeSetter.set.call(textarea, text);
              } else {
                textarea.value = text;
              }

              textarea.dispatchEvent(new Event('focus', { bubbles: true }));
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));

              try {
                if (textarea.ownerDocument) {
                  textarea.ownerDocument.execCommand('selectAll', false, null);
                  textarea.ownerDocument.execCommand('insertText', false, text);
                }
              } catch (e) {}

              if (textarea.tagName !== 'TEXTAREA' && textarea.isContentEditable) {
                textarea.innerText = text;
                textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
              }

              textDone = true;
              break;
            } catch (e) {}
          }
        }
      }

      // Step C: Check completion or timeout
      if ((starClicked && textDone) || attempts >= maxAttempts) {
        clearInterval(interval);

        if (starClicked || textDone) {
          showBanner(rating + '★ & Review Text Ready! Click Post to submit.');
          try {
            if (window.location.hash.indexOf('rc_auto=') !== -1) {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } catch (e) {}
        } else {
          showBanner('Review modal not found yet. Please click "Write a review" on Google, then click this bookmark again.', true);
        }
      }
    }, 300);
  }

  function showBanner(message, isWarning) {
    try {
      var existing = document.getElementById('reviewcraft-autofill-banner');
      if (existing) existing.remove();
      var banner = document.createElement('div');
      banner.id = 'reviewcraft-autofill-banner';
      banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (isWarning ? '#991b1b' : '#034665') + ';color:#ffffff;padding:12px 24px;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.35);z-index:2147483647;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;border:2px solid ' + (isWarning ? '#ef4444' : '#068dcb') + ';';
      banner.innerHTML = '<span style="font-size:18px;">' + (isWarning ? '⚠️' : '✨') + '</span> <span><strong>ReviewCraft:</strong> ' + message + '</span>';
      document.body.appendChild(banner);
      setTimeout(function () { banner.remove(); }, isWarning ? 7000 : 5000);
    } catch (e) {}
  }

  // 3. Trigger autofill with payload or clipboard
  if (reviewText) {
    proceedWithAutofill(reviewText, ratingVal);
  } else if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(function (clip) {
      proceedWithAutofill(clip || '', ratingVal);
    }).catch(function () {
      proceedWithAutofill('', ratingVal);
    });
  } else {
    proceedWithAutofill('', ratingVal);
  }
})();`;

/**
 * Encoded Bookmarklet URI string for installation into browser bookmarks bar.
 * NOTE: Must NOT be passed directly as an `href` prop inside React JSX.
 * It is consumed imperatively via DOM element refs or clipboard copy.
 */
export const BOOKMARKLET_HREF = `javascript:${encodeURIComponent(BOOKMARKLET_RAW_CODE.replace(/\s+/g, ' ').trim())}`;
