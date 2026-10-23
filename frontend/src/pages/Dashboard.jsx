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
import AnalyticsWidget from '../components/AnalyticsWidget';

export default function Dashboard({
  companies = [],
  selectedCompany,
  categories = [],
  onSelectCompany
}) {
  const { addToast } = useToast();

  // Active category & keyword selection
  const [selectedCategory, setSelectedCategory] = useState(
    selectedCompany?.category || categories[0]?.name || 'IT Services and Software Development'
  );
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');

  // Reviews state (strictly 3 reviews)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState(null);

  // When selected company changes
  useEffect(() => {
    if (selectedCompany && selectedCompany.category) {
      setSelectedCategory(selectedCompany.category);
    }
  }, [selectedCompany]);

  // When category changes, auto-switch to a matching company profile if available
  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    const matchingCompany = companies.find((c) => c.category === catName);
    if (matchingCompany && onSelectCompany) {
      onSelectCompany(matchingCompany);
    }
  };

  // Load keywords when selected category or company changes
  useEffect(() => {
    if (!selectedCategory) return;
    let isMounted = true;

    api.getCategoryKeywords(selectedCategory)
      .then((res) => {
        if (!isMounted) return;
        const presetKeywords = res.keywords || [];
        const companyKws = selectedCompany?.keywords || [];
        const combined = Array.from(new Set([...presetKeywords, ...companyKws]));
        setKeywords(combined);
        
        if (!combined.includes(selectedKeyword)) {
          setSelectedKeyword(combined[0] || '');
        }
      })
      .catch((err) => {
        console.error('Error fetching keywords:', err);
      });

    return () => { isMounted = false; };
  }, [selectedCategory, selectedCompany]);

  // Generate and display exactly 3 brand new reviews on refresh or tag click
  const generateThreeFreshReviews = useCallback(async (targetKw) => {
    if (!selectedCompany?.id) return;
    const kw = targetKw || selectedKeyword;
    if (!kw) return;

    setLoadingReviews(true);
    setIsGenerating(true);

    try {
      // Generate 3 fresh non-repeating reviews from the backend ML engine
      const genRes = await api.generateReviews({
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        category: selectedCategory,
        keyword: kw,
        description: selectedCompany.description,
        services: selectedCompany.services,
        location: selectedCompany.location,
        language: selectedCompany.preferredLanguage || 'en',
        tone: 'natural',
        length: 'medium',
        count: 3
      });

      if (genRes.success && genRes.reviews && genRes.reviews.length >= 3) {
        setReviews(genRes.reviews.slice(0, 3));
      } else {
        // Fetch latest 3 from DB if needed
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
      // In case of rapid click cooldown, load the latest 3 from DB
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

  // Initial load / refresh: generate 3 fresh reviews for active keyword
  useEffect(() => {
    if (selectedKeyword && selectedCompany?.id) {
      generateThreeFreshReviews(selectedKeyword);
    }
  }, [selectedCompany?.id, selectedKeyword]);

  // Fetch analytics overview
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.getAnalyticsOverview();
      if (res.success) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // When clicking a keyword tag: directly generate 3 fresh reviews
  const handleSelectKeyword = (kw) => {
    setSelectedKeyword(kw);
    generateThreeFreshReviews(kw);
  };

  const handleAddCustomKeyword = (newKw) => {
    if (!keywords.includes(newKw)) {
      setKeywords([newKw, ...keywords]);
    }
    setSelectedKeyword(newKw);
    generateThreeFreshReviews(newKw);
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

            {/* External Google Review Link button */}
            {selectedCompany.externalReviewLink && (
              <a
                href={selectedCompany.externalReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-2xs group"
              >
                <Globe className="w-4 h-4 text-indigo-600 group-hover:rotate-12 transition-transform" />
                <span>Open Google Review Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              </a>
            )}

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

      {/* Reviews Section Header (No search, no regenerate, no tone dropdown) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Review Suggestions</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                3 Ready
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
              <ReviewCard key={rev.id} review={rev} />
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

      {/* Analytics Overview Widget */}
      <AnalyticsWidget analytics={analytics} onRefreshAnalytics={fetchAnalytics} />

    </div>
  );
}
