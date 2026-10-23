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
      className="glass-card group p-5 rounded-2xl flex flex-col justify-between cursor-pointer relative overflow-hidden bg-[#10142a]/95 border border-purple-500/20 hover:border-purple-400/60 hover:shadow-2xl hover:shadow-purple-950/40 transition-all duration-200"
      title="Click card to view details or edit suggestion"
    >
      {/* Top badges */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {review.companyName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-white text-[11px] font-bold shadow-xs">
                <Building className="w-3 h-3 text-purple-400" />
                {review.companyName}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-950/70 text-purple-300 border border-purple-500/30 text-xs font-semibold">
              <Tag className="w-3 h-3 text-purple-400" />
              {review.keyword || (review.selectedKeywords && review.selectedKeywords[0]) || 'Featured'}
            </span>
          </div>

          {/* Clearly labelled Demo Rating stars */}
          <div 
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold"
            title="Demonstration rating preview - not an actual customer rating"
          >
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[10px] text-amber-200/90 font-medium ml-1">5.0 (Demo)</span>
          </div>
        </div>

        {/* Review Body (Italic, readable) */}
        <div className="my-3">
          <p className="text-sm text-slate-200 leading-relaxed font-normal italic group-hover:text-white transition-colors">
            "{review.reviewText}"
          </p>
        </div>
      </div>

      {/* Card Action Row */}
      <div className="mt-4 pt-3.5 border-t border-purple-500/15 flex flex-wrap items-center justify-between gap-2">
        
        {/* Edit / Details hint */}
        <span className="text-[11px] text-slate-400 group-hover:text-purple-300 transition-colors font-medium flex items-center gap-1">
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
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-purple-500/30 active:scale-95'
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
                <Copy className="w-3.5 h-3.5 text-purple-400" />
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
            <Globe className="w-3.5 h-3.5 text-purple-200" />
            <span>Open Google</span>
            <ExternalLink className="w-3 h-3 text-purple-200" />
          </button>

        </div>
      </div>

    </div>
  );
}
