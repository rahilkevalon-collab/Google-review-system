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
        preferredLanguage: 'en',
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Step 1 • Business Onboarding</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800">Business Reviews</span>
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto font-normal">
          Configure your business profile, services, and target SEO keywords to synthesize authentic, varied customer review suggestions.
        </p>

        {/* Quick Demo Fill Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleAutofillDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-xs font-semibold text-slate-700 hover:text-purple-700 transition-all shadow-2xs cursor-pointer group"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Fill Demo Example (Kevalon Technology)</span>
          </button>
        </div>
      </div>

      {/* Main Setup Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-9 border border-slate-200 shadow-xl shadow-slate-200/50 relative bg-white">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Row 1: Company Name with Auto-Detection Dropdown */}
          <div className="relative" ref={placeDropdownRef}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Company / Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-purple-600 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Kevalon Technology"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                  errors.name
                    ? 'border-red-400 focus:border-red-500 ring-2 ring-red-500/10'
                    : 'border-slate-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10'
                }`}
              />
              {searchingPlaces && (
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin absolute right-3.5 top-3.5" />
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.name}</p>
            )}

            {/* Places Autocomplete Dropdown */}
            {showPlaceDropdown && placeSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in">
                <div className="p-2.5 bg-purple-50/70 border-b border-purple-100 text-[11px] font-semibold text-purple-800 flex items-center justify-between">
                  <span>Matching Businesses (Select to auto-populate location):</span>
                  <button
                    type="button"
                    onClick={() => setShowPlaceDropdown(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {placeSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPlace(place)}
                      className="w-full text-left p-3 hover:bg-purple-50/50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                    >
                      <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
                            {place.name}
                          </p>
                          {place.isGoogleVerified && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Business Category
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-sm text-left text-slate-900 focus:outline-none focus:border-purple-600 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span className="truncate">{formData.category}</span>
                <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
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
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white"
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
                              : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Company Location <span className="text-slate-500 font-normal lowercase">(auto or manual)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-600 absolute left-3.5 top-3.5" />
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
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                />
                {formData.googlePlaceId && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3.5" title="Google Place ID verified" />
                )}
              </div>
              {formData.googlePlaceId ? (
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Place ID verified for direct Google Review link
                </p>
              ) : placesMessage ? (
                <p className="text-[11px] text-slate-500 mt-1 font-medium">{placesMessage}</p>
              ) : null}
            </div>

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
              <Briefcase className="w-4 h-4 text-purple-600 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. Web Development, AI Solutions, Mobile App Development, SEO Services"
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>
            {parsedServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedServices.map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                  >
                    <Check className="w-3 h-3 text-purple-600" />
                    {srv}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 4: SEO Keywords (Comma-separated) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                SEO Keywords <span className="text-slate-500 font-normal lowercase">(comma-separated)</span>
              </label>
              <span className="text-[11px] text-purple-700 font-semibold">
                {parsedKeywords.length} {parsedKeywords.length === 1 ? 'keyword chip' : 'keyword chips'} ready
              </span>
            </div>
            <div className="relative">
              <Tag className="w-4 h-4 text-purple-600 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. Web Development India, AI Solutions India, Software Development Company India"
                value={formData.seoKeywords}
                onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>
            {parsedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold"
                  >
                    <Tag className="w-3 h-3 text-purple-600" />
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>


          {/* Action CTA: Generate Reviews */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base tracking-wide transition-all shadow-lg shadow-purple-600/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
            <p className="text-center text-[11px] text-slate-500 mt-2.5">
              Saves company profile to MongoDB and immediately opens the interactive keyword review generation studio.
            </p>
          </div>

        </form>

      </div>

    </div>
  );
}
