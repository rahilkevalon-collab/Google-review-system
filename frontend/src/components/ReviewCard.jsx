import React, { useState } from 'react';
import { 
  Check, 
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
  const [copied, setCopied] = useState(false);

  const handleCardClick = async () => {
    const googleUrl = getGoogleReviewUrl(review);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(review.reviewText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = review.reviewText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      addToast('Review copied! Opening Google Review page...', 'success');
      
      // Track analytics copy event on backend
      api.recordCopyEvent(review.id).catch(() => {});
      
      // Open Google Review Link immediately (guaranteed valid URL, no 400 error)
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
      
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      addToast('Opening Google Review page...', 'info');
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="glass-card group p-5 rounded-2xl flex flex-col justify-between cursor-pointer relative overflow-hidden bg-white border border-slate-200/90 hover:border-indigo-500 hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
      title="Click to copy review and open Google Review page"
    >
      {/* Top badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {review.companyName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold shadow-2xs">
              <Building className="w-3 h-3 text-indigo-400" />
              {review.companyName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
            <Tag className="w-3 h-3 text-indigo-500" />
            {review.keyword}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium capitalize">
            {review.tone || 'Natural'}
          </span>
        </div>

        {/* 5-Star Indicator */}
        <div 
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"
        >
          <div className="flex items-center text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="ml-1">5.0</span>
        </div>
      </div>

      {/* Review Body */}
      <div className="my-2.5 flex-1">
        <p className="text-sm text-slate-800 leading-relaxed font-normal group-hover:text-slate-950 transition-colors">
          "{review.reviewText}"
        </p>
      </div>

      {/* Card Action Button: Click to copy and open Google */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors font-medium flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Click to copy & post
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied! Opening...</span>
            </>
          ) : (
            <>
              <span>Copy & Post on Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}
