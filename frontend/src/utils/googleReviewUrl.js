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
  // 1. Google Place ID takes highest priority (official direct write review modal)
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';

  // 2. Verified direct review links for known companies (e.g. Kevalon Technology direct write-review modal)
  if (name.toLowerCase().includes('kevalon')) {
    return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  }

  // 3. Custom review URL
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

  // 4. Fallback to Google Search Business Review query with review dialog anchor
  const queryParts = [name, loc, 'reviews'].filter(Boolean);

  if (queryParts.length > 1) {
    return `https://www.google.com/search?q=${encodeURIComponent(queryParts.join(' '))}`;
  }

  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, loc].filter(Boolean).join(' '))}`;
  }

  return 'https://www.google.com/maps';
}

