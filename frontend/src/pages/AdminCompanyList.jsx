import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Tag, 
  Loader2, 
  Globe, 
  ArrowUpRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function AdminCompanyList() {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.getCompanies();
      if (res && res.success) {
        setCompanies(res.companies || []);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      addToast('Failed to load business directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCopyPublicLink = (companyId, e) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/reviews/${companyId}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedId(companyId);
      addToast('Customer review studio link copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      addToast('Failed to copy link.', 'error');
    });
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const catMatch = (c.categoryName || c.category || '').toLowerCase().includes(q);
    const servicesMatch = Array.isArray(c.services) && c.services.some(s => s.toLowerCase().includes(q));
    return nameMatch || catMatch || servicesMatch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#034665] via-[#04618d] to-[#068dcb] p-6 sm:p-8 text-white shadow-xl shadow-[#068dcb]/15">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/95">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
              <span>Admin Management Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Business Directory & Review Links
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              View all registered businesses, copy public customer review generator links, and manage AI SEO keywords.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchCompanies}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-sm"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/setup"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#034665] hover:bg-slate-100 text-xs font-bold shadow-lg shadow-black/10 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#068dcb]" />
              <span>Setup New Business</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, category, or service..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30 focus:border-[#068dcb] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-end sm:self-auto">
          <span>Total Businesses:</span>
          <span className="px-2.5 py-1 rounded-full bg-[#068dcb]/10 text-[#034665] font-bold">
            {companies.length}
          </span>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3 bg-white rounded-3xl border border-slate-200/80 p-12">
          <Loader2 className="w-8 h-8 text-[#068dcb] animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading business profiles...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4 bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? 'No matching businesses found' : 'No businesses registered yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery 
                ? `No company matches "${searchQuery}". Try a different keyword.` 
                : 'Get started by creating your first business profile in the setup page.'}
            </p>
          </div>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-md shadow-[#068dcb]/20 hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Business</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((comp) => {
            const hasGoogleLink = Boolean(comp.googleReviewLink);
            const seoCount = (comp.seoKeywords || []).length;
            const servicesCount = (comp.services || []).length;

            return (
              <div
                key={comp.id || comp._id}
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 hover:border-[#068dcb]/40 p-5 shadow-2xs hover:shadow-lg hover:shadow-[#068dcb]/5 transition-all duration-200"
              >
                {/* Header: Name and Category */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-[#068dcb] transition-colors truncate">
                      {comp.name}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                      <Layers className="w-3 h-3 text-[#068dcb]" />
                      <span className="truncate">{comp.categoryName || comp.category || 'General'}</span>
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#034665]/10 to-[#068dcb]/15 text-[#034665] flex items-center justify-center shrink-0 border border-[#068dcb]/20">
                    <Building2 className="w-5 h-5 text-[#068dcb]" />
                  </div>
                </div>

                {/* Description or details */}
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed min-h-[2rem]">
                  {comp.description || 'No description provided for this business profile.'}
                </p>

                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                    <Tag className="w-3 h-3 text-amber-600" />
                    {seoCount} SEO Keywords
                  </span>
                  {servicesCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      {servicesCount} Services
                    </span>
                  )}
                  {hasGoogleLink ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      <Globe className="w-3 h-3 text-emerald-600" />
                      Google Link Set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 font-medium">
                      No Google Link
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Copy Public Customer URL button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyPublicLink(comp.id || comp._id, e)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#068dcb] bg-slate-50 hover:bg-[#068dcb]/10 text-slate-700 hover:text-[#034665] text-xs font-bold transition-all cursor-pointer"
                    title="Copy customer review link for this business"
                  >
                    {copiedId === (comp.id || comp._id) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Open Studio Link */}
                  <Link
                    to={`/reviews/${comp.id || comp._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#034665] to-[#068dcb] text-white hover:opacity-95 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Open Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
