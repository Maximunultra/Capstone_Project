import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

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
    topCategory: 'N/A'
  });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);

  // ── fetch all analytics on mount ──
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
          fetchTopSellers()
        ]);
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics data. Please check your backend connection.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedYear]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('Summary response:', json);
      if (json.success && json.stats) {
        setStats(json.stats);
      }
    } catch (e) {
      console.error('fetchSummary error:', e);
      throw e;
    }
  };

  const fetchSalesData = async (year) => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/sales-by-month?year=${year}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('Sales data response:', json);
      if (json.success && json.data) {
        setSalesData(json.data);
      }
    } catch (e) {
      console.error('fetchSalesData error:', e);
      throw e;
    }
  };

  const fetchCategoryData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/category-distribution`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('Category data response:', json);
      if (json.success && json.data) {
        setCategoryData(json.data);
      }
    } catch (e) {
      console.error('fetchCategoryData error:', e);
      throw e;
    }
  };

  const fetchTopProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/top-products?limit=5`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('Top products response:', json);
      if (json.success && json.data) {
        setTopProducts(json.data);
      }
    } catch (e) {
      console.error('fetchTopProducts error:', e);
      throw e;
    }
  };

  // ✅ NEW: Fetch top sellers for admin
  const fetchTopSellers = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;

      const res = await fetch(`${API_BASE_URL}/analytics/sellers/all?period_start=${periodStart}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('Top sellers response:', json);
      if (json.success && json.sellers) {
        setTopSellers(json.sellers);
      }
    } catch (e) {
      console.error('fetchTopSellers error:', e);
      // Don't throw - seller analytics is optional
      setTopSellers([]);
    }
  };

  // ── helpers ──
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

  // Calculate max for chart
  const getMaxValue = () => {
    if (salesData.length === 0) return 1000;
    return Math.max(...salesData.map((d) => d[selectedMetric] || 0), 1);
  };

  const maxValue = getMaxValue();
  const chartHeight = 300;

  // derived booleans for badge display
  const revenueGrowthNum = parseFloat(stats.revenueGrowth) || 0;
  const avgOrderChangeNum = parseFloat(stats.avgOrderChange) || 0;

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of all platform performance and metrics</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-red-600 hover:text-red-800 mt-1 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {revenueGrowthNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${revenueGrowthNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {revenueGrowthNum >= 0
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  }
                </svg>
                {Math.abs(revenueGrowthNum).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Platform Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {revenueGrowthNum >= 0 ? '+' : '−'} compared to last month
          </p>
        </div>

        {/* Products Sold */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Products Sold</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.productsSold)}</p>
          <p className="text-xs text-gray-500 mt-2">Total items sold</p>
        </div>

        {/* Avg Order Value */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            {avgOrderChangeNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${avgOrderChangeNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {avgOrderChangeNum >= 0
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  }
                </svg>
                {Math.abs(avgOrderChangeNum).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.avgOrderValue)}</p>
          <p className="text-xs text-gray-500 mt-2">Per transaction</p>
        </div>

        {/* Top Category */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Category</p>
          <p className="text-3xl font-bold text-gray-900">{stats.topCategory}</p>
          <p className="text-xs text-gray-500 mt-2">
            {categoryData.length > 0 ? `${categoryData[0].value}% of total sales` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* ── Sales Analysis Chart ── */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Platform Sales Analysis</h2>
            <p className="text-sm text-gray-500">Monthly revenue performance overview</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
            </select>
          </div>
        </div>

        {/* bar chart */}
        <div className="relative" style={{ height: chartHeight }}>
          {salesData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500 font-medium">No sales data available</p>
                <p className="text-gray-400 text-sm mt-1">Data will appear once orders are delivered</p>
              </div>
            </div>
          ) : (
            <>
              {/* Y labels */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 pr-2" style={{ width: 48 }}>
                <span>₱{(maxValue / 1000).toFixed(0)}k</span>
                <span>₱{((maxValue * 0.75) / 1000).toFixed(0)}k</span>
                <span>₱{((maxValue * 0.5) / 1000).toFixed(0)}k</span>
                <span>₱{((maxValue * 0.25) / 1000).toFixed(0)}k</span>
                <span>₱0</span>
              </div>

              {/* bars */}
              <div className="ml-12 h-full flex items-end justify-between gap-1.5 border-b border-l border-gray-200 pb-8 pl-2">
                {salesData.map((d, i) => {
                  const value = d[selectedMetric] || 0;
                  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full flex items-end justify-center" style={{ height: chartHeight - 40 }}>
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500 relative"
                          style={{ height: `${pct}%`, minHeight: value > 0 ? '2px' : '0' }}
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                            {selectedMetric === 'revenue' ? formatCurrency(value) : formatNumber(value)}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 font-medium">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center mt-5 gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-500 capitalize">{selectedMetric}</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Sales by Category */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales by Category</h3>

          {categoryData.length === 0 ? (
            <div className="text-center py-10">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-gray-500 text-sm">No category data available</p>
            </div>
          ) : (
            <div className="space-y-5">
              {categoryData.map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-700 font-medium">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{cat.value}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${cat.value}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Selling Products</h3>

          {topProducts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 text-sm">No product data available</p>
            </div>
          ) : (
            <div>
              {topProducts.map((product, i) => (
                <div key={i} className="py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 px-3 rounded-lg transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{formatNumber(product.sales)} units sold</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ NEW: Top Sellers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Sellers</h3>

          {topSellers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-sm">No seller data available</p>
              <p className="text-gray-400 text-xs mt-1">Seller analytics will appear once orders are delivered</p>
            </div>
          ) : (
            <div>
              {topSellers.slice(0, 5).map((seller, i) => (
                <div key={i} className="py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 px-3 rounded-lg transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xs font-semibold text-white">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {seller.users?.full_name || 'Unknown Seller'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(seller.items_sold || 0)} items • {seller.total_orders || 0} orders
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(seller.total_revenue || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-gray-700 font-medium">Loading analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;