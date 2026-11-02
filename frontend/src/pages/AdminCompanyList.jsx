import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  PlusCircle,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Layers,
  Loader2,
  Globe,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Trash2,
  Power,
  AlertTriangle,
  X,
  GitBranch,
  MapPin,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function AdminCompanyList() {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Status toggling state
  const [togglingId, setTogglingId] = useState(null);

  // Edit Company modal state
  const [editingCompany, setEditingCompany] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    services: '',
    description: '',
    isActive: true
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Delete Company modal state
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------
  // BRANCH MANAGEMENT STATE
  // -------------------------------------------------------------
  const [branchManagerCompany, setBranchManagerCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchFormData, setBranchFormData] = useState({
    branchName: '',
    city: '',
    address: '',
    state: '',
    country: 'India',
    googleReviewUrl: '',
    reviewPageSlug: ''
  });
  const [branchErrors, setBranchErrors] = useState({});
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);

  // Editing branch inside Branch Manager
  const [editingBranch, setEditingBranch] = useState(null);
  const [editBranchFormData, setEditBranchFormData] = useState({});
  const [isSavingBranchEdit, setIsSavingBranchEdit] = useState(false);

  // Fetch Companies Directory
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const [compRes, catRes] = await Promise.allSettled([
        api.getCompanies(),
        api.getCategories()
      ]);

      if (compRes.status === 'fulfilled' && compRes.value && compRes.value.success) {
        setCompanies(compRes.value.companies || []);
      } else {
        setCompanies([]);
      }

      if (catRes.status === 'fulfilled' && catRes.value && catRes.value.success) {
        setCategories(catRes.value.categories || []);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      addToast('Failed to load business directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // -------------------------------------------------------------
  // BRANCH MANAGER HANDLERS
  // -------------------------------------------------------------
  const handleOpenBranchManager = async (comp, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setBranchManagerCompany(comp);
    setShowAddBranch(false);
    setEditingBranch(null);
    setBranchFormData({
      branchName: '',
      city: '',
      address: '',
      state: '',
      country: 'India',
      googleReviewUrl: '',
      reviewPageSlug: ''
    });
    setBranchErrors({});
    await loadBranchesForCompany(comp.id || comp._id);
  };

  const loadBranchesForCompany = async (companyId) => {
    setLoadingBranches(true);
    try {
      const res = await api.getCompanyBranches(companyId);
      if (res && res.success) {
        setBranches(res.branches || []);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      addToast('Failed to load branches.', 'error');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Add Branch Form Submission
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchManagerCompany) return;
    const companyId = branchManagerCompany.id || branchManagerCompany._id;

    const errors = {};
    if (!branchFormData.branchName.trim()) {
      errors.branchName = 'Branch Name is required (e.g. Junagadh Branch).';
    }
    const trimmedUrl = branchFormData.googleReviewUrl.trim();
    if (!trimmedUrl) {
      errors.googleReviewUrl = 'Google Review Dialog Box URL is required for this branch.';
    } else if (!/^https?:\/\//i.test(trimmedUrl)) {
      errors.googleReviewUrl = 'URL must start with https:// or http://';
    }

    if (Object.keys(errors).length > 0) {
      setBranchErrors(errors);
      return;
    }

    setIsSubmittingBranch(true);
    try {
      const payload = {
        branchName: branchFormData.branchName.trim(),
        city: branchFormData.city.trim(),
        address: branchFormData.address.trim(),
        state: branchFormData.state.trim(),
        country: branchFormData.country.trim(),
        googleReviewUrl: trimmedUrl,
        reviewPageSlug: branchFormData.reviewPageSlug.trim()
      };

      const res = await api.createBranch(companyId, payload);
      if (res && res.success && res.branch) {
        addToast(`Branch "${res.branch.branchName}" created successfully!`, 'success');
        setBranches((prev) => [res.branch, ...prev]);
        // Update company branchCount in local state
        setCompanies((prev) =>
          prev.map((c) =>
            (c.id || c._id) === companyId ? { ...c, branchCount: (c.branchCount || 0) + 1 } : c
          )
        );
        setShowAddBranch(false);
        setBranchFormData({
          branchName: '',
          city: '',
          address: '',
          state: '',
          country: 'India',
          googleReviewUrl: '',
          reviewPageSlug: ''
        });
        setBranchErrors({});
      } else {
        const errMsg = res.error || 'Failed to create branch.';
        setBranchErrors({ branchName: errMsg });
        addToast(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = err.message || 'Error creating branch.';
      setBranchErrors({ branchName: errMsg });
      addToast(errMsg, 'error');
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  // Toggle Branch Status
  const handleToggleBranchStatus = async (branch, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const branchId = branch.id || branch._id;
    const nextStatus = branch.isActive === false;

    try {
      const res = await api.toggleBranchStatus(branchId, nextStatus);
      if (res && res.success) {
        setBranches((prev) =>
          prev.map((b) => ((b.id || b._id) === branchId ? { ...b, isActive: nextStatus, status: nextStatus ? 'active' : 'inactive' } : b))
        );
        addToast(
          `${branch.branchName} is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`,
          nextStatus ? 'success' : 'info'
        );
      }
    } catch (err) {
      addToast(err.message || 'Failed to toggle branch status.', 'error');
    }
  };

  // Delete Branch
  const handleDeleteBranch = async (branchId, branchName, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${branchName}"?`)) return;

    try {
      const res = await api.deleteBranch(branchId);
      if (res && res.success) {
        setBranches((prev) => prev.filter((b) => (b.id || b._id) !== branchId));
        if (branchManagerCompany) {
          const cid = branchManagerCompany.id || branchManagerCompany._id;
          setCompanies((prev) =>
            prev.map((c) =>
              (c.id || c._id) === cid ? { ...c, branchCount: Math.max(0, (c.branchCount || 1) - 1) } : c
            )
          );
        }
        addToast(`Branch "${branchName}" deleted.`, 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete branch.', 'error');
    }
  };

  // Copy Public Link (Branch or Company)
  const handleCopyLink = (slugOrId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const publicUrl = `${window.location.origin}/reviews/${slugOrId}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedId(slugOrId);
      addToast('Review page link copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      addToast('Failed to copy link.', 'error');
    });
  };

  // -------------------------------------------------------------
  // COMPANY EDIT & DELETE HANDLERS
  // -------------------------------------------------------------
  const handleOpenEditCompany = (comp, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const srvText = Array.isArray(comp.services) ? comp.services.join(', ') : (comp.services || '');
    setEditingCompany(comp);
    setEditFormData({
      name: comp.companyName || comp.name || '',
      category: comp.category || '',
      services: srvText,
      description: comp.description || '',
      isActive: comp.isActive !== false
    });
    setEditErrors({});
  };

  const handleSaveCompanyEdit = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;
    const targetId = editingCompany.id || editingCompany._id;

    if (!editFormData.name.trim()) {
      setEditErrors({ name: 'Company name is required.' });
      return;
    } else if (editFormData.name.trim().toLowerCase() === editFormData.category.trim().toLowerCase()) {
      setEditErrors({ name: 'Business Name and Category cannot be the same.' });
      return;
    }

    const normName = editFormData.name.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const existsOther = companies.some((c) => {
      const cid = c.id || c._id;
      if (cid === targetId) return false;
      const cNorm = (c.companyName || c.name || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
      return cNorm === normName;
    });
    if (existsOther) {
      setEditErrors({ name: 'Another company with this name already exists. Company names must be unique.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        companyName: editFormData.name.trim(),
        category: editFormData.category.trim(),
        services: editFormData.services.trim(),
        description: editFormData.description.trim(),
        isActive: editFormData.isActive
      };

      const res = await api.updateCompany(targetId, payload);
      if (res && res.success && res.company) {
        setCompanies((prev) =>
          prev.map((c) => ((c.id || c._id) === targetId ? { ...c, ...res.company } : c))
        );
        addToast('Company details updated successfully!', 'success');
        setEditingCompany(null);
      } else {
        addToast(res.error || 'Failed to update company.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error updating company.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;
    const targetId = deletingCompany.id || deletingCompany._id;

    setIsDeleting(true);
    try {
      const res = await api.deleteCompany(targetId);
      if (res && res.success) {
        setCompanies((prev) => prev.filter((c) => (c.id || c._id) !== targetId));
        addToast(`Deleted "${deletingCompany.name || deletingCompany.companyName}" and its branches.`, 'info');
        setDeletingCompany(null);
      } else {
        addToast(res.error || 'Failed to delete company.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error deleting company.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (c.companyName || c.name || '').toLowerCase().includes(q);
    const catMatch = (c.category || '').toLowerCase().includes(q);
    const servicesMatch = Array.isArray(c.services)
      ? c.services.some((s) => s.toLowerCase().includes(q))
      : (c.services || '').toLowerCase().includes(q);
    return nameMatch || catMatch || servicesMatch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#034665] via-[#04618d] to-[#068dcb] p-6 sm:p-8 text-white shadow-xl shadow-[#068dcb]/15">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/95">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
              <span>Company & Branch Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Business Directory & Branch Network
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              Manage parent companies and their multiple branches. Each branch has its own Google Review URL, dedicated review link, and active status.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchCompanies}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-sm"
              title="Refresh directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/setup"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#034665] hover:bg-slate-100 text-xs font-bold shadow-lg shadow-black/10 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#068dcb]" />
              <span>Register New Business</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, category, or service..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30 focus:border-[#068dcb] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-end sm:self-auto">
          <span>Registered Companies:</span>
          <span className="px-2.5 py-1 rounded-full bg-[#068dcb]/10 text-[#034665] font-bold">
            {companies.length}
          </span>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3 bg-white rounded-3xl border border-slate-200/80 p-12">
          <Loader2 className="w-8 h-8 text-[#068dcb] animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading business directory...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4 bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? 'No matching companies found' : 'No companies registered yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? `No company matches "${searchQuery}". Try a different keyword.`
                : 'Get started by registering your first parent company with its branches.'}
            </p>
          </div>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-md shadow-[#068dcb]/20 hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register First Business</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((comp) => {
            const companyId = comp.id || comp._id;
            const branchCount = comp.branchCount || (comp.branches ? comp.branches.length : 0);
            const firstBranch = comp.branches && comp.branches[0];
            const defaultReviewSlug = firstBranch?.reviewPageSlug || companyId;

            return (
              <div
                key={companyId}
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 hover:border-[#068dcb]/40 p-5 shadow-2xs hover:shadow-lg hover:shadow-[#068dcb]/5 transition-all duration-200"
              >
                {/* Header: Name and Category */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-[#068dcb] transition-colors truncate">
                      {comp.companyName || comp.name}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                      <Layers className="w-3 h-3 text-[#068dcb]" />
                      <span className="truncate">{comp.category || 'General'}</span>
                    </div>
                  </div>

                  {/* Total Branches Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-[#034665] border border-cyan-200 text-xs font-bold shrink-0">
                    <GitBranch className="w-3.5 h-3.5 text-[#068dcb]" />
                    <span>{branchCount} {branchCount === 1 ? 'Branch' : 'Branches'}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed min-h-[2rem]">
                  {comp.description || 'No description provided.'}
                </p>

                {/* Services preview */}
                {comp.services && (
                  <div className="mb-4 text-[11px] text-slate-600 truncate">
                    <span className="font-semibold text-slate-700">Services: </span>
                    <span>{Array.isArray(comp.services) ? comp.services.join(', ') : comp.services}</span>
                  </div>
                )}

                {/* Actions Row */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* MANAGE BRANCHES BUTTON (PRIMARY) */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenBranchManager(comp, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-xs hover:brightness-110 transition-all cursor-pointer"
                      title="Manage branches, direct Google Review URLs & review pages"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Manage Branches</span>
                    </button>

                    {/* Edit Company */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditCompany(comp, e)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      title="Edit company profile"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Company */}
                    <button
                      type="button"
                      onClick={(e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        setDeletingCompany(comp);
                      }}
                      className="inline-flex items-center p-1.5 rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete company and its branches"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Open primary branch review page */}
                  <a
                    href={`/reviews/${defaultReviewSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#068dcb] hover:underline cursor-pointer ml-auto"
                    title="Open public review studio"
                  >
                    <span>Review Page</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================= */}
      {/* MANAGE BRANCHES MODAL / DRAWER */}
      {/* ============================================================= */}
      {branchManagerCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#068dcb]/10 text-[#034665] text-xs font-bold">
                  <GitBranch className="w-3.5 h-3.5 text-[#068dcb]" />
                  <span>Branch Network Manager</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Branches for {branchManagerCompany.companyName || branchManagerCompany.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Manage individual branches, configure their direct Google Review URLs, and generate unique review links.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setBranchManagerCompany(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Bar: Add Branch toggle */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">
                {branches.length} {branches.length === 1 ? 'Branch Registered' : 'Branches Registered'}
              </span>

              <button
                type="button"
                onClick={() => {
                  setShowAddBranch(!showAddBranch);
                  setBranchErrors({});
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${showAddBranch
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-gradient-to-r from-[#034665] to-[#068dcb] text-white shadow-xs'
                  }`}
              >
                {showAddBranch ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{showAddBranch ? 'Cancel' : 'Add New Branch'}</span>
              </button>
            </div>

            {/* ADD NEW BRANCH FORM (Collapsible) */}
            {showAddBranch && (
              <form onSubmit={handleCreateBranch} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <PlusCircle className="w-4 h-4 text-[#068dcb]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Register New Branch Under {branchManagerCompany.companyName || branchManagerCompany.name}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Junagadh Branch"
                      value={branchFormData.branchName}
                      onChange={(e) => setBranchFormData({ ...branchFormData, branchName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30"
                    />
                    {branchErrors.branchName && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{branchErrors.branchName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      City / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Junagadh"
                      value={branchFormData.city}
                      onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, Crystal Mall, Kalawad Road"
                    value={branchFormData.address}
                    onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Branch Google Review Dialog Box URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="Paste this specific branch's direct Google Review URL here"
                    value={branchFormData.googleReviewUrl}
                    onChange={(e) => setBranchFormData({ ...branchFormData, googleReviewUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#068dcb]/30"
                  />
                  {branchErrors.googleReviewUrl && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">{branchErrors.googleReviewUrl}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customers visiting this branch will be redirected to this exact Google Review link.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBranch(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBranch}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingBranch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Save Branch</span>
                  </button>
                </div>
              </form>
            )}

            {/* BRANCHES LIST */}
            {loadingBranches ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-2">
                <Loader2 className="w-6 h-6 text-[#068dcb] animate-spin" />
                <p className="text-xs text-slate-500">Loading branches...</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <GitBranch className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Branches Added Yet</h4>
                <p className="text-xs text-slate-500">
                  Click "Add New Branch" above to add locations (e.g. Ahmedabad, Junagadh, Rajkot).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((b) => {
                  const branchId = b.id || b._id;
                  const isActive = b.isActive !== false;
                  const slug = b.reviewPageSlug || branchId;

                  return (
                    <div
                      key={branchId}
                      className={`p-4 rounded-2xl border transition-all ${isActive
                        ? 'bg-white border-slate-200/90 hover:border-[#068dcb]/40 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-300 opacity-80'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {b.branchName}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600 border border-slate-200">
                              /reviews/{slug}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {b.city && (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                <MapPin className="w-3 h-3 text-[#068dcb]" />
                                <span>{b.city}</span>
                              </span>
                            )}
                            {b.address && <span>• {b.address}</span>}
                          </div>
                        </div>

                        {/* Status Toggle & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {/* Active / Inactive Status button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleBranchStatus(b, e)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                            title={isActive ? 'Deactivate branch review page' : 'Activate branch review page'}
                          >
                            <Power className={`w-3 h-3 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                          </button>

                          {/* Copy Public Review Link */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(slug, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#068dcb] text-xs font-bold text-slate-700 hover:text-[#034665] bg-slate-50 transition-all cursor-pointer"
                            title="Copy customer review link for this branch"
                          >
                            {copiedId === slug ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Open Review Studio */}
                          <a
                            href={`/reviews/${slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-2xs hover:brightness-110 cursor-pointer"
                            title="Open branch review page in new tab"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>

                          {/* Delete Branch */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBranch(branchId, b.branchName, e)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                            title="Delete this branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBranchManagerCompany(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT COMPANY MODAL */}
      {/* ============================================================= */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Edit Company Information</h3>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Company / Business Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                />
                {editErrors.name && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">{editErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Business Category
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Services Offered (comma-separated)
                </label>
                <input
                  type="text"
                  value={editFormData.services}
                  onChange={(e) => setEditFormData({ ...editFormData, services: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Business Description
                </label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#034665] to-[#068dcb] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DELETE COMPANY CONFIRMATION MODAL */}
      {/* ============================================================= */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Business & Branches</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-800">"{deletingCompany.companyName || deletingCompany.name}"</span>? All branches and reviews under this company will be permanently removed.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                disabled={isDeleting}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCompany}
                disabled={isDeleting}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md text-center cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
