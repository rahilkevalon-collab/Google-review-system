import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, Building2, PlusCircle, ShieldCheck } from 'lucide-react';
import { useToast } from './Toast';

export default function AdminHeader({ adminUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const handleLogoutClick = () => {
    localStorage.removeItem('reviewcraft_admin_token');
    localStorage.removeItem('reviewcraft_admin_user');
    addToast('Logged out of Admin Panel successfully.', 'info');
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const isDirectory = location.pathname.startsWith('/admin');
  const isSetup = location.pathname === '/' || location.pathname === '/setup';

  return (
    <header className="w-full bg-white border-b border-slate-200/90 shadow-2xs sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-3">
          <Link to="/admin/companies" className="flex items-center gap-2.5 group">
            <img
              src="/kevalon-tap-logo.png"
              alt="KevalonTap"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-[1.02] transition-transform"
            />
            <span className="hidden sm:inline-block text-[10px] font-extrabold text-[#068dcb] bg-[#068dcb]/10 border border-[#068dcb]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Admin Control
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-slate-200">
            <Link
              to="/admin/companies"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDirectory
                  ? 'bg-[#068dcb]/10 text-[#034665]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Directory</span>
            </Link>

            <Link
              to="/setup"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSetup
                  ? 'bg-[#068dcb]/10 text-[#034665]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Business</span>
            </Link>
          </nav>
        </div>

        {/* Admin User Info & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{adminUser?.name || 'Super Admin'}</span>
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Log out of Admin Panel"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
