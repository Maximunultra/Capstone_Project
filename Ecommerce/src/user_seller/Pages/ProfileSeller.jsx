import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Edit2, Save, X, FileText, Calendar, Shield, AlertCircle } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const ProfileSeller = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  const [profileData, setProfileData] = useState({
    full_name: '', email: '', phone: '', address: '', birthdate: '',
    role: '', profile_image: '', proof_document: '', valid_id_front: '',
    valid_id_back: '', approval_status: '', created_at: '', updated_at: ''
  });

  const [editedData, setEditedData] = useState({
    full_name: '', email: '', phone: '', address: '', birthdate: ''
  });

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

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    } else {
      setError('No user logged in');
      setLoading(false);
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const userData = await response.json();

      setProfileData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        birthdate: userData.birthdate ? userData.birthdate.split('T')[0] : '',
        role: userData.role || '',
        profile_image: userData.profile_image || '',
        proof_document: userData.proof_document || '',
        valid_id_front: userData.valid_id_front || '',
        valid_id_back: userData.valid_id_back || '',
        approval_status: userData.approval_status || '',
        created_at: userData.created_at || '',
        updated_at: userData.updated_at || ''
      });

      setEditedData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        birthdate: userData.birthdate ? userData.birthdate.split('T')[0] : ''
      });

      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // ✅ Phone: digits only, max 11
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) {
        setEditedData(prev => ({ ...prev, phone: digitsOnly }));
      }
      if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
      return;
    }

    setEditedData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccessMessage('');
    setFieldErrors({});
  };

  const handleCancel = () => {
    setEditedData({
      full_name: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
      address: profileData.address,
      birthdate: profileData.birthdate
    });
    setIsEditing(false);
    setError(null);
    setSuccessMessage('');
    setFieldErrors({});
  };

  // ✅ Validate before saving
  const validateFields = () => {
    const newErrors = {};

    if (!editedData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!editedData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editedData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // ✅ Phone: 11 digits, starts with 09
    if (editedData.phone) {
      if (editedData.phone.length !== 11) {
        newErrors.phone = 'Phone number must be exactly 11 digits';
      } else if (!editedData.phone.startsWith('09')) {
        newErrors.phone = 'Phone number must start with 09 (e.g. 09XXXXXXXXX)';
      }
    }

    // ✅ Birthdate: at least 18
    if (editedData.birthdate) {
      const birthDate = new Date(editedData.birthdate);
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

  const handleSave = async (e) => {
    e.preventDefault();

    const validationErrors = validateFields();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setProfileData(prev => ({ ...prev, ...updatedUser, birthdate: updatedUser.birthdate ? updatedUser.birthdate.split('T')[0] : '' }));
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setFieldErrors({});
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // ✅ Phone validation status
  const getPhoneStatus = () => {
    if (!editedData.phone) return null;
    if (editedData.phone.length === 11 && editedData.phone.startsWith('09')) return 'valid';
    return 'invalid';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-orange-100 text-orange-700 border-orange-200', text: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-700 border-green-200', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', text: 'Rejected' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5c5042] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Logged In</h2>
          <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#5c5042] text-white rounded-lg hover:bg-[#4a3f35] transition">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">View and manage your account information</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-white" />
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
              <div className="text-center mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mx-auto mb-4 ring-4 ring-orange-100 shadow-lg">
                  {profileData.profile_image ? (
                    <img src={profileData.profile_image} alt={profileData.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-orange-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{profileData.full_name}</h2>
                <p className="text-gray-600 text-sm mb-3">{profileData.email}</p>
                <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                  <Shield className="w-4 h-4 mr-1" />
                  {profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
                </span>
              </div>

              {/* Account Status for sellers */}
              {profileData.role === 'seller' && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Status</label>
                  {getStatusBadge(profileData.approval_status)}
                  {profileData.approval_status === 'pending' && (
                    <p className="text-xs text-gray-600 mt-2">Your seller account is pending admin approval.</p>
                  )}
                </div>
              )}

              {/* Account Dates */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                {/* ✅ Show birthdate in sidebar */}
                {profileData.birthdate && (
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                      Birthdate
                    </label>
                    <p className="text-sm text-gray-600">{formatDate(profileData.birthdate)}</p>
                  </div>
                )}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                    Member Since
                  </label>
                  <p className="text-sm text-gray-600">{formatDate(profileData.created_at)}</p>
                </div>
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-600">{formatDate(profileData.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Full Name */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 mr-2 text-orange-500" />
                      Full Name {isEditing && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="full_name"
                          value={editedData.full_name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.full_name ? 'border-red-400' : 'border-gray-300'}`}
                          required
                        />
                        {fieldErrors.full_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</p>}
                      </>
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.full_name}</div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Mail className="w-4 h-4 mr-2 text-orange-500" />
                      Email {isEditing && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="email"
                          name="email"
                          value={editedData.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                          required
                        />
                        {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                      </>
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.email}</div>
                    )}
                  </div>

                  {/* ✅ Phone with live validation */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="w-4 h-4 mr-2 text-orange-500" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <>
                        <div className="relative">
                          <input
                            type="tel"
                            name="phone"
                            value={editedData.phone}
                            onChange={handleInputChange}
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="09XXXXXXXXX"
                            className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                              fieldErrors.phone
                                ? 'border-red-400 bg-red-50'
                                : getPhoneStatus() === 'valid'
                                ? 'border-green-400 bg-green-50'
                                : 'border-gray-300'
                            }`}
                          />
                          <span className={`absolute right-3 top-3 text-xs font-semibold ${editedData.phone.length === 11 ? 'text-green-600' : 'text-gray-400'}`}>
                            {editedData.phone.length}/11
                          </span>
                        </div>
                        {editedData.phone.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            <div className={`flex items-center gap-1 text-xs ${editedData.phone.startsWith('09') ? 'text-green-600' : 'text-red-500'}`}>
                              <span>{editedData.phone.startsWith('09') ? '✓' : '✗'}</span>
                              <span>Starts with 09</span>
                            </div>
                            <div className={`flex items-center gap-1 text-xs ${editedData.phone.length === 11 ? 'text-green-600' : 'text-red-500'}`}>
                              <span>{editedData.phone.length === 11 ? '✓' : '✗'}</span>
                              <span>Exactly 11 digits ({editedData.phone.length} entered)</span>
                            </div>
                          </div>
                        )}
                        {fieldErrors.phone && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{fieldErrors.phone}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {profileData.phone || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* ✅ Birthdate */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                      Birthdate
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="date"
                          name="birthdate"
                          value={editedData.birthdate}
                          onChange={handleInputChange}
                          min={getMinBirthdate()}
                          max={getMaxBirthdate()}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.birthdate ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                        />
                        {fieldErrors.birthdate && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{fieldErrors.birthdate}
                          </p>
                        )}
                        {!fieldErrors.birthdate && (
                          <p className="text-gray-400 text-xs mt-1">Must be at least 18 years old</p>
                        )}
                      </>
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {profileData.birthdate ? formatDate(profileData.birthdate) : 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Address - full width */}
                  <div className="md:col-span-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                      Address
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={editedData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {profileData.address || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller Documents Section */}
                {profileData.role === 'seller' && (profileData.proof_document || profileData.valid_id_front || profileData.valid_id_back) && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-orange-500" />
                      Verification Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profileData.proof_document && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Barangay Certificate</label>
                          <div className="bg-white rounded-lg p-2 border border-gray-300 overflow-hidden">
                            <img src={profileData.proof_document} alt="Proof document" className="w-full h-40 object-cover rounded-lg" />
                            <a href={profileData.proof_document} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                              <FileText className="w-4 h-4 mr-1" />View Full Document
                            </a>
                          </div>
                        </div>
                      )}
                      {profileData.valid_id_front && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Valid ID (Front)</label>
                          <div className="bg-white rounded-lg p-2 border border-gray-300 overflow-hidden">
                            <img src={profileData.valid_id_front} alt="Valid ID Front" className="w-full h-40 object-cover rounded-lg" />
                            <a href={profileData.valid_id_front} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                              <FileText className="w-4 h-4 mr-1" />View Full Image
                            </a>
                          </div>
                        </div>
                      )}
                      {profileData.valid_id_back && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Valid ID (Back)</label>
                          <div className="bg-white rounded-lg p-2 border border-gray-300 overflow-hidden">
                            <img src={profileData.valid_id_back} alt="Valid ID Back" className="w-full h-40 object-cover rounded-lg" />
                            <a href={profileData.valid_id_back} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                              <FileText className="w-4 h-4 mr-1" />View Full Image
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <button type="button" onClick={handleCancel} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium">
                      <X className="w-4 h-4" />Cancel
                    </button>
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium">
                      {saving ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Saving...</>
                      ) : (
                        <><Save className="w-4 h-4" />Save Changes</>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSeller;