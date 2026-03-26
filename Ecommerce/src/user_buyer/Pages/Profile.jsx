import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Edit2, Save, X, FileText, Calendar, Shield, AlertCircle, Camera, Loader2, Lock, Eye, EyeOff, KeyRound, AtSign } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError]               = useState(null);
  const [fieldErrors, setFieldErrors]   = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing]       = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const [showPasswordSection, setShowPasswordSection]   = useState(false);
  const [savingPassword, setSavingPassword]             = useState(false);
  const [passwordSuccess, setPasswordSuccess]           = useState('');
  const [passwordError, setPasswordError]               = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors]   = useState({});
  const [showCurrentPassword, setShowCurrentPassword]   = useState(false);
  const [showNewPassword, setShowNewPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword]   = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const user   = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  const [profileData, setProfileData] = useState({
    full_name: '', email: '', username: '', phone: '', address: '', birthdate: '',
    role: '', profile_image: '', proof_document: '', valid_id_front: '',
    valid_id_back: '', approval_status: '', created_at: '', updated_at: ''
  });

  const [editedData, setEditedData] = useState({
    full_name: '', email: '', username: '', phone: '', address: '', birthdate: ''
  });

  const getMaxBirthdate = () => { const d = new Date(); d.setFullYear(d.getFullYear()-18); return d.toISOString().split('T')[0]; };
  const getMinBirthdate = () => { const d = new Date(); d.setFullYear(d.getFullYear()-120); return d.toISOString().split('T')[0]; };

  useEffect(() => {
    if (userId) fetchUserProfile();
    else { setError('No user logged in'); setLoading(false); }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch user profile');
      const u = await res.json();
      const d = {
        full_name: u.full_name || '', email: u.email || '', username: u.username || '',
        phone: u.phone || '', address: u.address || '',
        birthdate: u.birthdate ? u.birthdate.split('T')[0] : '',
        role: u.role || '', profile_image: u.profile_image || '',
        proof_document: u.proof_document || '', valid_id_front: u.valid_id_front || '',
        valid_id_back: u.valid_id_back || '', approval_status: u.approval_status || '',
        created_at: u.created_at || '', updated_at: u.updated_at || ''
      };
      setProfileData(d);
      setEditedData({ full_name: d.full_name, email: d.email, username: d.username, phone: d.phone, address: d.address, birthdate: d.birthdate });
      localStorage.setItem('user', JSON.stringify(u));
    } catch (err) { setError('Failed to load profile'); }
    finally { setLoading(false); }
  };

  // ── Image ──────────────────────────────────────────────────────────────────

  const handleImageClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only image files are allowed'); return; }
    if (file.size > 5*1024*1024) { setError('Image must be smaller than 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingImage(true); setError(null);
    try {
      const fd = new FormData(); fd.append('image', file);
      const token = localStorage.getItem('token');
      const upRes = await fetch(`${API_BASE_URL}/users/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
      if (!upRes.ok) { const e = await upRes.json(); throw new Error(e.error || 'Upload failed'); }
      const { imageUrl } = await upRes.json();
      const putRes = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ profile_image: imageUrl }) });
      if (!putRes.ok) { const e = await putRes.json(); throw new Error(e.error || 'Failed to save image'); }
      const updated = await putRes.json();
      setProfileData(prev => ({ ...prev, profile_image: updated.profile_image }));
      setImagePreview(null);
      localStorage.setItem('user', JSON.stringify(updated));
      setSuccessMessage('Profile photo updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message || 'Failed to upload image'); setImagePreview(null); }
    finally { setUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  // ── Profile fields ─────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setEditedData(prev => ({ ...prev, phone: digits }));
      if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
      return;
    }
    if (name === 'username') {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
      setEditedData(prev => ({ ...prev, username: cleaned }));
      if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }));
      return;
    }
    setEditedData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleEdit   = () => { setIsEditing(true); setError(null); setSuccessMessage(''); setFieldErrors({}); };
  const handleCancel = () => {
    setEditedData({ full_name: profileData.full_name, email: profileData.email, username: profileData.username, phone: profileData.phone, address: profileData.address, birthdate: profileData.birthdate });
    setIsEditing(false); setError(null); setSuccessMessage(''); setFieldErrors({});
  };

  const validateFields = () => {
    const e = {};
    if (!editedData.full_name.trim()) e.full_name = 'Full name is required';
    if (!editedData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(editedData.email)) e.email = 'Please enter a valid email';
    if (editedData.username) {
      if (editedData.username.length < 3) e.username = 'Username must be at least 3 characters';
      else if (editedData.username.length > 30) e.username = 'Username must be 30 characters or less';
      else if (!/^[a-z0-9_]+$/.test(editedData.username)) e.username = 'Only lowercase letters, numbers, and underscores';
    }
    if (editedData.phone) {
      if (editedData.phone.length !== 11) e.phone = 'Phone number must be exactly 11 digits';
      else if (!editedData.phone.startsWith('09')) e.phone = 'Phone number must start with 09';
    }
    if (editedData.birthdate) {
      const bd = new Date(editedData.birthdate), today = new Date();
      let age = today.getFullYear() - bd.getFullYear();
      const m = today.getMonth() - bd.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
      if (age < 18) e.birthdate = 'You must be at least 18 years old';
    }
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const errs = validateFields();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setSaving(true); setError(null); setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(editedData) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to update profile'); }
      const updated = await res.json();
      setProfileData(prev => ({ ...prev, ...updated, birthdate: updated.birthdate ? updated.birthdate.split('T')[0] : '' }));
      localStorage.setItem('user', JSON.stringify(updated));
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false); setFieldErrors({});
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  // ── Password ───────────────────────────────────────────────────────────────

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordFieldErrors[name]) setPasswordFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (passwordError) setPasswordError('');
  };

  const validatePasswordFields = () => {
    const errors = {};
    if (!passwordData.current_password) errors.current_password = 'Current password is required';
    if (!passwordData.new_password) { errors.new_password = 'New password is required'; }
    else {
      const pw = passwordData.new_password;
      if (pw.length < 8)              errors.new_password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(pw))     errors.new_password = 'Password must contain at least 1 capital letter';
      else if (!/[0-9]/.test(pw))     errors.new_password = 'Password must contain at least 1 number';
      else if (!/[^A-Za-z0-9]/.test(pw)) errors.new_password = 'Password must contain at least 1 special character';
      else if (pw === passwordData.current_password) errors.new_password = 'New password must be different from your current password';
    }
    if (!passwordData.confirm_password) errors.confirm_password = 'Please confirm your new password';
    else if (passwordData.new_password !== passwordData.confirm_password) errors.confirm_password = 'Passwords do not match';
    return errors;
  };

  const handlePasswordSave = async (ev) => {
    ev.preventDefault();
    const errs = validatePasswordFields();
    if (Object.keys(errs).length > 0) { setPasswordFieldErrors(errs); return; }
    setSavingPassword(true); setPasswordError(''); setPasswordSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}/change-password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ current_password: passwordData.current_password, new_password: passwordData.new_password }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to change password'); }
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordFieldErrors({});
      setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false);
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => { setPasswordSuccess(''); setShowPasswordSection(false); }, 3000);
    } catch (err) { setPasswordError(err.message || 'Failed to change password'); }
    finally { setSavingPassword(false); }
  };

  const handleCancelPassword = () => {
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    setPasswordFieldErrors({}); setPasswordError(''); setPasswordSuccess('');
    setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false);
    setShowPasswordSection(false);
  };

  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let s = 0;
    if (pw.length >= 8)  s++; if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { level: 1, label: 'Weak',       color: 'bg-red-400' };
    if (s <= 2) return { level: 2, label: 'Fair',       color: 'bg-orange-400' };
    if (s <= 3) return { level: 3, label: 'Good',       color: 'bg-yellow-400' };
    if (s <= 4) return { level: 4, label: 'Strong',     color: 'bg-green-400' };
    return             { level: 5, label: 'Very Strong',color: 'bg-green-600' };
  };
  const passwordStrength = getPasswordStrength(passwordData.new_password);

  const formatDate = (ds) => { if (!ds) return 'N/A'; return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };

  const getStatusBadge = (status) => {
    const badges = {
      pending:  { color: 'bg-orange-100 text-orange-700 border-orange-200', text: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-700 border-green-200',   text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200',         text: 'Rejected' }
    };
    const b = badges[status] || badges.pending;
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${b.color}`}>{b.text}</span>;
  };

  const getUsernameStatus = () => {
    if (!editedData.username) return null;
    return (editedData.username.length >= 3 && /^[a-z0-9_]+$/.test(editedData.username)) ? 'valid' : 'invalid';
  };

  const displayImage = imagePreview || profileData.profile_image;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#5c5042] mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
      </div>
    </div>
  );

  if (!userId) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><X className="w-8 h-8 text-red-600" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Logged In</h2>
        <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#5c5042] text-white rounded-lg hover:bg-[#4a3f35] transition">Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">View and manage your account information</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0"><X className="w-3 h-3 text-white" /></div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center ring-4 ring-orange-100 shadow-lg">
                    {displayImage
                      ? <img src={displayImage} alt={profileData.full_name} className={`w-full h-full object-cover transition-opacity ${uploadingImage ? 'opacity-50' : 'opacity-100'}`} />
                      : <User className={`w-16 h-16 text-orange-600 ${uploadingImage ? 'opacity-30' : ''}`} />
                    }
                    {uploadingImage && <div className="absolute inset-0 flex items-center justify-center rounded-full"><Loader2 className="w-8 h-8 text-orange-600 animate-spin" /></div>}
                  </div>
                  <button type="button" onClick={handleImageClick} disabled={!isEditing || uploadingImage}
                    title={isEditing ? "Change profile photo" : "Click Edit Profile to change your photo"}
                    className={`absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-white ${isEditing ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-110 text-white cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'}`}>
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
                <p className="text-xs text-gray-400 mb-3">{uploadingImage ? 'Uploading...' : isEditing ? 'Click camera icon to update photo' : 'Click Edit Profile to change photo'}</p>
                <h2 className="text-2xl font-bold text-gray-900 mb-0.5">{profileData.full_name}</h2>
                {profileData.username && (
                  <p className="text-sm text-orange-500 font-medium mb-1 flex items-center justify-center gap-1">
                    <AtSign className="w-3.5 h-3.5" />{profileData.username}
                  </p>
                )}
                <p className="text-gray-600 text-sm mb-3">{profileData.email}</p>
                <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                  <Shield className="w-4 h-4 mr-1" />{profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
                </span>
              </div>

              {profileData.role === 'seller' && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Status</label>
                  {getStatusBadge(profileData.approval_status)}
                  {profileData.approval_status === 'pending' && <p className="text-xs text-gray-600 mt-2">Your seller account is pending admin approval.</p>}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 space-y-3">
                {profileData.birthdate && <div><label className="flex items-center text-sm font-semibold text-gray-700 mb-1"><Calendar className="w-4 h-4 mr-2 text-orange-500" />Birthdate</label><p className="text-sm text-gray-600">{formatDate(profileData.birthdate)}</p></div>}
                <div><label className="flex items-center text-sm font-semibold text-gray-700 mb-1"><Calendar className="w-4 h-4 mr-2 text-orange-500" />Member Since</label><p className="text-sm text-gray-600">{formatDate(profileData.created_at)}</p></div>
                <div><label className="flex items-center text-sm font-semibold text-gray-700 mb-1"><Calendar className="w-4 h-4 mr-2 text-orange-500" />Last Updated</label><p className="text-sm text-gray-600">{formatDate(profileData.updated_at)}</p></div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Profile Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                {!isEditing && (
                  <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md font-medium">
                    <Edit2 className="w-4 h-4" />Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Full Name */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2"><User className="w-4 h-4 mr-2 text-orange-500" />Full Name {isEditing && <span className="text-red-500 ml-1">*</span>}</label>
                    {isEditing ? (
                      <>
                        <input type="text" name="full_name" value={editedData.full_name} onChange={handleInputChange} required
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.full_name ? 'border-red-400' : 'border-gray-300'}`} />
                        {fieldErrors.full_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</p>}
                      </>
                    ) : <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.full_name}</div>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2"><Mail className="w-4 h-4 mr-2 text-orange-500" />Email {isEditing && <span className="text-red-500 ml-1">*</span>}</label>
                    {isEditing ? (
                      <>
                        <input type="email" name="email" value={editedData.email} onChange={handleInputChange} required
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`} />
                        {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                      </>
                    ) : <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.email}</div>}
                  </div>

                  {/* ── Username ── */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <AtSign className="w-4 h-4 mr-2 text-orange-500" />Username
                      <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
                    </label>
                    {isEditing ? (
                      <>
                        <input type="text" name="username" value={editedData.username} onChange={handleInputChange} maxLength={30} placeholder="your_username"
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                            fieldErrors.username ? 'border-red-400 bg-red-50'
                            : getUsernameStatus() === 'valid' ? 'border-green-400 bg-green-50'
                            : 'border-gray-300'
                          }`} />
                        {editedData.username.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            <div className={`flex items-center gap-1 text-xs ${editedData.username.length >= 3 ? 'text-green-600' : 'text-red-500'}`}><span>{editedData.username.length >= 3 ? '✓' : '✗'}</span><span>At least 3 characters ({editedData.username.length}/30)</span></div>
                            <div className={`flex items-center gap-1 text-xs ${/^[a-z0-9_]+$/.test(editedData.username) ? 'text-green-600' : 'text-red-500'}`}><span>{/^[a-z0-9_]+$/.test(editedData.username) ? '✓' : '✗'}</span><span>Only lowercase letters, numbers, underscores</span></div>
                          </div>
                        )}
                        {fieldErrors.username
                          ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.username}</p>
                          : !editedData.username && <p className="text-gray-400 text-xs mt-1">Used to log in. Leave blank to keep current.</p>}
                      </>
                    ) : (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {profileData.username
                          ? <span className="flex items-center gap-1 text-orange-600 font-medium"><AtSign className="w-3.5 h-3.5" />{profileData.username}</span>
                          : <span className="text-gray-400 italic">Not set</span>}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2"><Phone className="w-4 h-4 mr-2 text-orange-500" />Phone Number</label>
                    {isEditing ? (
                      <>
                        <input type="tel" name="phone" value={editedData.phone} onChange={handleInputChange} inputMode="numeric" maxLength={11} placeholder="09XXXXXXXXX"
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                        {fieldErrors.phone ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.phone}</p> : <p className="text-gray-400 text-xs mt-1">Format: 09XXXXXXXXX (11 digits)</p>}
                      </>
                    ) : <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.phone || 'Not provided'}</div>}
                  </div>

                  {/* Birthdate */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2"><Calendar className="w-4 h-4 mr-2 text-orange-500" />Birthdate</label>
                    {isEditing ? (
                      <>
                        <input type="date" name="birthdate" value={editedData.birthdate} onChange={handleInputChange} min={getMinBirthdate()} max={getMaxBirthdate()}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${fieldErrors.birthdate ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                        {fieldErrors.birthdate ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors.birthdate}</p> : <p className="text-gray-400 text-xs mt-1">Must be at least 18 years old</p>}
                      </>
                    ) : <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.birthdate ? formatDate(profileData.birthdate) : 'Not provided'}</div>}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2"><MapPin className="w-4 h-4 mr-2 text-orange-500" />Address</label>
                    {isEditing
                      ? <input type="text" name="address" value={editedData.address} onChange={handleInputChange} placeholder="Optional" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" />
                      : <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">{profileData.address || 'Not provided'}</div>}
                  </div>
                </div>

                {/* Seller Docs */}
                {profileData.role === 'seller' && (profileData.proof_document || profileData.valid_id_front || profileData.valid_id_back) && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-orange-500" />Verification Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[{label:'Barangay Certificate',url:profileData.proof_document},{label:'Valid ID (Front)',url:profileData.valid_id_front},{label:'Valid ID (Back)',url:profileData.valid_id_back}].filter(d=>d.url).map(doc=>(
                        <div key={doc.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">{doc.label}</label>
                          <div className="bg-white rounded-lg p-2 border border-gray-300">
                            <img src={doc.url} alt={doc.label} className="w-full h-40 object-cover rounded-lg" />
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm"><FileText className="w-4 h-4 mr-1" />View Full</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <button type="button" onClick={handleCancel} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium"><X className="w-4 h-4" />Cancel</button>
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium">
                      {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* ── Change Password ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden">
              <button onClick={() => { if (showPasswordSection) handleCancelPassword(); else setShowPasswordSection(true); }}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-orange-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0"><KeyRound className="w-4 h-4 text-orange-600" /></div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Change Password</p>
                    <p className="text-xs text-gray-500">Update your account password</p>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showPasswordSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPasswordSection && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="pt-4 space-y-4">
                    {passwordSuccess && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg></div><p className="text-green-800 text-sm font-medium">{passwordSuccess}</p></div>}
                    {passwordError  && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/><p className="text-red-700 text-sm font-medium">{passwordError}</p></div>}

                    <form onSubmit={handlePasswordSave} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Current */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input type={showCurrentPassword?'text':'password'} name="current_password" value={passwordData.current_password} onChange={handlePasswordInputChange} placeholder="Current password"
                              className={`w-full pl-3 pr-9 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${passwordFieldErrors.current_password?'border-red-400 bg-red-50':'border-gray-300'}`} />
                            <button type="button" onClick={()=>setShowCurrentPassword(p=>!p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showCurrentPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                          </div>
                          {passwordFieldErrors.current_password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{passwordFieldErrors.current_password}</p>}
                        </div>
                        {/* New */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">New Password <span className="text-red-500">*</span></label>
                          <p className="text-xs text-gray-400 mb-2">Min 8 · 1 capital · 1 number · 1 special</p>
                          <div className="relative">
                            <input type={showNewPassword?'text':'password'} name="new_password" value={passwordData.new_password} onChange={handlePasswordInputChange} placeholder="New password"
                              className={`w-full pl-3 pr-9 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${passwordFieldErrors.new_password?'border-red-400 bg-red-50':'border-gray-300'}`} />
                            <button type="button" onClick={()=>setShowNewPassword(p=>!p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showNewPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                          </div>
                          {passwordData.new_password && (
                            <div className="mt-2">
                              <div className="flex gap-1 mb-1">{[1,2,3,4,5].map(i=><div key={i} className={`h-1 flex-1 rounded-full transition-all ${i<=passwordStrength.level?passwordStrength.color:'bg-gray-200'}`}/>)}</div>
                              <p className={`text-xs font-medium ${passwordStrength.level<=1?'text-red-500':passwordStrength.level<=2?'text-orange-500':passwordStrength.level<=3?'text-yellow-600':'text-green-600'}`}>{passwordStrength.label}</p>
                            </div>
                          )}
                          {passwordFieldErrors.new_password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{passwordFieldErrors.new_password}</p>}
                        </div>
                        {/* Confirm */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input type={showConfirmPassword?'text':'password'} name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordInputChange} placeholder="Confirm password"
                              className={`w-full pl-3 pr-9 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${passwordFieldErrors.confirm_password?'border-red-400 bg-red-50':passwordData.confirm_password&&passwordData.new_password===passwordData.confirm_password?'border-green-400 bg-green-50':'border-gray-300'}`} />
                            <button type="button" onClick={()=>setShowConfirmPassword(p=>!p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirmPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                          </div>
                          {passwordFieldErrors.confirm_password
                            ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{passwordFieldErrors.confirm_password}</p>
                            : passwordData.confirm_password && passwordData.new_password===passwordData.confirm_password
                              ? <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Passwords match</p>
                              : null}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={handleCancelPassword} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium text-sm"><X className="w-4 h-4"/>Cancel</button>
                        <button type="submit" disabled={savingPassword} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium text-sm">
                          {savingPassword ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving...</> : <><Lock className="w-4 h-4"/>Update Password</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;