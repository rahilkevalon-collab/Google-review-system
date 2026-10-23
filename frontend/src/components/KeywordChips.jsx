import React, { useState } from 'react';
import { Tag, Plus, Check, X } from 'lucide-react';

export default function KeywordChips({
  keywords = [],
  selectedKeywords = [],
  onToggleKeyword,
  onAddKeyword,
  onRemoveKeyword
}) {
  const [customInput, setCustomInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Clean and deduplicate keywords
  const cleanKeywords = Array.from(
    new Set(
      keywords
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter(Boolean)
    )
  );

  const handleAdd = (e) => {
    e?.preventDefault();
    const clean = customInput.trim();
    if (clean) {
      onAddKeyword(clean);
      setCustomInput('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {cleanKeywords.map((kw) => {
          const isSelected = selectedKeywords.includes(kw);
          return (
            <div
              key={kw}
              className={`inline-flex items-center rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 border group ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-lg shadow-purple-600/30 scale-102 ring-2 ring-purple-400/30'
                  : 'bg-slate-900/90 text-purple-200/90 border-purple-500/25 hover:border-purple-400/50 hover:bg-purple-950/40 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleKeyword(kw)}
                className="pl-3.5 pr-2 py-2 flex items-center gap-1.5 cursor-pointer focus:outline-none"
                title={`Click to ${isSelected ? 'unselect' : 'select'} "${kw}"`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                ) : (
                  <Tag className="w-3 h-3 text-purple-400/70" />
                )}
                <span>{kw}</span>
              </button>

              {/* Remove Keyword Button */}
              {onRemoveKeyword && cleanKeywords.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveKeyword(kw);
                  }}
                  className={`pr-3 pl-1 py-2 text-xs transition-colors cursor-pointer rounded-r-full ${
                    isSelected
                      ? 'text-purple-200 hover:text-white hover:bg-purple-700/60'
                      : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                  title={`Remove "${kw}"`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Custom Keyword Adder */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 animate-in fade-in">
            <input
              type="text"
              autoFocus
              placeholder="e.g. AI AUTOMATION"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-purple-500 text-xs text-white placeholder:text-slate-500 focus:outline-none w-44 shadow-inner"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs cursor-pointer"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-full text-xs font-medium text-purple-300 hover:text-white bg-slate-900/80 hover:bg-purple-950/60 border border-dashed border-purple-500/40 hover:border-purple-400 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Add Keyword</span>
          </button>
        )}
      </div>
    </div>
  );
}
