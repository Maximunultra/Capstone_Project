import React, { useState } from 'react';
import { Upload, User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle, ArrowLeft, FileText, CreditCard, Calendar, Store, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const SellerRegistration = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    birthdate: '',
    storeName: '',
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
      return;
    }
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

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, document: 'Please select a valid image file' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, document: 'Document size must be less than 5MB' })); return; }
    setProofDocument(file);
    setErrors(prev => ({ ...prev, document: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setDocumentPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleValidIdFrontChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, validIdFront: 'Please select a valid image file' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, validIdFront: 'Image size must be less than 5MB' })); return; }
    setValidIdFront(file);
    setErrors(prev => ({ ...prev, validIdFront: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setValidIdFrontPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleValidIdBackChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, validIdBack: 'Please select a valid image file' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, validIdBack: 'Image size must be less than 5MB' })); return; }
    setValidIdBack(file);
    setErrors(prev => ({ ...prev, validIdBack: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setValidIdBackPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.storeName.trim()) newErrors.storeName = 'Store name is required';

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

    if (!proofDocument) newErrors.document = 'Barangay certificate or proof of residence is required';
    if (!validIdFront) newErrors.validIdFront = 'Valid ID front photo is required';
    if (!validIdBack) newErrors.validIdBack = 'Valid ID back photo is required';
    return newErrors;
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const data = new FormData();
    data.append('image', file);
    const response = await fetch(`${API_BASE_URL}/users/upload`, { method: 'POST', body: data });
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
      let proofDocumentUrl = null, validIdFrontUrl = null, validIdBackUrl = null;
      if (proofDocument) proofDocumentUrl = await uploadImage(proofDocument);
      if (validIdFront)  validIdFrontUrl  = await uploadImage(validIdFront);
      if (validIdBack)   validIdBackUrl   = await uploadImage(validIdBack);

      const userData = {
        full_name:      formData.fullName,
        username:       formData.username || null,
        email:          formData.email,
        password:       formData.password,
        role:           'seller',
        phone:          formData.phone || null,
        address:        formData.address || null,
        birthdate:      formData.birthdate || null,
        store_name:     formData.storeName || null,
        profile_image:  profileImageUrl,
        proof_document: proofDocumentUrl,
        valid_id_front: validIdFrontUrl,
        valid_id_back:  validIdBackUrl,
        approval_status: 'approved',
      };

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create seller');
      }

      setSuccess(true);
      setFormData({ fullName: '', username: '', email: '', password: '', confirmPassword: '', phone: '', address: '', birthdate: '', storeName: '' });
      setProfileImage(null); setImagePreview(null);
      setProofDocument(null); setDocumentPreview(null);
      setValidIdFront(null); setValidIdFrontPreview(null);
      setValidIdBack(null); setValidIdBackPreview(null);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller Created!</h2>
          <p className="text-gray-600 mb-6">The seller account has been created and approved successfully.</p>
          <div className="flex gap-3">
            <button onClick={() => setSuccess(false)} className="flex-1 border border-orange-300 text-orange-600 py-2.5 px-4 rounded-xl hover:bg-orange-50 transition duration-200 font-medium">Add Another</button>
            <button onClick={() => navigate(-1)} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition duration-200 font-medium">Back to Users</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-orange-700 hover:text-orange-900 transition duration-200 font-medium">
            <ArrowLeft className="w-5 h-5" />Back to Users
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">Add New Seller</h2>
            <p className="text-orange-100 text-sm mt-1">Admin panel — seller accounts are auto-approved</p>
          </div>

          <div className="p-8 space-y-5">
            {/* Profile Image */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-orange-100">
                  {imagePreview ? <img src={imagePreview} alt="Profile preview" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-orange-400" />}
                </div>
                <label className="absolute bottom-0 right-0 bg-orange-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-orange-600 transition duration-200 shadow-md">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Profile photo (optional)</p>
              {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.fullName ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter full name" />
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
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.username ? 'border-red-400 bg-red-50'
                    : getUsernameStatus() === 'valid' ? 'border-green-400 bg-green-50'
                    : 'border-gray-300'
                  }`}
                  placeholder="seller_username" maxLength={30} />
              </div>
              {formData.username.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className={`flex items-center gap-1.5 text-xs ${formData.username.length >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                    <span>{formData.username.length >= 3 ? '✓' : '✗'}</span><span>At least 3 characters ({formData.username.length}/30)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${/^[a-z0-9_]+$/.test(formData.username) ? 'text-green-600' : 'text-red-500'}`}>
                    <span>{/^[a-z0-9_]+$/.test(formData.username) ? '✓' : '✗'}</span><span>Only letters, numbers, underscores</span>
                  </div>
                </div>
              )}
              {errors.username
                ? <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.username}</p>
                : !formData.username && <p className="text-gray-400 text-xs mt-1">Used to log in. Letters, numbers, underscores only.</p>}
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
              <div className="relative">
                <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="text" name="storeName" value={formData.storeName} onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.storeName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Enter store name" />
              </div>
              {errors.storeName && <p className="text-red-500 text-sm mt-1">{errors.storeName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Enter email address" />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Set a password" />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Confirm password" />
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
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.phone ? 'border-red-400 bg-red-50' : getPhoneStatus() === 'valid' ? 'border-green-400 bg-green-50' : 'border-gray-300'
                  }`}
                  placeholder="09XXXXXXXXX" />
                <span className={`absolute right-3 top-3 text-xs font-semibold ${formData.phone.length === 11 ? 'text-green-600' : 'text-gray-400'}`}>
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
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="text" name="address" value={formData.address} onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter address" />
              </div>
            </div>

            {/* Documents section — unchanged from original, keeping it intact */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Seller Verification Documents</h3>
                <p className="text-sm text-gray-500 mt-0.5">Upload the required verification documents</p>
              </div>

              {/* Proof of Residence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barangay Certificate / Proof of Residence (Legazpi) *</label>
                <div className={`border-2 border-dashed rounded-xl p-4 hover:border-orange-400 transition duration-200 ${errors.document ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                  <div className="flex flex-col items-center">
                    {documentPreview ? (
                      <div className="relative w-full">
                        <img src={documentPreview} alt="Document preview" className="w-full h-48 object-contain rounded-lg mb-2" />
                        <button type="button" onClick={() => { setProofDocument(null); setDocumentPreview(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : <FileText className="w-10 h-10 text-gray-400 mb-2" />}
                    <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition duration-200 flex items-center text-sm font-medium">
                      <Upload className="w-4 h-4 mr-2" />{documentPreview ? 'Change Document' : 'Upload Document'}
                      <input type="file" accept="image/*" onChange={handleDocumentChange} className="hidden" />
                    </label>
                  </div>
                </div>
                {errors.document && <p className="text-red-500 text-sm mt-1">{errors.document}</p>}
              </div>

              {/* Valid ID Front */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid ID (Front) *</label>
                <div className={`border-2 border-dashed rounded-xl p-4 hover:border-orange-400 transition duration-200 ${errors.validIdFront ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                  <div className="flex flex-col items-center">
                    {validIdFrontPreview ? (
                      <div className="relative w-full">
                        <img src={validIdFrontPreview} alt="ID Front" className="w-full h-48 object-contain rounded-lg mb-2" />
                        <button type="button" onClick={() => { setValidIdFront(null); setValidIdFrontPreview(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : <CreditCard className="w-10 h-10 text-gray-400 mb-2" />}
                    <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition duration-200 flex items-center text-sm font-medium">
                      <Upload className="w-4 h-4 mr-2" />{validIdFrontPreview ? 'Change ID Front' : 'Upload ID Front'}
                      <input type="file" accept="image/*" onChange={handleValidIdFrontChange} className="hidden" />
                    </label>
                  </div>
                </div>
                {errors.validIdFront && <p className="text-red-500 text-sm mt-1">{errors.validIdFront}</p>}
              </div>

              {/* Valid ID Back */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid ID (Back) *</label>
                <div className={`border-2 border-dashed rounded-xl p-4 hover:border-orange-400 transition duration-200 ${errors.validIdBack ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                  <div className="flex flex-col items-center">
                    {validIdBackPreview ? (
                      <div className="relative w-full">
                        <img src={validIdBackPreview} alt="ID Back" className="w-full h-48 object-contain rounded-lg mb-2" />
                        <button type="button" onClick={() => { setValidIdBack(null); setValidIdBackPreview(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : <CreditCard className="w-10 h-10 text-gray-400 mb-2" />}
                    <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition duration-200 flex items-center text-sm font-medium">
                      <Upload className="w-4 h-4 mr-2" />{validIdBackPreview ? 'Change ID Back' : 'Upload ID Back'}
                      <input type="file" accept="image/*" onChange={handleValidIdBackChange} className="hidden" />
                    </label>
                  </div>
                </div>
                {errors.validIdBack && <p className="text-red-500 text-sm mt-1">{errors.validIdBack}</p>}
              </div>
            </div>

            {errors.submit && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}

            <button type="button" onClick={handleSubmit} disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg text-base">
              {loading ? 'Creating Seller Account...' : 'Create Seller Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;