import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:5000/api';

const Profile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [userData, setUserData] = useState({
    id: '',
    full_name: '',
    email: '',
    role: '',
    phone: '',
    address: '',
    profile_image: '',
    created_at: ''
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        navigate('/login');
        return;
      }

      const userData = JSON.parse(user);
      
      // Fetch fresh user data from API
      const response = await fetch(`${API_BASE_URL}/users/${userData.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUserData(data);
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        password: ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.full_name || !formData.email) {
        setError('Full name and email are required');
        setSaving(false);
        return;
      }

      // Prepare update data
      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      };

      // Only include password if it's being changed
      if (formData.password && formData.password.trim() !== '') {
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setSaving(false);
          return;
        }
        updateData.password = formData.password;
      }

      // Update user via API
      const response = await fetch(`${API_BASE_URL}/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update localStorage with new user data
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const updatedUserData = {
        ...currentUser,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address
      };
      localStorage.setItem('user', JSON.stringify(updatedUserData));

      // Update local state
      setUserData(updatedUser);
      setFormData(prev => ({
        ...prev,
        password: '' // Clear password field after successful update
      }));

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setSaving(false);

      // Reload the page to update the navigation bar
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    setFormData({
      full_name: userData.full_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || '',
      password: ''
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5c5042] mx-auto"></div>
          <p className="mt-4 text-[#5c5042]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#5c5042] mb-2">My Profile</h1>
              <p className="text-gray-600">Manage your account information</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#a48a6d] text-white px-6 py-2 rounded shadow font-medium hover:bg-[#c08a4b] transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Profile Content */}
          {!isEditing ? (
            // View Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Full Name</label>
                  <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200">
                    {userData.full_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Email</label>
                  <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200">
                    {userData.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Role</label>
                  <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200 capitalize">
                    {userData.role}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Phone</label>
                  <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200">
                    {userData.phone || 'Not provided'}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5c5042] mb-2">Address</label>
                <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200">
                  {userData.address || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5c5042] mb-2">Member Since</label>
                <p className="text-gray-700 bg-gray-50 px-4 py-3 rounded border border-gray-200">
                  {formatDate(userData.created_at)}
                </p>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:border-[#c08a4b] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:border-[#c08a4b] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Role</label>
                  <input
                    type="text"
                    value={userData.role}
                    className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-100 capitalize cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5c5042] mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:border-[#c08a4b] transition"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5c5042] mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:border-[#c08a4b] transition resize-none"
                  placeholder="Enter your address"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5c5042] mb-2">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:border-[#c08a4b] transition"
                  placeholder="Enter new password (min 6 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#a48a6d] text-white px-6 py-3 rounded shadow font-medium hover:bg-[#c08a4b] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded shadow font-medium hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-[#5c5042] hover:text-[#c08a4b] font-medium transition inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;