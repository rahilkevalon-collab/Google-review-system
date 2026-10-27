/**
 * Resolves a reliable, verified Google Review / Business link.
 * 
 * Supports both Mobile devices (Android/iOS) and Desktop:
 * - Direct #lrd / Place ID links open the exact "Write a review" modal directly on phones!
 * - Fallback to Google Maps Search for location targeting.
 */
export function getGoogleReviewUrl(item = {}) {
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();

  // 1. If explicit googlePlaceId exists: direct Google write-review dialog
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 2. Direct Write-Review Link (e.g. #lrd=..., g.page/r/..., maps.app.goo.gl):
  // Directly opens the review modal on BOTH mobile phones and desktop
  if (link && (link.includes('#lrd=') || link.includes('writereview') || link.includes('g.page/r/'))) {
    return link;
  }

  // 3. Known direct review modal for Kevalon (works directly on mobile phones & desktop)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('kevalon')) {
    return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  }

  // 4. Custom valid Google Maps direct URL
  if (link && link.startsWith('http') && !link.includes('google.com/search')) {
    return link;
  }

  // 5. Fallback: Google Maps search targeting company and location
  const cleanLoc = loc ? loc.replace(/\s+/g, ' ').trim() : '';
  const query = [name, cleanLoc].filter(Boolean).join(' ').trim();
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return 'https://www.google.com/maps';
}
