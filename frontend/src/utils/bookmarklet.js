/**
 * ReviewCraft Bookmarklet (Alternative A)
 * 
 * Enables 1-Click Zero-Installation Google Review Auto-Filling on ANY computer,
 * in ANY modern browser (Chrome, Edge, Brave, Safari, Firefox), WITHOUT requiring
 * any browser extension to be installed.
 * 
 * How it works:
 * 1. User drags the "⚡ Auto-Fill Review" button to their Bookmarks Bar once.
 * 2. On ReviewCraft, clicking "Post on Google" copies the review to clipboard
 *    and launches Google's review modal with the payload in the URL hash.
 * 3. On Google's tab, user clicks their "⚡ Auto-Fill Review" bookmark:
 *    - The script executes inside Google's origin (so Same-Origin Policy does not block it).
 *    - It locates and clicks the 5-star / 4-star rating button geometrically.
 *    - It populates Google's textarea using native property setter and execCommand('insertText').
 *    - It shows a success floating badge on Google's page.
 */

export const BOOKMARKLET_RAW_CODE = `(function () {
  'use strict';
  var reviewText = '';
  var ratingVal = 5;

  try {
    var hash = window.location.hash || '';
    if (hash.indexOf('rc_auto=') !== -1) {
      var raw = hash.split('rc_auto=')[1].split('&')[0];
      var data = JSON.parse(decodeURIComponent(raw));
      if (data.text) reviewText = data.text;
      if (data.rating) ratingVal = Number(data.rating) || 5;
    }
  } catch (e) {}

  function proceedWithAutofill(text, rating) {
    var attempts = 0;
    var maxAttempts = 35;

    var interval = setInterval(function () {
      attempts++;
      var dialog = null;
      var selectors = ['div[role="dialog"]', 'dialog', '[aria-modal="true"]', 'g-dialog', '.modal-dialog', 'div.review-dialog', 'div.JAPqpe'];
      for (var i = 0; i < selectors.length; i++) {
        var found = document.querySelector(selectors[i]);
        if (found && found.offsetHeight > 100) { dialog = found; break; }
      }
      var root = dialog || document;

      var starClicked = false;
      var starRadios = Array.from(root.querySelectorAll('[role="radio"]')).filter(function (el) {
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      });

      if (starRadios.length >= 5) {
        starRadios.sort(function (a, b) {
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        });
        var targetIdx = Math.max(0, Math.min(starRadios.length - 1, rating - 1));
        var targetStar = starRadios[targetIdx];
        if (targetStar) {
          targetStar.focus();
          targetStar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          targetStar.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          targetStar.click();
          targetStar.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
          targetStar.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          targetStar.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
          starClicked = true;
        }
      }

      var textDone = false;
      var textarea = root.querySelector('textarea:not([name="q"]):not(#APjFqb), div[role="textbox"]:not([name="q"]):not(#APjFqb), div[contenteditable="true"]');
      if (textarea && text) {
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
      }

      if ((starClicked && textDone) || attempts >= maxAttempts) {
        clearInterval(interval);
        showBanner(starClicked, textDone, rating);
        try {
          if (window.location.hash.indexOf('rc_auto=') !== -1) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } catch (e) {}
      }
    }, 300);
  }

  function showBanner(stars, text, rating) {
    var existing = document.getElementById('reviewcraft-autofill-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'reviewcraft-autofill-banner';
    banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#034665;color:#ffffff;padding:12px 24px;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.35);z-index:9999999;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;border:2px solid #068dcb;';
    banner.innerHTML = '<span style="font-size:18px;">✨</span> <span>ReviewCraft Auto-Filled: ' + rating + '★ & Review Text Ready! Click <strong>Post</strong> to submit.</span>';
    document.body.appendChild(banner);
    setTimeout(function () { banner.remove(); }, 6000);
  }

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
 * Minified, encoded Bookmarklet URI ready to be set as <a href={BOOKMARKLET_HREF}>
 */
export const BOOKMARKLET_HREF = `javascript:${encodeURIComponent(BOOKMARKLET_RAW_CODE.replace(/\s+/g, ' ').trim())}`;

