/**
 * Resolves a reliable, working Google Review / Business link.
 * 
 * Prevents Google Error 400 caused by malformed or incomplete URLs like
 * "https://search.google.com/local/writereview" missing a "?placeid=" parameter.
 */
export function getGoogleReviewUrl(item = {}) {
  const link = (item.externalReviewLink || item.external_review_link || '').trim();

  // If a valid custom link is provided
  if (link) {
    const isBareWriteReview =
      link === 'https://search.google.com/local/writereview' ||
      link === 'https://search.google.com/local/writereview/' ||
      (link.startsWith('https://search.google.com/local/writereview') && !link.includes('placeid='));

    // If it's NOT the bare/broken writereview link, return the custom link directly
    if (!isBareWriteReview) {
      return link;
    }
  }

  // Construct Google Search / Maps query for the company
  const name = item.companyName || item.name || '';
  const loc = item.companyLocation || item.location || '';
  const queryParts = [name, loc].filter(Boolean);

  if (queryParts.length > 0) {
    // Official Google Maps search URL - opens the business details card with review section & "Write a review"
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryParts.join(' '))}`;
  }

  return 'https://www.google.com/maps';
}
