const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || `HTTP error ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  verifyAuth: async (token) => {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(res);
  },

  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Categories
  getCategories: async () => {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse(res);
  },

  getCategoryKeywords: async (categoryIdentifier) => {
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(categoryIdentifier)}/keywords`);
    return handleResponse(res);
  },

  addCategoryKeyword: async (categoryIdentifier, keyword) => {
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(categoryIdentifier)}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
    return handleResponse(res);
  },

  // Companies
  getCompanies: async () => {
    const res = await fetch(`${API_BASE}/companies`);
    return handleResponse(res);
  },

  searchCompanies: async (query) => {
    const res = await fetch(`${API_BASE}/companies/search?query=${encodeURIComponent(query)}`);
    return handleResponse(res);
  },

  getCompanyById: async (id) => {
    const res = await fetch(`${API_BASE}/companies/${id}`);
    return handleResponse(res);
  },

  getCompanyGoogleReviewLink: async (id) => {
    const res = await fetch(`${API_BASE}/companies/${id}/google-review-link`);
    return handleResponse(res);
  },

  createCompany: async (companyData) => {
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyData),
    });
    return handleResponse(res);
  },

  addCompanyKeyword: async (companyId, keyword) => {
    const res = await fetch(`${API_BASE}/companies/${companyId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
    return handleResponse(res);
  },

  removeCompanyKeyword: async (companyId, keyword) => {
    const res = await fetch(`${API_BASE}/companies/${companyId}/keywords/${encodeURIComponent(keyword)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

    // Auto SEO Keyword Generator
  generateSeoKeywords: async (payload) => {
    const res = await fetch(`${API_BASE}/companies/generate-seo-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Review Generation & Rating Settings
  getRatingDistributionSettings: async () => {
    const res = await fetch(`${API_BASE}/settings/rating-distribution`);
    return handleResponse(res);
  },

  generateReviews: async (payload) => {
    const res = await fetch(`${API_BASE}/generate-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Reviews List & Detail
  getReviews: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/reviews?${query.toString()}`);
    return handleResponse(res);
  },

  getReviewById: async (id) => {
    const res = await fetch(`${API_BASE}/reviews/${id}`);
    return handleResponse(res);
  },

  updateReviewText: async (id, reviewText) => {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText }),
    });
    return handleResponse(res);
  },

  patchReviewText: async (id, reviewText) => {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText }),
    });
    return handleResponse(res);
  },

  recordCopyEvent: async (id) => {
    const res = await fetch(`${API_BASE}/reviews/${id}/copy-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // Analytics
  getAnalyticsOverview: async () => {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    return handleResponse(res);
  },
};
