import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Cpu, Layers } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  ReviewCraft
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  AI SEO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Dynamic & Non-Repeating Business Reviews
              </p>
            </div>
          </Link>
        </div>

        {/* Right side status badge */}
        <div className="flex items-center gap-3">
          {healthStatus && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {healthStatus.aiProvider?.isAi ? 'Gemini AI Model' : 'Template Engine (Demo)'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
