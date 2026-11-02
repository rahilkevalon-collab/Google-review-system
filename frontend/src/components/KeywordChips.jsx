import React from 'react';
import { Tag, Check } from 'lucide-react';

export default function KeywordChips({
  keywords = [],
  selectedKeywords = [],
  onToggleKeyword
}) {
  // Clean and deduplicate keywords
  const cleanKeywords = Array.from(
    new Set(
      keywords
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {cleanKeywords.map((kw) => {
          const isSelected = selectedKeywords.includes(kw);
          return (
            <button
              key={kw}
              type="button"
              onClick={() => onToggleKeyword(kw)}
              aria-pressed={isSelected}
              className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 border cursor-pointer focus:outline-none select-none ${
                isSelected
                  ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white border-[#034665] shadow-md shadow-[#068dcb]/25 scale-102 ring-2 ring-[#068dcb]/20 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#068dcb]/40 hover:text-[#034665] hover:bg-[#068dcb]/10 shadow-xs'
              }`}
              title={`Click to ${isSelected ? 'unselect' : 'select'} "${kw}"`}
            >
              {isSelected ? (
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5] mr-1.5 shrink-0" />
              ) : (
                <Tag className="w-3 h-3 text-[#068dcb] mr-1.5 shrink-0" />
              )}
              <span>{kw}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
