/**
 * Resolves a reliable, verified Google Review / Business link.
 * 
 * Flow:
 * 1. If googlePlaceId or placeId exists: https://search.google.com/local/writereview?placeid={placeId}
 * 2. If valid official URL exists (e.g. g.page/r/... or google.com/maps...): use it
 * 3. Fallback: Google Search / Maps review query with company name and location.
 * 
 * Prevents Google Error 400 caused by bare "https://search.google.com/local/writereview" missing placeid.
 */
export function getGoogleReviewUrl(item = {}) {
  // 1. Google Place ID takes highest priority
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 2. Custom review URL
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();
  if (link && link.startsWith('http')) {
    const isBareWriteReview =
      link === 'https://search.google.com/local/writereview' ||
      link === 'https://search.google.com/local/writereview/' ||
      (link.startsWith('https://search.google.com/local/writereview') && !link.includes('placeid='));

    if (!isBareWriteReview) {
      return link;
    }
  }

  // 3. Fallback to Google Search Business Review query
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const queryParts = [name, loc, 'reviews'].filter(Boolean);

  if (queryParts.length > 1) {
    return `https://www.google.com/search?q=${encodeURIComponent(queryParts.join(' '))}`;
  }

  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, loc].filter(Boolean).join(' '))}`;
  }

  return 'https://www.google.com/maps';
}
