/**
 * Converts a Google hex feature pair (0x...:0x...) found in #lrd= URLs into
 * a canonical Google Place ID (ChIJ...) that opens directly on mobile devices & apps.
 */
export function hexFeatureToPlaceId(hexStr) {
  try {
    if (!hexStr || !hexStr.includes(':')) return null;
    const parts = hexStr.split(':');
    if (parts.length < 2) return null;
    const clean0 = parts[0].trim();
    const clean1 = parts[1].split(',')[0].trim();
    if (!clean0.startsWith('0x') || !clean1.startsWith('0x')) return null;

    const f1 = BigInt(clean0);
    const f2 = BigInt(clean1);

    const buf = new Uint8Array(20);
    buf[0] = 10;
    buf[1] = 18;
    buf[2] = 9;
    const view = new DataView(buf.buffer);
    view.setBigUint64(3, f1, true); // little-endian
    buf[11] = 17;
    view.setBigUint64(12, f2, true); // little-endian

    let binary = '';
    for (let i = 0; i < buf.byteLength; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return null;
  }
}

/**
 * Resolves a reliable, verified Google Review / Business link.
 * 
 * Supports both Mobile devices (Android/iOS) and Desktop:
 * - Direct search.google.com/local/writereview?placeid={PLACE_ID} opens the 5-star
 *   rating dialog DIRECTLY on phones (Google Maps App / Mobile Chrome) and Desktop!
 * - Converts #lrd hex links to Place IDs so mobile phones don't get stuck on Maps overview.
 */
export function getGoogleReviewUrl(item = {}) {
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();

  // 1. Explicit googlePlaceId / placeId -> Canonical direct writereview URL (works on phones & desktop)
  const placeId = (item.googlePlaceId || item.placeId || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // 2. Direct Write-Review Link already formatted
  if (link && link.includes('writereview?placeid=')) {
    return link;
  }

  // 3. Known verified Place ID for Kevalon Technology (ChIJQwrcdyL0U6cRLe6thND0Dvw)
  // Directly opens the 5-star review modal on mobile phones (Android/iOS) and desktop!
  const lowerName = name.toLowerCase();
  if (lowerName.includes('kevalon')) {
    return 'https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw';
  }

  // 4. Convert #lrd hex links into Place ID writereview URLs for full mobile support
  if (link && link.includes('#lrd=')) {
    const lrdPart = link.split('#lrd=')[1] || '';
    const hexMatch = lrdPart.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (hexMatch) {
      const convertedPid = hexFeatureToPlaceId(hexMatch[1]);
      if (convertedPid) {
        return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(convertedPid)}`;
      }
    }
    return link;
  }

  // 5. Shortlinks that directly trigger review form on mobile (g.page/r/..., maps.app.goo.gl)
  if (link && (link.includes('g.page/r/') || link.includes('maps.app.goo.gl'))) {
    return link;
  }

  // 6. Direct custom URL that is NOT a generic search
  if (link && link.startsWith('http') && !link.includes('maps/search') && !link.includes('google.com/search') && !link.includes('maps?q=')) {
    return link;
  }

  // 7. Fallback: Google search targeting company with reviews
  const cleanLoc = loc ? loc.replace(/\s+/g, ' ').trim() : '';
  const query = [name, cleanLoc].filter(Boolean).join(' ').trim();
  if (query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query + ' reviews')}`;
  }

  return 'https://www.google.com/maps';
}
