import React from 'react';

export default function SkeletonReviewCard() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse flex flex-col justify-between space-y-4 min-h-[170px] shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-slate-200 rounded-lg"></div>
          <div className="h-5 w-14 bg-slate-200 rounded-md"></div>
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-md"></div>
      </div>
      <div className="space-y-2 py-2">
        <div className="h-3.5 bg-slate-200 rounded w-full"></div>
        <div className="h-3.5 bg-slate-200 rounded w-5/6"></div>
        <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-4 w-20 bg-slate-200 rounded"></div>
        <div className="h-7 w-20 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
  );
}
