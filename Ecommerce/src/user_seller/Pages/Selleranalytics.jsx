import React, { useState, useEffect } from 'react';

// API Base URL - Update this to your actual API endpoint
const API_BASE_URL = 'http://localhost:5000/api';

const SellerAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    productsSold: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
    topCategory: 'Electronics'
  });

  // Sample data for charts - Replace with real API data
  const [salesData] = useState([
    { month: 'Jan', revenue: 12500, orders: 45, customers: 38 },
    { month: 'Feb', revenue: 15800, orders: 52, customers: 45 },
    { month: 'Mar', revenue: 18200, orders: 64, customers: 56 },
    { month: 'Apr', revenue: 16900, orders: 58, customers: 51 },
    { month: 'May', revenue: 21300, orders: 72, customers: 65 },
    { month: 'Jun', revenue: 24500, orders: 85, customers: 74 },
    { month: 'Jul', revenue: 23800, orders: 81, customers: 71 },
    { month: 'Aug', revenue: 27600, orders: 95, customers: 83 },
    { month: 'Sep', revenue: 29200, orders: 102, customers: 89 },
    { month: 'Oct', revenue: 31500, orders: 110, customers: 96 },
    { month: 'Nov', revenue: 34800, orders: 125, customers: 108 },
    { month: 'Dec', revenue: 38900, orders: 142, customers: 122 }
  ]);

  const [categoryData] = useState([
    { name: 'Electronics', value: 45, color: '#3b82f6' },
    { name: 'Home & Living', value: 25, color: '#8b5cf6' },
    { name: 'Fashion', value: 18, color: '#ec4899' },
    { name: 'Accessories', value: 12, color: '#f59e0b' }
  ]);

  const [topProducts] = useState([
    { name: 'Wireless Headphones', sales: 342, revenue: 42870 },
    { name: 'Smart Watch Pro', sales: 289, revenue: 68950 },
    { name: 'USB-C Charger', sales: 256, revenue: 8960 },
    { name: 'Coffee Mug Set', sales: 198, revenue: 7920 },
    { name: 'Ceramic Vase', sales: 175, revenue: 8750 }
  ]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setStats({
        totalRevenue: 294900,
        revenueGrowth: 12.5,
        productsSold: 1131,
        avgOrderValue: 260.71,
        avgOrderChange: -3.2,
        topCategory: 'Electronics'
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    console.log('Exporting data...');
    alert('Export functionality - Connect to your backend to generate CSV/PDF');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate chart positions for bar chart
  const maxRevenue = Math.max(...salesData.map(d => d.revenue));
  const chartHeight = 300;

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          Track your business performance and key metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Revenue Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {stats.revenueGrowth}%
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Total Revenue
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              +{formatCurrency(stats.totalRevenue * 0.125)} from last period
            </p>
          </div>
        </div>

        {/* Products Sold Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Products Sold
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(stats.productsSold)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Across all categories
            </p>
          </div>
        </div>

        {/* Average Order Value Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              {Math.abs(stats.avgOrderChange)}%
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Avg Order Value
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.avgOrderValue)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Per transaction
            </p>
          </div>
        </div>

        {/* Top Category Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Top Category
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.topCategory}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              45% of total sales
            </p>
          </div>
        </div>
      </div>

      {/* Sales Analysis Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        {/* Chart Header */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Sales Analysis
            </h2>
            <p className="text-sm text-gray-600">
              Monthly revenue performance overview
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="12months">Last 12 months</option>
              <option value="year">This year</option>
            </select>

            {/* Metric Selector */}
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
            </select>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>${(maxRevenue / 1000).toFixed(0)}k</span>
            <span>${(maxRevenue * 0.75 / 1000).toFixed(0)}k</span>
            <span>${(maxRevenue * 0.5 / 1000).toFixed(0)}k</span>
            <span>${(maxRevenue * 0.25 / 1000).toFixed(0)}k</span>
            <span>$0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full flex items-end justify-between gap-2 border-b border-l border-gray-200 pb-8 pl-4">
            {salesData.map((data, index) => {
              const barHeight = (data.revenue / maxRevenue) * (chartHeight - 40);
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full flex items-end justify-center" style={{ height: chartHeight - 40 }}>
                    {/* Bar */}
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500 relative"
                      style={{ height: `${barHeight}px` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        {formatCurrency(data.revenue)}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* X-axis label */}
                  <span className="text-xs text-gray-600 mt-2 font-medium">{data.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center mt-6 gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">Revenue</span>
          </div>
        </div>
      </div>

      {/* Bottom Row - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Sales by Category
          </h3>
          
          {/* Progress Bars */}
          <div className="space-y-5">
            {categoryData.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm text-gray-700 font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{category.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${category.value}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Donut Chart Visual */}
          <div className="mt-8 flex justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="20"
                />
                {/* Segments */}
                {(() => {
                  let currentAngle = 0;
                  return categoryData.map((category, index) => {
                    const angle = (category.value / 100) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle = endAngle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    
                    const x1 = 50 + 40 * Math.cos(startRad);
                    const y1 = 50 + 40 * Math.sin(startRad);
                    const x2 = 50 + 40 * Math.cos(endRad);
                    const y2 = 50 + 40 * Math.sin(endRad);

                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                      <path
                        key={index}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={category.color}
                        opacity="0.9"
                      />
                    );
                  });
                })()}
                {/* Inner white circle to create donut */}
                <circle
                  cx="50"
                  cy="50"
                  r="25"
                  fill="white"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Top Selling Products
          </h3>
          <div className="space-y-0">
            {topProducts.map((product, index) => (
              <div
                key={index}
                className="py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 px-3 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-0.5">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.sales} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Loading analytics...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAnalytics;