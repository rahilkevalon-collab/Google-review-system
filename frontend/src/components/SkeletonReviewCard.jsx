import React from 'react';

export default function SkeletonReviewCard() {
  return (
    <div className="p-5 rounded-2xl bg-[#10142a]/80 border border-purple-500/20 animate-pulse flex flex-col justify-between space-y-4 min-h-[180px] shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-purple-900/40 rounded-lg"></div>
          <div className="h-5 w-16 bg-purple-900/30 rounded-md"></div>
        </div>
        <div className="h-5 w-20 bg-amber-500/20 rounded-md"></div>
      </div>
      <div className="space-y-2.5 py-2">
        <div className="h-3.5 bg-slate-800 rounded w-full"></div>
        <div className="h-3.5 bg-slate-800 rounded w-5/6"></div>
        <div className="h-3.5 bg-slate-800 rounded w-2/3"></div>
      </div>
      <div className="pt-3 border-t border-purple-500/10 flex items-center justify-between">
        <div className="h-4 w-20 bg-slate-800 rounded"></div>
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-slate-800/90 rounded-xl"></div>
          <div className="h-7 w-24 bg-purple-900/50 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
