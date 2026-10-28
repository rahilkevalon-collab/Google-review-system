import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Sparkles, X, Smartphone, Check, Copy, HelpCircle } from 'lucide-react';
import { BOOKMARKLET_HREF } from '../utils/bookmarklet';

export default function BookmarkletBar() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('reviewcraft_bookmarklet_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [copied, setCopied] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Anchor ref to imperatively set native href on real DOM node
  // This completely prevents React virtual DOM from seeing or evaluating "javascript:" in JSX attributes
  const dragAnchorRef = useRef(null);

  useEffect(() => {
    if (dragAnchorRef.current) {
      dragAnchorRef.current.setAttribute('href', BOOKMARKLET_HREF);
    }
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_HREF);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback if clipboard API is blocked
      const input = document.createElement('textarea');
      input.value = BOOKMARKLET_HREF;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('reviewcraft_bookmarklet_dismissed', 'true');
    } catch (e) {}
  };

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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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

  // Desktop Version: Draggable Bookmarklet Tool + 1-Click Code Copier
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
                1-Click Google Auto-Filler (Bookmarklet)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-2xs font-bold uppercase tracking-wider">
                No Extension Required
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Automatically pastes review text & selects 5★ on Google with 1 click.
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

      {/* Action Row: Draggable Anchor + Copy Button + Instructions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        
        {/* Draggable Anchor: React JSX renders safe '#install-bookmarklet', href is populated via ref */}
        <a
          ref={dragAnchorRef}
          href="#install-bookmarklet"
          draggable="true"
          onClick={(e) => {
            e.preventDefault();
            setShowHelpModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white text-xs font-bold shadow-md shadow-[#068dcb]/25 transition-all cursor-grab active:cursor-grabbing border border-white/20 select-none animate-pulse hover:animate-none"
          title="Drag this button up into your browser's Bookmarks Bar (or click for instructions)"
        >
          <Bookmark className="w-4 h-4 text-white fill-white/20" />
          <span>⚡ Drag to Bookmarks Bar</span>
        </a>

        {/* 1-Click Copy Code Button (Proper React button, separate from navigation) */}
        <button
          type="button"
          onClick={handleCopyCode}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
          }`}
          title="Copy bookmarklet javascript code directly to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
        </button>

        {/* Instructions Toggle Button */}
        <button
          type="button"
          onClick={() => setShowHelpModal(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
          title="View installation instructions"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>{showHelpModal ? 'Hide Steps' : 'How to Install?'}</span>
        </button>

        {/* Quick Instructions Pill */}
        <div className="flex-1 min-w-[260px] text-xs text-slate-600 flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-slate-200">
          <span className="w-5 h-5 rounded-full bg-[#068dcb]/10 text-[#034665] flex items-center justify-center font-bold text-2xs shrink-0">
            ℹ️
          </span>
          <span className="leading-snug text-2xs">
            Drag the button above to your Bookmarks Bar <em>(Press <strong>Ctrl + Shift + B</strong> to show bar)</em>, or click <strong>Copy Code</strong>.
          </span>
        </div>

      </div>

      {/* Expandable Step-by-Step Instructions */}
      {showHelpModal && (
        <div className="p-4 rounded-2xl bg-white border border-sky-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>📌</span> Quick Setup (Only Once)
            </h4>
            <span className="text-2xs text-slate-500">Works in Chrome, Edge, Safari, Firefox</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#068dcb] text-white inline-flex items-center justify-center text-3xs font-bold">A</span>
                Option 1: Drag & Drop
              </p>
              <ol className="list-decimal list-inside text-2xs text-slate-600 space-y-1">
                <li>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 font-mono text-3xs">Ctrl + Shift + B</kbd> (Mac: <kbd className="px-1 py-0.5 rounded bg-slate-200 font-mono text-3xs">Cmd + Shift + B</kbd>) to make sure your Bookmarks Bar is visible.</li>
                <li>Drag the blue <strong>"⚡ Drag to Bookmarks Bar"</strong> button directly up into your Bookmarks Bar.</li>
              </ol>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#034665] text-white inline-flex items-center justify-center text-3xs font-bold">B</span>
                Option 2: Manual Copy & Paste
              </p>
              <ol className="list-decimal list-inside text-2xs text-slate-600 space-y-1">
                <li>Click the <strong>"Copy Code"</strong> button above.</li>
                <li>Right-click your browser's Bookmarks bar ➔ click <strong>Add Page...</strong> (or Add Bookmark).</li>
                <li>Set Name: <code className="text-[#034665] font-bold">⚡ Auto-Fill Review</code>, and paste the code into the <strong>URL</strong> field.</li>
              </ol>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 text-2xs text-slate-700 flex items-center gap-2">
            <span className="font-bold text-sky-800 shrink-0">🎯 How to Use:</span>
            <span>Click <strong>"Post on Google"</strong> on any review card below. On Google's page, click your saved <strong>"⚡ Auto-Fill Review"</strong> bookmark — 5 stars and review text are filled instantly!</span>
          </div>
        </div>
      )}

    </div>
  );
}
