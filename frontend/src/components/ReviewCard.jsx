import React from 'react';
import { 
  ExternalLink, 
  Tag, 
  Star,
  Globe,
  Building
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

export default function ReviewCard({ review }) {
  const { addToast } = useToast();
  const reviewId = review?.id || review?._id;
  const ratingVal = Math.round(Number(review.rating)) || 5;

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(review.reviewText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = review.reviewText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      return false;
    }
  };

  // Open Google Reviews handler: Copies text directly & launches verified review modal
  const handleOpenGoogle = async (e) => {
    e.stopPropagation();
    const googleUrl = getGoogleReviewUrl(review);
    const ratingVal = Math.round(Number(review.rating)) || 5;
    
    // 1. Copy review text to clipboard (reliable fallback)
    await copyToClipboard();
    if (reviewId) {
      api.recordCopyEvent(reviewId).catch(() => {});
    }

    // 2. Dispatch event for ReviewCraft Chrome Extension to auto-fill review text & stars on Google
    window.postMessage({
      type: 'REVIEW_CRAFT_AUTOFILL',
      payload: {
        text: review.reviewText,
        rating: ratingVal,
        companyName: review.companyName || '',
        timestamp: Date.now()
      }
    }, '*');

    addToast(`Review copied! Opening Google — ReviewCraft extension will auto-paste text & select ${ratingVal} stars.`, 'success', 4000);
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="glass-card group p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden bg-white border border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-200 font-sans"
    >
      {/* Top badges */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {review.companyName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold shadow-2xs">
                <Building className="w-3 h-3 text-purple-600" />
                {review.companyName}
              </span>
            )}
            {/* Display relevant keyword labels for this specific review card */}
            {Array.isArray(review.selectedKeywords) && review.selectedKeywords.length > 0 ? (
              review.selectedKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold"
                >
                  <Tag className="w-3 h-3 text-purple-600" />
                  {kw}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <Tag className="w-3 h-3 text-purple-600" />
                {review.keyword || 'Featured'}
              </span>
            )}
          </div>

          {/* Rating stars without Demo label */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"
            title={`${ratingVal}.0 Star Review`}
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((starNum) => (
                <Star 
                  key={starNum} 
                  className={`w-3.5 h-3.5 ${
                    starNum <= ratingVal 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'fill-slate-200 text-slate-300'
                  }`} 
                />
              ))}
            </div>
            <span className="text-xs text-amber-900 font-bold ml-0.5">
              {ratingVal.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Review Body (Clean sans-serif, bold/semibold font-weight 600, no italic) */}
        <div className="my-3">
          <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-semibold group-hover:text-slate-900 transition-colors">
            "{review.reviewText}"
          </p>
        </div>
      </div>

      {/* Card Action Row: Clean 1-click Open Google button */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 font-medium">
          Auto-copy & launch
        </span>

        {/* Open Google Reviews Button */}
        <button
          type="button"
          onClick={handleOpenGoogle}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
          title="Copy review text and open Google Review dialog"
        >
          <Globe className="w-3.5 h-3.5 text-white" />
          <span>Open Google</span>
          <ExternalLink className="w-3 h-3 text-white/80" />
        </button>
      </div>
    </div>
  );
}


