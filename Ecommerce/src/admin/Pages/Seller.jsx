import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  User, Mail, Phone, MapPin, Crown, Trash2, RefreshCw, Search, X,
  CheckCircle, XCircle, Clock, FileText, Eye, UserPlus, Filter,
  ShieldOff, ShieldCheck, Store, Pencil
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// const API_BASE_URL = '/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [blockingUserId, setBlockingUserId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false, title: '', message: '', onConfirm: null, type: 'danger'
  });
  const [actionMenuUserId, setActionMenuUserId] = useState(null);

  const navigate = useNavigate();

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`);
      setSelectedUser(response.data.user || response.data);
      setShowUserModal(true);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // ── Block / Unblock ───────────────────────────────────────────────────────

  const toggleBlockUser = (userId, currentStatus) => {
    const isBlocking = currentStatus !== 'blocked';
    setConfirmDialog({
      open: true,
      type: isBlocking ? 'danger' : 'success',
      title: isBlocking ? 'Block Account' : 'Unblock Account',
      message: isBlocking
        ? 'This will prevent the user from logging in and accessing the platform.'
        : "This will restore the user's access to the platform.",
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setBlockingUserId(userId);
        try {
          await axios.patch(`${API_BASE_URL}/users/${userId}/approval`, {
            approval_status: isBlocking ? 'blocked' : 'approved'
          });
          await fetchUsers();
          if (showUserModal && selectedUser?.id === userId) {
            const res = await axios.get(`${API_BASE_URL}/users/${userId}`);
            setSelectedUser(res.data.user || res.data);
          }
        } catch (err) {
          console.error('Error toggling block:', err);
          setError(err.response?.data?.error || 'Failed to update account status');
        } finally {
          setBlockingUserId(null);
        }
      }
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteUser = (userId) => {
    setConfirmDialog({
      open: true,
      type: 'danger',
      title: 'Delete User',
      message: 'This action cannot be undone. All user data including products and orders will be permanently removed.',
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        try {
          await axios.delete(`${API_BASE_URL}/users/${userId}`);
          fetchUsers();
          if (showUserModal && selectedUser?.id === userId) setShowUserModal(false);
        } catch (err) {
          console.error('Error deleting user:', err);
          setError(err.response?.data?.error || 'Failed to delete user');
        }
      }
    });
  };

  // ── Filters ───────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.store_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.approval_status === filterStatus;
    const matchesRole   = filterRole   === 'all' || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalUsers   = users.length;
  const totalSellers = users.filter(u => u.role === 'seller').length;
  const totalBuyers  = users.filter(u => u.role === 'buyer').length;
  const blockedCount = users.filter(u => u.approval_status === 'blocked').length;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

  const getStatusBadge = (status) => {
    const badges = {
      pending:  { color: 'bg-orange-500 text-white', icon: Clock,       text: 'Pending'  },
      approved: { color: 'bg-green-500 text-white',  icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500 text-white',    icon: XCircle,     text: 'Rejected' },
      blocked:  { color: 'bg-gray-700 text-white',   icon: ShieldOff,   text: 'Blocked'  },
    };
    const badge = badges[status] || badges.approved;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  useEffect(() => { fetchUsers(); }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.closest('[data-action-menu]')) return;
      setActionMenuUserId(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto" />
          <span className="mt-4 text-orange-800 font-medium block">Loading users...</span>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
              onClick={() => navigate('/admin/add-seller')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Add New Seller
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users',   value: totalUsers,   color: 'text-orange-900', bg: 'bg-orange-100', icon: <User className="w-6 h-6 text-orange-600" /> },
            { label: 'Total Sellers', value: totalSellers, color: 'text-orange-600', bg: 'bg-orange-100', icon: <Store className="w-6 h-6 text-orange-600" /> },
            { label: 'Total Buyers',  value: totalBuyers,  color: 'text-green-600',  bg: 'bg-green-100',  icon: <CheckCircle className="w-6 h-6 text-green-600" /> },
            { label: 'Blocked',       value: blockedCount, color: 'text-gray-700',   bg: 'bg-gray-100',   icon: <ShieldOff className="w-6 h-6 text-gray-600" /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-md border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border border-orange-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <Crown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                className="pl-12 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer min-w-[150px]">
                <option value="all">All Roles</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-12 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer min-w-[160px]">
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <button onClick={fetchUsers}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-md">
              <RefreshCw className="w-5 h-5" />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
          {(searchTerm || filterRole !== 'all' || filterStatus !== 'all') && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="text-blue-600 hover:text-blue-800">×</button>
                </span>
              )}
              {filterRole !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                  Role: {filterRole}
                  <button onClick={() => setFilterRole('all')} className="text-purple-600 hover:text-purple-800">×</button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('all')} className="text-amber-600 hover:text-amber-800">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearchTerm(''); setFilterRole('all'); setFilterStatus('all'); }}
                className="ml-2 text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Clear all
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Users Table */}
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
          <div className="bg-white rounded-2xl shadow-md border border-orange-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Store</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const isBlocked = user.approval_status === 'blocked';
                  const isSeller  = user.role === 'seller';
                  return (
                    <tr key={user.id} className={`${isBlocked ? 'bg-gray-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2
                            ${isBlocked ? 'ring-gray-300 bg-gray-100' : 'ring-orange-100 bg-gradient-to-br from-orange-100 to-orange-200'}`}>
                            {user.profile_image
                              ? <img src={user.profile_image} alt={user.full_name}
                                  className={`w-full h-full object-cover ${isBlocked ? 'grayscale' : ''}`} />
                              : <User className={`w-6 h-6 ${isBlocked ? 'text-gray-400' : 'text-orange-600'}`} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          <Crown className="w-3 h-3 mr-1" />
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(user.approval_status)}
                      </td>
                      <td className="px-4 py-4 truncate max-w-[220px]">
                        <span className="text-xs text-gray-600">{user.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-600">{user.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-600 truncate max-w-[180px]">{user.store_name || '—'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-600">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="px-4 py-4 text-right" data-action-menu>
                        <div className="relative inline-block">
                          <button
                            type="button"
                            data-action-menu
                            onClick={(e) => { e.stopPropagation(); setActionMenuUserId(actionMenuUserId === user.id ? null : user.id); }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                          >
                            <span className="text-lg leading-none">⋮</span>
                            <span className="sr-only">Open actions</span>
                          </button>

                          {actionMenuUserId === user.id && (
                            <div
                              data-action-menu
                              className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-20"
                            >
                              <button
                                onClick={() => { setActionMenuUserId(null); fetchUser(user.id); }}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Eye className="w-4 h-4" /> View
                                </span>
                              </button>
                              {isSeller && (
                                <button
                                  onClick={() => { setActionMenuUserId(null); navigate(`/admin/users/edit/${user.id}`); }}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Pencil className="w-4 h-4" /> Edit
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => { setActionMenuUserId(null); toggleBlockUser(user.id, user.approval_status); }}
                                disabled={blockingUserId === user.id}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="inline-flex items-center gap-2">
                                  {blockingUserId === user.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : isBlocked ? (
                                    <ShieldCheck className="w-4 h-4" />
                                  ) : (
                                    <ShieldOff className="w-4 h-4" />
                                  )}
                                  {isBlocked ? 'Unblock' : 'Block'}
                                </span>
                              </button>
                              <button
                                onClick={() => { setActionMenuUserId(null); deleteUser(user.id); }}
                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── User Details Modal ──────────────────────────────────────────────── */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

            <div className={`sticky top-0 p-6 rounded-t-3xl ${selectedUser.approval_status === 'blocked' ? 'bg-gray-700' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">User Details</h3>
                  {selectedUser.approval_status === 'blocked' && (
                    <span className="text-gray-300 text-sm flex items-center gap-1 mt-0.5">
                      <ShieldOff className="w-4 h-4" /> This account is currently blocked
                    </span>
                  )}
                </div>
                <button onClick={() => setShowUserModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Profile */}
              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-4 ring-4
                  ${selectedUser.approval_status === 'blocked' ? 'ring-gray-200 bg-gray-100' : 'ring-orange-100 bg-gradient-to-br from-orange-100 to-orange-200'}`}>
                  {selectedUser.profile_image
                    ? <img src={selectedUser.profile_image} alt={selectedUser.full_name}
                        className={`w-full h-full object-cover ${selectedUser.approval_status === 'blocked' ? 'grayscale' : ''}`} />
                    : <User className={`w-12 h-12 ${selectedUser.approval_status === 'blocked' ? 'text-gray-400' : 'text-orange-600'}`} />}
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-1">{selectedUser.full_name}</h4>
                {selectedUser.role === 'seller' && selectedUser.store_name && (
                  <p className="text-orange-600 font-medium flex items-center justify-center gap-1 mb-2">
                    <Store className="w-4 h-4" />{selectedUser.store_name}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4 mr-1" />
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                  {getStatusBadge(selectedUser.approval_status)}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-500" />Email
                  </label>
                  <p className="text-gray-900 text-sm break-all">{selectedUser.email}</p>
                </div>
                {selectedUser.phone && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-500" />Phone
                    </label>
                    <p className="text-gray-900 text-sm">{selectedUser.phone}</p>
                  </div>
                )}
                {selectedUser.address && (
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-500" />Address
                    </label>
                    <p className="text-gray-900 text-sm">{selectedUser.address}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Joined</label>
                  <p className="text-gray-900 text-sm">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Updated</label>
                  <p className="text-gray-900 text-sm">{formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>

              {/* Seller Documents */}
              {selectedUser.role === 'seller' && (selectedUser.proof_document || selectedUser.valid_id_front || selectedUser.valid_id_back) && (
                <div className="space-y-4 mb-6">
                  <h5 className="text-lg font-bold text-gray-900">Verification Documents</h5>
                  {selectedUser.proof_document && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Barangay Certificate / Proof of Residence</label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img src={selectedUser.proof_document} alt="Proof document" className="w-full h-auto rounded-lg" />
                        <a href={selectedUser.proof_document} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                          <FileText className="w-4 h-4 mr-1" />View Full Document
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedUser.valid_id_front && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Valid ID (Front)</label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img src={selectedUser.valid_id_front} alt="Valid ID Front" className="w-full h-auto rounded-lg" />
                        <a href={selectedUser.valid_id_front} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                          <FileText className="w-4 h-4 mr-1" />View Full Image
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedUser.valid_id_back && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Valid ID (Back)</label>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <img src={selectedUser.valid_id_back} alt="Valid ID Back" className="w-full h-auto rounded-lg" />
                        <a href={selectedUser.valid_id_back} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
                          <FileText className="w-4 h-4 mr-1" />View Full Image
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">

                {/* Edit button — sellers only */}
                {selectedUser.role === 'seller' && (
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      navigate(`/admin/users/edit/${selectedUser.id}`);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg">
                    <Pencil className="w-5 h-5" /> Edit Account
                  </button>
                )}

                {/* Block / Unblock */}
                <button
                  onClick={() => toggleBlockUser(selectedUser.id, selectedUser.approval_status)}
                  disabled={blockingUserId === selectedUser.id}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium shadow-lg disabled:opacity-50
                    ${selectedUser.approval_status === 'blocked'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'}`}>
                  {blockingUserId === selectedUser.id
                    ? <RefreshCw className="w-5 h-5 animate-spin" />
                    : selectedUser.approval_status === 'blocked'
                      ? <><ShieldCheck className="w-5 h-5" /> Unblock Account</>
                      : <><ShieldOff  className="w-5 h-5" /> Block Account</>}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteUser(selectedUser.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg">
                  <Trash2 className="w-5 h-5" /> Delete
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ──────────────────────────────────────────────────── */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-green-100'}`}>
              {confirmDialog.type === 'danger'
                ? <ShieldOff className="w-6 h-6 text-red-600" />
                : <ShieldCheck className="w-6 h-6 text-green-600" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-500 text-sm text-center mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog({ open: false })}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium">
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-all font-medium ${confirmDialog.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;
