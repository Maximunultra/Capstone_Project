import React, { useState, useEffect } from 'react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const LOG_LIMIT = 50;

const AdminActivityLogs = () => {
  const [logs,        setLogs       ] = useState([]);
  const [logsTotal,   setLogsTotal  ] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logCategory, setLogCategory] = useState('all');
  const [logRole,     setLogRole    ] = useState('all');
  const [logOffset,   setLogOffset  ] = useState(0);

  const token = () => localStorage.getItem('token');

  const fetchLogs = async (category = logCategory, role = logRole, offset = 0) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: LOG_LIMIT, offset });
      if (category !== 'all') params.set('category', category);
      if (role     !== 'all') params.set('role',     role);
      const res  = await fetch(`${API_BASE_URL}/admin/analytics/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
        setLogOffset(offset);
      }
    } catch (e) { console.error('Logs fetch error:', e); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => { fetchLogs('all', 'all', 0); }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track all platform actions by admins, sellers, and buyers</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter:</span>
        <select value={logCategory}
          onChange={e => { setLogCategory(e.target.value); fetchLogs(e.target.value, logRole, 0); }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
          <option value="all">All Categories</option>
          <option value="auth">Auth (Login/Register)</option>
          <option value="order">Orders</option>
          <option value="refund">Refunds</option>
          <option value="product">Products</option>
          <option value="user">Users</option>
        </select>
        <select value={logRole}
          onChange={e => { setLogRole(e.target.value); fetchLogs(logCategory, e.target.value, 0); }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="seller">Seller</option>
          <option value="buyer">Buyer</option>
        </select>
        {(logCategory !== 'all' || logRole !== 'all') && (
          <button onClick={() => { setLogCategory('all'); setLogRole('all'); fetchLogs('all', 'all', 0); }}
            className="text-xs text-blue-600 hover:underline">Reset</button>
        )}
        <span className="ml-auto text-xs text-gray-400">{logsTotal.toLocaleString()} total logs</span>
        <button onClick={() => fetchLogs(logCategory, logRole, logOffset)} disabled={logsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {logsLoading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-16">
            <p className="text-gray-400 text-sm">No activity logs found</p>
            <p className="text-gray-300 text-xs mt-1">Logs appear here as users interact with the platform</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, i) => {
                  const catColors  = { auth:'bg-green-100 text-green-800', order:'bg-blue-100 text-blue-800', refund:'bg-orange-100 text-orange-800', product:'bg-purple-100 text-purple-800', user:'bg-gray-100 text-gray-700' };
                  const roleColors = { admin:'bg-purple-100 text-purple-700', seller:'bg-blue-100 text-blue-700', buyer:'bg-green-100 text-green-700' };
                  const actionIcon = { refund_approved:'✅', refund_rejected:'❌', refund_submitted:'📋', refund_return_confirmed:'📦', order_created:'🛒', order_cancelled:'❌', order_status_delivered:'✅', order_status_shipped:'🚚', user_registered:'👤', user_blocked:'🚫', user_unblocked:'✅', product_approved:'✅', product_rejected:'❌', product_created_approved:'📦', product_deleted:'🗑️' };
                  return (
                    <tr key={log.id || i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <p>{new Date(log.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric' })}</p>
                        <p className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{log.user?.full_name || 'System'}</p>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[log.role] || 'bg-gray-100 text-gray-600'}`}>{log.role || 'system'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${catColors[log.category] || 'bg-gray-100 text-gray-700'}`}>{log.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 whitespace-nowrap">{actionIcon[log.action] || '•'} {log.action?.replace(/_/g, ' ')}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="text-xs text-gray-700 truncate" title={log.description}>{log.description}</p>
                        {log.metadata?.amount && <p className="text-[10px] text-gray-400 mt-0.5">₱{parseFloat(log.metadata.amount).toFixed(2)}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logsTotal > LOG_LIMIT && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {logOffset + 1}–{Math.min(logOffset + LOG_LIMIT, logsTotal)} of {logsTotal.toLocaleString()} logs
            </p>
            <div className="flex gap-2">
              <button disabled={logOffset === 0}
                onClick={() => fetchLogs(logCategory, logRole, Math.max(0, logOffset - LOG_LIMIT))}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition">
                ← Previous
              </button>
              <button disabled={logOffset + LOG_LIMIT >= logsTotal}
                onClick={() => fetchLogs(logCategory, logRole, logOffset + LOG_LIMIT)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivityLogs;