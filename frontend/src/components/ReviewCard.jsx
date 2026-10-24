import React, { useState } from 'react';
import { 
  ExternalLink, 
  Tag, 
  Star,
  Globe,
  Building,
  CheckCircle2,
  Copy,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

export default function ReviewCard({ review }) {
  const { addToast } = useToast();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedInModal, setCopiedInModal] = useState(false);
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

  // Open Google Reviews handler: Copies text directly, opens Google modal, & shows step guide
  const handleOpenGoogle = async (e) => {
    e.stopPropagation();
    const googleUrl = getGoogleReviewUrl(review);
    
    // Copy review text first so user can simply paste it on Google
    await copyToClipboard();
    if (reviewId) {
      api.recordCopyEvent(reviewId).catch(() => {});
    }

    addToast(`Review text copied! Opening Google Review page — paste (Ctrl+V) and select ${ratingVal} stars.`, 'success', 5000);
    setShowGuideModal(true);
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  const handleModalCopyAgain = async () => {
    const ok = await copyToClipboard();
    if (ok) {
      setCopiedInModal(true);
      setTimeout(() => setCopiedInModal(false), 2000);
    }
  };

  return (
    <>
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

      {/* Interactive Helper Modal showing clear instructions */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative animate-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Review Text Copied!
                </h3>
                <p className="text-xs text-slate-500">
                  Google Review dialog has opened in your new tab
                </p>
              </div>
            </div>

            {/* 2 Simple Steps */}
            <div className="space-y-3 bg-purple-50/60 border border-purple-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Paste Review Text:
                  </p>
                  <p className="text-xs text-slate-600">
                    Click the box in Google and press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">Ctrl + V</kbd> (or Right Click → Paste).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Select Star Rating:</span>
                    <span className="text-amber-500 font-bold">
                      {ratingVal} Stars {'★'.repeat(ratingVal)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Tap the {ratingVal}th star and click <strong>Post</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Review Text Preview box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Copied Review Text:</span>
                <button
                  type="button"
                  onClick={handleModalCopyAgain}
                  className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-bold cursor-pointer"
                >
                  {copiedInModal ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied again!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Again</span>
                    </>
                  )}
                </button>
              </div>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium line-clamp-3 italic">
                "{review.reviewText}"
              </p>
            </div>

            {/* Note on security */}
            <p className="text-[11px] text-slate-400 leading-normal">
              💡 <em>Browser security (Same-Origin Policy) protects your Google account by requiring you to paste and verify reviews directly.</em>
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all cursor-pointer text-center"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

