import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import CompanyModal from './components/CompanyModal';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initial data loading
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [compRes, catRes, healthRes] = await Promise.allSettled([
          api.getCompanies(),
          api.getCategories(),
          api.getHealth()
        ]);

        if (!isMounted) return;

        if (compRes.status === 'fulfilled' && compRes.value.success) {
          const loadedCompanies = compRes.value.companies || [];
          setCompanies(loadedCompanies);
          if (loadedCompanies.length > 0) {
            const savedCompanyId = localStorage.getItem('reviewcraft_company_id');
            const savedCategory = localStorage.getItem('reviewcraft_category');

            let matched = null;
            if (savedCompanyId) {
              matched = loadedCompanies.find((c) => c.id === savedCompanyId);
            }
            if (!matched && savedCategory) {
              matched = loadedCompanies.find((c) => c.category === savedCategory);
            }

            const activeComp = matched || loadedCompanies.find((c) => c.category === 'E-commerce') || loadedCompanies[0];
            setSelectedCompany(activeComp);
            if (activeComp) {
              localStorage.setItem('reviewcraft_company_id', activeComp.id);
              localStorage.setItem('reviewcraft_category', activeComp.category);
            }
          }
        }

        if (catRes.status === 'fulfilled' && catRes.value.success) {
          setCategories(catRes.value.categories || []);
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

  const handleSelectCompany = (comp) => {
    setSelectedCompany(comp);
    if (comp) {
      localStorage.setItem('reviewcraft_company_id', comp.id);
      localStorage.setItem('reviewcraft_category', comp.category);
    }
  };

  const handleCompanyCreated = (newCompany) => {
    setCompanies((prev) => [newCompany, ...prev]);
    handleSelectCompany(newCompany);
  };

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 radial-glow">
          
          {/* Top Navigation Bar */}
          <Navbar
            healthStatus={healthStatus}
          />

          {/* Main Content Viewport */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium">Connecting to AI Review Engine...</p>
              </div>
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      companies={companies}
                      selectedCompany={selectedCompany}
                      categories={categories}
                      onSelectCompany={handleSelectCompany}
                      onOpenNewCompanyModal={() => setIsModalOpen(true)}
                    />
                  }
                />
                <Route path="/review/:id" element={<ReviewDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </main>

          {/* Create Company Modal */}
          <CompanyModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            categories={categories}
            onCompanyCreated={handleCompanyCreated}
          />

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 font-medium text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>ReviewCraft AI • Intelligent SEO Business Review Generator</span>
            </div>
            <p className="max-w-xl mx-auto text-[11px] text-slate-500 px-4">
              All generated reviews are AI-synthesized draft suggestions to facilitate brand marketing and SEO. They do not represent real customer testimonials. Powered by Python Flask, Scikit-Learn TF-IDF, and MongoDB.
            </p>
          </footer>

        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
