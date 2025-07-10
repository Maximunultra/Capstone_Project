import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";

export default function Login({ onAuthChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) return alert('Please enter email and password');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password,
      });

      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update authentication state in parent component
        if (onAuthChange) {
          onAuthChange(true, user.role);
        }
        
        alert(`Welcome, ${user.role.toUpperCase()}!`);
        
        // Navigate based on user role with new routing structure
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        {/* Registration and Forgot Password Links */}
        <div className="text-center mt-4 space-y-2">
          <button
            onClick={() => navigate('/register')}
            className="w-full py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
          >
            Create Account
          </button>
          
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}