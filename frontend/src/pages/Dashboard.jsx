import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Globe, 
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import CategorySelector from '../components/CategorySelector';
import KeywordChips from '../components/KeywordChips';
import ReviewCard from '../components/ReviewCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import { getGoogleReviewUrl } from '../utils/googleReviewUrl';

// Helpers to persist and retrieve custom tags in localStorage
function getCustomTags(category, companyId) {
  try {
    const catTags = JSON.parse(localStorage.getItem(`reviewcraft_custom_tags_${category}`) || '[]');
    const compTags = companyId ? JSON.parse(localStorage.getItem(`reviewcraft_custom_tags_company_${companyId}`) || '[]') : [];
    return Array.from(new Set([...catTags, ...compTags]));
  } catch {
    return [];
  }
}

function saveCustomTag(category, companyId, newTag) {
  try {
    if (!newTag) return;
    const catKey = `reviewcraft_custom_tags_${category}`;
    const existingCat = JSON.parse(localStorage.getItem(catKey) || '[]');
    if (!existingCat.includes(newTag)) {
      localStorage.setItem(catKey, JSON.stringify([newTag, ...existingCat]));
    }
    if (companyId) {
      const compKey = `reviewcraft_custom_tags_company_${companyId}`;
      const existingComp = JSON.parse(localStorage.getItem(compKey) || '[]');
      if (!existingComp.includes(newTag)) {
        localStorage.setItem(compKey, JSON.stringify([newTag, ...existingComp]));
      }
    }
  } catch (e) {
    console.error('Failed to save custom tag to localStorage:', e);
  }
}

