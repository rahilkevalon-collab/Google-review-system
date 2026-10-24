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
  const text = item.reviewText || item.text || '';
  const rating = Math.round(Number(item.rating)) || 5;

  let baseUrl = '';

  // 1. If explicit direct Google Search write-review URL exists (with #lrd=...): use it directly
  if (link && link.includes('#lrd=')) {
    return link;
  }

  // 2. Verified direct Google Search review modal for Kevalon
  if (name.toLowerCase().includes('kevalon')) {
    return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  }

  // 3. Fallback to Google Place ID write-review dialog
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 4. Custom direct review URL (e.g. g.page/r/..., maps.app.goo.gl, etc.)
  // Strictly ignore bare google.com/search URLs (which have no review modal and trigger AI overviews)
  if (link && link.startsWith('http') && !link.includes('google.com/search') && !link.includes('writereview/')) {
    if (link.includes('maps/search')) {
      return link.replace(/\+reviews/gi, '').replace(/%20reviews/gi, '').replace(/reviews/gi, '');
    }
    return link;
  }

  // 5. Google Maps Search URL (Opens the exact business profile on Google Maps with Write a Review button, bypassing AI Overviews completely)
  const primaryCity = loc ? loc.split(',')[0].trim() : '';
  const queryTokens = [name, primaryCity || loc].filter(Boolean);
  const cleanSearchQuery = queryTokens.join(' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanSearchQuery)}`;
}


