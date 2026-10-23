import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Save, 
  Globe, 
  ExternalLink, 
  Tag, 
  Building2, 
  MapPin,
  Calendar, 
  Star, 
  Sparkles, 
  Info, 
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

export default function ReviewDetail() {
  const { id, reviewId } = useParams();
  const effectiveId = reviewId || id;
  const { addToast } = useToast();

  const [review, setReview] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadReviewAndCompany() {
      try {
        const res = await api.getReviewById(effectiveId);
        if (!isMounted) return;

        if (res.success && res.review) {
          const rev = res.review;
          setReview(rev);
          setReviewText(rev.reviewText || '');

          // If companyId exists, fetch latest company details for address, placeId etc.
          if (rev.companyId) {
            try {
              const compRes = await api.getCompanyById(rev.companyId);
              if (compRes.success && compRes.company) {
                setCompany(compRes.company);
              }
            } catch (e) {
              console.warn('Could not fetch companion company:', e);
            }
          }
        } else {
          setError('Review suggestion not found in database.');
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Error loading review suggestion.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReviewAndCompany();
    return () => { isMounted = false; };
  }, [effectiveId]);

  const copyToClipboard = async () => {
    if (!reviewText.trim()) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reviewText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reviewText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard();
    if (ok) {
      setIsCopied(true);
      addToast('Review text copied to clipboard successfully!', 'success');
      api.recordCopyEvent(effectiveId).catch(() => {});
      setTimeout(() => setIsCopied(false), 3000);
    } else {
      addToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleOpenGoogle = async () => {
    // Copy review text first
    await copyToClipboard();
    api.recordCopyEvent(effectiveId).catch(() => {});

    // Resolve URL with placeId or fallback
    const targetItem = {
      ...review,
      ...(company || {})
    };
    const googleUrl = getGoogleReviewUrl(targetItem);

    addToast('Review text copied! Opening Google Reviews — please paste and submit your review.', 'info', 6000);
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveEdits = async () => {
    if (!reviewText.trim()) {
      addToast('Review text cannot be empty.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.patchReviewText(effectiveId, reviewText);
      if (res.success && res.review) {
        setReview(res.review);
        addToast('Review updated and persisted to MongoDB!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Error updating review text.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded-lg animate-pulse"></div>
        <div className="h-44 bg-[#0e1227] rounded-3xl border border-purple-500/20 animate-pulse"></div>
        <div className="h-64 bg-[#0e1227] rounded-3xl border border-purple-500/20 animate-pulse"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl glass-panel text-center space-y-5 border border-purple-500/20">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Review Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This review suggestion does not exist.'}</p>
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Business Setup</span>
        </Link>
      </div>
    );
  }

  const wordCount = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const charCount = reviewText.length;
  const companyName = review.companyName || company?.name || 'Business Profile';
  const companyAddress = company?.formattedAddress || company?.location || review.companyLocation || '';
  const returnCompanyId = review.companyId || company?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div>
        <Link
          to={returnCompanyId ? `/reviews/${returnCompanyId}` : '/setup'}
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-300 hover:text-white transition-colors py-2 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-purple-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {companyName} Reviews</span>
        </Link>
      </div>

      {/* Review Header Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-4 relative overflow-hidden bg-slate-950/80 border border-purple-500/20 shadow-2xl">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {review.keyword || (review.selectedKeywords && review.selectedKeywords[0]) || 'Featured'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 text-xs font-medium capitalize">
              Tone: {review.tone || 'Natural'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 text-xs font-medium uppercase">
              {review.language || 'EN'}
            </span>
            {review.isUserEdited && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-200 border border-purple-500/30 text-xs font-medium">
                User Edited
              </span>
            )}
          </div>

          {/* Clearly labelled Demo / Real Rating */}
          {(() => {
            const ratingVal = Number(review.rating) || 5;
            const isDemo = review.isDemo !== false && review.ratingType !== 'real';
            return (
              <div 
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold"
                title={isDemo ? "Demonstration rating preview - not a verified customer rating" : "Verified Customer Rating"}
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <Star 
                      key={starNum} 
                      className={`w-3.5 h-3.5 ${
                        starNum <= ratingVal 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'fill-slate-800/80 text-slate-700'
                      }`} 
                    />
                  ))}
                </div>
                <span className="ml-1">{ratingVal.toFixed(1)}</span>
                <span className="text-[10px] text-amber-200/80 font-normal ml-0.5">
                  {isDemo ? '(Demo Rating)' : '(Verified Rating)'}
                </span>
              </div>
            );
          })()}
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-purple-300/80 mb-1 font-medium flex-wrap">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold text-white">{companyName}</span>
            {companyAddress && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {companyAddress}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Review Suggestion Editor
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-3 border-t border-purple-500/15">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            ID: <code className="text-purple-300 font-mono text-[11px]">{review.id || effectiveId}</code>
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Source: {review.source === 'google-gemini' ? 'Gemini AI Model' : 'Template Synthesis'}
          </span>
        </div>

      </div>

      {/* Editable Review Text Box */}
      <div className="p-6 sm:p-7 rounded-3xl glass-panel border border-purple-500/20 bg-slate-950/80 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-purple-200/90 flex items-center gap-1.5">
            Editable Review Text
            <span className="text-[11px] font-normal text-slate-400 lowercase">(adapt to your genuine experience)</span>
          </label>
          <div className="text-xs text-slate-400 flex items-center gap-3 font-medium">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>

        <textarea
          rows={6}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Review text..."
          className="w-full p-4 rounded-2xl bg-slate-900/90 border border-purple-500/25 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 transition-colors leading-relaxed text-sm sm:text-base font-normal shadow-inner italic"
        />

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          <button
            type="button"
            onClick={handleSaveEdits}
            disabled={isSaving || reviewText === review.reviewText}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-purple-500/30 transition-all disabled:opacity-40 cursor-pointer active:scale-95 shadow-xs"
          >
            <Save className="w-3.5 h-3.5 text-purple-400" />
            <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
          </button>

          <div className="flex items-center gap-3">
            
            {/* One-Click Copy Review Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-purple-500/40'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-purple-300" />
                  <span>Copy Review Text</span>
                </>
              )}
            </button>

            {/* Separate Google Review Link Button */}
            <button
              type="button"
              onClick={handleOpenGoogle}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
              title="Copy review and open Google Review page"
            >
              <Globe className="w-4 h-4 text-purple-200" />
              <span>Open Google Reviews</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-200" />
            </button>

          </div>

        </div>

        {/* Explanatory note on separate actions */}
        <p className="text-xs text-slate-400 pt-3 border-t border-purple-500/15 leading-relaxed">
          * Note: Copying the review text and opening Google Reviews are separate actions. In compliance with review policies, AI suggestions are never automatically submitted to Google.
        </p>

      </div>

      {/* Suggestion Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-3 text-xs text-purple-200 shadow-md">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          This draft suggestion was created with ReviewCraft's NLP synthesis engine and verified against duplicate suggestions using Scikit-Learn TF-IDF cosine similarity. Please customize the text to ensure it reflects your genuine customer experience.
        </p>
      </div>

    </div>
  );
}
