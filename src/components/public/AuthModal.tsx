import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccessNavigate?: (role: 'staff') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccessNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { login, registerUser } = useAuth();

  // Login form
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form
  const [fullName, setFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginInput.trim()) {
      setErrorMessage('Please enter your username.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginInput, loginPassword);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
      if (onSuccessNavigate) {
        onSuccessNavigate('staff');
      }
    } else {
      setErrorMessage(result.error || 'Login failed. Please verify credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !regUsername.trim() || !regPassword) {
      setErrorMessage('Please fill in all required fields: Full Name, Username, and Password.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (regPassword.length < 5) {
      setErrorMessage('Password must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    const res = await registerUser({
      fullName,
      username: regUsername,
      password: regPassword,
      role: 'staff',
    });
    setIsSubmitting(false);

    if (res.success) {
      setSuccessNotice(
        'Account successfully registered. Credentials securely saved. Signing you in...'
      );
      setTimeout(() => {
        onClose();
        if (onSuccessNavigate) onSuccessNavigate('staff');
      }, 1000);
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                T20
              </span>
              <span>
                {mode === 'login' ? 'Sign In to T20 Server' : 'Register Account on T20 Server'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Business Operations, Sales, Inventory & Reporting System
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Workflow Explanation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>T20 Operational Workflow:</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            1. <strong>Product Registration:</strong> Register products with Photo, Name, and Price.<br />
            2. <strong>Daily Report Entry:</strong> Products auto-populate, where quantity sold is filled alongside Quantum & Body Analyzer diagnostics and Member Kits.<br />
            3. <strong>Automated Reports:</strong> Weekly, Monthly, Quarterly, and Annual statements compile automatically with profit and expense reconciliation.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-100">
          <button
            onClick={() => { setMode('login'); setErrorMessage(''); setSuccessNotice(''); }}
            className={`flex-1 py-3.5 text-sm font-black text-center transition-colors min-h-[48px] cursor-pointer ${
              mode === 'login' ? 'bg-white text-slate-950 border-b-3 border-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMessage(''); setSuccessNotice(''); }}
            className={`flex-1 py-3.5 text-sm font-black text-center transition-colors min-h-[48px] cursor-pointer ${
              mode === 'register' ? 'bg-white text-slate-950 border-b-3 border-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Register Account
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">
                  Username (Jina la Mtumiaji) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Enter your registered username..."
                    className="w-full pl-10 pr-3.5 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">
                  Password (Nenosiri) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-950 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-md transition-all min-h-[48px] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">
                  Full Name (Jina Kamili) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. David Richardson"
                  className="w-full px-3.5 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">
                  Username (Jina la Mtumiaji) *
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. david.staff"
                  className="w-full px-3.5 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Password (Nenosiri) *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-12 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-950 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Confirm Password (Thibitisha) *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-12 py-3 text-sm font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400 placeholder:font-normal min-h-[46px] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-950 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                      title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-md transition-all mt-3 min-h-[48px] disabled:opacity-60 cursor-pointer bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? 'Registering Account...' : 'Register & Save Credentials'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
