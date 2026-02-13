import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';
// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const [stats, setStats] = useState({
    totalRevenue: '0',
    revenueGrowth: '0',
    productsSold: 0,
    avgOrderValue: '0',
    avgOrderChange: '0',
    topCategory: 'N/A',
    sellerRevenue: '0',
    systemCommission: '0',
    shippingRevenue: '0',
    gcashRevenue: '0',
    gcashOrders: 0,
    paypalRevenue: '0',
    paypalOrders: 0,
    codRevenue: '0',
    codOrders: 0,
    totalOrders: 0
  });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [sellersPayment, setSellersPayment] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchSummary(),
          fetchSalesData(selectedYear),
          fetchCategoryData(),
          fetchTopProducts(),
          fetchTopSellers(),
          fetchSellersPayment()
        ]);
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedYear]);

  const getAuthToken = () => localStorage.getItem('token');

  const fetchWithAuth = async (url) => {
    const token = getAuthToken();
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const fetchSummary = async () => {
    const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/summary`);
    if (json.success && json.stats) setStats(json.stats);
  };

  const fetchSalesData = async (year) => {
    const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/sales-by-month?year=${year}`);
    if (json.success && json.data) setSalesData(json.data);
  };

  const fetchCategoryData = async () => {
    const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/category-distribution`);
    if (json.success && json.data) setCategoryData(json.data);
  };

  const fetchTopProducts = async () => {
    const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/top-products?limit=5`);
    if (json.success && json.data) setTopProducts(json.data);
  };

  const fetchTopSellers = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/top-sellers?limit=5`);
      if (json.success && json.data) setTopSellers(json.data);
    } catch (e) {
      setTopSellers([]);
    }
  };

  const fetchSellersPayment = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/sellers-by-payment`);
      if (json.success && json.data) setSellersPayment(json.data);
    } catch (e) {
      console.error('Error fetching sellers payment:', e);
      setSellersPayment([]);
    }
  };

  const formatCurrency = (v) => {
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP', 
      maximumFractionDigits: 0 
    }).format(num || 0);
  };

  const formatNumber = (v) => {
    const num = typeof v === 'string' ? parseInt(v) : v;
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getMaxValue = () => {
    if (salesData.length === 0) return 1000;
    return Math.max(...salesData.map((d) => d[selectedMetric] || 0), 1);
  };

  const maxValue = getMaxValue();
  const chartHeight = 300;
  const revenueGrowthNum = parseFloat(stats.revenueGrowth) || 0;
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of platform performance and metrics</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Revenue Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {revenueGrowthNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${revenueGrowthNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {Math.abs(revenueGrowthNum).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.totalOrders} orders</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Seller Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.sellerRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">Paid to sellers</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">System Commission</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.systemCommission)}</p>
          <p className="text-xs text-gray-500 mt-2">Platform earnings</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Products Sold</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.productsSold)}</p>
          <p className="text-xs text-gray-500 mt-2">Total items</p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">GCash</span>
              <span className="text-sm text-gray-500">{stats.gcashOrders} orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.gcashRevenue)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">PayPal</span>
              <span className="text-sm text-gray-500">{stats.paypalOrders} orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paypalRevenue)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">COD</span>
              <span className="text-sm text-gray-500">{stats.codOrders} orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.codRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Analysis</h2>
          </div>
          <div className="flex gap-3">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-4 py-2 border rounded-lg">
              {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="revenue">Revenue</option>
              <option value="commission">Commission</option>
              <option value="orders">Orders</option>
            </select>
          </div>
        </div>
        <div className="relative" style={{ height: chartHeight }}>
          {salesData.length > 0 ? (
            <>
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400" style={{ width: 48 }}>
                <span>₱{(maxValue / 1000).toFixed(0)}k</span>
                <span>₱{((maxValue * 0.5) / 1000).toFixed(0)}k</span>
                <span>₱0</span>
              </div>
              <div className="ml-12 h-full flex items-end justify-between gap-1.5 border-b border-l border-gray-200 pb-8 pl-2">
                {salesData.map((d, i) => {
                  const value = d[selectedMetric] || 0;
                  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full flex items-end justify-center" style={{ height: chartHeight - 40 }}>
                        <div className="w-full bg-blue-600 rounded-t-md" style={{ height: `${pct}%`, minHeight: value > 0 ? '2px' : '0' }} />
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No data</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Categories</h3>
          {categoryData.length > 0 ? categoryData.map((cat, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm">{cat.name}</span>
                <span className="text-sm font-semibold">{cat.value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${cat.value}%`, backgroundColor: cat.color }} />
              </div>
            </div>
          )) : <p className="text-gray-500 text-sm">No data</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h3>
          {topProducts.length > 0 ? topProducts.map((p, i) => (
            <div key={i} className="py-3 border-b last:border-0">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatNumber(p.sales)} units</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(p.revenue)}</p>
              </div>
            </div>
          )) : <p className="text-gray-500 text-sm">No data</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Sellers</h3>
          {topSellers.length > 0 ? topSellers.map((s, i) => (
            <div key={i} className="py-3 border-b last:border-0">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">{s.seller_name}</p>
                  <p className="text-xs text-gray-500">{formatNumber(s.items_sold)} items</p>
                </div>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(s.total_revenue)}</p>
              </div>
            </div>
          )) : <p className="text-gray-500 text-sm">No data</p>}
        </div>
      </div>

      {/* Sellers Payment Method Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Seller Payment Breakdown</h3>
          <p className="text-sm text-gray-500">Orders and revenue by payment method for each seller</p>
        </div>

        {sellersPayment.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Seller</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">GCash Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">GCash Revenue</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">PayPal Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">PayPal Revenue</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-blue-50">Total Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-blue-50">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellersPayment.map((seller, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{seller.seller_name}</p>
                        <p className="text-xs text-gray-500">{seller.seller_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        seller.gcash_orders > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {seller.gcash_orders}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${
                        parseFloat(seller.gcash_revenue) > 0 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {formatCurrency(seller.gcash_revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        seller.paypal_orders > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {seller.paypal_orders}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${
                        parseFloat(seller.paypal_revenue) > 0 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {formatCurrency(seller.paypal_revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center bg-blue-50">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900">
                        {seller.total_orders}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right bg-blue-50">
                      <span className="text-sm font-bold text-blue-900">
                        {formatCurrency(seller.total_revenue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 font-medium">No seller payment data available</p>
            <p className="text-gray-400 text-sm mt-1">Data will appear once sellers have delivered orders</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;