const PROD_API_URL = 'https://google-review-system-9302.onrender.com';
const rawApiUrl = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_API_URL : '')).trim();
const API_BASE = (rawApiUrl ? rawApiUrl.replace(/\/$/, '') : '') + '/api';

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('reviewcraft_admin_token');
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

// =========================================================================
// HIGH-PERFORMANCE IN-FLIGHT DEDUPLICATOR & SHORT-LIVED IN-MEMORY CACHE
// =========================================================================
const inFlightRequests = new Map();
const apiCache = new Map();

export function clearApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(prefix)) {
        apiCache.delete(key);
      }
    }
  }
}

async function cachedFetch(url, options = {}, ttlMs = 0) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return fetch(url, options).then(handleResponse);
  }

  const cacheKey = url;
  const now = Date.now();

  // 1. Check TTL cache
  if (ttlMs > 0 && apiCache.has(cacheKey)) {
    const entry = apiCache.get(cacheKey);
    if (now - entry.timestamp < ttlMs) {
      return entry.data;
    }
    apiCache.delete(cacheKey);
  }

  // 2. In-flight request deduplication (prevents duplicate concurrent round trips)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = fetch(url, options)
    .then(handleResponse)
    .then((data) => {
      if (ttlMs > 0 && data && data.success !== false) {
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      }
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export const api = {
  // Auth
  login: async (credentials) => {
    clearApiCache();
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  verifyAuth: async (token) => {
    return cachedFetch(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 15000);
  },

  // Health (Cached for 10s with deduplication)
  getHealth: async () => {
    return cachedFetch(`${API_BASE}/health`, {}, 10000);
  },

  // Categories (Cached for 60s with instant invalidation on changes)
  getCategories: async () => {
    return cachedFetch(`${API_BASE}/categories`, {}, 60000);
  },

  createCategory: async (categoryData) => {
    clearApiCache('/categories');
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(typeof categoryData === 'string' ? { name: categoryData } : categoryData),
    });
    return handleResponse(res);
  },

  getCategoryKeywords: async (categoryIdentifier) => {
    return cachedFetch(`${API_BASE}/categories/${encodeURIComponent(categoryIdentifier)}/keywords`, {}, 120000);
  },

  addCategoryKeyword: async (categoryIdentifier, keyword) => {
    clearApiCache('/categories');
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(categoryIdentifier)}/keywords`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ keyword }),
    });
    return handleResponse(res);
  },

  // Companies (Cached for 15s with instant invalidation on mutations)
  getCompanies: async () => {
    return cachedFetch(`${API_BASE}/companies`, {}, 15000);
  },

  searchCompanies: async (query) => {
    return cachedFetch(`${API_BASE}/companies/search?query=${encodeURIComponent(query)}`, {}, 5000);
  },

  getCompanyById: async (id) => {
    return cachedFetch(`${API_BASE}/companies/${id}`, {}, 30000);
  },

  getCompanyGoogleReviewLink: async (id) => {
    return cachedFetch(`${API_BASE}/companies/${id}/google-review-link`, {}, 30000);
  },

  createCompany: async (companyData) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/categories');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(companyData),
    });
    return handleResponse(res);
  },

  updateCompany: async (id, companyData) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/categories');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(companyData),
    });
    return handleResponse(res);
  },

  deleteCompany: async (id) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  toggleCompanyStatus: async (id, isActive) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/companies/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return handleResponse(res);
  },

  addCompanyKeyword: async (companyId, keyword) => {
    clearApiCache('/companies');
    const res = await fetch(`${API_BASE}/companies/${companyId}/keywords`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ keyword }),
    });
    return handleResponse(res);
  },

  removeCompanyKeyword: async (companyId, keyword) => {
    clearApiCache('/companies');
    const res = await fetch(`${API_BASE}/companies/${companyId}/keywords/${encodeURIComponent(keyword)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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

  // Branch Management APIs
  getCompanyBranches: async (companyId) => {
    return cachedFetch(`${API_BASE}/companies/${companyId}/branches`, {}, 15000);
  },

  createBranch: async (companyId, branchData) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/companies/${companyId}/branches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(branchData),
    });
    return handleResponse(res);
  },

  getBranch: async (branchId) => {
    return cachedFetch(`${API_BASE}/branches/${branchId}`, {}, 30000);
  },

  updateBranch: async (branchId, branchData) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/branches/${branchId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(branchData),
    });
    return handleResponse(res);
  },

  deleteBranch: async (branchId) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/branches/${branchId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  toggleBranchStatus: async (branchId, isActive) => {
    clearApiCache('/companies');
    clearApiCache('/branches');
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/branches/${branchId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return handleResponse(res);
  },

  getReviewPage: async (slugOrId) => {
    return cachedFetch(`${API_BASE}/reviews/page/${encodeURIComponent(slugOrId)}`, {}, 20000);
  },

  // Review Generation & Rating Settings
  getRatingDistributionSettings: async () => {
    return cachedFetch(`${API_BASE}/settings/rating-distribution`, {}, 60000);
  },

  generateReviews: async (payload) => {
    const res = await fetch(`${API_BASE}/generate-reviews?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
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
    return cachedFetch(`${API_BASE}/reviews?${query.toString()}`, {}, 10000);
  },

  getReviewById: async (id) => {
    return cachedFetch(`${API_BASE}/reviews/${id}`, {}, 30000);
  },

  updateReviewText: async (id, reviewText) => {
    clearApiCache('/reviews');
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText }),
    });
    return handleResponse(res);
  },

  patchReviewText: async (id, reviewText) => {
    clearApiCache('/reviews');
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
    return cachedFetch(`${API_BASE}/analytics/overview`, {}, 15000);
  },
};
