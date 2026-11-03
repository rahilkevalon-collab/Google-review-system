import React from 'react';

export default function SkeletonCompanyCard() {
  return (
    <div className="relative flex flex-col bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs overflow-hidden">
      {/* Background shimmer animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/60 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite] pointer-events-none"></div>

      {/* Header: Name and Category badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="h-5 w-40 bg-slate-200/80 rounded-md animate-pulse"></div>
          <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse"></div>
        </div>
        <div className="h-6 w-20 rounded-full bg-cyan-100/60 animate-pulse"></div>
      </div>

      {/* Description lines */}
      <div className="space-y-2 my-3 min-h-[2.5rem]">
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse"></div>
        <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse"></div>
      </div>

      {/* Services preview line */}
      <div className="h-3.5 w-3/5 bg-slate-100 rounded animate-pulse mb-4"></div>

      {/* Branch quick info bar */}
      <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-xl mb-4 animate-pulse"></div>

      {/* Card action row */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="h-7 w-28 bg-slate-200/70 rounded-lg animate-pulse"></div>
        <div className="flex gap-1.5">
          <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse"></div>
          <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse"></div>
          <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
