import React, { useState } from 'react';
import { Upload, User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle, ArrowLeft, Calendar, AtSign } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const UserRegistration = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    birthdate: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
      return;
    }
    // Username: lowercase, no spaces, alphanumeric + underscore only
    if (name === 'username') {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, username: cleaned }));
      if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, image: 'Please select a valid image file' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' })); return; }
    setProfileImage(file);
    setErrors(prev => ({ ...prev, image: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';

    // Username validation
    if (formData.username) {
      if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
      else if (formData.username.length > 30) newErrors.username = 'Username must be 30 characters or less';
      else if (!/^[a-z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (formData.phone.length !== 11) newErrors.phone = 'Phone number must be exactly 11 digits';
    else if (!formData.phone.startsWith('09')) newErrors.phone = 'Phone number must start with 09 (e.g. 09XXXXXXXXX)';

    return newErrors;
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/users/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Failed to upload image');
    const result = await response.json();
    return result.imageUrl;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setLoading(true);
    setErrors({});
    try {
      let profileImageUrl = null;
      if (profileImage) profileImageUrl = await uploadImage(profileImage);

      const userData = {
        full_name:     formData.fullName,
        username:      formData.username || null,
        email:         formData.email,
        password:      formData.password,
        role:          'buyer',
        phone:         formData.phone || null,
        address:       formData.address || null,
        birthdate:     formData.birthdate || null,
        profile_image: profileImageUrl,
      };

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      setSuccess(true);
      setFormData({ fullName: '', username: '', email: '', password: '', confirmPassword: '', phone: '', address: '', birthdate: '' });
      setProfileImage(null);
      setImagePreview(null);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBackToLogin) onBackToLogin();
    else window.location.href = '/login';
  };

  const getPhoneStatus = () => {
    if (!formData.phone) return null;
    return (formData.phone.length === 11 && formData.phone.startsWith('09')) ? 'valid' : 'invalid';
  };

  const getUsernameStatus = () => {
    if (!formData.username) return null;
    return (formData.username.length >= 3 && /^[a-z0-9_]+$/.test(formData.username)) ? 'valid' : 'invalid';
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">Your account has been created successfully. You can now log in.</p>
          <button onClick={handleBackToLogin} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <button onClick={handleBackToLogin} className="flex items-center text-gray-600 hover:text-gray-800 transition duration-200">
          <ArrowLeft className="w-5 h-5 mr-2" />Back to Login
        </button>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Account</h2>

      <div className="space-y-4">
        {/* Profile Image */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {imagePreview ? <img src={imagePreview} alt="Profile preview" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-400" />}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700 transition duration-200">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Enter your full name" />
          </div>
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="text" name="username" value={formData.username} onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.username ? 'border-red-400 bg-red-50'
                : getUsernameStatus() === 'valid' ? 'border-green-400 bg-green-50'
                : 'border-gray-300'
              }`}
              placeholder="your_username" maxLength={30} />
          </div>
          {formData.username.length > 0 && (
            <div className="mt-1.5 space-y-1">
              <div className={`flex items-center gap-1.5 text-xs ${formData.username.length >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                <span>{formData.username.length >= 3 ? '✓' : '✗'}</span>
                <span>At least 3 characters ({formData.username.length}/30)</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${/^[a-z0-9_]+$/.test(formData.username) ? 'text-green-600' : 'text-red-500'}`}>
                <span>{/^[a-z0-9_]+$/.test(formData.username) ? '✓' : '✗'}</span>
                <span>Only letters, numbers, underscores</span>
              </div>
            </div>
          )}
          {errors.username
            ? <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.username}</p>
            : !formData.username && <p className="text-gray-400 text-xs mt-1">Used to log in. Letters, numbers, underscores only.</p>
          }
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Enter your email" />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="password" name="password" value={formData.password} onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Enter your password" />
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Confirm your password" />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
              inputMode="numeric" maxLength={11}
              className={`w-full pl-10 pr-12 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.phone ? 'border-red-400 bg-red-50' : getPhoneStatus() === 'valid' ? 'border-green-400 bg-green-50' : 'border-gray-300'
              }`}
              placeholder="09XXXXXXXXX" />
            <span className={`absolute right-3 top-2.5 text-xs font-semibold ${formData.phone.length === 11 ? 'text-green-600' : 'text-gray-400'}`}>
              {formData.phone.length}/11
            </span>
          </div>
          {formData.phone.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className={`flex items-center gap-1.5 text-xs ${formData.phone.startsWith('09') ? 'text-green-600' : 'text-red-500'}`}>
                <span>{formData.phone.startsWith('09') ? '✓' : '✗'}</span><span>Starts with 09</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${formData.phone.length === 11 ? 'text-green-600' : 'text-red-500'}`}>
                <span>{formData.phone.length === 11 ? '✓' : '✗'}</span><span>Exactly 11 digits ({formData.phone.length} entered)</span>
              </div>
            </div>
          )}
          {errors.phone
            ? <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.phone}</p>
            : <p className="text-gray-400 text-xs mt-1">Format: 09XXXXXXXXX (Philippine mobile number)</p>}
        </div>

        {/* Birthdate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input type="text" name="address" value={formData.address} onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your address" />
          </div>
        </div>

        {errors.submit && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        <button type="button" onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
};

export default UserRegistration;