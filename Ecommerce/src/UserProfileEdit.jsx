import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Lock, Save, X, AlertCircle, CheckCircle, Camera, Calendar } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const UserProfileEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    birthdate: '',
    role: 'buyer',
    profile_image: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // ✅ Max birthdate = 18 years ago
  const getMaxBirthdate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today.toISOString().split('T')[0];
  };

  const getMinBirthdate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 120);
    return today.toISOString().split('T')[0];
  };

  // Fetch user data by ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${id}`);
        if (!res.ok) throw new Error('User not found');
        const user = await res.json();
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          password: '',
          confirmPassword: '',
          phone: user.phone || '',
          address: user.address || '',
          birthdate: user.birthdate ? user.birthdate.split('T')[0] : '',
          role: user.role || 'buyer',
          profile_image: user.profile_image || ''
        });
        setImagePreview(user.profile_image || null);
      } catch (err) {
        setErrors({ submit: err.message });
      }
    };
    fetchUser();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // ✅ Phone: digits only, max 11
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) {
        setFormData(prev => ({ ...prev, phone: digitsOnly }));
      }
      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Please select a valid image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      setProfileImage(file);
      setErrors(prev => ({ ...prev, image: '' }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // ✅ Phone validation: 11 digits, starts with 09
    if (formData.phone) {
      if (formData.phone.length !== 11) {
        newErrors.phone = 'Phone number must be exactly 11 digits';
      } else if (!formData.phone.startsWith('09')) {
        newErrors.phone = 'Phone number must start with 09 (e.g. 09XXXXXXXXX)';
      }
    }

    // ✅ Birthdate: must be at least 18
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1 : age;
      if (actualAge < 18) {
        newErrors.birthdate = 'You must be at least 18 years old';
      }
    }

    return newErrors;
  };

  const uploadImage = async (file) => {
    if (!file) return formData.profile_image;
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    try {
      const response = await fetch(`${API_BASE_URL}/users/upload`, {
        method: 'POST',
        body: uploadFormData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const result = await response.json();
      return result.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return formData.profile_image;
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      let profileImageUrl = formData.profile_image;
      if (profileImage) profileImageUrl = await uploadImage(profileImage);

      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        birthdate: formData.birthdate || null,
        role: formData.role,
        profile_image: profileImageUrl
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Update error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setSuccess(false);
    navigate(-1);
  };

  // ✅ Phone status for live indicator
  const getPhoneStatus = () => {
    if (!formData.phone) return null;
    if (formData.phone.length === 11 && formData.phone.startsWith('09')) return 'valid';
    return 'invalid';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-700">Profile updated successfully!</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              {errors.image && <p className="text-red-500 text-sm mt-2">{errors.image}</p>}
              <p className="text-sm text-gray-500 mt-2">Click camera icon to change photo</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.full_name ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter full name"
                />
              </div>
              {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter email"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password (leave blank to keep current)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter new password"
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            {formData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Confirm new password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* ✅ Phone Number with live validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength={11}
                  className={`w-full pl-10 pr-12 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.phone
                      ? 'border-red-400 bg-red-50'
                      : getPhoneStatus() === 'valid'
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="09XXXXXXXXX"
                />
                {/* Live digit counter */}
                <span className={`absolute right-3 top-2.5 text-xs font-semibold ${
                  formData.phone.length === 11 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {formData.phone.length}/11
                </span>
              </div>

              {/* Live hints */}
              {formData.phone.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center gap-1.5 text-xs ${formData.phone.startsWith('09') ? 'text-green-600' : 'text-red-500'}`}>
                    <span>{formData.phone.startsWith('09') ? '✓' : '✗'}</span>
                    <span>Starts with 09</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${formData.phone.length === 11 ? 'text-green-600' : 'text-red-500'}`}>
                    <span>{formData.phone.length === 11 ? '✓' : '✗'}</span>
                    <span>Exactly 11 digits ({formData.phone.length} entered)</span>
                  </div>
                </div>
              )}

              {errors.phone && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.phone}
                </p>
              )}
              {!errors.phone && !formData.phone && (
                <p className="text-gray-400 text-xs mt-1">Format: 09XXXXXXXXX (Philippine mobile number)</p>
              )}
            </div>

            {/* ✅ Birthdate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  min={getMinBirthdate()}
                  max={getMaxBirthdate()}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.birthdate ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.birthdate && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.birthdate}
                </p>
              )}
              {!errors.birthdate && (
                <p className="text-gray-400 text-xs mt-1">Must be at least 18 years old</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter address"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || success}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileEdit;