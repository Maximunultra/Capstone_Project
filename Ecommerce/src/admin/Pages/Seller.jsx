import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, MapPin, Crown, Trash2, RefreshCw, Search, X, CheckCircle, XCircle, Clock, FileText, Eye, UserPlus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const navigate = useNavigate();

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

  const updateApprovalStatus = async (userId, status) => {
    try {
      await axios.patch(`http://localhost:5000/api/users/${userId}/approval`, {
        approval_status: status
      });
      alert(`Seller ${status} successfully!`);
      fetchUsers();
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

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`);
      alert('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to delete user';
      alert(`Error: ${errorMessage}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || user.approval_status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'pending').length;
  const approvedSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'approved').length;
  const rejectedSellersCount = users.filter(u => u.role === 'seller' && u.approval_status === 'rejected').length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-orange-500 text-white', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-500 text-white', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500 text-white', icon: XCircle, text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
          <span className="mt-4 text-orange-800 font-medium block">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-orange-900 mb-2">User Management</h1>
              <p className="text-orange-700">Manage your registered users and sellers</p>
            </div>
            <button
              onClick={() => navigate('/register')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Add New User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-orange-900">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Sellers</p>
                <p className="text-3xl font-bold text-orange-600">{pendingSellersCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved Sellers</p>
                <p className="text-3xl font-bold text-green-600">{approvedSellersCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rejected Sellers</p>
                <p className="text-3xl font-bold text-red-600">{rejectedSellersCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border border-orange-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Role Filter */}
            <div className="relative">
              <Crown className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-500" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-12 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-12 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-md"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterRole !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
                setFilterStatus('all');
              }}
              className="mt-4 text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-red-700 font-medium">{error}</p>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-orange-100">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm || filterStatus !== 'all' || filterRole !== 'all' 
                ? 'No users found matching your filters.' 
                : 'No users found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <div 
                key={user.id} 
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-orange-100 hover:border-orange-300"
              >
                <div className="flex items-start gap-4">
                  {/* Profile Image */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0 ring-2 ring-orange-100">
                    {user.profile_image ? (
                      <img 
                        src={user.profile_image} 
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-orange-600" />
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 truncate">{user.full_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                            <Crown className="w-3 h-3 mr-1" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                          {user.role === 'seller' && getStatusBadge(user.approval_status)}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.address && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                          <span className="truncate">{user.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-gray-500 mb-3">
                      Joined {formatDate(user.created_at)}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => fetchUser(user.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm font-medium shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>

                      {user.role === 'seller' && user.approval_status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateApprovalStatus(user.id, 'approved')}
                            className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 text-sm font-medium shadow-md"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateApprovalStatus(user.id, 'rejected')}
                            className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium shadow-md"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => deleteUser(user.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Profile Section */}
              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mx-auto mb-4 ring-4 ring-orange-100">
                  {selectedUser.profile_image ? (
                    <img 
                      src={selectedUser.profile_image} 
                      alt={selectedUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-orange-600" />
                  )}
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedUser.full_name}</h4>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4 mr-1" />
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                  {selectedUser.role === 'seller' && getStatusBadge(selectedUser.approval_status)}
                </div>
              </div>
              
              {/* User Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-orange-500" />
                    Email
                  </label>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                
                {selectedUser.phone && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-orange-500" />
                      Phone
                    </label>
                    <p className="text-gray-900">{selectedUser.phone}</p>
                  </div>
                )}
                
                {selectedUser.address && (
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                      Address
                    </label>
                    <p className="text-gray-900">{selectedUser.address}</p>
                  </div>
                )}
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Created</label>
                  <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Updated</label>
                  <p className="text-gray-900">{formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>

              {/* Seller Documents */}
              {selectedUser.role === 'seller' && (selectedUser.proof_document || selectedUser.valid_id_front || selectedUser.valid_id_back) && (
                <div className="space-y-4 mb-6">
                  <h5 className="text-lg font-bold text-gray-900">Verification Documents</h5>
                  
                  {selectedUser.proof_document && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Barangay Certificate / Proof of Residence
                      </label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img 
                          src={selectedUser.proof_document} 
                          alt="Proof document"
                          className="w-full h-auto rounded-lg"
                        />
                        <a 
                          href={selectedUser.proof_document} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Full Document
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedUser.valid_id_front && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Valid ID (Front)
                      </label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img 
                          src={selectedUser.valid_id_front} 
                          alt="Valid ID Front"
                          className="w-full h-auto rounded-lg"
                        />
                        <a 
                          href={selectedUser.valid_id_front} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Full Image
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedUser.valid_id_back && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Valid ID (Back)
                      </label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img 
                          src={selectedUser.valid_id_back} 
                          alt="Valid ID Back"
                          className="w-full h-auto rounded-lg"
                        />
                        <a 
                          href={selectedUser.valid_id_back} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Full Image
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Actions */}
              {selectedUser.role === 'seller' && selectedUser.approval_status === 'pending' && (
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => updateApprovalStatus(selectedUser.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Seller
                  </button>
                  <button
                    onClick={() => updateApprovalStatus(selectedUser.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Seller
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;