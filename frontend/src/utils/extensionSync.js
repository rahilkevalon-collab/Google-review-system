/**
 * ReviewCraft Website <-> Chrome Extension Bridge
 * Synchronizes generated reviews, active selections, and ratings automatically
 * with the ReviewCraft Chrome Extension via window.postMessage.
 * 
 * Works reliably on localhost, custom ports, and production without requiring hardcoded extension IDs.
 */

/**
 * Dispatches a review synchronization event to the ReviewCraft Chrome Extension.
 *
 * @param {Object} review - The review object (reviewText, rating, keyword, etc.)
 * @param {Object} company - The company profile object (name, id, location, placeId, etc.)
 * @param {string} source - 'auto_sync' | 'card_select' | 'open_google' | 'detail_edit'
 * @returns {Object|null} The formatted payload that was dispatched
 */
export function syncReviewToExtension(review, company = {}, source = 'auto_sync') {
  if (!review) return null;
  const reviewText = (review.reviewText || review.text || '').trim();
  if (!reviewText) return null;

  const ratingVal = Math.round(Number(review.rating)) || 5;
  const companyName = review.companyName || company?.name || '';
  const companyLocation = review.companyLocation || company?.location || company?.formattedAddress || '';
  const googlePlaceId = review.googlePlaceId || company?.googlePlaceId || '';
  const googleReviewUrl = review.googleReviewUrl || company?.googleReviewUrl || review.externalReviewLink || '';
  const reviewId = review.id || review._id || '';

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
    timestamp: Date.now(),
    source,
    status: source === 'open_google' ? 'ready' : 'synced'
  };

  try {
    window.postMessage({
      type: 'REVIEW_CRAFT_SYNC',
      payload
    }, '*');
  } catch (err) {
    console.warn('[ReviewCraft] Extension postMessage failed:', err);
  }

  return payload;
}

/**
 * Dispatches an explicit autofill trigger right before navigating to Google Reviews.
 *
 * @param {Object} review - The review object
 * @param {Object} company - The company profile object
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
    console.warn('[ReviewCraft] Autofill trigger failed:', err);
  }

  return payload;
}
