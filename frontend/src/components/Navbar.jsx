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
            <img 
              src="/kevalon-tap-logo.png" 
              alt="KevalonTap" 
              className="h-9 w-auto object-contain group-hover:scale-[1.02] transition-transform" 
            />
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium pl-2 border-l border-slate-200">
              Dynamic & Authentic Business Reviews
            </p>
          </Link>
        </div>

      </div>
    </header>
  );
}
