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
                  ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white border-[#034665] shadow-md shadow-[#068dcb]/25 scale-102 ring-2 ring-[#068dcb]/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#068dcb]/40 hover:text-[#034665] hover:bg-[#068dcb]/10 shadow-xs'
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
                  <Tag className="w-3 h-3 text-[#068dcb]" />
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
                      ? 'text-cyan-100 hover:text-white hover:bg-[#034665]/60'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
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
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#068dcb] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none w-44 shadow-xs"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-[#034665] bg-white hover:bg-[#068dcb]/10 border border-dashed border-slate-300 hover:border-[#068dcb]/50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#068dcb]" />
            <span>Add Keyword</span>
          </button>
        )}
      </div>
    </div>
  );
}
