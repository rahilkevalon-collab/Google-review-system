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

  // 1. If explicit googlePlaceId exists: direct Google write-review dialog for that specific place
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 2. Exact Branch Location Targeting:
  // When an end user specifies a branch location (e.g. "Nikol, Ahmedabad", "Surat", "C.G. Road", etc.),
  // target that exact branch on Google Maps so the review is added to that specific branch.
  if (loc) {
    const lowerName = name.toLowerCase();
    const lowerLoc = loc.toLowerCase().trim();

    // Only use the verified Kevalon HQ link if specifically set to the default Ahmedabad HQ demo address
    if (lowerName.includes('kevalon') && (lowerLoc === 'ahmedabad, gujarat, india' || lowerLoc === 'ahmedabad, india' || lowerLoc === 'ahmedabad')) {
      return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
    }

    // Include full branch location (clean extra spaces and special characters for optimal Google Maps branch resolution)
    const cleanLoc = loc.replace(/\s+/g, ' ').trim();
    const branchQuery = `${name} ${cleanLoc}`.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchQuery)}`;
  }

  // 3. If explicit direct Google Search write-review URL exists (with #lrd=...): use it directly
  if (link && link.includes('#lrd=')) {
    return link;
  }

  // 4. Verified direct Google Search review modal for known demo businesses (Bypasses Google Maps completely)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('kevalon')) {
    return 'https://www.google.com/search?q=Kevalon+Technology+Ahmedabad%2C+Gujarat%2C+India+reviews#lrd=0xa753f42277dc0a43:0xfc0ef4d084adee2d,3,,,';
  }
  if (lowerName.includes('amazon')) {
    return 'https://www.google.com/search?q=Amazon+India+reviews#lrd=0x395e8b4dc3faaaab:0xcecd65884d1f6b7,3,,,';
  }
  if (lowerName.includes('flora') && lowerName.includes('fountain')) {
    return 'https://www.google.com/search?q=Flora+Fountain+Ahmedabad+reviews#lrd=0x395e8484a0c86845:0x5e2ea710a76a5b6f,3,,,';
  }

  // 5. Custom direct review URL (e.g. g.page/r/..., maps.app.goo.gl, etc.)
  if (link && link.startsWith('http') && !link.includes('google.com/search') && !link.includes('writereview/')) {
    if (link.includes('maps/search')) {
      return link.replace(/\+reviews/gi, '').replace(/%20reviews/gi, '').replace(/reviews/gi, '');
    }
    return link;
  }

  // 6. Default Google Maps Search URL
  const query = [name, loc].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}


