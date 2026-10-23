import React, { useState } from 'react';
import { Tag, Plus, Check } from 'lucide-react';

export default function KeywordChips({
  keywords = [],
  selectedKeyword,
  onSelectKeyword,
  onAddCustomKeyword
}) {
  const [customInput, setCustomInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (e) => {
    e?.preventDefault();
    const clean = customInput.trim();
    if (clean) {
      onAddCustomKeyword(clean);
      setCustomInput('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {keywords.map((kw) => {
          const isSelected = selectedKeyword === kw;
          return (
            <button
              key={kw}
              type="button"
              onClick={() => onSelectKeyword(kw)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-600/20 scale-105 ring-2 ring-indigo-400/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 shadow-2xs'
              }`}
            >
              {isSelected ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Tag className="w-3 h-3 text-slate-400" />
              )}
              <span>{kw}</span>
            </button>
          );
        })}

        {/* Custom Keyword Adder */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 animate-in fade-in">
            <input
              type="text"
              autoFocus
              placeholder="Custom tag..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-indigo-500 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none w-36 sm:w-44 shadow-xs"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 flex items-center gap-1 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Tag</span>
          </button>
        )}
      </div>
    </div>
  );
}
