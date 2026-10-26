import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function Navbar() {
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

      </div>
    </header>
  );
}
