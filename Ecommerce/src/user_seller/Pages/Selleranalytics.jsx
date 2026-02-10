import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

const SellerAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    productsSold: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
    topCategory: 'N/A'
  });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [productStock, setProductStock] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  // Get JWT token from localStorage
  const getAuthToken = () => {
    // This retrieves the token stored during login
    // Make sure your login component stores it as 'token'
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found in localStorage');
    }
    
    return token;
  };

  // ── fetch all four endpoints on mount / dateRange change ──
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchSummary(), 
          fetchSalesData(), 
          fetchCategoryData(), 
          fetchTopProducts(),
          fetchProductStock()
        ]);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dateRange]);

  const fetchWithAuth = async (url) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in.');
    }

    console.log('Fetching with token:', token.substring(0, 20) + '...');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('Access denied. Seller account required.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch data');
    }

    return response.json();
  };

  const fetchSummary = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/analytics/summary`);
      console.log('Summary data:', json);
      if (json.success) setStats(json.stats);
    } catch (e) {
      console.error('fetchSummary error:', e);
      throw e;
    }
  };

  const fetchSalesData = async () => {
    try {
      const year = new Date().getFullYear();
      const json = await fetchWithAuth(`${API_BASE_URL}/analytics/sales-by-month?year=${year}`);
      console.log('Sales data:', json);
      if (json.success) setSalesData(json.data);
    } catch (e) {
      console.error('fetchSalesData error:', e);
      throw e;
    }
  };

  const fetchCategoryData = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/analytics/category-distribution`);
      console.log('Category data:', json);
      if (json.success) setCategoryData(json.data);
    } catch (e) {
      console.error('fetchCategoryData error:', e);
      throw e;
    }
  };

  const fetchTopProducts = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/analytics/top-products?limit=5`);
      console.log('Top products data:', json);
      if (json.success) setTopProducts(json.data);
    } catch (e) {
      console.error('fetchTopProducts error:', e);
      throw e;
    }
  };

  const fetchProductStock = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/analytics/product-stock`);
      console.log('Product stock data:', json);
      if (json.success) {
        setProductStock(json.data);
        setStockSummary(json.summary);
      }
    } catch (e) {
      console.error('fetchProductStock error:', e);
      throw e;
    }
  };

  // ── helpers ──
  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v);

  const formatNumber = (v) => new Intl.NumberFormat('en-US').format(v);

  const maxRevenue = salesData.length ? Math.max(...salesData.map((d) => d.revenue)) : 1000;
  const chartHeight = 300;

  // derived booleans for badge display
  const revenueGrowthNum = parseFloat(stats.revenueGrowth) || 0;
  const avgOrderChangeNum = parseFloat(stats.avgOrderChange) || 0;

  // Error display
  if (error) {
    return (
      <div className="p-8 min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Analytics</h3>
                <p className="text-red-700 mb-4">{error}</p>
                {error.includes('log in') && (
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mr-2"
                  >
                    Go to Login
                  </button>
                )}
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Analytics Dashboard</h1>
        <p className="text-sm text-gray-500">Track your business performance and key metrics</p>
      </div>

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
                {Math.abs(revenueGrowthNum)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">My Total Revenue</p>
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
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">My Products Sold</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.productsSold)}</p>
          <p className="text-xs text-gray-500 mt-2">Across all categories</p>
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
                {Math.abs(avgOrderChangeNum)}%
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
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">My Top Category</p>
          <p className="text-3xl font-bold text-gray-900">{stats.topCategory}</p>
          <p className="text-xs text-gray-500 mt-2">
            {categoryData.length > 0 ? `${categoryData[0].value}% of my sales` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sales by Category */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">My Sales by Category</h3>

          {categoryData.length === 0 ? (
            <div className="text-center py-10">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-gray-500 text-sm">No category data available</p>
            </div>
          ) : (
            <>
              {/* progress bars */}
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

              {/* donut */}
              <div className="mt-8 flex justify-center">
                <div className="w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                    {(() => {
                      let angle = 0;
                      return categoryData.map((cat, i) => {
                        const slice = (cat.value / 100) * 360;
                        const startRad = (angle * Math.PI) / 180;
                        const endRad = ((angle + slice) * Math.PI) / 180;
                        const x1 = 50 + 40 * Math.cos(startRad);
                        const y1 = 50 + 40 * Math.sin(startRad);
                        const x2 = 50 + 40 * Math.cos(endRad);
                        const y2 = 50 + 40 * Math.sin(endRad);
                        const large = slice > 180 ? 1 : 0;
                        angle += slice;
                        return (
                          <path
                            key={i}
                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`}
                            fill={cat.color}
                            opacity="0.9"
                          />
                        );
                      });
                    })()}
                    <circle cx="50" cy="50" r="25" fill="white" />
                  </svg>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">My Top Selling Products</h3>

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
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-500">{formatNumber(product.sales)} units sold</p>
                          <span className="text-gray-300">•</span>
                          <p className={`text-xs font-medium ${
                            product.stockStatus === 'out_of_stock' ? 'text-red-600' :
                            product.stockStatus === 'low_stock' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {product.stock} in stock
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatCurrency(product.price)}/unit</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Product Stock Overview ── */}
      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Product Stock Overview</h3>
            <p className="text-sm text-gray-500">Monitor your inventory levels</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 font-medium">{stockSummary.outOfStock} Out of Stock</p>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-600 font-medium">{stockSummary.lowStock} Low Stock</p>
            </div>
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">Total Products</p>
            <p className="text-2xl font-bold text-blue-900">{stockSummary.totalProducts}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <p className="text-xs text-green-600 font-medium mb-1">Active Products</p>
            <p className="text-2xl font-bold text-green-900">{stockSummary.activeProducts}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
            <p className="text-xs text-amber-600 font-medium mb-1">Low Stock Alert</p>
            <p className="text-2xl font-bold text-amber-900">{stockSummary.lowStock}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <p className="text-xs text-purple-600 font-medium mb-1">Inventory Value</p>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(stockSummary.totalValue)}</p>
          </div>
        </div>

        {/* Product Stock Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productStock.slice(0, 10).map((product, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">ID: {product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className={`text-sm font-semibold ${
                      product.stockStatus === 'out_of_stock' ? 'text-red-600' :
                      product.stockStatus === 'low_stock' ? 'text-amber-600' :
                      'text-gray-900'
                    }`}>
                      {product.stock}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                      product.stockStatus === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {product.stockStatusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="text-sm text-gray-600">{formatNumber(product.totalSold)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {productStock.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 text-sm">No products found</p>
            </div>
          )}
        </div>

        {productStock.length > 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing 10 of {productStock.length} products
            </p>
          </div>
        )}
      </div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-gray-700 font-medium">Loading your analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAnalytics;