import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Heart, CheckCircle, AlertCircle, X, ShieldOff, Clock } from 'lucide-react';

function Toast({ message, type, onClose }) {
  const styles = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-amber-500', blocked: 'bg-gray-800', info: 'bg-blue-500' };
  const Icon = type === 'success' ? CheckCircle : type === 'blocked' ? ShieldOff : AlertCircle;
  return (
    <div className={`fixed top-4 right-4 ${styles[type] || styles.info} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 max-w-md animate-in slide-in-from-right duration-300`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1 transition-colors duration-200"><X className="w-4 h-4" /></button>
    </div>
  );
}

function BlockedModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><ShieldOff className="w-8 h-8 text-red-600" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Account Blocked</h2>
        <p className="text-gray-500 text-sm mb-2">Your account has been blocked by an administrator.</p>
        <p className="text-gray-500 text-sm mb-6">If you believe this is a mistake, please contact our support team for assistance.</p>
        <button onClick={onClose} className="w-full py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-lg">Got it</button>
      </div>
    </div>
  );
}

function SuspendedModal({ suspendedUntil, autoSuspended, onExpired }) {
  const [timeLeft, setTimeLeft] = useState({ mins: 0, secs: 0 });
  useEffect(() => {
    const calculate = () => {
      const diff = new Date(suspendedUntil) - new Date();
      if (diff <= 0) { onExpired(); return; }
      setTimeLeft({ mins: Math.floor(diff / 60000), secs: Math.floor((diff % 60000) / 1000) });
    };
    calculate();
    const id = setInterval(calculate, 1000);
    return () => clearInterval(id);
  }, [suspendedUntil, onExpired]);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4"><Clock className="w-8 h-8 text-amber-600" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Account Temporarily Suspended</h2>
        {autoSuspended && <p className="text-gray-500 text-sm mb-4">Your account was suspended after <span className="font-semibold text-red-500">3 failed login attempts</span>.</p>}
        <p className="text-gray-500 text-sm mb-5">You can try again in:</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-8 py-4 mb-6 w-full">
          <div className="flex items-center justify-center gap-2">
            <div className="text-center"><p className="text-4xl font-bold text-amber-700 font-mono">{pad(timeLeft.mins)}</p><p className="text-xs text-amber-500 font-medium uppercase tracking-wider mt-1">min</p></div>
            <p className="text-3xl font-bold text-amber-400 mb-3">:</p>
            <div className="text-center"><p className="text-4xl font-bold text-amber-700 font-mono">{pad(timeLeft.secs)}</p><p className="text-xs text-amber-500 font-medium uppercase tracking-wider mt-1">sec</p></div>
          </div>
        </div>
        <p className="text-xs text-gray-400">The form will unlock automatically when the timer ends.</p>
      </div>
    </div>
  );
}

function AttemptsWarning({ attemptsLeft }) {
  if (attemptsLeft === null) return null;
  const color = attemptsLeft === 1 ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-700';
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium mb-4 ${color}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before your account is temporarily suspended.</span>
    </div>
  );
}

export default function Login({ onAuthChange }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [toast, setToast]           = useState(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [suspendedUntil, setSuspendedUntil]     = useState(null);
  const [autoSuspended, setAutoSuspended]       = useState(false);
  const [attemptsLeft, setAttemptsLeft]         = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast(null), 5000); };
  const handleSuspensionExpired = () => { setSuspendedUntil(null); setAutoSuspended(false); setAttemptsLeft(null); };

  const handleLogin = async () => {
    if (!identifier || !password) { showToast('Please enter your email/username and password', 'error'); return; }
    setLoading(true);
    try {
      const res = await axios.post('https://capstone-project-1msq.onrender.com/api/auth/login', { email: identifier.trim(), password });
      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (onAuthChange) onAuthChange(true, user.role);
        setAttemptsLeft(null);
        showToast(`Welcome back, ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}!`, 'success');
        setTimeout(() => { switch (user.role) { case 'admin': navigate('/admin'); break; case 'seller': navigate('/seller'); break; case 'buyer': navigate('/buyer'); break; default: navigate('/login'); } }, 1000);
      } else { showToast('Invalid response from server', 'error'); }
    } catch (err) {
      const status = err.response?.status;
      const data   = err.response?.data;
      if (status === 403 && data?.code === 'ACCOUNT_BLOCKED') { setShowBlockedModal(true); setAttemptsLeft(null); }
      else if (status === 403 && data?.code === 'ACCOUNT_SUSPENDED') { setSuspendedUntil(data.suspended_until); setAutoSuspended(!!data.auto_suspended); setAttemptsLeft(null); }
      else if (status === 403) { showToast(data?.error || 'Account not approved.', 'warning'); }
      else if (status === 401 && data?.code === 'SESSION_INVALIDATED') { localStorage.removeItem('token'); localStorage.removeItem('user'); showToast('You were logged out. Account signed in on another device.', 'error'); setTimeout(() => navigate('/login'), 2000); }
      else if (status === 401 && data?.attempts_left !== undefined) { setAttemptsLeft(data.attempts_left); showToast(data.error, 'error'); }
      else { showToast(data?.error || 'Login failed! Please try again.', 'error'); }
    } finally { setLoading(false); }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showBlockedModal && <BlockedModal onClose={() => setShowBlockedModal(false)} />}
      {suspendedUntil && <SuspendedModal suspendedUntil={suspendedUntil} autoSuspended={autoSuspended} onExpired={handleSuspensionExpired} />}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl p-10 w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl transform rotate-6 opacity-20"></div>
              <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm sm:text-lg">A</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Welcome Back</h1>
          <p className="text-gray-600 text-sm">Sign in to your artisan account</p>
        </div>

        <AttemptsWarning attemptsLeft={attemptsLeft} />

        {/* Email or Username */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Email or Username</label>
          <div className={`relative transition-all duration-300 ${focusedField === 'identifier' ? 'transform scale-[1.02]' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'identifier' ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder="you@example.com or your_username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField(null)}
              onKeyPress={handleKeyPress}
              autoComplete="username"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'transform scale-[1.02]' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onKeyPress={handleKeyPress}
              autoComplete="current-password"
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-amber-600 transition-colors duration-300" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="text-right mb-6">
          <button onClick={() => navigate('/forgot-password')} className="text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors duration-300 hover:underline">Forgot Password?</button>
        </div>

        <button onClick={handleLogin} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-300 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-6">
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-3">Don't have an account?</p>
          <button onClick={() => navigate('/register')} className="w-full py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 font-semibold rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-gray-300">Create New Account</button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center">Made with <Heart className="w-3 h-3 mx-1 text-rose-500 fill-current" /> by artisans, for artisans</p>
        </div>
      </div>
    </div>
  );
}