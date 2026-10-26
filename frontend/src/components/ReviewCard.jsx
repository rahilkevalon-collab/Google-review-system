import React from 'react';
import { 
  ExternalLink, 
  Star,
  Globe,
  Building,
  CheckCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';
import { syncReviewToExtension, triggerExtensionAutoFill } from '../utils/extensionSync';

export default function ReviewCard({ review, company = {}, isActive = false, onSelect }) {
  const { addToast } = useToast();
  const reviewId = review?.id || review?._id;
  const ratingVal = Math.max(1, Math.min(5, Math.round(Number(review.rating)) || 5));

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
    
    // Persist as the active selected review in localStorage
    try {
      localStorage.setItem('reviewcraft_active_selected_review', JSON.stringify(review));
      if (company?.id) {
        localStorage.setItem(`reviewcraft_active_selected_review_${company.id}`, JSON.stringify(review));
      }
    } catch (err) {}

    if (onSelect) {
      onSelect(review);
    }

    // 1. Copy review text to clipboard (reliable fallback)
    await copyToClipboard();
    if (reviewId) {
      api.recordCopyEvent(reviewId).catch(() => {});
    }

    // 2. Dispatch event for ReviewCraft Chrome Extension to auto-fill review text & stars on Google
    triggerExtensionAutoFill(review, company);

    addToast(`Review copied! Opening Google — ReviewCraft extension will auto-paste text & select ${ratingVal} stars.`, 'success', 4000);
    
    setTimeout(() => {
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    }, 100);
  };

  const handleCardInteraction = () => {
    try {
      localStorage.setItem('reviewcraft_active_selected_review', JSON.stringify(review));
      if (company?.id) {
        localStorage.setItem(`reviewcraft_active_selected_review_${company.id}`, JSON.stringify(review));
      }
    } catch (err) {}

    if (onSelect) {
      onSelect(review);
    }
    syncReviewToExtension(review, company, 'card_select');
  };

  return (
    <div
      onClick={handleCardInteraction}
      className={`glass-card group p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden bg-white border transition-all duration-200 font-sans cursor-pointer ${
        isActive 
          ? 'border-[#068dcb] ring-2 ring-[#068dcb]/25 shadow-lg shadow-[#068dcb]/10' 
          : 'border-slate-200 hover:border-[#068dcb]/40 hover:shadow-xl hover:shadow-[#068dcb]/10'
      }`}
    >
      {/* Top badges */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {review.companyName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold shadow-2xs">
                <Building className="w-3 h-3 text-[#068dcb]" />
                {review.companyName}
              </span>
            )}

            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#068dcb] text-white text-[10px] font-bold shadow-xs">
                <CheckCircle className="w-3 h-3 text-white" />
                Active for Google
              </span>
            )}
          </div>

          {/* Rating stars */}
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

        {/* Review Body */}
        <div className="my-3">
          <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-semibold group-hover:text-slate-900 transition-colors">
            "{review.reviewText}"
          </p>
        </div>
      </div>

      {/* Card Action Row (Auto-copy text removed, opens Google directly & auto-fills) */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-end">
        {/* Open Google Reviews Button */}
        <button
          type="button"
          onClick={handleOpenGoogle}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white shadow-md shadow-[#068dcb]/25 active:scale-95 transition-all cursor-pointer"
          title="Open Google Review dialog and auto-fill"
        >
          <Globe className="w-3.5 h-3.5 text-white" />
          <span>Open Google</span>
          <ExternalLink className="w-3 h-3 text-white/80" />
        </button>
      </div>
    </div>
  );
}
