/**
 * Resolves a reliable, verified Google Review / Business link.
 * 
 * Flow:
 * 1. If explicit googlePlaceId exists: direct Google write-review dialog for that specific place.
 * 2. Official Google Maps search targeting the business name and location:
 *    Always opens Google Maps with the exact business location pinned and the review modal.
 * 3. Custom direct review URL (e.g. g.page/r/..., maps.app.goo.gl, etc.)
 */
export function getGoogleReviewUrl(item = {}) {
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();

  // 1. If explicit googlePlaceId exists: direct Google write-review dialog for that specific place
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 2. Custom valid Google Maps direct URL (e.g. maps.app.goo.gl, g.page/r/..., google.com/maps...)
  if (link && link.startsWith('http') && !link.includes('google.com/search') && !link.includes('writereview/')) {
    if (link.includes('maps/search')) {
      return link.replace(/\+reviews/gi, '').replace(/%20reviews/gi, '').replace(/reviews/gi, '');
    }
    return link;
  }

  // 3. Exact Branch / Business Location on Google Maps:
  // Opens the business profile directly on Google Maps with location pin and review section
  const cleanLoc = loc ? loc.replace(/\s+/g, ' ').trim() : '';
  const query = [name, cleanLoc].filter(Boolean).join(' ').trim();
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return 'https://www.google.com/maps';
}
