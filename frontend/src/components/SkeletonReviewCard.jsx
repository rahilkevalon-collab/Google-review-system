import React from 'react';
import { Sparkles, Star } from 'lucide-react';

export default function SkeletonReviewCard({ index = 1 }) {
  return (
    <div className="relative p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4 min-h-[200px] overflow-hidden">
      {/* Subtle animated shimmer gradient in background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/60 to-transparent animate-shimmer pointer-events-none"></div>

      {/* Card Header with Star placeholders and badge */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1 text-amber-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-amber-300 text-amber-400 animate-pulse" />
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#068dcb]/10 text-[10px] font-semibold text-[#034665]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#068dcb] animate-ping"></span>
          <span>Draft #{index}</span>
        </div>
      </div>

      {/* Card Center: Animated Spinner & Text */}
      <div className="my-auto py-3 flex flex-col items-center justify-center text-center space-y-2.5 z-10">
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
          <Sparkles className="w-3.5 h-3.5 text-[#068dcb] absolute animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-800">
            Crafting Review Draft...
          </p>
          <p className="text-[10px] text-slate-400">
            Synthesizing authentic customer perspective
          </p>
        </div>
      </div>

      {/* Bottom Action Placeholders */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between z-10">
        <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-8 w-28 bg-gradient-to-r from-slate-200 to-slate-100 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}
