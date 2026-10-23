import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  Tag, 
  Star,
  Globe,
  Building,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

export default function ReviewCard({ review }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  const reviewId = review?.id || review?._id;

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

  // 1. One-click Copy Review handler
  const handleCopyReview = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard();
    if (ok) {
      setCopied(true);
      addToast('Review text copied to clipboard!', 'success');
      if (reviewId) {
        api.recordCopyEvent(reviewId).catch(() => {});
      }
      setTimeout(() => setCopied(false), 2500);
    } else {
      addToast('Failed to copy to clipboard.', 'error');
    }
  };

  // 2. Open Google Reviews handler
  const handleOpenGoogle = async (e) => {
    e.stopPropagation();
    const googleUrl = getGoogleReviewUrl(review);
    
    // Copy review text first so user can simply paste it on Google
    await copyToClipboard();
    if (reviewId) {
      api.recordCopyEvent(reviewId).catch(() => {});
    }

    addToast('Review text copied! Opening Google Reviews — please paste and submit your review.', 'info', 6000);
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  // 3. Card click navigates to /review/:reviewId for editing
  const handleCardClick = () => {
    if (reviewId) {
      navigate(`/review/${reviewId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="glass-card group p-5 rounded-2xl flex flex-col justify-between cursor-pointer relative overflow-hidden bg-white border border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-200 font-sans"
      title="Click card to view details or edit suggestion"
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

          {/* Clearly labelled Demo / Real Rating stars */}
          {(() => {
            const ratingVal = Math.round(Number(review.rating)) || 5;
            const isDemo = review.isDemo !== false && review.ratingType !== 'real';
            return (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"
                title={isDemo ? "AI-generated synthetic demo suggestion - not a verified customer rating" : "Verified Customer Rating"}
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <Star 
                      key={starNum} 
                      className={`w-3 h-3 ${
                        starNum <= ratingVal 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'fill-slate-200 text-slate-300'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-[10px] text-amber-900 font-bold ml-0.5">
                  {ratingVal.toFixed(1)} {isDemo ? '(Demo)' : ''}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Review Body (Clean sans-serif, bold/semibold font-weight 600, no italic) */}
        <div className="my-3">
          <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed font-semibold group-hover:text-slate-900 transition-colors">
            "{review.reviewText}"
          </p>
        </div>
      </div>

      {/* Card Action Row */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        
        {/* Edit / Details hint */}
        <span className="text-[11px] text-slate-400 group-hover:text-purple-600 transition-colors font-medium flex items-center gap-1">
          <Edit3 className="w-3 h-3" />
          Click card to edit
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Copy Review Button */}
          <button
            type="button"
            onClick={handleCopyReview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 active:scale-95'
            }`}
            title="Copy review text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-purple-600" />
                <span>Copy Review</span>
              </>
            )}
          </button>

          {/* Open Google Reviews Button */}
          <button
            type="button"
            onClick={handleOpenGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
            title="Copy review and open Google Review page"
          >
            <Globe className="w-3.5 h-3.5 text-white" />
            <span>Open Google</span>
            <ExternalLink className="w-3 h-3 text-white/80" />
          </button>

        </div>
      </div>

    </div>
  );
}
