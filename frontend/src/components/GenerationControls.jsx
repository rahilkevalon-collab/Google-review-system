import React from 'react';
import { Sparkles, RefreshCw, Sliders, Globe, MessageSquare, Clock } from 'lucide-react';

export default function GenerationControls({
  tone,
  setTone,
  length,
  setLength,
  language,
  setLanguage,
  count,
  setCount,
  onGenerate,
  onRegenerate,
  isLoading,
  cooldownRemaining,
  hasExistingReviews
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-[#068dcb]" />
          <span>Review Generation Parameters</span>
        </div>
        <span className="text-[11px] text-slate-500">
          TF-IDF Deduplication Active (Guarantees fresh suggestions)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tone Control */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-[#068dcb]" />
            Tone of Voice
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {['natural', 'formal', 'conversational'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  tone === t
                    ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Review Length */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#068dcb]" />
            Review Length
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {['short', 'medium', 'long'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLength(l)}
                className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  length === l
                    ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#068dcb]" />
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#068dcb] cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="gu">Gujarati (ગુજરાતી)</option>
          </select>
        </div>

        {/* Suggestions Count */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Number of Suggestions ({count})
          </label>
          <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  count === num
                    ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          {cooldownRemaining > 0 ? (
            <span className="text-amber-600 flex items-center gap-1 font-medium">
              Cooldown: {cooldownRemaining}s
            </span>
          ) : (
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              ● Ready to generate
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {hasExistingReviews && (
            <button
              type="button"
              disabled={isLoading || cooldownRemaining > 0}
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate (Non-Repeating)</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || cooldownRemaining > 0}
            onClick={onGenerate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white font-bold text-xs shadow-md shadow-[#068dcb]/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-bounce' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Generate AI Reviews'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
