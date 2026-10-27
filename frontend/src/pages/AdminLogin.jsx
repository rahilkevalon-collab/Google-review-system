import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function AdminLogin({ onLoginSuccess }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = formData.identifier.trim();
    const cleanPass = formData.password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Please enter both email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Attempt login with backend API
      const res = await api.login({
        email: cleanId,
        username: cleanId,
        password: cleanPass
      });

      if (res.success && res.token) {
        localStorage.setItem('reviewcraft_admin_token', res.token);
        localStorage.setItem('reviewcraft_admin_user', JSON.stringify(res.user));
        addToast('Welcome back, Admin!', 'success');
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          navigate('/setup');
        }
      } else {
        setErrorMsg(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      // Fallback offline validation for default admin credentials
      if (
        (cleanId.toLowerCase() === 'admin@reviewcraft.com' || cleanId.toLowerCase() === 'admin') &&
        cleanPass === 'admin123'
      ) {
        const dummyUser = {
          name: 'Super Admin',
          email: 'admin@reviewcraft.com',
          username: 'admin',
          role: 'admin'
        };
        localStorage.setItem('reviewcraft_admin_token', 'rc_admin_local_session');
        localStorage.setItem('reviewcraft_admin_user', JSON.stringify(dummyUser));
        addToast('Admin logged in successfully!', 'success');
        if (onLoginSuccess) {
          onLoginSuccess(dummyUser);
        } else {
          navigate('/setup');
        }
      } else {
        setErrorMsg(err.message || 'Invalid email or password. Please try again.');
        addToast('Login failed. Invalid credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8 animate-in fade-in duration-300">
      <div className="w-full max-w-md">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#034665] to-[#068dcb] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#068dcb]/25 ring-4 ring-[#068dcb]/15">
            <ShieldCheck className="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ReviewCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#034665] to-[#068dcb]">Admin Panel</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Sign in with your admin credentials to setup businesses and manage reviews.
          </p>


        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-2xl shadow-slate-200/60 bg-white relative">
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email / Username Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Admin Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  name="identifier"
                  required
                  placeholder="admin@reviewcraft.com or admin"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#068dcb] focus:ring-4 focus:ring-[#068dcb]/15 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#068dcb] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#068dcb] focus:ring-4 focus:ring-[#068dcb]/15 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#034665] to-[#068dcb] hover:from-[#02354e] hover:to-[#057db4] text-white font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-[#068dcb]/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>



          </form>

        </div>

      </div>
    </div>
  );
}
