import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Cpu, PlusCircle } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/15 bg-[#090c1c]/90 backdrop-blur-xl shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-5">
          <Link to="/setup" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-purple-300 transition-colors">
                  ReviewCraft
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI SEO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Dynamic & Non-Repeating Business Reviews
              </p>
            </div>
          </Link>
        </div>

        {/* Right side actions & status */}
        <div className="flex items-center gap-3">
          {healthStatus && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-purple-500/20 text-xs text-slate-300 font-medium">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>
                {healthStatus.aiProvider?.isAi ? 'Gemini AI Model' : 'Template Engine (Demo)'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400"></span>
            </div>
          )}

          <Link
            to="/setup"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
              location.pathname === '/' || location.pathname === '/setup'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25 active:scale-95'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Setup</span>
          </Link>
        </div>

      </div>
    </header>
  );
}
