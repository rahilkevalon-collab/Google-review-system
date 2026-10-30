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
 * Resolves a reliable, verified Google Review / Business link for ANY company.
 * 
 * Flow:
 * 1. Checks explicit `googlePlaceId` or `placeId`.
 * 2. If missing, attempts to extract `placeid` or `place_id` from the provided URL.
 * 3. If URL contains `#lrd=0x...:0x...`, converts hex coordinates to a canonical Place ID.
 * 4. Whenever a Place ID is resolved, returns canonical:
 *    `https://search.google.com/local/writereview?placeid={PLACE_ID}`
 *    which opens Google's review dialog box directly on desktop and mobile!
 * 5. Supports direct shortlinks (g.page/r/..., maps.app.goo.gl/...) and custom review links.
 * 6. Fallback: Google Search targeting the exact business entity Knowledge Panel (without '+ reviews').
 * 7. Embeds `#rc_auto=` payload hash for extension / auto-filler fallback.
 */
export function getGoogleReviewUrl(item = {}) {
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || item.formattedAddress || '';
  const link = (item.googleReviewUrl || item.externalReviewLink || item.external_review_link || '').trim();

  let resolved = '';

  // 1. Check explicit Place ID
  let placeId = (item.googlePlaceId || item.placeId || '').trim();

  // 2. Extract Place ID from link if present
  if (!placeId && link) {
    const pidMatch = link.match(/[?&](?:placeid|place_id)=([^&#]+)/i);
    if (pidMatch) {
      placeId = decodeURIComponent(pidMatch[1]).trim();
    }
  }

  // 3. Extract and convert hex feature pair in #lrd= links if present
  if (!placeId && link && link.includes('#lrd=')) {
    const lrdPart = link.split('#lrd=')[1] || '';
    const hexMatch = lrdPart.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (hexMatch) {
      const convertedPid = hexFeatureToPlaceId(hexMatch[1]);
      if (convertedPid) {
        placeId = convertedPid;
      }
    }
  }

  // 4. Resolve destination URL based on extracted Place ID or link type
  if (placeId) {
    // Canonical direct write-review URL: opens Google Review dialog directly across all devices
    resolved = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  } else if (link && link.includes('writereview?placeid=')) {
    resolved = link;
  } else if (link && (link.includes('g.page/r/') || link.includes('maps.app.goo.gl'))) {
    resolved = link;
  } else if (link && link.includes('#lrd=')) {
    resolved = link;
  } else if (link && link.startsWith('http') && !link.includes('maps/search') && !link.includes('google.com/search') && !link.includes('maps?q=')) {
    resolved = link;
  } else {
    // Fallback: Google Search targeted directly at the business entity Knowledge Panel (do NOT append 'reviews')
    const cleanLoc = loc ? loc.replace(/\s+/g, ' ').trim() : '';
    const query = [name, cleanLoc].filter(Boolean).join(' ').trim();
    if (query) {
      resolved = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    } else {
      resolved = 'https://www.google.com/maps';
    }
  }

  // Embed review payload hash for 1-Click Auto-Filler
  const reviewText = (item.reviewText || item.text || '').trim();
  if (reviewText && !resolved.includes('rc_auto=')) {
    const ratingVal = Math.max(1, Math.min(5, Math.round(Number(item.rating)) || 5));
    const payload = encodeURIComponent(JSON.stringify({
      text: reviewText,
      rating: ratingVal,
      company: name
    }));
    if (resolved.includes('#')) {
      resolved += `&rc_auto=${payload}`;
    } else {
      resolved += `#rc_auto=${payload}`;
    }
  }

  return resolved;
}
