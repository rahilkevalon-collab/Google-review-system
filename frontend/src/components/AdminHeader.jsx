import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useToast } from './Toast';

export default function AdminHeader({ adminUser, onLogout }) {
  const navigate = useNavigate();
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex justify-end items-center">
      <div className="flex items-center gap-3">
        <span className="text-xs sm:text-sm font-bold text-slate-800">
          {adminUser?.name || 'Super Admin'}
        </span>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          title="Log out of Admin Panel"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
