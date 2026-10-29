import React from 'react';
import { Star } from 'lucide-react';

export default function SkeletonReviewCard() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[220px]">
      {/* Background shimmer animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent animate-shimmer pointer-events-none"></div>

      <div>
        {/* Company / Location Badges Skeleton */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse"></div>
          <div className="h-6 w-24 bg-slate-50 rounded-lg animate-pulse"></div>
        </div>

        {/* Star Rating Badge Skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/60">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-300 text-amber-400 animate-pulse" />
              ))}
            </div>
            <div className="h-3 w-6 bg-amber-200/60 rounded ml-1 animate-pulse"></div>
          </div>
        </div>

        {/* Review Text Skeleton Lines */}
        <div className="my-3 space-y-2.5">
          <div className="h-3.5 bg-slate-200/80 rounded-full w-full animate-pulse"></div>
          <div className="h-3.5 bg-slate-200/80 rounded-full w-[92%] animate-pulse"></div>
          <div className="h-3.5 bg-slate-200/80 rounded-full w-[68%] animate-pulse"></div>
        </div>
      </div>

      {/* Card Action Row: Post on Google Button Skeleton */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-end">
        <div className="h-8 w-32 rounded-xl bg-gradient-to-r from-slate-200 to-slate-100 animate-pulse"></div>
      </div>
    </div>
  );
}
