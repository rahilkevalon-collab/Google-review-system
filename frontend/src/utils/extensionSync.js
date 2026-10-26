/**
 * ReviewCraft Website <-> Chrome Extension Bridge
 * 
 * Provides robust, bidirectional synchronization between the ReviewCraft React web app
 * and the ReviewCraft Chrome Extension.
 * 
 * Features:
 * - Assigns monotonically increasing timestamp/version to prevent stale overwrites.
 * - Dispatches window.postMessage for content-webapp.js.
 * - Backs up active payload in website localStorage for instant restoration on page refresh.
 * - Exposes extension detection and status checks.
 */

let lastDispatchedVersion = 0;

/**
 * Checks whether the ReviewCraft extension content script is currently injected and active.
 *
 * @returns {boolean}
 */
export function isExtensionActive() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.documentElement.getAttribute('data-reviewcraft-extension-active'));
}

/**
 * Synchronizes a review suggestion with the Chrome Extension.
 *
 * @param {Object} review - The review object
 * @param {Object} company - The company profile
 * @param {string} source - 'auto_sync' | 'card_select' | 'open_google' | 'detail_edit' | 'refresh_restore'
 * @returns {Object|null}
 */
export function syncReviewToExtension(review, company = {}, source = 'auto_sync') {
  if (!review) return null;
  const reviewText = (review.reviewText || review.text || '').trim();
  if (!reviewText) return null;

  const version = Date.now();
  // Ensure version is strictly greater than last dispatched
  const effectiveVersion = version > lastDispatchedVersion ? version : lastDispatchedVersion + 1;
  lastDispatchedVersion = effectiveVersion;

  const ratingVal = Math.max(1, Math.min(5, Math.round(Number(review.rating)) || 5));
  const companyName = review.companyName || company?.name || '';
  const companyLocation = review.companyLocation || company?.location || company?.formattedAddress || '';
  const googlePlaceId = review.googlePlaceId || company?.googlePlaceId || '';
  const googleReviewUrl = review.googleReviewUrl || company?.googleReviewUrl || review.externalReviewLink || '';
  const reviewId = review.id || review._id || `rev_${effectiveVersion}`;

  const payload = {
    companyId: company?.id || review.companyId || '',
    companyName,
    companyLocation,
    googlePlaceId,
    googleReviewUrl,
    reviewId,
    text: reviewText,
    rating: ratingVal,
    keyword: review.keyword || (Array.isArray(review.selectedKeywords) ? review.selectedKeywords[0] : '') || '',
    timestamp: effectiveVersion,
    version: effectiveVersion,
    source,
    status: source === 'open_google' ? 'ready' : 'synced'
  };

  // 1. Dispatch window event for content-webapp.js bridge
  try {
    window.postMessage({
      type: 'REVIEW_CRAFT_SYNC',
      payload
    }, '*');
  } catch (err) {
    console.warn('[ReviewCraft Sync] postMessage error:', err);
  }

  // 2. Persist in website localStorage as reliable backup across reloads
  try {
    localStorage.setItem('reviewcraft_active_extension_payload', JSON.stringify(payload));
  } catch (e) {}

  return payload;
}

/**
 * Dispatches an autofill trigger event right before opening Google Reviews.
 *
 * @param {Object} review - The review object
 * @param {Object} company - The company profile
 * @returns {Object|null}
 */
export function triggerExtensionAutoFill(review, company = {}) {
  const payload = syncReviewToExtension(review, company, 'open_google');
  if (!payload) return null;

  try {
    window.postMessage({
      type: 'REVIEW_CRAFT_AUTOFILL',
      payload
    }, '*');
  } catch (err) {
    console.warn('[ReviewCraft Sync] Autofill trigger error:', err);
  }

  return payload;
}

/**
 * Sends a ping to the extension bridge to request acknowledgment and presence.
 */
export function pingExtension() {
  try {
    window.postMessage({ type: 'REVIEW_CRAFT_PING' }, '*');
  } catch (e) {}
}
