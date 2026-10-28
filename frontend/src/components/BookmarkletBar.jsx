import React, { useState } from 'react';
import { Bookmark, Sparkles, X, Smartphone, Check, Star } from 'lucide-react';
import { BOOKMARKLET_HREF } from '../utils/bookmarklet';

export default function BookmarkletBar() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('reviewcraft_bookmarklet_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (dismissed) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setDismissed(false);
            try {
              localStorage.removeItem('reviewcraft_bookmarklet_dismissed');
            } catch (e) {}
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
        >
          {isMobile ? <Smartphone className="w-3.5 h-3.5 text-[#068dcb]" /> : <Bookmark className="w-3.5 h-3.5 text-[#068dcb]" />}
          <span>{isMobile ? 'Show Mobile Review Guide' : 'Show 1-Click Auto-Fill Tool'}</span>
        </button>
      </div>
    );
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('reviewcraft_bookmarklet_dismissed', 'true');
    } catch (e) {}
  };

  // Mobile Version: Optimized for thumb interactions on Android & iPhone
  if (isMobile) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-indigo-50/50 border border-sky-200/80 shadow-md shadow-sky-100/40 space-y-2.5 relative animate-in fade-in duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#034665] to-[#068dcb] text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-extrabold text-slate-900">
                  Mobile 1-Tap Reviews
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-bold uppercase tracking-wider">
                  Instant Auto-Copy
                </span>
              </div>
              <p className="text-2xs text-slate-500 font-medium">
                Tap any card below ➔ Review is auto-copied ➔ Google opens directly!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Mobile Steps */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="w-4 h-4 rounded-full bg-[#068dcb]/10 text-[#034665] font-bold text-3xs inline-flex items-center justify-center">1</span>
            <p className="text-2xs font-bold text-slate-800">Tap Any Card</p>
            <p className="text-3xs text-slate-500">Auto-copies text</p>
          </div>
          <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="w-4 h-4 rounded-full bg-[#068dcb]/10 text-[#034665] font-bold text-3xs inline-flex items-center justify-center">2</span>
            <p className="text-2xs font-bold text-slate-800">Tap 5 Stars</p>
            <p className="text-3xs text-slate-500">On Google prompt</p>
          </div>
          <div className="p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="w-4 h-4 rounded-full bg-[#068dcb]/10 text-[#034665] font-bold text-3xs inline-flex items-center justify-center">3</span>
            <p className="text-2xs font-bold text-slate-800">Paste & Post</p>
            <p className="text-3xs text-slate-500">From keyboard</p>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Version: Draggable Bookmarklet Tool
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-50 via-white to-indigo-50/40 border border-sky-200/80 shadow-md shadow-sky-100/50 space-y-3 relative animate-in fade-in duration-300">
      
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#034665] to-[#068dcb] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                1-Click Google Auto-Filler
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-2xs font-bold uppercase tracking-wider">
                No Extension Required
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Automatically pastes review text & selects star ratings on Google with 1 click.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Row: Draggable Button + Quick Instructions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        
        {/* The Draggable Bookmarklet Button */}
        <a
          href={BOOKMARKLET_HREF}
          onClick={(e) => {
            e.preventDefault();
            alert('To install: Drag and drop this "⚡ Auto-Fill Review" button up into your browser\'s Bookmarks bar! (Press Ctrl+Shift+B if your bookmarks bar is not visible).');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white text-xs font-bold shadow-md shadow-[#068dcb]/25 transition-all cursor-grab active:cursor-grabbing border border-white/20 select-none animate-pulse hover:animate-none"
          title="Drag and drop this button to your Bookmarks Bar"
        >
          <Bookmark className="w-4 h-4 text-white fill-white/20" />
          <span>⚡ Auto-Fill Review</span>
        </a>

        {/* Instructions pill */}
        <div className="flex-1 min-w-[240px] text-xs text-slate-600 flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-slate-200">
          <span className="w-5 h-5 rounded-full bg-[#068dcb]/10 text-[#034665] flex items-center justify-center font-bold text-2xs shrink-0">
            1
          </span>
          <span className="leading-snug">
            <strong>Drag the button above</strong> into your browser's Bookmarks bar <em>(Press Ctrl + Shift + B to show bar)</em>.
          </span>
        </div>

        <div className="flex-1 min-w-[240px] text-xs text-slate-600 flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-slate-200">
          <span className="w-5 h-5 rounded-full bg-[#068dcb]/10 text-[#034665] flex items-center justify-center font-bold text-2xs shrink-0">
            2
          </span>
          <span className="leading-snug">
            Click <strong>"Post on Google"</strong> below ➔ On Google's page, click your bookmark to auto-fill text & stars!
          </span>
        </div>

      </div>

    </div>
  );
}
