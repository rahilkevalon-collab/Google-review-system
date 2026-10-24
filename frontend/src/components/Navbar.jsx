import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, PlusCircle } from 'lucide-react';

export default function Navbar({ healthStatus }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-5">
          <Link to="/setup" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] flex items-center justify-center shadow-md shadow-[#068dcb]/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-[#068dcb] transition-colors">
                  ReviewCraft
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Dynamic & Non-Repeating Business Reviews
              </p>
            </div>
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">

          <Link
            to="/setup"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              location.pathname === '/' || location.pathname === '/setup'
                ? 'bg-[#068dcb]/10 text-[#034665] border border-[#068dcb]/30 font-bold'
                : 'bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white shadow-md shadow-[#068dcb]/25 active:scale-95'
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
