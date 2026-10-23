import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Sparkles, 
  Tag, 
  Briefcase, 
  Globe, 
  Search, 
  Check, 
  ChevronDown, 
  X, 
  Info, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function CompanySetup({ categories = [] }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'IT Services and Software Development',
    services: '',
    seoKeywords: '',
    location: '',
    formattedAddress: '',
    googlePlaceId: '',
    preferredLanguage: 'en',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Searchable Category Dropdown state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryRef = useRef(null);

  // Location Autocomplete state
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [placesMessage, setPlacesMessage] = useState('');
  const placeLookupTimeout = useRef(null);
  const placeDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
      if (placeDropdownRef.current && !placeDropdownRef.current.contains(event.target)) {
        setShowPlaceDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Place Lookup when Company Name changes
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, name: val }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }

    if (placeLookupTimeout.current) {
      clearTimeout(placeLookupTimeout.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setPlaceSuggestions([]);
      setShowPlaceDropdown(false);
      return;
    }

    placeLookupTimeout.current = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const res = await api.searchCompanies(val.trim());
        if (res.success && res.results && res.results.length > 0) {
          setPlaceSuggestions(res.results);
          setShowPlaceDropdown(true);
          setPlacesMessage(res.message || '');
        } else {
          setPlaceSuggestions([]);
          setPlacesMessage(res.message || 'No direct matches found. You can enter location manually below.');
        }
      } catch (err) {
        console.warn('Place lookup error:', err);
      } finally {
        setSearchingPlaces(false);
      }
    }, 450);
  };

  // Select place from autocomplete
  const handleSelectPlace = (place) => {
    setFormData((prev) => ({
      ...prev,
      name: place.name || prev.name,
      location: place.location || place.formattedAddress || prev.location,
      formattedAddress: place.formattedAddress || place.location || '',
      googlePlaceId: place.googlePlaceId || ''
    }));
    setShowPlaceDropdown(false);
    addToast(`Verified location set to "${place.formattedAddress || place.name}"`, 'success');
  };

  // Quick Demo Autofill
  const handleAutofillDemo = () => {
    setFormData({
      name: 'Kevalon Technology',
      category: 'IT Services and Software Development',
      services: 'Web Development, AI Solutions, Mobile App Development, SEO Services',
      seoKeywords: 'Web Development India, AI Solutions India, Software Development Company India, Digital Marketing India',
      location: 'Ahmedabad, Gujarat, India',
      formattedAddress: 'Ahmedabad, Gujarat, India',
      googlePlaceId: '',
      preferredLanguage: 'en',
      description: 'Next-generation software engineering firm specializing in modern web, mobile apps, and enterprise AI automation.'
    });
    setErrors({});
    addToast('Loaded Kevalon Technology demo profile!', 'info');
  };

  // Parse comma-separated preview chips
  const parseChips = (csvString) => {
    if (!csvString) return [];
    return csvString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const parsedServices = parseChips(formData.services);
  const parsedKeywords = parseChips(formData.seoKeywords);

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

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        services: formData.services.trim(),
        seoKeywords: parsedKeywords.length > 0 ? parsedKeywords : ['Quality Service', 'Customer Support'],
        location: formData.location.trim(),
        formattedAddress: formData.formattedAddress.trim() || formData.location.trim(),
        googlePlaceId: formData.googlePlaceId.trim(),
        preferredLanguage: formData.preferredLanguage || 'en',
        description: formData.description.trim()
      };

      const res = await api.createCompany(payload);
      if (res.success && res.company) {
        addToast(`Company "${res.company.name}" created successfully!`, 'success');
        localStorage.setItem('reviewcraft_company_id', res.company.id);
        localStorage.setItem('reviewcraft_category', res.company.category);
        localStorage.setItem('reviewcraft_keyword', (res.company.seoKeywords && res.company.seoKeywords[0]) || 'Quality Service');

        // Navigate directly to Page 2 review generation for this company
        navigate(`/reviews/${res.company.id}`);
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      addToast(err.message || 'Failed to setup company. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Step 1 • Business Onboarding</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500">Business Reviews</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto font-normal">
          Configure your business profile, services, and target SEO keywords to synthesize authentic, varied customer review suggestions.
        </p>

        {/* Quick Demo Fill Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleAutofillDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-purple-950/60 border border-purple-500/30 text-xs font-medium text-purple-300 hover:text-purple-200 transition-all shadow-sm cursor-pointer group"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span>Fill Demo Example (Kevalon Technology)</span>
          </button>
        </div>
      </div>

      {/* Main Setup Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-9 border border-purple-500/20 shadow-2xl relative bg-slate-950/80 backdrop-blur-xl">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Row 1: Company Name with Auto-Detection Dropdown */}
          <div className="relative" ref={placeDropdownRef}>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90 mb-2">
              Company / Business Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Kevalon Technology"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900/90 border text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner ${
                  errors.name
                    ? 'border-red-500/80 focus:border-red-400 ring-2 ring-red-500/20'
                    : 'border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                }`}
              />
              {searchingPlaces && (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-3.5" />
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">{errors.name}</p>
            )}

            {/* Places Autocomplete Dropdown */}
            {showPlaceDropdown && placeSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto animate-in fade-in">
                <div className="p-2.5 bg-purple-950/40 border-b border-purple-500/20 text-[11px] font-semibold text-purple-300 flex items-center justify-between">
                  <span>Matching Businesses (Select to auto-populate location):</span>
                  <button
                    type="button"
                    onClick={() => setShowPlaceDropdown(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-800">
                  {placeSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPlace(place)}
                      className="w-full text-left p-3 hover:bg-purple-900/20 flex items-start gap-2.5 transition-colors cursor-pointer group"
                    >
                      <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                            {place.name}
                          </p>
                          {place.isGoogleVerified && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {place.formattedAddress || place.location}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Category (Searchable Dropdown) & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Searchable Business Category */}
            <div className="relative" ref={categoryRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90 mb-2">
                Business Category
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 text-sm text-left text-white focus:outline-none focus:border-purple-500 flex items-center justify-between transition-all cursor-pointer shadow-inner"
              >
                <span className="truncate">{formData.category}</span>
                <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isCategoryOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl p-2 backdrop-blur-xl animate-in fade-in">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
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
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-slate-300 hover:bg-purple-950/50 hover:text-purple-200'
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

            {/* Company Location */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90 mb-2">
                Company Location <span className="text-slate-400 font-normal lowercase">(auto or manual)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad, India"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                      formattedAddress: e.target.value
                    }))
                  }
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                />
                {formData.googlePlaceId && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" title="Google Place ID verified" />
                )}
              </div>
              {formData.googlePlaceId ? (
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Place ID verified for direct Google Review link
                </p>
              ) : placesMessage ? (
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{placesMessage}</p>
              ) : null}
            </div>

          </div>

          {/* Row 3: Services Offered (Comma-separated) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90">
                Services Offered <span className="text-slate-400 font-normal lowercase">(comma-separated)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {parsedServices.length} {parsedServices.length === 1 ? 'service' : 'services'} detected
              </span>
            </div>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. Web Development, AI Solutions, Mobile App Development, SEO Services"
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
              />
            </div>
            {parsedServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedServices.map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-medium"
                  >
                    <Check className="w-3 h-3 text-purple-400" />
                    {srv}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 4: SEO Keywords (Comma-separated) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90">
                SEO Keywords <span className="text-slate-400 font-normal lowercase">(comma-separated)</span>
              </label>
              <span className="text-[11px] text-purple-300 font-medium">
                {parsedKeywords.length} {parsedKeywords.length === 1 ? 'keyword chip' : 'keyword chips'} ready
              </span>
            </div>
            <div className="relative">
              <Tag className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. Web Development India, AI Solutions India, Software Development Company India"
                value={formData.seoKeywords}
                onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
              />
            </div>
            {parsedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold"
                  >
                    <Tag className="w-3 h-3 text-purple-400" />
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Preferred Review Language */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90 mb-2">
              Preferred Review Language
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { code: 'en', label: 'English', desc: 'Natural English phrasing' },
                { code: 'hi', label: 'Hindi (हिंदी)', desc: 'हिंदी समीक्षा प्रारूप' },
                { code: 'gu', label: 'Gujarati (ગુજરાતી)', desc: 'ગુજરાતી રિવ્યુ ફોર્મેટ' },
              ].map((lang) => {
                const isSelected = formData.preferredLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredLanguage: lang.code })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-500 text-white shadow-md shadow-purple-600/20 ring-1 ring-purple-500'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{lang.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-300" />}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{lang.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 6: Optional Company Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200/90 mb-2">
              Company Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide context about your company, strengths, or specialties to enrich AI review suggestions..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner resize-none"
            />
          </div>

          {/* Action CTA: Generate Reviews */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base tracking-wide transition-all shadow-lg shadow-purple-600/30 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Profile & Synthesizing Reviews...</span>
                </>
              ) : (
                <>
                  <span>Generate Reviews</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2.5">
              Saves company profile to MongoDB and immediately opens the interactive keyword review generation studio.
            </p>
          </div>

        </form>

      </div>

    </div>
  );
}
