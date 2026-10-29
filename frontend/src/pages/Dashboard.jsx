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
          setReviews(fallbackRes.reviews.slice(0, 3));
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

  // Initial load: Generate fresh reviews on every page load and refresh
  const loadInitialReviews = useCallback(async (comp, initialKeywords) => {
    if (!comp?.id) return;
    generateReviews(initialKeywords, true, comp);
  }, [generateReviews]);

  // 2. Load Company Profile deterministically without depending on localStorage
  useEffect(() => {
    let isMounted = true;
    setLoadingCompany(true);
    setCompanyError(null);

    async function fetchCompany() {
      try {
        let targetId = routeCompanyId;

        // If no companyId in route, look up the primary active business from database
        if (!targetId) {
          const allRes = await api.getCompanies();
          if (allRes.success && Array.isArray(allRes.companies) && allRes.companies.length > 0) {
            // Prefer Kevalon Technology if present, or the newest company
            const kevalon = allRes.companies.find(c => c.name && c.name.toLowerCase().includes('kevalon'));
            const primary = kevalon || allRes.companies[0];
            targetId = primary.id;
            // Update browser URL cleanly so refreshing or sharing works identically on all devices
            navigate(`/reviews/${targetId}`, { replace: true });
            return;
          } else {
            navigate('/setup');
            return;
          }
        }

        const res = await api.getCompanyById(targetId);
        if (!isMounted) return;

        if (res.success && res.company) {
          const comp = res.company;
          setCompany(comp);

          // Setup SEO keywords
          const rawKeywords = Array.isArray(comp.seoKeywords) && comp.seoKeywords.length > 0
            ? comp.seoKeywords
            : (Array.isArray(comp.keywords) && comp.keywords.length > 0 ? comp.keywords : []);

          const cleanKeywords = Array.from(new Set(rawKeywords.map((k) => k.trim()).filter(Boolean)));
          const finalKeywords = cleanKeywords.length > 0 ? cleanKeywords : ['Quality Service', 'Customer Support'];

          setKeywords(finalKeywords);

          // Set 1st SEO keyword as initial selection
          const initialSelected = [finalKeywords[0]];
          setSelectedKeywords(initialSelected);

          // Deterministically load predefined reviews or synthesize initial set
          loadInitialReviews(comp, initialSelected);
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
  }, [routeCompanyId, navigate, loadInitialReviews]);

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
    generateReviews(next, true, company);
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
      }
      generateReviews(nextSelected, true, company);
      addToast(`Added keyword: "${clean}"`, 'success');
    } else if (!selectedKeywords.includes(clean)) {
      const nextSelected = [...selectedKeywords, clean];
      setSelectedKeywords(nextSelected);
      generateReviews(nextSelected, true, company);
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

      {/* 3 Review Cards Grid - 100% consistent across all devices */}
      {loadingReviews || isGenerating ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonReviewCard />
          <SkeletonReviewCard />
          <SkeletonReviewCard />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
