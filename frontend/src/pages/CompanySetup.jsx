import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Briefcase, 
  Check, 
  ChevronDown, 
  Search, 
  ArrowRight, 
  Loader2, 
  Zap, 
  Globe, 
  Copy, 
  ExternalLink, 
  MapPin, 
  GitBranch,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function CompanySetup({ categories = [], onRefreshCategories }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'IT Services and Software Development',
    customCategory: '',
    services: '',
    description: '',
    // Initial Branch Fields
    branchName: 'Ahmedabad Branch',
    city: 'Ahmedabad',
    address: '',
    googleReviewUrl: ''
  });

  // Successfully registered company & branch state
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Automatically synthesized SEO keywords
  const [autoKeywords, setAutoKeywords] = useState([]);
  const seoDebounceTimeout = useRef(null);

  // Existing companies cache for instant duplicate prevention
  const [existingCompanies, setExistingCompanies] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadCompanies() {
      try {
        const res = await api.getCompanies();
        if (isMounted && res && res.companies) {
          setExistingCompanies(res.companies);
        }
      } catch (e) {
        // ignore
      }
    }
    loadCompanies();
    return () => { isMounted = false; };
  }, []);

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

  // Automatic SEO Keyword Synthesizer
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
        }
      } catch (e) {
        // Silently ignore background generation error
      }
    }, 400);
  }, []);

  const normalizeForComparison = (str) =>
    (str || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  const checkDuplicateName = (val) => {
    const norm = normalizeForComparison(val);
    if (!norm) return null;
    const match = existingCompanies.find((c) => normalizeForComparison(c.companyName || c.name) === norm);
    if (match) {
      const matchCat = match.category ? ` (in category "${match.category}")` : '';
      return `"${match.companyName || match.name}" is already registered${matchCat}. Company names must be unique. To add multiple locations, please manage branches under that company in the Directory.`;
    }
    return null;
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, name: val }));
    const dupWarning = checkDuplicateName(val);
    if (dupWarning) {
      setErrors((prev) => ({ ...prev, name: dupWarning }));
    } else if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }
    triggerAutoSeoGeneration(val, formData.category, formData.services);
  };

  // Quick Demo Autofill
  const handleAutofillDemo = () => {
    const demoData = {
      name: 'KevalonTap',
      category: 'IT Services and Software Development',
      customCategory: '',
      services: 'Web Development, AI Solutions, Mobile App Development, SEO Services',
      description: 'Next-generation software engineering firm specializing in modern web, mobile apps, and enterprise AI automation.',
      branchName: 'Ahmedabad Branch',
      city: 'Ahmedabad',
      address: '303, Titanium Square, SG Highway',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw'
    };
    setFormData(demoData);
    setErrors({});
    triggerAutoSeoGeneration(demoData.name, demoData.category, demoData.services);
    addToast('Loaded KevalonTap demo profile with Ahmedabad Branch!', 'info');
  };

  // Parse services chips
  const parsedServices = formData.services
    .replace(/;/g, ',')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Form Validation & Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isOtherCategory = (formData.category || '').trim().toLowerCase() === 'other';
    const effectiveCategory = isOtherCategory ? formData.customCategory.trim() : (formData.category || '').trim();

    const newErrors = {};

    if (isOtherCategory) {
      if (!formData.customCategory.trim()) {
        newErrors.customCategory = 'Enter Custom Business Category is required.';
      } else if (formData.customCategory.trim().toLowerCase() === 'other') {
        newErrors.customCategory = 'Please enter a valid custom category name.';
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Company / Business Name is required.';
    } else if (effectiveCategory && formData.name.trim().toLowerCase() === effectiveCategory.toLowerCase()) {
      newErrors.name = 'Business Name and Category cannot be the same. Please enter a distinct company name.';
    } else {
      const dup = checkDuplicateName(formData.name.trim());
      if (dup) {
        newErrors.name = dup;
      }
    }

    if (!formData.branchName.trim()) {
      newErrors.branchName = 'Initial Branch Name is required (e.g. Ahmedabad Branch).';
    }

    const trimmedUrl = (formData.googleReviewUrl || '').trim();
    if (!trimmedUrl) {
      newErrors.googleReviewUrl = 'Google Review Dialog Box URL is required for this branch.';
    } else if (!/^https?:\/\//i.test(trimmedUrl)) {
      newErrors.googleReviewUrl = 'Please enter a valid URL (must start with https:// or http://).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        companyName: formData.name.trim(),
        category: effectiveCategory,
        customCategory: isOtherCategory ? formData.customCategory.trim() : '',
        services: formData.services.trim(),
        description: formData.description.trim(),
        branchName: formData.branchName.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        googleReviewUrl: trimmedUrl
      };

      const res = await api.createCompany(payload);
      if (res.success && res.company) {
        addToast(`Company "${res.company.name}" registered successfully!`, 'success');
        if (onRefreshCategories) {
          onRefreshCategories();
        }
        
        // Find created branch if any
        const branches = res.company.branches || [];
        const primaryBranch = branches[0] || null;
        const reviewSlug = primaryBranch?.reviewPageSlug || res.company.id;

        setCreatedResult({
          company: res.company,
          branch: primaryBranch,
          slug: reviewSlug
        });
      } else {
        const errorMsg = res.error || 'Failed to setup company.';
        setErrors((prev) => ({ ...prev, name: errorMsg }));
        addToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      const errMsg = err.message || 'Failed to setup company.';
      setErrors((prev) => ({ ...prev, name: errMsg }));
      addToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Register New Business
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Register a parent company and configure its initial branch. You can manage and add multiple branches anytime from the Admin Directory.
        </p>

        {/* Demo Autofill Shortcut */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAutofillDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Fill Demo Example (KevalonTap)</span>
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: PARENT COMPANY DETAILS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Building2 className="w-4 h-4 text-[#068dcb]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                1. Company Information
              </h2>
            </div>

            {/* Company / Business Name */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Company / Business Name <span className="text-red-500 font-bold">*</span>
                </label>
                {errors.name && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.name}
                  </span>
                )}
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. KevalonTap"
                  value={formData.name}
                  onChange={handleNameChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border ${
                    errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-[#068dcb] focus:ring-[#068dcb]/15'
                  } focus:bg-white focus:ring-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs`}
                />
              </div>
            </div>

            {/* Business Category */}
            <div className="relative" ref={categoryRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Business Category
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 hover:bg-slate-100/80 focus:outline-none transition-all cursor-pointer shadow-2xs"
              >
                <span className="truncate">{formData.category || 'Select a business category'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCategoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-2 space-y-2 animate-in fade-in zoom-in-95">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30 text-slate-800"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {filteredCategories.map((cat) => {
                      const isSelected = formData.category === cat.name;
                      return (
                        <button
                          key={cat.id || cat.name}
                          type="button"
                          onClick={() => {
                            const isOther = (cat.name || '').toLowerCase() === 'other';
                            setFormData((prev) => ({
                              ...prev,
                              category: cat.name,
                              customCategory: isOther ? prev.customCategory : ''
                            }));
                            setIsCategoryOpen(false);
                            setCategorySearch('');
                            const effectiveCat = isOther ? (formData.customCategory || 'Other') : cat.name;
                            triggerAutoSeoGeneration(formData.name, effectiveCat, formData.services);
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

            {/* Custom Business Category Input (shown when 'Other' is selected) */}
            {formData.category?.toLowerCase() === 'other' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Enter Custom Business Category <span className="text-red-500 font-bold">*</span>
                  </label>
                  {errors.customCategory && (
                    <span className="text-xs text-red-500 font-medium">
                      {errors.customCategory}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Layers className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Healthcare, Education, Automobile, Manufacturing"
                    value={formData.customCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, customCategory: val }));
                      if (errors.customCategory) {
                        setErrors((prev) => ({ ...prev, customCategory: '' }));
                      }
                      triggerAutoSeoGeneration(formData.name, val || 'Other', formData.services);
                    }}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border ${
                      errors.customCategory
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                        : 'border-slate-200 focus:border-[#068dcb] focus:ring-[#068dcb]/15'
                    } focus:bg-white focus:ring-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs`}
                  />
                </div>
              </div>
            )}

            {/* Services Offered */}
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
            </div>
          </div>

          {/* SECTION 2: INITIAL BRANCH SETUP */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <GitBranch className="w-4 h-4 text-[#068dcb]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                2. Initial Branch / Location Setup
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Branch Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad Branch"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#068dcb] focus:ring-4 text-sm text-slate-900"
                  />
                </div>
                {errors.branchName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.branchName}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#068dcb] focus:ring-4 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Google Review Dialog Box URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Branch Google Review Dialog Box URL <span className="text-red-500 font-bold">*</span>
                </label>
                {errors.googleReviewUrl && (
                  <span className="text-xs text-red-500 font-medium">
                    {errors.googleReviewUrl}
                  </span>
                )}
              </div>
              <div className="relative">
                <Globe className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  placeholder="Paste this branch's direct Google Review URL here"
                  value={formData.googleReviewUrl}
                  onChange={(e) => {
                    const urlVal = e.target.value;
                    setFormData((prev) => ({ ...prev, googleReviewUrl: urlVal }));
                    if (errors.googleReviewUrl) {
                      setErrors((prev) => ({ ...prev, googleReviewUrl: '' }));
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border ${
                    errors.googleReviewUrl ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-[#068dcb] focus:ring-[#068dcb]/15'
                  } focus:bg-white focus:ring-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs`}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Enter the direct Google Review link for this specific branch. When customers post on this branch's page, it will open this exact link.
              </p>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white font-extrabold text-base tracking-wide transition-all shadow-lg shadow-[#068dcb]/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering Company & Branch...</span>
                </>
              ) : (
                <>
                  <span>Save & Register Business</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Success Modal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Company & Branch Registered!
              </h2>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-800">{createdResult.company.name}</span> has been registered with its initial branch <span className="font-bold text-slate-800">({createdResult.branch?.branchName || 'Main Branch'})</span>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Branch Review Page URL
              </label>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono break-all">
                <span className="flex-1 select-all">{`${window.location.origin}/reviews/${createdResult.slug}`}</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/reviews/${createdResult.slug}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setCopiedLink(true);
                      addToast('Branch review URL copied to clipboard!', 'success');
                      setTimeout(() => setCopiedLink(false), 3000);
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#068dcb]" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You can add more branches (e.g. Junagadh, Rajkot) at any time from the Business Directory.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/companies')}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
              >
                Go to Business Directory
              </button>
              <a
                href={`/reviews/${createdResult.slug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] text-white font-bold text-xs transition-all shadow-md shadow-[#068dcb]/20 flex items-center justify-center gap-1.5 text-center cursor-pointer"
              >
                <span>Open Review Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}