import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import KeywordChips from '../components/KeywordChips';
import ReviewCard from '../components/ReviewCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import BookmarkletBar from '../components/BookmarkletBar';
import { syncReviewToExtension } from '../utils/extensionSync';

export default function Dashboard({ categories = [] }) {
  const params = useParams();
  const routeCompanyId = params.companyId || params.id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState(null);

  // Keyword states
  const [keywords, setKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeReviewId, setActiveReviewId] = useState(null);

  // Reviews state (strictly 3 distinct suggestions)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dedupNotice, setDedupNotice] = useState(null);

  // Concurrency guard
  const isGeneratingRef = useRef(false);
  const lastGenerationTime = useRef(0);

  const companyRef = useRef(null);
  companyRef.current = company;

  const selectedKeywordsRef = useRef(selectedKeywords);
  selectedKeywordsRef.current = selectedKeywords;

  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;

  // 1. Generate or fetch reviews helper
  const generateReviews = useCallback(async (keywordsToUse, forceFresh = false, companyOverride = null) => {
    const targetComp = companyOverride || companyRef.current;
    if (!targetComp?.id) return;

    const now = Date.now();
    if (isGeneratingRef.current || (now - lastGenerationTime.current < 800 && !forceFresh)) {
      return;
    }

    isGeneratingRef.current = true;
    lastGenerationTime.current = now;
    setLoadingReviews(true);
    setIsGenerating(true);
    setDedupNotice(null);

    const activeKeywords = Array.isArray(keywordsToUse) && keywordsToUse.length > 0
      ? keywordsToUse
      : ((selectedKeywordsRef.current && selectedKeywordsRef.current.length > 0) ? selectedKeywordsRef.current : [(keywordsRef.current && keywordsRef.current[0]) || 'Quality Service']);

    try {
      const payload = {
        companyId: targetComp.id,
        companyName: targetComp.name,
        category: targetComp.category,
        selectedKeywords: activeKeywords,
        services: targetComp.services,
        description: targetComp.description,
        location: targetComp.location || targetComp.formattedAddress,
        language: targetComp.preferredLanguage || 'en',
        tone: 'natural',
        length: 'medium',
        count: 3
      };

      const res = await api.generateReviews(payload);

      if (res.success && Array.isArray(res.reviews) && res.reviews.length > 0) {
        const topReviews = res.reviews.slice(0, 3);
        setReviews(topReviews);
        try {
          localStorage.setItem(`reviewcraft_cached_reviews_${targetComp.id}`, JSON.stringify(topReviews));
        } catch (e) {}
        if (topReviews[0] && targetComp) {
          try {
            syncReviewToExtension(topReviews[0], targetComp, 'auto_sync');
          } catch (e) {}
        }
        if (res.rejectedDuplicates > 0) {
          setDedupNotice(
            `Deduplication verified 3 distinct suggestions (${res.rejectedDuplicates} similar variant${res.rejectedDuplicates > 1 ? 's' : ''} filtered).`
          );
        }
      } else {
        const fallbackRes = await api.getReviews({
          companyId: targetComp.id,
          limit: 3
        });
        if (fallbackRes.success && fallbackRes.reviews && fallbackRes.reviews.length > 0) {
          const topFallback = fallbackRes.reviews.slice(0, 3);
          setReviews(topFallback);
          try {
            localStorage.setItem(`reviewcraft_cached_reviews_${targetComp.id}`, JSON.stringify(topFallback));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Review generation error, fetching stored reviews:', err);
      try {
        const fallback = await api.getReviews({ companyId: targetComp?.id, limit: 3 });
        if (fallback.success && fallback.reviews && fallback.reviews.length > 0) {
          setReviews(fallback.reviews.slice(0, 3));
        }
      } catch (e) {
        addToast('Unable to load reviews. Please verify backend connection.', 'error');
      }
    } finally {
      setLoadingReviews(false);
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [addToast]);

  // 2. Load Company Profile deterministically & display existing reviews instantly
  useEffect(() => {
    let isMounted = true;
    setLoadingCompany(true);
    setCompanyError(null);

    async function fetchCompany() {
      try {
        let targetId = routeCompanyId;

        if (!targetId) {
          const savedId = localStorage.getItem('reviewcraft_company_id');
          if (savedId) {
            targetId = savedId;
          } else {
            const allRes = await api.getCompanies();
            if (allRes.success && allRes.companies && allRes.companies.length > 0) {
              targetId = allRes.companies[0].id;
            } else {
              navigate('/setup');
              return;
            }
          }
        }

        const res = await api.getCompanyById(targetId);
        if (!isMounted) return;

        if (res.success && res.company) {
          const comp = res.company;
          setCompany(comp);
          localStorage.setItem('reviewcraft_company_id', comp.id);
          localStorage.setItem('reviewcraft_category', comp.category || '');

          const rawKeywords = Array.isArray(comp.seoKeywords) && comp.seoKeywords.length > 0
            ? comp.seoKeywords
            : (Array.isArray(comp.keywords) && comp.keywords.length > 0 ? comp.keywords : []);

          const cleanKeywords = Array.from(new Set(rawKeywords.map((k) => k.trim()).filter(Boolean)));
          const finalKeywords = cleanKeywords.length > 0 ? cleanKeywords : ['Quality Service', 'Customer Support'];

          setKeywords(finalKeywords);

          // Always set selection to the 1st SEO keyword
          const initialSelected = [finalKeywords[0]];
          setSelectedKeywords(initialSelected);
          if (comp?.id) {
            localStorage.setItem(`reviewcraft_selected_kw_${comp.id}`, JSON.stringify(initialSelected));
          }

          // 1. Instant rendering from local cache if available (0ms)
          let foundExisting = false;
          try {
            const cached = localStorage.getItem(`reviewcraft_cached_reviews_${comp.id}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setReviews(parsed.slice(0, 3));
                foundExisting = true;
              }
            }
          } catch (e) {}

          // 2. Fetch existing reviews from MongoDB for this company
          try {
            const existingRes = await api.getReviews({ companyId: comp.id, limit: 3 });
            if (existingRes.success && Array.isArray(existingRes.reviews) && existingRes.reviews.length > 0) {
              setReviews(existingRes.reviews.slice(0, 3));
              localStorage.setItem(`reviewcraft_cached_reviews_${comp.id}`, JSON.stringify(existingRes.reviews.slice(0, 3)));
              foundExisting = true;
            }
          } catch (e) {
            console.warn('Could not fetch existing reviews:', e);
          }

          // 3. ONLY generate fresh reviews if company has zero reviews yet
          if (!foundExisting) {
            generateReviews(initialSelected, true, comp);
          }
        } else {
          setCompanyError('Business profile not found in database.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching company details:', err);
        setCompanyError(err.message || 'Failed to load company profile.');
      } finally {
        if (isMounted) setLoadingCompany(false);
      }
    }

    fetchCompany();
    return () => { isMounted = false; };
  }, [routeCompanyId, navigate, generateReviews]);

  // 3. Handle Keyword Selection: Multi-select support
  const handleToggleKeyword = (kw) => {
    let next;
    if (selectedKeywords.includes(kw)) {
      next = selectedKeywords.length > 1
        ? selectedKeywords.filter((k) => k !== kw)
        : selectedKeywords;
    } else {
      next = [...selectedKeywords, kw];
    }

    setSelectedKeywords(next);
    if (company?.id) {
      localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, JSON.stringify(next));
    }
    generateReviews(next, true);
  };

  // 4. Add a new keyword chip
  const handleAddKeyword = (newKw) => {
    const clean = newKw.trim();
    if (!clean) return;

    if (!keywords.includes(clean)) {
      const updated = [...keywords, clean];
      setKeywords(updated);
      const nextSelected = [...selectedKeywords, clean];
      setSelectedKeywords(nextSelected);

      if (company?.id) {
        api.addCompanyKeyword(company.id, clean).catch(() => {});
        localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, JSON.stringify(nextSelected));
      }
      generateReviews(nextSelected, true);
      addToast(`Added keyword: "${clean}"`, 'success');
    } else if (!selectedKeywords.includes(clean)) {
      const nextSelected = [...selectedKeywords, clean];
      setSelectedKeywords(nextSelected);
      if (company?.id) {
        localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, JSON.stringify(nextSelected));
      }
      generateReviews(nextSelected, true);
    }
  };

  // 5. Remove a keyword chip
  const handleRemoveKeyword = (kwToRemove) => {
    const updated = keywords.filter((k) => k !== kwToRemove);
    setKeywords(updated);

    const nextSelected = selectedKeywords.filter((k) => k !== kwToRemove);
    const finalSelected = nextSelected.length > 0 ? nextSelected : [updated[0]];
    setSelectedKeywords(finalSelected);

    if (company?.id) {
      api.removeCompanyKeyword(company.id, kwToRemove).catch(() => {});
      localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, JSON.stringify(finalSelected));
    }
    addToast(`Removed keyword: "${kwToRemove}"`, 'info');
  };

  if (loadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Loading business profile & SEO reviews...
        </p>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl glass-panel text-center space-y-5 border border-slate-200 shadow-xl bg-white">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Business Profile Not Found</h2>
        <p className="text-sm text-slate-500">
          {companyError || "Could not retrieve the saved business details. Please try again."}
        </p>
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white text-xs font-bold shadow-md shadow-[#068dcb]/25"
        >
          <span>Go to Setup Form</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Company Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-200/40 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#034665] to-[#068dcb]">{company.name}</span>
        </h1>
        {company.location && (
          <p className="text-xs text-slate-600 font-semibold flex items-center justify-center gap-1.5 pt-1">
            <MapPin className="w-3.5 h-3.5 text-[#068dcb]" />
            <span>{company.location}</span>
          </p>
        )}
        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#034665] pt-1.5">
          SELECT KEYWORDS & GENERATE REVIEW SUGGESTIONS
        </p>
      </div>

      {/* 1-Click Zero-Installation Bookmarklet Auto-Filler (Alternative A) */}
      <BookmarkletBar />

      {/* SEO Keywords Chips */}
      <div>
        <KeywordChips
          keywords={keywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={handleToggleKeyword}
          onAddKeyword={handleAddKeyword}
          onRemoveKeyword={handleRemoveKeyword}
        />
      </div>

      {/* Deduplication Notice */}
      {dedupNotice && (
        <div className="p-3 rounded-2xl bg-[#068dcb]/10 border border-[#068dcb]/25 flex items-center gap-2 text-xs text-[#034665] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#068dcb] shrink-0" />
          <span>{dedupNotice}</span>
        </div>
      )}

      {/* Active AI Generation Progress Banner */}
      {isGenerating && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#034665]/10 via-[#068dcb]/15 to-[#034665]/10 border border-[#068dcb]/30 shadow-md text-[#034665] animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
              <Sparkles className="w-2.5 h-2.5 text-[#068dcb] absolute animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Generating review suggestions with AI...
              </p>
              <p className="text-[11px] text-slate-500">
                Crafting authentic drafts for <strong className="text-slate-700">{company.name}</strong> based on "{selectedKeywords.join(', ')}"
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#068dcb]/20 text-[11px] font-semibold text-[#034665] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Groq AI Active</span>
          </div>
        </div>
      )}

      {/* 3 Review Cards Grid - 100% consistent across all devices */}
      {reviews.length === 0 && (loadingReviews || isGenerating) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonReviewCard index={1} />
          <SkeletonReviewCard index={2} />
          <SkeletonReviewCard index={3} />
        </div>
      ) : reviews.length > 0 ? (
        <div className="relative">
          {/* Subtle loading overlay while regenerating existing reviews */}
          {isGenerating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-3xl transition-opacity duration-300">
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white shadow-xl border border-[#068dcb]/30 text-xs font-bold text-[#034665] animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
                <span>Updating review suggestions...</span>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {reviews.slice(0, 3).map((rev) => {
              const revId = rev._id || rev.id;
              const fullRev = {
                ...rev,
                rating: Number(rev.rating) || 5,
                companyName: rev.companyName || company?.name || '',
                companyLocation: rev.companyLocation || company?.location || company?.formattedAddress || '',
                googlePlaceId: rev.googlePlaceId || company?.googlePlaceId || '',
                googleReviewUrl: rev.googleReviewUrl || company?.googleReviewUrl || '',
                externalReviewLink: rev.externalReviewLink || company?.externalReviewLink || company?.googleReviewUrl || ''
              };
              return (
                <ReviewCard
                  key={revId || `${company?.name || 'co'}-${rev.contentHash || rev.reviewText || Math.random()}`}
                  review={fullRev}
                  company={company}
                  isActive={Boolean(activeReviewId && revId && String(revId) === String(activeReviewId))}
                  onSelect={(selected) => setActiveReviewId(selected.id || selected._id)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl text-center space-y-4 glass-panel border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="w-12 h-12 rounded-2xl bg-[#068dcb]/10 text-[#034665] border border-[#068dcb]/25 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-[#068dcb]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Review Suggestions Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select one of your target SEO keywords above to synthesize fresh review suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
