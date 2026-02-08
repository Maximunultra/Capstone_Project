import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, MapPin, Crown, Trash2, RefreshCw, Search, X, CheckCircle, XCircle, Clock, FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected
  const [filterRole, setFilterRole] = useState('all'); // all, buyer, seller

  const navigate = useNavigate();

  // Fetch all users using axios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to fetch users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single user using axios
  const fetchUser = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${userId}`);
      setSelectedUser(response.data.user || response.data);
      setShowUserModal(true);
    } catch (err) {
      console.error('Error fetching user:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to fetch user';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Approve or reject seller
  const updateApprovalStatus = async (userId, status) => {
    try {
      await axios.patch(`http://localhost:5000/api/users/${userId}/approval`, {
        approval_status: status
      });
      alert(`Seller ${status} successfully!`);
      fetchUsers(); // Refresh the list
      if (showUserModal) {
        setShowUserModal(false);
      }
    } catch (err) {
      console.error('Error updating approval status:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to update approval status';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Delete user using axios
  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`);
      alert('User deleted successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to delete user';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Filter users based on search term, status, and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || user.approval_status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Get counts for badges
  const pendingSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'pending').length;
  const approvedSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'approved').length;
  const rejectedSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'rejected').length;

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Users Management</h2>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800">Pending Sellers</div>
              <div className="text-2xl font-bold text-yellow-900">{pendingSellersCount}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-800">Approved Sellers</div>
              <div className="text-2xl font-bold text-green-900">{approvedSellersCount}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-800">Rejected Sellers</div>
              <div className="text-2xl font-bold text-red-900">{rejectedSellersCount}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Users List */}
        <div className="divide-y divide-gray-200">
          {filteredUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterRole !== 'all' 
                ? 'No users found matching your filters.' 
                : 'No users found.'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Profile Image */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {user.profile_image ? (
                        <img 
                          src={user.profile_image} 
                          alt={user.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    {/* User Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                        {user.role === 'seller' && getStatusBadge(user.approval_status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Crown className="w-4 h-4" />
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatDate(user.created_at)}
                    </span>
                    
                    {/* View Details Button */}
                    <button
                      onClick={() => fetchUser(user.id)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Approve Button - Only for pending sellers */}
                    {user.role === 'seller' && user.approval_status === 'pending' && (
                      <button
                        onClick={() => updateApprovalStatus(user.id, 'approved')}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Approve Seller"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Reject Button - Only for pending sellers */}
                    {user.role === 'seller' && user.approval_status === 'pending' && (
                      <button
                        onClick={() => updateApprovalStatus(user.id, 'rejected')}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Reject Seller"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => navigate(`/user-profile-edit/${user.id}`)}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V21h8" />
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Address */}
                {user.address && (
                  <div className="mt-2 ml-16 flex items-center space-x-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{user.address}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Image */}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mx-auto">
                    {selectedUser.profile_image ? (
                      <img 
                        src={selectedUser.profile_image} 
                        alt={selectedUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <h4 className="mt-2 font-semibold text-lg">{selectedUser.full_name}</h4>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-gray-600 capitalize">{selectedUser.role}</span>
                    {selectedUser.role === 'seller' && getStatusBadge(selectedUser.approval_status)}
                  </div>
                </div>
                
                {/* User Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  
                  {selectedUser.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedUser.phone}</p>
                    </div>
                  )}
                  
                  {selectedUser.address && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="text-gray-900">{selectedUser.address}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-gray-900">{formatDate(selectedUser.updated_at)}</p>
                  </div>
                </div>

                {/* Proof Document for Sellers */}
                {selectedUser.role === 'seller' && selectedUser.proof_document && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barangay Certificate / Proof of Residence
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <img 
                        src={selectedUser.proof_document} 
                        alt="Proof document"
                        className="w-full h-auto rounded-md"
                      />
                      <a 
                        href={selectedUser.proof_document} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Full Document
                      </a>
                    </div>
                  </div>
                )}

                {/* Approval Actions for Sellers */}
                {selectedUser.role === 'seller' && selectedUser.approval_status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => updateApprovalStatus(selectedUser.id, 'approved')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Seller
                    </button>
                    <button
                      onClick={() => updateApprovalStatus(selectedUser.id, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Seller
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;