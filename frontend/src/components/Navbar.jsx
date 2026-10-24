import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Cpu, PlusCircle } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-5">
          <Link to="/setup" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-purple-600 transition-colors">
                  ReviewCraft
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Dynamic & Non-Repeating Business Reviews
              </p>
            </div>
          </Link>
        </div>

        {/* Right side actions & status */}
        <div className="flex items-center gap-3">
          {healthStatus && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs text-slate-700 font-medium">
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {healthStatus.aiProvider?.isAi ? 'Gemini AI Model' : 'Template Engine (Demo)'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            </div>
          )}

          <Link
            to="/setup"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              location.pathname === '/' || location.pathname === '/setup'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20 active:scale-95'
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
