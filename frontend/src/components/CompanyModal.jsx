import React, { useState } from 'react';
import { X, Building2, Tag, Globe, MapPin, Sparkles, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';

export default function CompanyModal({ isOpen, onClose, categories = [], onCompanyCreated }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.name || 'IT Services and Software Development',
    description: '',
    services: '',
    location: '',
    preferredLanguage: 'en',
    externalReviewLink: '',
    keywordInput: '',
    keywords: []
  });

  if (!isOpen) return null;

  const handleAddKeyword = (e) => {
    e?.preventDefault();
    const kw = formData.keywordInput.trim();
    if (kw && !formData.keywords.includes(kw)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, kw],
        keywordInput: ''
      });
    }
  };

  const handleRemoveKeyword = (kwToRemove) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== kwToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter a company name.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        services: formData.services.trim(),
        location: formData.location.trim(),
        preferredLanguage: formData.preferredLanguage,
        externalReviewLink: formData.externalReviewLink.trim(),
        keywords: formData.keywords
      };

      const res = await api.createCompany(payload);
      if (res.success && res.company) {
        addToast(`Company profile "${res.company.name}" created!`, 'success');
        onCompanyCreated(res.company);
        onClose();
      }
    } catch (err) {
      addToast(err.message || 'Failed to create company profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create Company Profile</h2>
              <p className="text-xs text-slate-500 font-medium">Configure business information and target SEO keywords</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kevalon Technology or Blue Horizon Cafe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          {/* Business Category & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer shadow-2xs"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Language
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer shadow-2xs"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of your business mission and value proposition..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors resize-none shadow-2xs"
            />
          </div>

          {/* Products & Services */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Products / Key Services
            </label>
            <input
              type="text"
              placeholder="e.g. Custom Software, Mobile Apps, Cloud Migration, 24/7 IT Support"
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          {/* Target Location & External Review URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. New York, NY or Mumbai, India"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Google Review URL (Optional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  placeholder="https://g.page/r/.../review"
                  value={formData.externalReviewLink}
                  onChange={(e) => setFormData({ ...formData, externalReviewLink: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* SEO Keywords Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target SEO Keywords
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Type keyword and press Add (e.g. Fast Web Hosting)"
                value={formData.keywordInput}
                onChange={(e) => setFormData({ ...formData, keywordInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                Add
              </button>
            </div>

            {/* Keyword tags */}
            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {formData.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold"
                  >
                    <Tag className="w-3 h-3 opacity-70" />
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="ml-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Creating...' : 'Save Profile'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
