import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [categories, setCategories] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

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
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 radial-glow antialiased selection:bg-[#068dcb]/20 selection:text-[#034665]">
          
          {/* Top Navigation Bar */}
          <Navbar healthStatus={healthStatus} />

          {/* Main Content Viewport */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 rounded-full border-2 border-[#068dcb] border-t-transparent animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  Connecting to AI Review Engine...
                </p>
              </div>
            ) : (
              <Routes>
                {/* Page 1: Company Onboarding Setup Form */}
                <Route path="/" element={<CompanySetup categories={categories} />} />
                <Route path="/setup" element={<CompanySetup categories={categories} />} />

                {/* Page 2: Review Generation Studio */}
                <Route path="/reviews/:companyId" element={<Dashboard categories={categories} />} />
                <Route path="/reviews" element={<Dashboard categories={categories} />} />

                {/* Page 3: Review Detail & Suggestion Editor */}
                <Route path="/review/:reviewId" element={<ReviewDetail />} />
                <Route path="/review/:id" element={<ReviewDetail />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/setup" replace />} />
              </Routes>
            )}
          </main>

          {/* Sweet & Short Single-Line Footer */}
          <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 shadow-2xs">
            <div className="flex items-center justify-center gap-2 font-medium text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-[#068dcb]" />
              <span>ReviewCraft AI • Intelligent SEO Business Review Generator</span>
            </div>
          </footer>

        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
