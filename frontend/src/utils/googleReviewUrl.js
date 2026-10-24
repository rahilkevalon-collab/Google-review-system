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
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();

  // 1. If explicit direct Google Search write-review URL exists (with #lrd=...): use it directly to bypass Google Maps
  if (link && link.includes('#lrd=')) {
    return link;
  }

  // 2. Verified direct Google Search review modal (Bypasses Google Maps redirect completely)
  if (name.toLowerCase().includes('kevalon')) {
    return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  }

  // 3. Custom review URL
  if (link && link.startsWith('http')) {
    const isBareWriteReview =
      link === 'https://search.google.com/local/writereview' ||
      link === 'https://search.google.com/local/writereview/' ||
      (link.startsWith('https://search.google.com/local/writereview') && !link.includes('placeid='));

    if (!isBareWriteReview) {
      return link;
    }
  }

  // 4. Fallback to Google Place ID write-review dialog
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 5. Fallback to Google Search Business Review query
  const queryParts = [name, loc, 'reviews'].filter(Boolean);
  if (queryParts.length > 1) {
    return `https://www.google.com/search?q=${encodeURIComponent(queryParts.join(' '))}`;
  }

  if (name) {
    return `https://www.google.com/search?q=${encodeURIComponent(name + ' reviews')}`;
  }

  return 'https://www.google.com/maps';
}

