import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Briefcase, 
  Search, 
  Check, 
  ChevronDown, 
  ArrowRight,
  Loader2,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

/**
 * Client-side SEO keyword synthesizer guaranteeing 3 to 7 high-intent keywords.
 */
function synthesizeClientKeywords(name, category, services, location = '', categoriesList = []) {
  const candidates = [];
  const seen = new Set();

  function add(kw) {
    if (!kw) return;
    const clean = kw.trim();
    if (clean.length >= 3 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      candidates.push(clean);
    }
  }

  // 1. Services offered
  if (services) {
    const raw = services.replace(/;/g, ',').split(',');
    for (const s of raw) {
      add(s);
    }
  }

  // 2. Geo-targeting with city (if available)
  const primaryCity = location ? location.split(',')[0].trim() : '';
  if (primaryCity && candidates.length > 0) {
    const topServices = candidates.slice(0, 2);
    for (const srv of topServices) {
      if (!srv.toLowerCase().includes(primaryCity.toLowerCase())) {
        add(`${srv} ${primaryCity}`);
      }
    }
  }

  // 3. Category-specific SEO terms
  const catObj = categoriesList.find((c) => (c.name || '').toLowerCase() === (category || '').toLowerCase());
  if (catObj && Array.isArray(catObj.keywords)) {
    for (const ckw of catObj.keywords) {
      if (candidates.length >= 7) break;
      add(ckw);
    }
  }

  // 4. Default high-intent business terms
  const fallbacks = [
    `${category || 'Business'} Services`,
    'Quality Service',
    'Customer Support',
    'Reliable Solutions',
    'Top Rated Service'
  ];
  for (const fb of fallbacks) {
    if (candidates.length >= 3) break;
    add(fb);
  }

  return candidates.slice(0, 7);
}

