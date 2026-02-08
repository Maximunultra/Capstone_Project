import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Scissors, Heart } from 'lucide-react';

export default function Login({ onAuthChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) return alert('Please enter email and password');
    setLoading(true);

    try {
      const res = await axios.post('https://capstone-project-1msq.onrender.com/api/auth/login', {
        email,
        password,
      });

      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        if (onAuthChange) {
          onAuthChange(true, user.role);
        }
        
        alert(`Welcome, ${user.role.toUpperCase()}!`);
        
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'seller':
            navigate('/seller');
            break;
          case 'buyer':
            navigate('/buyer');
            break;
          default:
            navigate('/login');
            break;
        }
      } else {
        alert('Invalid response from server.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Login Card */}
      <div className="relative bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl p-10 w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
        
        {/* Header with Brand Identity */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl transform rotate-6 opacity-20"></div>
              <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl">
                <Scissors className="w-10 h-10 text-amber-700" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm">Sign in to your artisan account</p>
        </div>

        {/* Email Input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'transform scale-[1.02]' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className={`w-5 h-5 transition-colors duration-300 ${
                focusedField === 'email' ? 'text-amber-600' : 'text-gray-400'
              }`} />
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'transform scale-[1.02]' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className={`w-5 h-5 transition-colors duration-300 ${
                focusedField === 'password' ? 'text-amber-600' : 'text-gray-400'
              }`} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-amber-600 transition-colors duration-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right mb-6">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors duration-300 hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-300 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>


        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-3">
            Don't have an account?
          </p>
          <button
            onClick={() => navigate('/register')}
            className="w-full py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 font-semibold rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border-2 border-gray-300"
          >
            Create New Account
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center">
            Made with <Heart className="w-3 h-3 mx-1 text-rose-500 fill-current" /> by artisans, for artisans
          </p>
        </div>
      </div>
    </div>
  );
}