export default function Dashboard({
  companies = [],
  selectedCompany,
  categories = [],
  onSelectCompany
}) {
  const { addToast } = useToast();

  // Active category & keyword selection with localStorage persistence
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return localStorage.getItem('reviewcraft_category') ||
      selectedCompany?.category ||
      'Restaurants and Food';
  });
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(() => {
    return localStorage.getItem('reviewcraft_keyword') || '';
  });

  // Reviews state (strictly 3 reviews)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // When selected company changes, sync category & localStorage
  useEffect(() => {
    if (selectedCompany && selectedCompany.category) {
      setSelectedCategory(selectedCompany.category);
      localStorage.setItem('reviewcraft_category', selectedCompany.category);
      localStorage.setItem('reviewcraft_company_id', selectedCompany.id);
    }
  }, [selectedCompany]);

  // When category changes, auto-switch to a matching company profile
  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    localStorage.setItem('reviewcraft_category', catName);
    const matchingCompany = companies.find((c) => c.category === catName);
    if (matchingCompany && onSelectCompany) {
      onSelectCompany(matchingCompany);
      localStorage.setItem('reviewcraft_company_id', matchingCompany.id);
    }
  };

  // Load keywords when selected category or company changes
  useEffect(() => {
    if (!selectedCategory) return;
    let isMounted = true;

    // Immediately fetch custom tags from localStorage so custom tags are NEVER lost
    const customTags = getCustomTags(selectedCategory, selectedCompany?.id);
    const savedKw = localStorage.getItem('reviewcraft_keyword');
    if (savedKw && !customTags.includes(savedKw)) {
      customTags.unshift(savedKw);
    }

    api.getCategoryKeywords(selectedCategory)
      .then((res) => {
        if (!isMounted) return;
        const presetKeywords = res.keywords || [];
        const companyKws = selectedCompany?.keywords || [];
        const combined = Array.from(new Set([...customTags, ...companyKws, ...presetKeywords]));
        setKeywords(combined);

        // Check if there is an existing keyword in localStorage or state
        const activeKw = localStorage.getItem('reviewcraft_keyword');
        if (activeKw && combined.includes(activeKw)) {
          if (selectedKeyword !== activeKw) {
            setSelectedKeyword(activeKw);
          }
        } else if (activeKw) {
          // If activeKw is custom, keep it in combined list and select it
          setKeywords([activeKw, ...combined]);
          setSelectedKeyword(activeKw);
        } else {
          const defaultKw = combined[0] || '';
          setSelectedKeyword(defaultKw);
          if (defaultKw) {
            localStorage.setItem('reviewcraft_keyword', defaultKw);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching keywords:', err);
        if (customTags.length > 0) {
          setKeywords(customTags);
        }
      });

    return () => { isMounted = false; };
  }, [selectedCategory, selectedCompany]);

  // Generate 3 fresh, unique reviews on every refresh / tag change with diverse business names
  const generateFreshReviews = useCallback(async (targetKw) => {
    if (!selectedCompany?.id) return;
    const kw = targetKw || selectedKeyword;
    if (!kw) return;

    setLoadingReviews(true);
    setIsGenerating(true);

    try {
      // Always generate 3 fresh, unique reviews from the backend ML engine in English
      const genRes = await api.generateReviews({
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        category: selectedCategory || selectedCompany.category,
        keyword: kw,
        description: selectedCompany.description,
        services: selectedCompany.services,
        location: selectedCompany.location,
        language: 'en', // Strictly English as requested
        tone: 'natural',
        length: 'medium',
        count: 3
      });

      if (genRes.success && genRes.reviews && genRes.reviews.length >= 3) {
        setReviews(genRes.reviews.slice(0, 3));
      } else {
        // Fallback to latest reviews in DB if rate limit
        const res = await api.getReviews({
          companyId: selectedCompany.id,
          keyword: kw,
          limit: 3
        });
        if (res.success && res.reviews && res.reviews.length > 0) {
          setReviews(res.reviews.slice(0, 3));
        }
      }
    } catch (err) {
      console.warn('Generation error, falling back to cached reviews:', err);
      const res = await api.getReviews({
        companyId: selectedCompany.id,
        keyword: kw,
        limit: 3
      }).catch(() => ({}));
      if (res && res.reviews && res.reviews.length > 0) {
        setReviews(res.reviews.slice(0, 3));
      }
    } finally {
      setLoadingReviews(false);
      setIsGenerating(false);
    }
  }, [selectedCompany, selectedCategory, selectedKeyword]);

  // Initial load / refresh / tag change: ALWAYS generate 3 fresh unique reviews
  useEffect(() => {
    if (selectedKeyword && selectedCompany?.id) {
      generateFreshReviews(selectedKeyword);
    }
  }, [selectedCompany?.id, selectedKeyword]);

// When clicking a keyword tag
  const handleSelectKeyword = (kw) => {
    localStorage.setItem('reviewcraft_keyword', kw);
    if (kw === selectedKeyword) {
      generateFreshReviews(kw);
    } else {
      setSelectedKeyword(kw);
    }
  };

  const handleAddCustomKeyword = (newKw) => {
    const cleanKw = newKw.trim();
    if (!cleanKw) return;

    // 1. Persist to localStorage immediately
    saveCustomTag(selectedCategory, selectedCompany?.id, cleanKw);
    localStorage.setItem('reviewcraft_keyword', cleanKw);

    // 2. Add to active keywords state
    if (!keywords.includes(cleanKw)) {
      setKeywords([cleanKw, ...keywords]);
    }

    // 3. Persist to backend in background
    if (selectedCompany?.id) {
      api.addCompanyKeyword(selectedCompany.id, cleanKw).catch(() => {});
    }
    if (selectedCategory) {
      api.addCategoryKeyword(selectedCategory, cleanKw).catch(() => {});
    }

    // 4. Set as selected keyword and generate fresh reviews
    setSelectedKeyword(cleanKw);
    generateFreshReviews(cleanKw);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* AI Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="leading-tight">
            <strong className="text-indigo-950 font-bold">AI Review Suggestions:</strong> Click any review card to copy and open the Google Review page.
          </p>
        </div>
      </div>

      {/* Selected Company Profile Banner */}
      {selectedCompany && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedCompany.category}
                </span>
                {selectedCompany.location && (
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedCompany.location}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{selectedCompany.name}</span>
              </h1>
              {selectedCompany.description && (
                <p className="text-xs text-slate-600 max-w-2xl font-normal pt-0.5">
                  {selectedCompany.description}
                </p>
              )}
            </div>

            {/* External Google Review Link button - Guaranteed valid URL without Google 400 error */}
            <a
              href={getGoogleReviewUrl(selectedCompany)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-2xs group"
              title="Open Google listing to view or write a review"
            >
              <Globe className="w-4 h-4 text-indigo-600 group-hover:rotate-12 transition-transform" />
              <span>Open Google Review Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </a>

          </div>
        </div>
      )}

      {/* Categories */}
      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Dynamic Keyword Chips */}
      <KeywordChips
        keywords={keywords}
        selectedKeyword={selectedKeyword}
        onSelectKeyword={handleSelectKeyword}
        onAddCustomKeyword={handleAddCustomKeyword}
      />

      {/* Reviews Section Header */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Review Suggestions</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                3 Unique Suggestions
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click any card to copy review text and redirect directly to Google
            </p>
          </div>
        </div>

        {/* 3 Review Cards Grid */}
        {loadingReviews || isGenerating ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonReviewCard />
            <SkeletonReviewCard />
            <SkeletonReviewCard />
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.slice(0, 3).map((rev) => (
              <ReviewCard
                key={rev.id || `${rev.companyName}-${rev.contentHash}`}
                review={{
                  ...rev,
                  companyName: rev.companyName || selectedCompany?.name,
                  companyLocation: rev.companyLocation || selectedCompany?.location,
                  externalReviewLink: rev.externalReviewLink || selectedCompany?.externalReviewLink
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl text-center space-y-3 bg-white border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Loading review suggestions...</h3>
          </div>
        )}
      </div>


    </div>
  );
}