export default function CompanySetup({ categories = [] }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'IT Services and Software Development',
    services: '',
    location: '',
    formattedAddress: '',
    googlePlaceId: '',
    preferredLanguage: 'en',
    description: ''
  });

  // Automatically synthesized SEO keywords in the background (guaranteed strictly 3 to 7)
  const [autoKeywords, setAutoKeywords] = useState([]);
  const seoDebounceTimeout = useRef(null);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Searchable Category Dropdown state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatic SEO Keyword Synthesizer (runs silently in the background)
  const triggerAutoSeoGeneration = useCallback((name, category, services) => {
    if (seoDebounceTimeout.current) {
      clearTimeout(seoDebounceTimeout.current);
    }

    seoDebounceTimeout.current = setTimeout(async () => {
      try {
        const res = await api.generateSeoKeywords({
          name: (name || '').trim(),
          category: (category || '').trim(),
          services: (services || '').trim(),
          location: ''
        });

        if (res.success && Array.isArray(res.seoKeywords) && res.seoKeywords.length >= 3) {
          setAutoKeywords(res.seoKeywords.slice(0, 7));
        } else {
          // Fallback to instant client synthesizer
          const fallbackKws = synthesizeClientKeywords(name, category, services, '', categories);
          setAutoKeywords(fallbackKws);
        }
      } catch (e) {
        const fallbackKws = synthesizeClientKeywords(name, category, services, '', categories);
        setAutoKeywords(fallbackKws);
      }
    }, 400);
  }, [categories]);

  // Company Name change handler
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, name: val }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }

    // Auto-update SEO keywords silently in the background
    triggerAutoSeoGeneration(val, formData.category, formData.services);
  };

  // Quick Demo Autofill
  const handleAutofillDemo = () => {
    const demoData = {
      name: 'Kevalon Technology',
      category: 'IT Services and Software Development',
      services: 'Web Development, AI Solutions, Mobile App Development, SEO Services',
      location: 'Ahmedabad, Gujarat, India',
      formattedAddress: 'Ahmedabad, Gujarat, India',
      googlePlaceId: '',
      preferredLanguage: 'en',
      description: 'Next-generation software engineering firm specializing in modern web, mobile apps, and enterprise AI automation.'
    };
    setFormData(demoData);
    setErrors({});
    
    // Auto-generate keywords for demo
    const demoKws = synthesizeClientKeywords(
      demoData.name,
      demoData.category,
      demoData.services,
      demoData.location,
      categories
    );
    setAutoKeywords(demoKws);
    addToast('Loaded Kevalon Technology demo profile!', 'info');
  };

  // Parse services chips for preview under services input
  const parsedServices = formData.services
    .replace(/;/g, ',')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Form Validation & Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Company / Business Name is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    // Ensure strictly between 3 and 7 keywords matching exact company name, category, and services
    let finalKeywords = autoKeywords;
    if (!finalKeywords || finalKeywords.length < 3 || formData.services) {
      const synthesized = synthesizeClientKeywords(formData.name, formData.category, formData.services, '', categories);
      if (synthesized && synthesized.length >= 3) {
        finalKeywords = synthesized;
      }
    }
    if (finalKeywords.length > 7) {
      finalKeywords = finalKeywords.slice(0, 7);
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        services: formData.services.trim(),
        seoKeywords: finalKeywords,
        location: (formData.location || '').trim(),
        formattedAddress: (formData.formattedAddress || formData.location || '').trim(),
        googlePlaceId: (formData.googlePlaceId || '').trim(),
        preferredLanguage: 'en',
        description: formData.description.trim()
      };

      const res = await api.createCompany(payload);
      if (res.success && res.company) {
        addToast(`Company "${res.company.name}" created successfully!`, 'success');
        localStorage.setItem('reviewcraft_company_id', res.company.id);
        localStorage.setItem('reviewcraft_category', res.company.category);
        localStorage.setItem('reviewcraft_keyword', (res.company.seoKeywords && res.company.seoKeywords[0]) || 'Quality Service');

        // Clear previous active review selection so new company starts fresh
        localStorage.removeItem('reviewcraft_active_selected_review');
        localStorage.removeItem(`reviewcraft_active_selected_review_${res.company.id}`);

        // Navigate directly to Page 2 review generation studio
        navigate(`/reviews/${res.company.id}`);
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      addToast(err.message || 'Failed to setup company. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter categories and ensure 'Other' is always at the very end
  const filteredCategories = categories
    .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    .sort((a, b) => {
      const aIsOther = (a.name || '').trim().toLowerCase() === 'other';
      const bIsOther = (b.name || '').trim().toLowerCase() === 'other';
      if (aIsOther && !bIsOther) return 1;
      if (!aIsOther && bIsOther) return -1;
      return 0;
    });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="text-center space-y-3 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Setup Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#034665] to-[#068dcb]">Business Profile</span>
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto font-normal">
          Enter your business name, category, and services. SEO keywords are automatically synthesized to generate authentic Google reviews.
        </p>

        {/* Quick Demo Fill Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleAutofillDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#068dcb]/10 border border-slate-200 hover:border-[#068dcb]/40 text-xs font-semibold text-slate-700 hover:text-[#034665] transition-all shadow-2xs cursor-pointer group"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Fill Demo Example (Kevalon Technology)</span>
          </button>
        </div>
      </div>

      {/* Main Setup Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-9 border border-slate-200 shadow-xl shadow-slate-200/50 relative bg-white">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Row 1: Company Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Company / Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Kevalon Technology"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                  errors.name ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-[#068dcb] focus:ring-4 focus:ring-[#068dcb]/15'
                }`}
              />
            </div>

            {errors.name && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Row 2: Business Category (Searchable Dropdown) */}
          <div className="relative" ref={categoryRef}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Business Category
            </label>
            <button
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-sm text-left text-slate-900 focus:outline-none focus:border-[#068dcb] flex items-center justify-between transition-all cursor-pointer shadow-2xs"
            >
              <span className="truncate">{formData.category}</span>
              <ChevronDown className={`w-4 h-4 text-[#068dcb] transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isCategoryOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 animate-in fade-in">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#068dcb] focus:bg-white"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {filteredCategories.map((cat) => {
                    const isSelected = formData.category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, category: cat.name }));
                          setIsCategoryOpen(false);
                          setCategorySearch('');
                          triggerAutoSeoGeneration(formData.name, cat.name, formData.services);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white font-bold shadow-xs'
                            : 'text-slate-700 hover:bg-[#068dcb]/10 hover:text-[#034665]'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Services Offered (Comma-separated) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Services Offered <span className="text-slate-500 font-normal lowercase">(comma-separated)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {parsedServices.length} {parsedServices.length === 1 ? 'service' : 'services'} detected
              </span>
            </div>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. Web Development, AI Solutions, Mobile App Development, SEO Services"
                value={formData.services}
                onChange={(e) => {
                  const srv = e.target.value;
                  setFormData((prev) => ({ ...prev, services: srv }));
                  triggerAutoSeoGeneration(formData.name, formData.category, srv);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#068dcb] focus:ring-4 focus:ring-[#068dcb]/15 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>
            {parsedServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedServices.map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                  >
                    <Check className="w-3 h-3 text-[#068dcb]" />
                    {srv}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action CTA: Save & Generate Reviews */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white font-extrabold text-base tracking-wide transition-all shadow-lg shadow-[#068dcb]/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Business Profile...</span>
                </>
              ) : (
                <>
                  <span>Save & Generate Reviews</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-500 mt-2.5">
              Securely saves your business profile in database and generates reviews from your SEO keywords.
            </p>
          </div>

        </form>

      </div>

    </div>
  );
}
