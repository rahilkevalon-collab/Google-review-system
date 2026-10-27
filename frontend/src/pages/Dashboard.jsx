import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  Globe, 
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import KeywordChips from '../components/KeywordChips';
import ReviewCard from '../components/ReviewCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';
import { syncReviewToExtension } from '../utils/extensionSync';

export default function Dashboard({ categories = [] }) {
  const { companyId: routeCompanyId } = useParams();
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

  // Guard against React StrictMode double-execution and rapid clicking
  const isGeneratingRef = useRef(false);
  const lastGenerationTime = useRef(0);

  // 1. Load Company Profile from MongoDB via Flask
  useEffect(() => {
    let isMounted = true;
    setLoadingCompany(true);
    setCompanyError(null);

    async function fetchCompany() {
      try {
        let targetId = routeCompanyId;

        // If no companyId in route, check localStorage or fetch the first existing company
        if (!targetId) {
          const savedId = localStorage.getItem('reviewcraft_company_id');
          if (savedId) {
            targetId = savedId;
          } else {
            const allRes = await api.getCompanies();
            if (allRes.success && allRes.companies && allRes.companies.length > 0) {
              targetId = allRes.companies[0].id;
            } else {
              // No company found at all, navigate to setup form
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

          // Setup SEO keywords
          const rawKeywords = Array.isArray(comp.seoKeywords) && comp.seoKeywords.length > 0
            ? comp.seoKeywords
            : (Array.isArray(comp.keywords) && comp.keywords.length > 0 ? comp.keywords : []);

          const cleanKeywords = Array.from(new Set(rawKeywords.map((k) => k.trim()).filter(Boolean)));
          const finalKeywords = cleanKeywords.length > 0 ? cleanKeywords : ['Quality Service', 'Customer Support'];

          setKeywords(finalKeywords);

          // Always reset selection to ONLY the 1st SEO keyword on page refresh / load
          const initialSelected = [finalKeywords[0]];
          setSelectedKeywords(initialSelected);
          if (comp?.id) {
            localStorage.setItem(`reviewcraft_selected_kw_${comp.id}`, JSON.stringify(initialSelected));
          }

          // Immediately generate reviews specifically for the 1st SEO keyword on page refresh
          generateReviews(initialSelected, true, comp);
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
  }, [routeCompanyId, navigate]);

  // 2. Generate Review Suggestions using Flask (Ratio handled entirely in backend)
  const generateReviews = useCallback(async (keywordsToUse, forceFresh = false, companyOverride = null) => {
    const targetComp = companyOverride || company;
    if (!targetComp?.id) return;

    // Concurrency / rapid-click guard (throttle within 800ms)
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
      : (selectedKeywords.length > 0 ? selectedKeywords : [keywords[0] || 'Quality Service']);

    try {
      // Backend automatically applies 100% 5-star rating
      // and natural keyword partitioning across review cards
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
          syncReviewToExtension(topReviews[0], targetComp, 'auto_sync');
        }
        if (res.rejectedDuplicates > 0) {
          setDedupNotice(
            `TF-IDF deduplication verified 3 distinct suggestions (${res.rejectedDuplicates} similar variant${res.rejectedDuplicates > 1 ? 's' : ''} filtered).`
          );
        }
      } else {
        // Fallback to existing reviews for this company
        const fallbackRes = await api.getReviews({
          companyId: company.id,
          limit: 3
        });
        if (fallbackRes.success && fallbackRes.reviews && fallbackRes.reviews.length > 0) {
          const topFallback = fallbackRes.reviews.slice(0, 3);
          setReviews(topFallback);
          if (topFallback[0] && company) {
            syncReviewToExtension(topFallback[0], company, 'auto_sync');
          }
        }
      }
    } catch (err) {
      console.warn('Generation encountered an issue, fetching cached suggestions:', err);
      try {
        const fallback = await api.getReviews({ companyId: company.id, limit: 3 });
        if (fallback.success && fallback.reviews) {
          setReviews(fallback.reviews.slice(0, 3));
        }
      } catch (e) {
        addToast('Unable to generate reviews. Please check backend connection.', 'error');
      }
    } finally {
      setLoadingReviews(false);
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [company, selectedKeywords, keywords, addToast]);

  // 3. Fallback trigger if company is ready but reviews not yet generated
  useEffect(() => {
    if (company?.id && selectedKeywords.length > 0 && reviews.length === 0 && !isGeneratingRef.current) {
      generateReviews(selectedKeywords, false);
    }
  }, [company?.id]);

  // 4. Handle Keyword Selection: Multi-select support — retain previous selections and add newly clicked chips
  const handleToggleKeyword = (kw) => {
    let next;
    if (selectedKeywords.includes(kw)) {
      // Toggle off if more than 1 keyword is selected; prevent 0 selections
      next = selectedKeywords.length > 1
        ? selectedKeywords.filter((k) => k !== kw)
        : selectedKeywords;
    } else {
      // Keep previous keywords and append newly clicked keyword
      next = [...selectedKeywords, kw];
    }

    setSelectedKeywords(next);
    if (company?.id) {
      localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, JSON.stringify(next));
    }
    generateReviews(next, true);
  };

  // 5. Add a new keyword chip and include it in active selection
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

  // 6. Remove a keyword chip
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
          Loading business profile & SEO keywords...
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
      
      {/* 2. Simplified Company Heading Section (Centered, Clean, No Badges or Buttons) */}
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

      {/* SEO Keywords Chips Section */}
      <div>
        {/* Rounded Brand Gradient Chips Component */}
        <KeywordChips
          keywords={keywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={handleToggleKeyword}
          onAddKeyword={handleAddKeyword}
          onRemoveKeyword={handleRemoveKeyword}
        />
      </div>

      {/* Deduplication Status Notice (if any duplicates were rejected) */}
      {dedupNotice && (
        <div className="p-3 rounded-2xl bg-[#068dcb]/10 border border-[#068dcb]/25 flex items-center gap-2 text-xs text-[#034665] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#068dcb] shrink-0" />
          <span>{dedupNotice}</span>
        </div>
      )}

      {/* 3 Review Cards Grid */}
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
              companyName: rev.companyName || company.name,
              companyLocation: rev.companyLocation || company.location || company.formattedAddress,
              googlePlaceId: rev.googlePlaceId || company.googlePlaceId,
              googleReviewUrl: rev.googleReviewUrl || company.googleReviewUrl,
              externalReviewLink: rev.externalReviewLink || company.externalReviewLink || company.googleReviewUrl
            };
            return (
              <ReviewCard
                key={revId || `${company.name}-${rev.contentHash}`}
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

      {/* AI Transparency & Ethical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start sm:items-center gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#068dcb] shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="text-[#034665] font-semibold">AI Review Draft Notice:</strong> All suggestions are AI-synthesized templates using your business details and selected keywords. Reviews must be reviewed, edited, and voluntarily submitted by real customers on Google.
        </p>
      </div>

    </div>
  );
}
