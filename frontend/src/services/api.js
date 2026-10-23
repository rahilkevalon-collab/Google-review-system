const API_BASE = '/api';

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

  getCompanyById: async (id) => {
    const res = await fetch(`${API_BASE}/companies/${id}`);
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

  // Review Generation
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
