import React from 'react';
import { 
  ArrowRight, 
  Star,
  Globe,
  Building,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';
import { triggerExtensionAutoFill } from '../utils/extensionSync';

export default function ReviewCard({ review, company = {}, isActive = false, onSelect }) {
  const { addToast } = useToast();
  const reviewId = review?.id || review?._id;
  const ratingVal = Math.max(1, Math.min(5, Math.round(Number(review.rating)) || 5));

  const copyToClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(review.reviewText).catch(() => {});
      }
      const textArea = document.createElement('textarea');
      textArea.value = review.reviewText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      return false;
    }
  };

  // Open Google Reviews handler: Copies text directly & launches verified review modal
  // Triggered when user taps ANYWHERE on the card or the button
  const handleOpenGoogle = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const mergedTarget = { ...(company || {}), ...(review || {}) };
    const googleUrl = getGoogleReviewUrl(mergedTarget);
    
    try {
      localStorage.setItem('reviewcraft_active_selected_review', JSON.stringify(review));
      if (company?.id) {
        localStorage.setItem(`reviewcraft_active_selected_review_${company.id}`, JSON.stringify(review));
      }
    } catch (err) {}

    if (onSelect) {
      onSelect(review);
    }

    // 1. Dispatch event for ReviewCraft Chrome Extension synchronously
    try {
      triggerExtensionAutoFill(review, company);
    } catch (e) {}

    // 2. Copy review text to clipboard synchronously to preserve user gesture
    copyToClipboard();
    if (reviewId) {
      api.recordCopyEvent(reviewId).catch(() => {});
    }

    // 3. User notification
    addToast(`Review text copied to clipboard! (5.0 Stars) Opening Google...`, 'success', 3500);

    // 4. On mobile devices, navigate directly via window.location.href to guarantee native Google Review dialog triggers
    // without popup blocking. On desktop PC, open in a new tab.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    if (isMobile) {
      window.location.href = googleUrl;
    } else {
      const win = window.open(googleUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = googleUrl;
      }
    }
  };

  return (
    <div
      onClick={handleOpenGoogle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenGoogle(e);
        }
      }}
      role="button"
      tabIndex={0}
      title="Click anywhere on card to copy review & open Google Reviews"
      className={`glass-card group p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden bg-white border transition-all duration-200 font-sans cursor-pointer active:scale-[0.99] select-none ${
        isActive 
          ? 'border-[#068dcb] ring-2 ring-[#068dcb]/25 shadow-lg shadow-[#068dcb]/10' 
          : 'border-slate-200/80 hover:border-[#068dcb]/50 shadow-sm hover:shadow-md'
      }`}
    >
      <div>
        {/* Card Header: Company & Location Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {company?.name && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#034665] border border-sky-100 text-xs font-semibold max-w-[200px] truncate">
              <Building className="w-3.5 h-3.5 shrink-0 text-[#068dcb]" />
              <span className="truncate">{company.name}</span>
            </span>
          )}

          {(company?.location || company?.formattedAddress) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 text-xs font-medium max-w-[220px] truncate">
              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="truncate">{company.location || company.formattedAddress}</span>
            </span>
          )}
        </div>

        {/* Star Rating Badges */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/60">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < ratingVal
                      ? 'fill-amber-400 text-amber-500'
                      : 'fill-slate-100 text-slate-300'
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

      {/* Card Action Row */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-end">
        {/* Post on Google Button */}
        <button
          type="button"
          onClick={handleOpenGoogle}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#034665] to-[#068dcb] group-hover:from-[#068dcb] group-hover:to-[#2ec5ff] group-hover:shadow-lg group-hover:shadow-[#068dcb]/35 hover:brightness-110 text-white shadow-md shadow-[#068dcb]/25 active:scale-95 transition-all cursor-pointer"
          title="Post review on Google"
        >
          <Globe className="w-3.5 h-3.5 text-white" />
          <span>Post on Google</span>
          <ArrowRight className="w-3 h-3 text-white/80" />
        </button>
      </div>
    </div>
  );
}
