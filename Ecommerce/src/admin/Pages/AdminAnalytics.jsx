import React, { useState, useEffect } from 'react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─── Mini Horizontal Bar Chart Component ────────────────────────────────────
const HorizontalBar = ({ label, value, maxValue, color, suffix = '', prefix = '' }) => {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 truncate max-w-[55%]">{label}</span>
        <span className="text-sm font-bold text-gray-900 ml-2">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Vertical Bar (Column) Chart ─────────────────────────────────────────────
const VerticalBarChart = ({ data, valueKey, labelKey, color, prefix = '', suffix = '' }) => {
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
  const chartH = 200;

  const formatLabel = (val) => {
    if (prefix === '₱') {
      if (val >= 1000) return `₱${(val / 1000).toFixed(1)}k`;
      return `₱${val.toLocaleString()}`;
    }
    return `${prefix}${val.toLocaleString()}${suffix}`;
  };

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height: chartH }}>
        {data.map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const pct = (val / max) * 100;
          const barHeight = (pct / 100) * (chartH - 32); // reserve 32px for label above bar
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end relative">
              {/* Value label on top */}
              {val > 0 && (
                <span
                  className="text-xs font-semibold text-gray-700 mb-1 text-center leading-tight"
                  style={{ fontSize: data.length > 6 ? '9px' : '11px' }}
                >
                  {formatLabel(val)}
                </span>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: barHeight,
                  minHeight: val > 0 ? 4 : 0,
                  backgroundColor: color,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-xs text-gray-500 truncate" title={d[labelKey]}>{d[labelKey]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
const DonutChart = ({ data }) => {
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const R = 72;
  const r = 44;
  const [hovered, setHovered] = useState(null);

  let cumulative = 0;
  const slices = data.map((d) => {
    const startAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const xi1 = cx + r * Math.cos(startAngle);
    const yi1 = cy + r * Math.sin(startAngle);
    const xi2 = cx + r * Math.cos(endAngle);
    const yi2 = cy + r * Math.sin(endAngle);
    const large = d.value > 50 ? 1 : 0;
    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi2} ${yi2}`,
      `A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1}`,
      'Z'
    ].join(' ');
    return { ...d, path };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            opacity={hovered === null || hovered === i ? 1 : 0.35}
            stroke="white"
            strokeWidth="2"
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fill="#111827" fontSize="15" fontWeight="700">
          {hovered !== null ? `${data[hovered].value}%` : `${data.length}`}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="11">
          {hovered !== null ? data[hovered].name : 'categories'}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Chart Type Toggle Button ─────────────────────────────────────────────────
const ChartTypeBtn = ({ current, value, label, setter }) => (
  <button
    onClick={() => setter(value)}
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      current === value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {label}
  </button>
);

// ─── Main AdminAnalytics Component ───────────────────────────────────────────
const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [paymentView, setPaymentView] = useState('summary');

  // Chart view states
  const [productChartType, setProductChartType] = useState('horizontal');
  const [sellerChartType, setSellerChartType] = useState('horizontal');
  const [categoryChartType, setCategoryChartType] = useState('donut');
  const [productSortBy, setProductSortBy] = useState('revenue');
  const [sellerSortBy, setSellerSortBy] = useState('revenue');
  const [productLimit, setProductLimit] = useState(5);
  const [sellerLimit, setSellerLimit] = useState(5);

  const [stats, setStats] = useState({
    totalRevenue: '0', revenueGrowth: '0', productsSold: 0,
    avgOrderValue: '0', avgOrderChange: '0', topCategory: 'N/A',
    sellerRevenue: '0', systemCommission: '0', shippingRevenue: '0',
    gcashRevenue: '0', gcashOrders: 0, paypalRevenue: '0',
    paypalOrders: 0, codRevenue: '0', codOrders: 0, totalOrders: 0
  });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [sellersPayment, setSellersPayment] = useState([]);
  const [paymentTransactions, setPaymentTransactions] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchSummary(), fetchSalesData(selectedYear), fetchCategoryData(),
          fetchTopProducts(), fetchTopSellers(), fetchSellersPayment(), fetchPaymentTransactions()
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
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
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
    const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/top-products?limit=10`);
    if (json.success && json.data) setTopProducts(json.data);
  };
  const fetchTopSellers = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/top-sellers?limit=10`);
      if (json.success && json.data) setTopSellers(json.data);
    } catch { setTopSellers([]); }
  };
  const fetchSellersPayment = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/sellers-by-payment`);
      if (json.success && json.data) setSellersPayment(json.data);
    } catch { setSellersPayment([]); }
  };
  const fetchPaymentTransactions = async () => {
    try {
      const json = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/payment-transactions`);
      if (json.success && json.data) setPaymentTransactions(json.data);
    } catch { setPaymentTransactions([]); }
  };

  const formatCurrency = (v) => {
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(num || 0);
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

  // Filtered / sorted chart data
  const sortedProducts = [...topProducts]
    .sort((a, b) => productSortBy === 'revenue'
      ? parseFloat(b.revenue) - parseFloat(a.revenue)
      : b.sales - a.sales)
    .slice(0, productLimit);

  const sortedSellers = [...topSellers]
    .sort((a, b) => sellerSortBy === 'revenue'
      ? parseFloat(b.total_revenue) - parseFloat(a.total_revenue)
      : b.items_sold - a.items_sold)
    .slice(0, sellerLimit);

  const COLORS = {
    products: '#3b82f6',
    sellers: '#10b981',
  };

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {revenueGrowthNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${revenueGrowthNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {revenueGrowthNum >= 0 ? '▲' : '▼'} {Math.abs(revenueGrowthNum).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.totalOrders} orders</p>
        </div>

        {/* Seller Revenue */}
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

        {/* System Commission */}
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

        {/* Products Sold */}
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
          {[
            { label: 'GCash', orders: stats.gcashOrders, revenue: stats.gcashRevenue, color: '#3b82f6' },
            { label: 'PayPal', orders: stats.paypalOrders, revenue: stats.paypalRevenue, color: '#6366f1' },
            { label: 'COD', orders: stats.codOrders, revenue: stats.codRevenue, color: '#f59e0b' },
          ].map((pm) => (
            <div key={pm.label} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-900">{pm.label}</span>
                <span className="text-sm text-gray-500">{pm.orders} orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(pm.revenue)}</p>
              <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{
                  width: `${stats.totalOrders > 0 ? (pm.orders / stats.totalOrders) * 100 : 0}%`,
                  backgroundColor: pm.color
                }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalOrders > 0 ? ((pm.orders / stats.totalOrders) * 100).toFixed(1) : 0}% of orders
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Sales Analysis</h2>
          <div className="flex gap-3">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-4 py-2 border rounded-lg text-sm">
              {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
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
                <span>{selectedMetric === 'orders' ? maxValue : `₱${(maxValue / 1000).toFixed(0)}k`}</span>
                <span>{selectedMetric === 'orders' ? Math.round(maxValue * 0.5) : `₱${((maxValue * 0.5) / 1000).toFixed(0)}k`}</span>
                <span>{selectedMetric === 'orders' ? '0' : '₱0'}</span>
              </div>
              <div className="ml-12 h-full flex items-end justify-between gap-1.5 border-b border-l border-gray-200 pb-8 pl-2">
                {salesData.map((d, i) => {
                  const value = d[selectedMetric] || 0;
                  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {selectedMetric === 'orders' ? value : formatCurrency(value)}
                      </div>
                      <div className="relative w-full flex items-end justify-center" style={{ height: chartHeight - 40 }}>
                        <div className="w-full bg-blue-600 rounded-t-md group-hover:bg-blue-500 transition-colors" style={{ height: `${pct}%`, minHeight: value > 0 ? '2px' : '0' }} />
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

      {/* ── CHARTS: Top Products, Top Sellers, Categories ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex gap-1">
              <ChartTypeBtn current={productChartType} value="horizontal" label="Bar" setter={setProductChartType} />
              <ChartTypeBtn current={productChartType} value="vertical" label="Column" setter={setProductChartType} />
            </div>
            <select
              value={productSortBy}
              onChange={e => setProductSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
            >
              <option value="revenue">By Revenue</option>
              <option value="sales">By Units Sold</option>
            </select>
            <select
              value={productLimit}
              onChange={e => setProductLimit(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>

          {sortedProducts.length > 0 ? (
            <>
              {productChartType === 'horizontal' && sortedProducts.map((p, i) => (
                <HorizontalBar
                  key={i}
                  label={p.name}
                  value={productSortBy === 'revenue' ? parseFloat(p.revenue) : p.sales}
                  maxValue={productSortBy === 'revenue'
                    ? Math.max(...sortedProducts.map(x => parseFloat(x.revenue)))
                    : Math.max(...sortedProducts.map(x => x.sales))}
                  color={COLORS.products}
                  prefix={productSortBy === 'revenue' ? '₱' : ''}
                  suffix={productSortBy === 'sales' ? ' units' : ''}
                />
              ))}
              {productChartType === 'vertical' && (
                <VerticalBarChart
                  data={sortedProducts.map(p => ({ ...p, revenue: parseFloat(p.revenue), name: p.name }))}
                  valueKey={productSortBy === 'revenue' ? 'revenue' : 'sales'}
                  labelKey="name"
                  color={COLORS.products}
                  prefix={productSortBy === 'revenue' ? '₱' : ''}
                  suffix={productSortBy === 'sales' ? ' units' : ''}
                />
              )}
              <p className="text-xs text-gray-400 text-center mt-4 pt-3 border-t border-gray-100">
                Showing {sortedProducts.length} products · sorted by {productSortBy}
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">No product data available</p>
          )}
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sellers</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex gap-1">
              <ChartTypeBtn current={sellerChartType} value="horizontal" label="Bar" setter={setSellerChartType} />
              <ChartTypeBtn current={sellerChartType} value="vertical" label="Column" setter={setSellerChartType} />
            </div>
            <select
              value={sellerSortBy}
              onChange={e => setSellerSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
            >
              <option value="revenue">By Revenue</option>
              <option value="items">By Items Sold</option>
            </select>
            <select
              value={sellerLimit}
              onChange={e => setSellerLimit(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>

          {sortedSellers.length > 0 ? (
            <>
              {sellerChartType === 'horizontal' && sortedSellers.map((s, i) => (
                <HorizontalBar
                  key={i}
                  label={s.seller_name}
                  value={sellerSortBy === 'revenue' ? parseFloat(s.total_revenue) : s.items_sold}
                  maxValue={sellerSortBy === 'revenue'
                    ? Math.max(...sortedSellers.map(x => parseFloat(x.total_revenue)))
                    : Math.max(...sortedSellers.map(x => x.items_sold))}
                  color={COLORS.sellers}
                  prefix={sellerSortBy === 'revenue' ? '₱' : ''}
                  suffix={sellerSortBy === 'items' ? ' items' : ''}
                />
              ))}
              {sellerChartType === 'vertical' && (
                <VerticalBarChart
                  data={sortedSellers.map(s => ({
                    ...s,
                    total_revenue: parseFloat(s.total_revenue),
                    name: s.seller_name
                  }))}
                  valueKey={sellerSortBy === 'revenue' ? 'total_revenue' : 'items_sold'}
                  labelKey="name"
                  color={COLORS.sellers}
                  prefix={sellerSortBy === 'revenue' ? '₱' : ''}
                  suffix={sellerSortBy === 'items' ? ' items' : ''}
                />
              )}
              <p className="text-xs text-gray-400 text-center mt-4 pt-3 border-t border-gray-100">
                Showing {sortedSellers.length} sellers · sorted by {sellerSortBy}
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">No seller data available</p>
          )}
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <ChartTypeBtn current={categoryChartType} value="donut" label="Donut" setter={setCategoryChartType} />
            <ChartTypeBtn current={categoryChartType} value="horizontal" label="Bar" setter={setCategoryChartType} />
            <ChartTypeBtn current={categoryChartType} value="vertical" label="Column" setter={setCategoryChartType} />
          </div>

          {categoryData.length > 0 ? (
            <>
              {categoryChartType === 'donut' && <DonutChart data={categoryData} />}
              {categoryChartType === 'horizontal' && categoryData.map((cat, i) => (
                <HorizontalBar
                  key={i}
                  label={cat.name}
                  value={cat.value}
                  maxValue={100}
                  color={cat.color || '#8b5cf6'}
                  suffix="%"
                />
              ))}
              {categoryChartType === 'vertical' && (
                <VerticalBarChart
                  data={categoryData}
                  valueKey="value"
                  labelKey="name"
                  color="#8b5cf6"
                  suffix="%"
                />
              )}
              <p className="text-xs text-gray-400 text-center mt-4 pt-3 border-t border-gray-100">
                {categoryData.length} categories · by % of items sold this month
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">No category data available</p>
          )}
        </div>
      </div>

      {/* Payment Tracking */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Tracking</h3>
          <p className="text-sm text-gray-500">Track all GCash and PayPal payments with transaction IDs</p>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setPaymentView('summary')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${paymentView === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Summary by Seller
          </button>
          <button
            onClick={() => setPaymentView('transactions')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${paymentView === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            All Transactions ({paymentTransactions.length})
          </button>
        </div>

        {paymentView === 'summary' && (
          sellersPayment.length > 0 ? (
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
                        <p className="text-sm font-medium text-gray-900">{seller.seller_name}</p>
                        <p className="text-xs text-gray-500">{seller.seller_email}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.gcash_orders > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                          {seller.gcash_orders}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-medium ${parseFloat(seller.gcash_revenue) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {formatCurrency(seller.gcash_revenue)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${seller.paypal_orders > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                          {seller.paypal_orders}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-medium ${parseFloat(seller.paypal_revenue) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {formatCurrency(seller.paypal_revenue)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center bg-blue-50">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900">
                          {seller.total_orders}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right bg-blue-50">
                        <span className="text-sm font-bold text-blue-900">{formatCurrency(seller.total_revenue)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">No seller payment data available</p>
              <p className="text-gray-400 text-sm mt-1">Data will appear once sellers have delivered orders</p>
            </div>
          )
        )}

        {paymentView === 'transactions' && (
          paymentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment Intent ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Capture ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentTransactions.map((txn, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-4"><span className="font-mono text-sm font-medium text-gray-900">{txn.order_number}</span></td>
                      <td className="px-4 py-4 text-right"><span className="text-sm font-semibold text-gray-900">{formatCurrency(txn.total_amount)}</span></td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.payment_method === 'gcash' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {txn.payment_method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4"><span className="font-mono text-xs text-gray-600 block truncate max-w-xs">{txn.payment_intent_id}</span></td>
                      <td className="px-4 py-4">
                        {txn.payment_capture_id
                          ? <span className="font-mono text-xs text-green-600 block truncate max-w-xs">{txn.payment_capture_id}</span>
                          : <span className="text-xs text-gray-400">N/A</span>}
                      </td>
                      <td className="px-4 py-4"><span className="text-xs text-gray-600">{new Date(txn.order_date).toLocaleDateString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">No payment transactions found</p>
              <p className="text-gray-400 text-sm mt-1">GCash and PayPal transactions will appear here</p>
            </div>
          )
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