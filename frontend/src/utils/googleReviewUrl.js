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

  // 1. If explicit direct Google Search write-review URL exists (with #lrd=...): use it directly to bypass Google Maps
  if (link && link.includes('#lrd=')) {
    baseUrl = link;
  } else if (name.toLowerCase().includes('kevalon')) {
    // 2. Verified direct Google Search review modal (Bypasses Google Maps redirect completely)
    baseUrl = 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  } else if (link && link.startsWith('http') && !link.includes('writereview')) {
    // 3. Custom review URL
    baseUrl = link;
  } else if ((item.googlePlaceId || item.placeId || '').trim()) {
    // 4. Fallback to Google Place ID write-review dialog
    const placeId = (item.googlePlaceId || item.placeId || '').trim();
    baseUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  } else {
    // 5. Clean Google Search Business Review query
    // Keep city name, strip repetitive country strings so Google triggers Knowledge Graph card
    const primaryCity = loc ? loc.split(',')[0].trim() : '';
    const queryTokens = [name, primaryCity || loc, 'reviews'].filter(Boolean);
    const cleanSearchQuery = queryTokens.join(' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    baseUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanSearchQuery)}`;
  }

  return baseUrl;
}


