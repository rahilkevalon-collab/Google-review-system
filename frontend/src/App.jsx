import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './services/api';
import { ToastProvider } from './components/Toast';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import AdminLogin from './pages/AdminLogin';
import AdminCompanyList from './pages/AdminCompanyList';
import AdminHeader from './components/AdminHeader';
import { Sparkles } from 'lucide-react';

function AppLayout({ children, adminUser, onLogout }) {
  const location = useLocation();
  const isReviewPage = location.pathname.startsWith('/review');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 radial-glow antialiased selection:bg-[#068dcb]/20 selection:text-[#034665]">
      {/* Admin Header: displayed ONLY on admin pages when logged in, NEVER on review pages */}
      {adminUser && !isReviewPage && (
        <AdminHeader adminUser={adminUser} onLogout={onLogout} />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 shadow-2xs">
        <div className="flex items-center justify-center gap-2 font-medium text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-[#068dcb]" />
          <span>ReviewCraft AI • Intelligent SEO Business Review Generator</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [categories, setCategories] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Admin authentication state
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const token = localStorage.getItem('reviewcraft_admin_token');
      const userJson = localStorage.getItem('reviewcraft_admin_user');
      if (token && userJson) {
        return JSON.parse(userJson);
      }
    } catch (e) {
      console.warn('Failed to parse cached admin user', e);
    }
    return null;
  });

  // Handle Login & Logout
  const handleLoginSuccess = (user) => {
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('reviewcraft_admin_token');
    localStorage.removeItem('reviewcraft_admin_user');
    setAdminUser(null);
  };

  // Initial data bootstrap
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [catRes, healthRes] = await Promise.allSettled([
          api.getCategories(),
          api.getHealth()
        ]);

        if (!isMounted) return;

        if (catRes.status === 'fulfilled' && catRes.value.success) {
          const rawCats = catRes.value.categories || [];
          const sortedCats = [...rawCats].sort((a, b) => {
            const aIsOther = (a.name || '').trim().toLowerCase() === 'other';
            const bIsOther = (b.name || '').trim().toLowerCase() === 'other';
            if (aIsOther && !bIsOther) return 1;
            if (!aIsOther && bIsOther) return -1;
            return 0;
          });
          setCategories(sortedCats);
        }

        if (healthRes.status === 'fulfilled') {
          setHealthStatus(healthRes.value);
        }
      } catch (err) {
        console.error('Initial bootstrap error:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        {initialLoading ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Connecting to AI Review Engine...
            </p>
          </div>
        ) : (
          <AppLayout adminUser={adminUser} onLogout={handleLogout}>
            <Routes>
              
              {/* Route 1: Explicit Admin Login */}
              <Route 
                path="/login" 
                element={
                  adminUser ? (
                    <Navigate to="/setup" replace />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } 
              />

              {/* Route 2: Root & /setup - Protected Admin Business Setup */}
              <Route 
                path="/" 
                element={
                  adminUser ? (
                    <CompanySetup categories={categories} />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } 
              />
              <Route 
                path="/setup" 
                element={
                  adminUser ? (
                    <CompanySetup categories={categories} />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } 
              />

              {/* Route 3: Admin Business Management Panel */}
              <Route 
                path="/admin/companies" 
                element={
                  adminUser ? (
                    <AdminCompanyList />
                  ) : (
                    <AdminLogin onLoginSuccess={handleLoginSuccess} />
                  )
                } 
              />

              {/* Route 4: Public Review Studio (For End-Users & Customers) */}
              <Route 
                path="/reviews/:companyId" 
                element={<Dashboard categories={categories} />} 
              />
              <Route 
                path="/reviews" 
                element={<Dashboard categories={categories} />} 
              />

              {/* Route 5: Public Review Detail & Suggestion Editor */}
              <Route 
                path="/review/:reviewId" 
                element={<ReviewDetail />} 
              />
              <Route 
                path="/review/:id" 
                element={<ReviewDetail />} 
              />

              {/* Fallback Route */}
              <Route 
                path="*" 
                element={
                  adminUser ? <Navigate to="/setup" replace /> : <Navigate to="/login" replace />
                } 
              />
            </Routes>
          </AppLayout>
        )}
      </BrowserRouter>
    </ToastProvider>
  );
}
