import React, { useState } from 'react';
import { Upload, User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle, ArrowLeft, FileText, CreditCard, Calendar } from 'lucide-react';

// API base URL - adjust this to match your server
const API_BASE_URL = 'http://localhost:5000/api'; 
// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api'; 

const UserRegistration = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    birthdate: '',
    role: 'buyer'
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [proofDocument, setProofDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [validIdFront, setValidIdFront] = useState(null);
  const [validIdFrontPreview, setValidIdFrontPreview] = useState(null);
  const [validIdBack, setValidIdBack] = useState(null);
  const [validIdBackPreview, setValidIdBackPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // ✅ Calculate max date for birthdate (must be at least 18 years old)
  const getMaxBirthdate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today.toISOString().split('T')[0];
  };

  // ✅ Calculate min date (no one is older than 120 years)
  const getMinBirthdate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 120);
    return today.toISOString().split('T')[0];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // ✅ Phone number: only allow digits, max 11 characters
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      }
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, document: 'Please select a valid image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, document: 'Document size must be less than 5MB' }));
        return;
      }
      setProofDocument(file);
      setErrors(prev => ({ ...prev, document: '' }));
      const reader = new FileReader();
      reader.onload = (e) => setDocumentPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleValidIdFrontChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, validIdFront: 'Please select a valid image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, validIdFront: 'Image size must be less than 5MB' }));
        return;
      }
      setValidIdFront(file);
      setErrors(prev => ({ ...prev, validIdFront: '' }));
      const reader = new FileReader();
      reader.onload = (e) => setValidIdFrontPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleValidIdBackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, validIdBack: 'Please select a valid image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, validIdBack: 'Image size must be less than 5MB' }));
        return;
      }
      setValidIdBack(file);
      setErrors(prev => ({ ...prev, validIdBack: '' }));
      const reader = new FileReader();
      reader.onload = (e) => setValidIdBackPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // ✅ Phone validation: 11 digits, starts with 09
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length !== 11) {
      newErrors.phone = 'Phone number must be exactly 11 digits';
    } else if (!formData.phone.startsWith('09')) {
      newErrors.phone = 'Phone number must start with 09 (e.g. 09XXXXXXXXX)';
    }

    // ✅ Birthdate validation
    if (!formData.birthdate) {
      newErrors.birthdate = 'Birthdate is required';
    } else {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

      if (actualAge < 18) {
        newErrors.birthdate = 'You must be at least 18 years old to register';
      }
    }

    // Require documents for sellers
    if (formData.role === 'seller') {
      if (!proofDocument) {
        newErrors.document = 'Barangay certificate or proof of residence is required for sellers';
      }
      if (!validIdFront) {
        newErrors.validIdFront = 'Valid ID front photo is required for sellers';
      }
      if (!validIdBack) {
        newErrors.validIdBack = 'Valid ID back photo is required for sellers';
      }
    }

    return newErrors;
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${API_BASE_URL}/users/upload`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const result = await response.json();
      return result.imageUrl;
    } catch (error) {
      throw new Error('Failed to upload image');
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
      let profileImageUrl = null;
      if (profileImage) profileImageUrl = await uploadImage(profileImage);

      let proofDocumentUrl = null;
      let validIdFrontUrl = null;
      let validIdBackUrl = null;

      if (formData.role === 'seller') {
        if (proofDocument) proofDocumentUrl = await uploadImage(proofDocument);
        if (validIdFront) validIdFrontUrl = await uploadImage(validIdFront);
        if (validIdBack) validIdBackUrl = await uploadImage(validIdBack);
      }

      const userData = {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || null,
        address: formData.address || null,
        birthdate: formData.birthdate || null,
        profile_image: profileImageUrl,
        proof_document: proofDocumentUrl,
        valid_id_front: validIdFrontUrl,
        valid_id_back: validIdBackUrl
      };

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const createdUser = await response.json();
      console.log('User created successfully:', createdUser);

      setSuccess(true);

      // Reset form
      setFormData({
        fullName: '', email: '', password: '', confirmPassword: '',
        phone: '', address: '', birthdate: '', role: 'buyer'
      });
      setProfileImage(null); setImagePreview(null);
      setProofDocument(null); setDocumentPreview(null);
      setValidIdFront(null); setValidIdFrontPreview(null);
      setValidIdBack(null); setValidIdBackPreview(null);

    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  // ✅ Helper: get phone validation indicator color
  const getPhoneStatus = () => {
    if (!formData.phone) return null;
    if (formData.phone.length === 11 && formData.phone.startsWith('09')) return 'valid';
    return 'invalid';
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            {formData.role === 'seller' ? (
              <>
                Your seller account has been created successfully. Your account is currently pending approval.
                You will receive an email once an administrator reviews your documents and approves your account.
              </>
            ) : (
              <>
                Your account has been created successfully. You can now log in and start using the platform.
              </>
            )}
          </p>
          <button
            onClick={handleBackToLogin}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Header with Back Button */}
      <div className="flex items-center mb-6">
        <button
          onClick={handleBackToLogin}
          className="flex items-center text-gray-600 hover:text-gray-800 transition duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Login
        </button>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Account</h2>

      <div className="space-y-4">
        {/* Profile Image Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
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
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fullName ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Enter your full name"
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
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
              placeholder="Enter your email"
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Enter your password"
            />
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Confirm your password"
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* ✅ Phone Number - With live validation indicator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
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

          {/* ✅ Live validation hints */}
          {formData.phone.length > 0 && (
            <div className="mt-2 space-y-1">
              {/* Check: starts with 09 */}
              <div className={`flex items-center gap-1.5 text-xs ${
                formData.phone.startsWith('09') ? 'text-green-600' : 'text-red-500'
              }`}>
                <span>{formData.phone.startsWith('09') ? '✓' : '✗'}</span>
                <span>Starts with 09</span>
              </div>
              {/* Check: 11 digits */}
              <div className={`flex items-center gap-1.5 text-xs ${
                formData.phone.length === 11 ? 'text-green-600' : 'text-red-500'
              }`}>
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
          {!errors.phone && (
            <p className="text-gray-400 text-xs mt-1">
              Format: 09XXXXXXXXX (Philippine mobile number)
            </p>
          )}
        </div>

        {/* ✅ Birthdate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birthdate *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleInputChange}
              min={getMinBirthdate()}
              max={getMaxBirthdate()}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.birthdate ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.birthdate && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.birthdate}
            </p>
          )}
          {!errors.birthdate && (
            <p className="text-gray-400 text-xs mt-1">
              You must be at least 18 years old to register
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your address"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </div>

        {/* Seller Documents Section */}
        {formData.role === 'seller' && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Seller Verification Documents</h3>
            <p className="text-sm text-gray-600">Please upload the following documents for verification</p>

            {/* Proof of Residence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay Certificate / Proof of Residence (Legazpi) *
              </label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition duration-200">
                <div className="flex flex-col items-center">
                  {documentPreview ? (
                    <div className="relative w-full">
                      <img src={documentPreview} alt="Document preview" className="w-full h-48 object-contain rounded-md mb-2" />
                      <button
                        type="button"
                        onClick={() => { setProofDocument(null); setDocumentPreview(null); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <FileText className="w-12 h-12 text-gray-400 mb-2" />
                  )}
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {documentPreview ? 'Change Document' : 'Upload Document'}
                    <input type="file" accept="image/*" onChange={handleDocumentChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">Clear photo of Barangay Certificate or Proof of Residence</p>
                </div>
              </div>
              {errors.document && <p className="text-red-500 text-sm mt-1">{errors.document}</p>}
            </div>

            {/* Valid ID Front */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid ID (Front) *</label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition duration-200">
                <div className="flex flex-col items-center">
                  {validIdFrontPreview ? (
                    <div className="relative w-full">
                      <img src={validIdFrontPreview} alt="ID Front preview" className="w-full h-48 object-contain rounded-md mb-2" />
                      <button
                        type="button"
                        onClick={() => { setValidIdFront(null); setValidIdFrontPreview(null); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <CreditCard className="w-12 h-12 text-gray-400 mb-2" />
                  )}
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {validIdFrontPreview ? 'Change ID Front' : 'Upload ID Front'}
                    <input type="file" accept="image/*" onChange={handleValidIdFrontChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">Front side of your Valid ID (Driver's License, National ID, Passport, etc.)</p>
                </div>
              </div>
              {errors.validIdFront && <p className="text-red-500 text-sm mt-1">{errors.validIdFront}</p>}
            </div>

            {/* Valid ID Back */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid ID (Back) *</label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition duration-200">
                <div className="flex flex-col items-center">
                  {validIdBackPreview ? (
                    <div className="relative w-full">
                      <img src={validIdBackPreview} alt="ID Back preview" className="w-full h-48 object-contain rounded-md mb-2" />
                      <button
                        type="button"
                        onClick={() => { setValidIdBack(null); setValidIdBackPreview(null); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <CreditCard className="w-12 h-12 text-gray-400 mb-2" />
                  )}
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {validIdBackPreview ? 'Change ID Back' : 'Upload ID Back'}
                    <input type="file" accept="image/*" onChange={handleValidIdBackChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">Back side of your Valid ID</p>
                </div>
              </div>
              {errors.validIdBack && <p className="text-red-500 text-sm mt-1">{errors.validIdBack}</p>}
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
};

export default UserRegistration;