import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Save, 
  Globe, 
  ExternalLink, 
  Tag, 
  Building, 
  Calendar, 
  Star, 
  Sparkles, 
  Info, 
  CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

export default function ReviewDetail() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getReviewById(id)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.review) {
          setReview(res.review);
          setReviewText(res.review.reviewText);
        } else {
          setError('Review not found.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error loading review suggestion.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  const handleCopy = async () => {
    if (!reviewText.trim()) return;
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

      setIsCopied(true);
      addToast('Review text copied to clipboard successfully!', 'success');
      
      api.recordCopyEvent(id).catch(() => {});
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      addToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleSaveEdits = async () => {
    if (!reviewText.trim()) {
      addToast('Review text cannot be empty.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.updateReviewText(id, reviewText);
      if (res.success && res.review) {
        setReview(res.review);
        addToast('Review updated and saved to MongoDB!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Error updating review text.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
        <div className="h-44 bg-white rounded-2xl border border-slate-200 shadow-xs"></div>
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-xs"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-200 w-16 h-16 flex items-center justify-center mx-auto">
          ✕
        </div>
        <h2 className="text-xl font-bold text-slate-900">Review Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This review suggestion does not exist.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Studio</span>
        </Link>
      </div>
    );
  }

  const wordCount = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const charCount = reviewText.length;
  const formattedDate = review.createdAt 
    ? new Date(review.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Studio</span>
        </Link>
      </div>

      {/* Review Header Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-4 relative overflow-hidden bg-white border border-slate-200 shadow-xs">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {review.keyword}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium capitalize">
              Tone: {review.tone || 'Natural'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium uppercase">
              {review.language || 'EN'}
            </span>
            {review.isUserEdited && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                User Edited
              </span>
            )}
          </div>

          {/* Synthetic Demo Rating Disclaimer Indicator */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold"
            title="Synthetic demo metric - not a verified customer rating"
          >
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>5.0</span>
            <span className="text-[10px] text-amber-700 font-normal">(Synthetic Demo)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span>{review.companyName || 'Business Profile'}</span>
            <span>•</span>
            <span>{review.category}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Review Suggestion Details
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Generated: {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Source: {review.source === 'google-gemini' ? 'Gemini AI Model' : 'Template Demo Engine'}
          </span>
          {review.copyCount > 0 && (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Copied {review.copyCount} time{review.copyCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

      </div>

      {/* Editable Review Text Box */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            Editable Review Text
            <span className="text-[11px] font-normal text-slate-500 lowercase">(feel free to personalize)</span>
          </label>
          <div className="text-xs text-slate-500 flex items-center gap-3 font-medium">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>

        <textarea
          rows={6}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Review text..."
          className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed text-sm sm:text-base font-normal shadow-2xs"
        />

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          <button
            type="button"
            onClick={handleSaveEdits}
            disabled={isSaving || reviewText === review.reviewText}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all disabled:opacity-40 cursor-pointer active:scale-95 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
          </button>

          <div className="flex items-center gap-3">
            
            {/* One-Click Copy Review Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 ${
                isCopied
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/25'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Review Text</span>
                </>
              )}
            </button>

            {/* Separate Google Review Link Button (Guaranteed valid URL) */}
            <a
              href={getGoogleReviewUrl(review)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shadow-2xs group"
              title="Open Google review page in new tab"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-12 transition-transform" />
              <span>Open Google Review Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </a>

          </div>

        </div>

        {/* Explanatory note on separate actions */}
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          * Note: Copying the review text and opening the external review page are separate actions. In compliance with review policies, reviews are never automatically submitted to Google or third-party platforms.
        </p>

      </div>

      {/* Suggestion Disclaimer */}
      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900 shadow-2xs">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          This content was generated by ReviewCraft's AI NLP Engine using statistical deduplication. Each generated record has a unique ID in MongoDB (<code>{review.id}</code>) to guarantee non-repetition across subsequent generations.
        </p>
      </div>

    </div>
  );
}
