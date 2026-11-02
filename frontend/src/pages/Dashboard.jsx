import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import KeywordChips from '../components/KeywordChips';
import ReviewCard from '../components/ReviewCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import { syncReviewToExtension } from '../utils/extensionSync';
import { generateInstantReviews } from '../utils/instantReviewGenerator';

function getSeoStorageKey(identifier) {
  return `reviewcraft_selected_seo_${identifier || 'default'}`;
}

export default function Dashboard({ categories = [] }) {
  const params = useParams();
  // slug or ID from route (e.g. /reviews/kevalontap-ahmedabad or /reviews/6ae...)
  const routeIdentifier = params.companyId || params.id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState(null);
  const [isDeactivated, setIsDeactivated] = useState(false);

  // Keyword states
  const [keywords, setKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeReviewId, setActiveReviewId] = useState(null);

  // Reviews state (strictly 3 distinct suggestions, fresh on every selection / refresh)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dedupNotice, setDedupNotice] = useState(null);

  // Request & debounce guards
  const activeRequestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);

  const companyRef = useRef(null);
  companyRef.current = company;

  const branchRef = useRef(null);
  branchRef.current = branch;

  const selectedKeywordsRef = useRef(selectedKeywords);
  selectedKeywordsRef.current = selectedKeywords;

  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;

  // Background AI Refinement (Runs smoothly after instant client update without blocking UI)
  const triggerBackgroundRefinement = useCallback((keywordsToUse, companyOverride = null, branchOverride = null) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    activeRequestIdRef.current += 1;
    const currentReqId = activeRequestIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      const targetComp = companyOverride || companyRef.current;
      const targetBranch = branchOverride || branchRef.current;
      if (!targetComp) return;

      const activeKws = Array.isArray(keywordsToUse) && keywordsToUse.length > 0
        ? keywordsToUse
        : (selectedKeywordsRef.current?.length > 0 ? selectedKeywordsRef.current : ['Quality Service']);

      const resolvedReviewUrl = targetBranch?.googleReviewUrl || targetComp?.googleReviewUrl || targetComp?.externalReviewLink || '';
      const resolvedBranchId = targetBranch?.id || targetBranch?._id || '';
      const resolvedBranchName = targetBranch?.branchName || '';
      const resolvedLocation = targetBranch?.city || targetBranch?.address || targetComp?.location || '';

      try {
        const payload = {
          companyId: targetComp.id || targetComp._id,
          branchId: resolvedBranchId,
          companyName: targetComp.companyName || targetComp.name,
          branchName: resolvedBranchName,
          category: targetComp.category,
          selectedKeywords: activeKws,
          services: targetComp.services,
          description: targetComp.description,
          location: resolvedLocation,
          googleReviewUrl: resolvedReviewUrl,
          externalReviewLink: resolvedReviewUrl,
          language: targetComp.preferredLanguage || 'en',
          tone: 'natural',
          length: 'medium',
          count: 3
        };

        const res = await api.generateReviews(payload);

        // Only apply if user hasn't toggled newer keywords in the interim
        if (currentReqId === activeRequestIdRef.current && res.success && Array.isArray(res.reviews) && res.reviews.length > 0) {
          const topReviews = res.reviews.slice(0, 3).map((r) => ({
            ...r,
            googleReviewUrl: resolvedReviewUrl,
            externalReviewLink: resolvedReviewUrl,
            branchName: resolvedBranchName,
            companyLocation: resolvedLocation
          }));

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
        }
      } catch (err) {
        console.warn('Background AI refinement notice:', err.message);
      }
    }, 500);
  }, []);

  // Load Company & Branch Profile (supports slug like 'kevalontap-ahmedabad' or IDs)
  useEffect(() => {
    let isMounted = true;
    setLoadingCompany(true);
    setCompanyError(null);

    async function fetchReviewTarget() {
      try {
        let targetSlugOrId = routeIdentifier;

        if (!targetSlugOrId) {
          const allRes = await api.getCompanies();
          if (allRes.success && allRes.companies && allRes.companies.length > 0) {
            const first = allRes.companies[0];
            const firstBranch = first.branches && first.branches[0];
            targetSlugOrId = firstBranch?.reviewPageSlug || first.id;
          } else {
            setCompanyError('No business review pages available in database.');
            setLoadingCompany(false);
            return;
          }
        }

        // 1. Try public review page resolver (handles branch reviewPageSlug or branch ID)
        let pageRes = await api.getReviewPage(targetSlugOrId).catch(() => null);

        // 2. Fallback to getCompanyById if not resolved as branch slug
        if (!pageRes || !pageRes.success || !pageRes.branch) {
          const compRes = await api.getCompanyById(targetSlugOrId).catch(() => null);
          if (compRes && compRes.success && compRes.company) {
            const c = compRes.company;
            const primaryBranch = c.branches && c.branches[0];
            pageRes = {
              success: true,
              branch: primaryBranch || {
                id: c.id,
                branchName: c.companyName || c.name,
                googleReviewUrl: c.googleReviewUrl || c.externalReviewLink || '',
                reviewPageSlug: c.id,
                isActive: c.isActive !== false,
                seoKeywords: c.seoKeywords || c.keywords || []
              },
              company: c
            };
          }
        }

        if (!isMounted) return;

        if (pageRes && pageRes.success && pageRes.branch) {
          const b = pageRes.branch;
          const c = pageRes.company || pageRes.branch?.company || {};

          // Check if either branch or parent company is inactive
          if (b.isActive === false || b.status === 'inactive' || c.isActive === false) {
            setIsDeactivated(true);
            setLoadingReviews(false);
            return;
          }
          setIsDeactivated(false);

          setBranch(b);
          setCompany(c);

          // Build merged target object
          const mergedTarget = {
            id: c.id || c._id || b.companyId,
            _id: c._id || c.id || b.companyId,
            companyName: c.companyName || c.name || b.branchName,
            name: c.companyName || c.name || b.branchName,
            category: c.category || 'General',
            services: c.services || '',
            description: c.description || '',
            branchId: b.id || b._id,
            branchName: b.branchName,
            branchCity: b.city || '',
            branchAddress: b.address || '',
            googleReviewUrl: b.googleReviewUrl || c.googleReviewUrl || '',
            externalReviewLink: b.googleReviewUrl || c.externalReviewLink || '',
            preferredLanguage: c.preferredLanguage || 'en'
          };

          const rawKeywords = Array.isArray(b.seoKeywords) && b.seoKeywords.length > 0
            ? b.seoKeywords
            : (Array.isArray(c.seoKeywords) && c.seoKeywords.length > 0 ? c.seoKeywords : (c.keywords || []));

          const cleanKeywords = Array.from(new Set(rawKeywords.map((k) => k.trim()).filter(Boolean)));
          const finalKeywords = cleanKeywords.length > 0 ? cleanKeywords : ['Quality Service', 'Customer Support'];
          setKeywords(finalKeywords);

          // Persistent selected SEO keywords retrieval
          // If the user selected multiple SEO keywords, retain them across refresh!
          // They will only be removed if the user explicitly unselects them.
          const storageKey = getSeoStorageKey(targetSlugOrId || b?.reviewPageSlug || b?.id || c?.id);
          let initialSelected = [];
          try {
            const rawStored = localStorage.getItem(storageKey);
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Keep only keywords that belong to this business
                const validKeywords = parsed.filter((k) => finalKeywords.includes(k));
                if (validKeywords.length > 0) {
                  initialSelected = validKeywords;
                }
              }
            }
          } catch (e) {
            console.warn('Error reading saved SEO keywords from storage:', e);
          }

          // Fallback only if user hasn't made any selection yet
          if (initialSelected.length === 0) {
            initialSelected = [finalKeywords[0]];
            try {
              localStorage.setItem(storageKey, JSON.stringify(initialSelected));
            } catch (e) {}
          }

          setSelectedKeywords(initialSelected);

          // 1. Instantly display fresh, unique reviews for the selected SEO keywords on load/refresh
          const initialInstant = generateInstantReviews(initialSelected, mergedTarget, b, 3);
          setReviews(initialInstant);
          setLoadingReviews(false);
          setIsGenerating(false);

          if (initialInstant[0]) {
            try {
              syncReviewToExtension(initialInstant[0], mergedTarget, 'auto_sync');
            } catch (e) {}
          }

          // 2. Background AI refinement
          triggerBackgroundRefinement(initialSelected, mergedTarget, b);
        } else {
          setCompanyError('The requested business review page could not be found.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching review page:', err);
        setCompanyError(err.message || 'Failed to load review page.');
      } finally {
        if (isMounted) setLoadingCompany(false);
      }
    }

    fetchReviewTarget();
    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [routeIdentifier, triggerBackgroundRefinement]);

  // Helper to persist keyword selection
  const persistSelection = (newSelection) => {
    const targetComp = companyRef.current;
    const targetBranch = branchRef.current;
    const targetId = routeIdentifier || targetBranch?.reviewPageSlug || targetBranch?.id || targetComp?.id || 'default';
    const storageKey = getSeoStorageKey(targetId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSelection));
    } catch (e) {}
  };

  // Handle Keyword Selection: Multi-select support with INSTANT zero-latency review update
  // User can select or unselect any SEO keyword freely
  const handleToggleKeyword = (kw) => {
    let next;
    if (selectedKeywords.includes(kw)) {
      // Unselect this keyword
      next = selectedKeywords.filter((k) => k !== kw);
    } else {
      // Select this keyword
      next = [...selectedKeywords, kw];
    }

    setSelectedKeywords(next);
    persistSelection(next);

    // If user unselects all keywords, show empty state prompt
    if (next.length === 0) {
      setReviews([]);
      setLoadingReviews(false);
      setIsGenerating(false);
      return;
    }

    // 1. INSTANT REVIEW GENERATION: Update reviews in 0 ms with ALL selected keywords!
    const targetComp = companyRef.current;
    const targetBranch = branchRef.current;
    const instantReviews = generateInstantReviews(next, targetComp, targetBranch, 3);
    setReviews(instantReviews);
    setLoadingReviews(false);
    setIsGenerating(false);

    if (instantReviews[0] && targetComp) {
      try {
        syncReviewToExtension(instantReviews[0], targetComp, 'auto_sync');
      } catch (e) {}
    }

    // 2. Refine in background via Groq AI without blocking UI or dropping clicks
    triggerBackgroundRefinement(next, targetComp, targetBranch);
  };

  if (loadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Loading business review page...
        </p>
      </div>
    );
  }

  // INACTIVE REVIEW PAGE NOTICE
  if (isDeactivated) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl glass-panel text-center space-y-5 border border-slate-200 shadow-xl bg-white animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Review Page Inactive</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            This review page is currently inactive. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // NOT FOUND
  if (companyError || !company) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl glass-panel text-center space-y-5 border border-slate-200 shadow-xl bg-white animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Business Profile Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {companyError || "The requested business review page could not be found. Please check the URL or contact your administrator."}
        </p>
      </div>
    );
  }

  const companyDisplayName = company.companyName || company.name || 'Business';
  const branchDisplayName = branch?.branchName || '';
  const branchCity = branch?.city || branch?.address || '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Company & Branch Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-200/40 text-center space-y-2.5">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#034665] to-[#068dcb]">{companyDisplayName}</span>
        </h1>

        {branchDisplayName && (
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#034665] text-xs font-bold shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-[#068dcb]" />
              <span>{branchDisplayName}</span>
              {branchCity && <span className="text-slate-500 font-medium">({branchCity})</span>}
            </span>
          </div>
        )}

        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#034665] pt-1">
          SELECT KEYWORDS & GENERATE REVIEW SUGGESTIONS
        </p>
      </div>

      {/* SEO Keywords Chips */}
      <div>
        <KeywordChips
          keywords={keywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={handleToggleKeyword}
        />
      </div>

      {/* Deduplication Notice */}
      {dedupNotice && (
        <div className="p-3 text-xs text-slate-600 bg-sky-50/70 border border-[#068dcb]/20 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#068dcb] shrink-0" />
          <span>{dedupNotice}</span>
        </div>
      )}

      {/* Review Cards Grid or Empty State */}
      {selectedKeywords.length === 0 ? (
        <div className="p-12 rounded-3xl text-center space-y-4 glass-panel border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="w-12 h-12 rounded-2xl bg-[#068dcb]/10 text-[#034665] border border-[#068dcb]/25 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6 text-[#068dcb]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No SEO Keywords Selected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please select one or more target SEO keywords above to view personalized 5-star customer review suggestions.
          </p>
        </div>
      ) : reviews.length === 0 && (loadingReviews || isGenerating) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonReviewCard />
          <SkeletonReviewCard />
          <SkeletonReviewCard />
        </div>
      ) : reviews.length > 0 ? (
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.slice(0, 3).map((rev) => {
              const revId = rev._id || rev.id;
              const fullRev = {
                ...rev,
                rating: Number(rev.rating) || 5,
                companyName: companyDisplayName,
                companyLocation: branchCity || company?.location || '',
                googleReviewUrl: branch?.googleReviewUrl || company?.googleReviewUrl || rev.googleReviewUrl || '',
                externalReviewLink: branch?.googleReviewUrl || company?.externalReviewLink || rev.externalReviewLink || ''
              };

              return (
                <ReviewCard
                  key={revId || `${companyDisplayName}-${rev.contentHash || rev.reviewText || Math.random()}`}
                  review={fullRev}
                  company={{
                    ...company,
                    name: companyDisplayName,
                    location: branchCity || company?.location,
                    googleReviewUrl: branch?.googleReviewUrl || company?.googleReviewUrl,
                    externalReviewLink: branch?.googleReviewUrl || company?.externalReviewLink
                  }}
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
            Select one of your target SEO keywords above to synthesize suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
