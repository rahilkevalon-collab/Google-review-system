import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  Globe, 
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Building2,
  Info,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import KeywordChips from '../components/KeywordChips';
import ReviewCard from '../components/ReviewCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

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

          // Restore or set default selected keywords
          const savedKw = localStorage.getItem(`reviewcraft_selected_kw_${comp.id}`);
          let initialSelected = [];
          if (savedKw && finalKeywords.includes(savedKw)) {
            initialSelected = [savedKw];
          } else {
            initialSelected = [finalKeywords[0]];
          }
          setSelectedKeywords(initialSelected);
        } else {
          setCompanyError('Company profile not found in database.');
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

  // 2. Generate Review Suggestions using Flask + Scikit-Learn TF-IDF deduplication
  const generateReviews = useCallback(async (keywordsToUse, forceFresh = false) => {
    if (!company?.id) return;

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
      const payload = {
        companyId: company.id,
        companyName: company.name,
        category: company.category,
        selectedKeywords: activeKeywords,
        services: company.services,
        description: company.description,
        location: company.location || company.formattedAddress,
        language: company.preferredLanguage || 'en',
        tone: 'natural',
        length: 'medium',
        count: 3
      };

      const res = await api.generateReviews(payload);

      if (res.success && Array.isArray(res.reviews) && res.reviews.length > 0) {
        setReviews(res.reviews.slice(0, 3));
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
          setReviews(fallbackRes.reviews.slice(0, 3));
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

  // 3. Trigger initial generation when company and keywords are loaded
  useEffect(() => {
    if (company?.id && selectedKeywords.length > 0) {
      generateReviews(selectedKeywords);
    }
  }, [company?.id, selectedKeywords.join(',')]);

  // 4. Handle Keyword Selection (single or multi-select)
  const handleToggleKeyword = (kw) => {
    let next;
    if (selectedKeywords.includes(kw)) {
      if (selectedKeywords.length > 1) {
        next = selectedKeywords.filter((k) => k !== kw);
      } else {
        // If it's the only one selected, re-generate on it
        next = [kw];
      }
    } else {
      next = [...selectedKeywords, kw];
    }

    setSelectedKeywords(next);
    if (company?.id) {
      localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, next[0] || kw);
    }
  };

  // 5. Add a new keyword chip
  const handleAddKeyword = (newKw) => {
    const clean = newKw.trim();
    if (!clean) return;

    if (!keywords.includes(clean)) {
      const updated = [...keywords, clean];
      setKeywords(updated);
      setSelectedKeywords([clean]);

      if (company?.id) {
        api.addCompanyKeyword(company.id, clean).catch(() => {});
        localStorage.setItem(`reviewcraft_selected_kw_${company.id}`, clean);
      }
      generateReviews([clean], true);
      addToast(`Added keyword: "${clean}"`, 'success');
    } else {
      setSelectedKeywords([clean]);
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
    }
    addToast(`Removed keyword: "${kwToRemove}"`, 'info');
  };

  // 7. Regenerate reviews explicitly
  const handleRegenerate = () => {
    generateReviews(selectedKeywords, true);
    addToast('Generating fresh, non-repeating review suggestions...', 'info');
  };

  // 8. Generate More Reviews
  const handleGenerateMore = () => {
    generateReviews(selectedKeywords, true);
    addToast('Synthesizing additional suggestions...', 'info');
  };

  if (loadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-purple-300 font-medium tracking-wide">
          Loading business profile & SEO keywords...
        </p>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl glass-panel text-center space-y-5 border border-purple-500/20">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Business Profile Not Found</h2>
        <p className="text-sm text-slate-400">
          {companyError || "Could not retrieve the saved business details from MongoDB."}
        </p>
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/30"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Go to Setup Form</span>
        </Link>
      </div>
    );
  }

  const googleReviewDestination = getGoogleReviewUrl(company);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Top Banner: Tapzy Inspired - White heading with Purple Company Name */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/20 relative overflow-hidden bg-slate-950/80 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          
          <div className="space-y-2 max-w-2xl">
            {/* Meta Tags / Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {company.category || 'Business'}
              </span>
              {(company.location || company.formattedAddress) && (
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate max-w-xs">{company.formattedAddress || company.location}</span>
                </span>
              )}
              {company.preferredLanguage && (
                <span className="text-[11px] uppercase font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                  Lang: {company.preferredLanguage === 'hi' ? 'Hindi' : company.preferredLanguage === 'gu' ? 'Gujarati' : 'English'}
                </span>
              )}
            </div>

            {/* Main Page 2 Heading & Subtitle */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500">{company.name}</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-300/80 pt-0.5">
              SELECT KEYWORDS & GENERATE REVIEW SUGGESTIONS
            </p>

            {company.description && (
              <p className="text-xs text-slate-400 max-w-xl font-normal leading-relaxed pt-1">
                {company.description}
              </p>
            )}
          </div>

          {/* Right Action: Open Google Review Destination Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={googleReviewDestination}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 text-xs font-semibold text-purple-200 hover:text-white transition-all shadow-md shadow-purple-950/50 group"
              title="Open Google listing to inspect or write reviews"
            >
              <Globe className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
              <span>Open Google Review Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300" />
            </a>

            <Link
              to="/setup"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-xs font-semibold text-purple-300 hover:text-white transition-all"
              title="Create or edit business setup"
            >
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Edit Setup</span>
            </Link>
          </div>

        </div>
      </div>

      {/* SEO Keywords Chips Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-purple-300/90 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Target SEO Keyword Chips</span>
            <span className="text-[10px] text-slate-400 normal-case font-normal">
              (Click to select one or multiple keywords)
            </span>
          </label>
        </div>

        {/* Rounded Purple Chips Component */}
        <KeywordChips
          keywords={keywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={handleToggleKeyword}
          onAddKeyword={handleAddKeyword}
          onRemoveKeyword={handleRemoveKeyword}
        />
      </div>

      {/* Action Controls: Regenerate & Generate More Reviews */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Customer Review Suggestions</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              3 Distinct Suggestions
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Regenerate Button */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating || loadingReviews}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 text-xs font-semibold text-purple-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            title="Generate a fresh new batch of unique suggestions"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          {/* Generate More Reviews Button */}
          <button
            type="button"
            onClick={handleGenerateMore}
            disabled={isGenerating || loadingReviews}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Synthesize additional review suggestions"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Generate More Reviews</span>
          </button>
        </div>
      </div>

      {/* Deduplication Status Notice (if any duplicates were rejected) */}
      {dedupNotice && (
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/25 flex items-center gap-2 text-xs text-purple-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
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
          {reviews.slice(0, 3).map((rev) => (
            <ReviewCard
              key={rev.id || rev._id || `${company.name}-${rev.contentHash}`}
              review={{
                ...rev,
                companyName: rev.companyName || company.name,
                companyLocation: rev.companyLocation || company.location || company.formattedAddress,
                googlePlaceId: rev.googlePlaceId || company.googlePlaceId,
                googleReviewUrl: rev.googleReviewUrl || company.googleReviewUrl,
                externalReviewLink: rev.externalReviewLink || company.externalReviewLink || company.googleReviewUrl
              }}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl text-center space-y-4 glass-panel border border-purple-500/20 bg-slate-950/70">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Review Suggestions Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select one of your target SEO keywords above and click "Generate More Reviews".
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30"
          >
            Generate Now
          </button>
        </div>
      )}

      {/* AI Transparency & Ethical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/15 flex items-start sm:items-center gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="text-purple-300 font-semibold">AI Review Draft Notice:</strong> All suggestions are AI-synthesized templates using your business details and selected keywords. Reviews must be reviewed, edited, and voluntarily submitted by real customers on Google.
        </p>
      </div>

    </div>
  );
}
