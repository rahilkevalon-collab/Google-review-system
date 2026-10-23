import React from 'react';
import { 
  Building, 
  Sparkles, 
  Copy, 
  ShieldCheck, 
  Tag, 
  Clock, 
  Activity 
} from 'lucide-react';

export default function AnalyticsWidget({ analytics, onRefreshAnalytics }) {
  if (!analytics) return null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">System Performance & Dedup Analytics</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time statistics across MongoDB and Scikit-Learn TF-IDF engine</p>
          </div>
        </div>
        <button
          onClick={onRefreshAnalytics}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Total Companies */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Companies</span>
            <Building className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{analytics.totalCompanies || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active profiles configured</p>
        </div>

        {/* Total Generated Reviews */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Suggestions</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{analytics.totalReviews || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Stored distinct reviews</p>
        </div>

        {/* Total Copy Actions */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Copy Actions</span>
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{analytics.totalCopies || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">One-click copies</p>
        </div>

        {/* Deduplication Shield */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Duplicates Prevented</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{analytics.totalRejections || 0}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {analytics.rejectionRate}% near-dup rejection
          </p>
        </div>

      </div>

      {/* Top Keywords & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        
        {/* Top Keywords */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            Top Targeted SEO Keywords
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {analytics.topKeywords && analytics.topKeywords.length > 0 ? (
              analytics.topKeywords.map((kw) => (
                <span
                  key={kw.keyword}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5"
                >
                  <span>{kw.keyword}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {kw.count}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No keyword activity recorded yet.</span>
            )}
          </div>
        </div>

        {/* Recent Generation Logs */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Recent Generation Audit Log
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {analytics.recentLogs && analytics.recentLogs.length > 0 ? (
              analytics.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between text-slate-700"
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                      {log.keyword}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      ({log.generatedCount}/{log.requestedCount} generated)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.rejectedDuplicateCount > 0 && (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                        {log.rejectedDuplicateCount} deduped
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No generation logs yet.</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
