import React, { useState, useEffect } from 'react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─── Date Range Utilities ─────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split("T")[0];
const lastDay = (y, m) => new Date(y, m + 1, 0);

const getPresetRange = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month":    return { startDate: fmt(new Date(y, m, 1)),     endDate: fmt(lastDay(y, m)) };
    case "last_month":    return { startDate: fmt(new Date(y, m-1, 1)),    endDate: fmt(lastDay(y, m-1)) };
    case "last_3_months": return { startDate: fmt(new Date(y, m-2, 1)),   endDate: fmt(lastDay(y, m)) };
    case "last_6_months": return { startDate: fmt(new Date(y, m-5, 1)),   endDate: fmt(lastDay(y, m)) };
    case "this_year":     return { startDate: fmt(new Date(y, 0, 1)),      endDate: fmt(new Date(y, 11, 31)) };
    default:              return { startDate: fmt(new Date(y, m, 1)),      endDate: fmt(lastDay(y, m)) };
  }
};

const PRESETS = [
  { key: "this_month",    label: "This Month" },
  { key: "last_month",    label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "last_6_months", label: "Last 6 Months" },
  { key: "this_year",     label: "This Year" },
  { key: "custom",        label: "Custom" },
];

// ─── Date Range Picker ────────────────────────────────────────────────────────
const DateRangePicker = ({ startDate, endDate, onRangeChange }) => {
  const [activePreset, setActivePreset] = useState("this_month");
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handlePreset = (key) => {
    setActivePreset(key);
    if (key === "custom") { setShowCustom(true); }
    else { setShowCustom(false); onRangeChange(getPresetRange(key)); }
  };

  return (
    <div className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Date Range:</span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => handlePreset(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePreset === p.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{p.label}</button>
          ))}
        </div>
        {!showCustom && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{startDate} → {endDate}</span>
        )}
      </div>
      {showCustom && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">From:</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">To:</label>
            <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => { if (customStart && customEnd && customStart <= customEnd) onRangeChange({ startDate: customStart, endDate: customEnd }); }}
            disabled={!customStart || !customEnd || customStart > customEnd}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Apply
          </button>
          {customStart && customEnd && (
            <span className="text-xs text-gray-400">{customStart} → {customEnd}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
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
        <div className="h-3 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ─── Vertical Bar Chart ───────────────────────────────────────────────────────
const VerticalBarChart = ({ data, valueKey, labelKey, color, prefix = '', suffix = '' }) => {
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
  const chartH = 200;
  const formatLabel = (val) => {
    if (prefix === '₱') return val >= 1000 ? `₱${(val / 1000).toFixed(1)}k` : `₱${val.toLocaleString()}`;
    return `${prefix}${val.toLocaleString()}${suffix}`;
  };
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height: chartH }}>
        {data.map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const barH = ((val / max) * (chartH - 32));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end relative">
              {val > 0 && (
                <span className="text-xs font-semibold text-gray-700 mb-1 text-center leading-tight"
                  style={{ fontSize: data.length > 6 ? '9px' : '11px' }}>{formatLabel(val)}</span>
              )}
              <div className="w-full rounded-t-md transition-all duration-500"
                style={{ height: barH, minHeight: val > 0 ? 4 : 0, backgroundColor: color }} />
            </div>
          );
        })}
      </div>
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

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ data }) => {
  const size = 190; const cx = size/2; const cy = size/2; const R = 72; const r = 44;
  const [hovered, setHovered] = useState(null);
  let cumulative = 0;
  const slices = data.map(d => {
    const sa = (cumulative/100)*2*Math.PI - Math.PI/2;
    cumulative += d.value;
    const ea = (cumulative/100)*2*Math.PI - Math.PI/2;
    const x1=cx+R*Math.cos(sa); const y1=cy+R*Math.sin(sa);
    const x2=cx+R*Math.cos(ea); const y2=cy+R*Math.sin(ea);
    const xi1=cx+r*Math.cos(sa); const yi1=cy+r*Math.sin(sa);
    const xi2=cx+r*Math.cos(ea); const yi2=cy+r*Math.sin(ea);
    const large = d.value > 50 ? 1 : 0;
    const path = [`M ${x1} ${y1}`,`A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,`L ${xi2} ${yi2}`,`A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1}`,'Z'].join(' ');
    return { ...d, path };
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {slices.map((s,i) => (
          <path key={i} d={s.path} fill={s.color} opacity={hovered===null||hovered===i?1:0.35}
            stroke="white" strokeWidth="2" className="transition-all duration-200 cursor-pointer"
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)} />
        ))}
        <text x={cx} y={cy-7} textAnchor="middle" fill="#111827" fontSize="15" fontWeight="700">
          {hovered!==null?`${data[hovered].value}%`:`${data.length}`}
        </text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#6b7280" fontSize="11">
          {hovered!==null?data[hovered].name:'categories'}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map((d,i) => (
          <div key={i} className="flex items-center gap-1.5 cursor-pointer"
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:d.color}} />
            <span className="text-xs text-gray-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartBtn = ({ current, value, label, setter }) => (
  <button onClick={() => setter(value)}
    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      current === value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}>{label}</button>
);

const StockBadge = ({ status, label }) => {
  const s = { out_of_stock:'bg-red-100 text-red-700', low_stock:'bg-amber-100 text-amber-700', in_stock:'bg-green-100 text-green-700' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s[status]||s.in_stock}`}>{label}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SellerAnalytics = () => {
  const initRange = getPresetRange("this_month");
  const [dateRange, setDateRange] = useState(initRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [salesGroupBy, setSalesGroupBy] = useState('month'); // 'month' | 'week' — must be before useEffect

  const [productChartType, setProductChartType] = useState('horizontal');
  const [productSortBy, setProductSortBy] = useState('revenue');
  const [productLimit, setProductLimit] = useState(5);
  const [productGroupBy, setProductGroupBy] = useState('month'); // 'month' | 'week'
  const [categoryChartType, setCategoryChartType] = useState('donut');
  const [stockFilter, setStockFilter] = useState('all');
  const [stockSortBy, setStockSortBy] = useState('stock');
  const [stockSearch, setStockSearch] = useState('');

  const [stats, setStats] = useState({
    totalRevenue: 0, revenueGrowth: 0, productsSold: 0,
    avgOrderValue: 0, avgOrderChange: 0, topCategory: 'N/A'
  });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [productStock, setProductStock] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0, activeProducts: 0, lowStock: 0, outOfStock: 0, totalValue: 0
  });

  const getAuthToken = () => localStorage.getItem('token');

  const fetchWithAuth = async (url) => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated. Please log in.');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (res.status === 401) { localStorage.removeItem('token'); throw new Error('Session expired. Please log in again.'); }
    if (res.status === 403) throw new Error('Access denied. Seller account required.');
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch data'); }
    return res.json();
  };

  // Single useEffect — dateParams built INSIDE the effect so deps are stable
  useEffect(() => {
    const dp = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
    const run = async () => {
      setLoading(true); setError(null);
      try {
        await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/analytics/summary?${dp}`)
            .then(j => { if (j.success) setStats(j.stats); })
            .catch(e => console.error('summary:', e)),
          fetchWithAuth(`${API_BASE_URL}/analytics/sales-by-period?groupBy=${salesGroupBy}&year=${selectedYear}&${dp}`)
            .then(j => { if (j.success && j.data) setSalesData(j.data); })
            .catch(() =>
              // Fallback to old endpoint name if new one not yet deployed
              fetchWithAuth(`${API_BASE_URL}/analytics/sales-by-month?year=${selectedYear}`)
                .then(j => { if (j.success && j.data) setSalesData(j.data); })
                .catch(e => console.error('sales-by-month fallback:', e))
            ),
          fetchWithAuth(`${API_BASE_URL}/analytics/category-distribution?${dp}`)
            .then(j => { if (j.success) setCategoryData(j.data); })
            .catch(e => console.error('category:', e)),
          fetchWithAuth(`${API_BASE_URL}/analytics/top-products?limit=10&${dp}`)
            .then(j => { if (j.success) setTopProducts(j.data); })
            .catch(e => console.error('top-products:', e)),
          fetchWithAuth(`${API_BASE_URL}/analytics/product-stock`)
            .then(j => { if (j.success) { setProductStock(j.data); setStockSummary(j.summary); } })
            .catch(e => console.error('product-stock:', e)),
        ]);
      } catch (err) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dateRange.startDate, dateRange.endDate, salesGroupBy, selectedYear]);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v || 0);
  const formatNumber = (v) => new Intl.NumberFormat('en-US').format(v || 0);

  const revenueGrowthNum = parseFloat(stats.revenueGrowth) || 0;
  const avgOrderChangeNum = parseFloat(stats.avgOrderChange) || 0;
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const chartHeight = 300;

  // ── Sales chart derived vars (must be before maxSalesValue) ──────
  const chartData    = salesData;
  const getBarLabel  = (d) => salesGroupBy === 'week' ? d.label : d.month;
  const isScrollable = salesGroupBy === 'week' && chartData.length > 12;
  const maxSalesValue = chartData.length ? Math.max(...chartData.map(d => d[selectedMetric] || 0), 1) : 1;

  const sortedProducts = [...topProducts]
    .sort((a, b) => productSortBy === 'revenue' ? parseFloat(b.revenue) - parseFloat(a.revenue) : b.sales - a.sales)
    .slice(0, productLimit);

  const filteredStock = productStock
    .filter(p => {
      if (stockFilter === 'low') return p.stockStatus === 'low_stock';
      if (stockFilter === 'out') return p.stockStatus === 'out_of_stock';
      return true;
    })
    .filter(p => stockSearch === '' || p.name.toLowerCase().includes(stockSearch.toLowerCase()))
    .sort((a, b) => {
      if (stockSortBy === 'name') return a.name.localeCompare(b.name);
      if (stockSortBy === 'price') return parseFloat(b.price) - parseFloat(a.price);
      return a.stock - b.stock;
    });

  const COLORS = { products: '#8b5cf6' };

  if (error) {
    return (
      <div className="p-8 min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-1">Error Loading Analytics</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Analytics Dashboard</h1>
        <p className="text-sm text-gray-500">Track your business performance and key metrics</p>
      </div>

{/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {revenueGrowthNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${revenueGrowthNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {revenueGrowthNum >= 0 ? '▲' : '▼'} {Math.abs(revenueGrowthNum)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">My Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">{revenueGrowthNum >= 0 ? '+' : '−'} vs prior period</p>
        </div>

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

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            {avgOrderChangeNum !== 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${avgOrderChangeNum >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {avgOrderChangeNum >= 0 ? '▲' : '▼'} {Math.abs(avgOrderChangeNum)}%
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.avgOrderValue)}</p>
          <p className="text-xs text-gray-500 mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">My Top Category</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{stats.topCategory}</p>
          <p className="text-xs text-gray-500 mt-2">
            {categoryData.length > 0 ? `${categoryData[0].value}% of my sales` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* ── Sales Chart ── */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">
              {salesGroupBy === 'month' ? `Monthly breakdown for ${selectedYear}` : `Weekly breakdown · ${dateRange.startDate} → ${dateRange.endDate}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Month / Week toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {[{ v: 'month', l: 'Month' }, { v: 'week', l: 'Week' }].map(opt => (
                <button key={opt.v} onClick={() => setSalesGroupBy(opt.v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    salesGroupBy === opt.v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>{opt.l}</button>
              ))}
            </div>
            {/* Year selector — only relevant in month view */}
            {salesGroupBy === 'month' && (
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="revenue">Revenue</option>
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
            </select>
          </div>
        </div>

        {/* Scrollable hint badge */}
        {isScrollable && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              {chartData.length} weeks · scroll horizontally to see all
            </span>
          </div>
        )}

        <div className="relative" style={{ height: chartHeight }}>
          {chartData.length > 0 ? (
            <>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 z-10 bg-white pr-1" style={{ width: 52 }}>
                <span>{selectedMetric === 'revenue' ? `₱${(maxSalesValue/1000).toFixed(0)}k` : maxSalesValue}</span>
                <span>{selectedMetric === 'revenue' ? `₱${(maxSalesValue*0.5/1000).toFixed(0)}k` : Math.round(maxSalesValue*0.5)}</span>
                <span>{selectedMetric === 'revenue' ? '₱0' : '0'}</span>
              </div>

              {/* Chart area — scrollable when many weeks */}
              <div className={`ml-14 h-full border-b border-l border-gray-200 pb-8 pl-2 ${isScrollable ? 'overflow-x-auto' : ''}`}>
                <div className={`h-full flex items-end justify-between gap-1.5 ${isScrollable ? `min-w-[${chartData.length * 36}px]` : ''}`}>
                  {chartData.map((d, i) => {
                    const value = d[selectedMetric] || 0;
                    const pct   = maxSalesValue > 0 ? (value / maxSalesValue) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative" style={isScrollable ? { minWidth: 32 } : {}}>
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          <span className="font-semibold">{getBarLabel(d)}</span><br />
                          {selectedMetric === 'revenue' ? formatCurrency(value) : value}
                        </div>
                        <div className="relative w-full flex items-end justify-center" style={{ height: chartHeight - 40 }}>
                          <div className="w-full bg-blue-500 rounded-t-md group-hover:bg-blue-400 transition-colors"
                            style={{ height: `${pct}%`, minHeight: value > 0 ? '2px' : '0' }} />
                        </div>
                        {/* X-axis label — rotated when many bars */}
                        <span className={`text-gray-500 mt-1 text-center leading-tight ${isScrollable ? 'text-[9px]' : 'text-xs mt-2'}`}
                          style={isScrollable ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 28 } : {}}>
                          {getBarLabel(d)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full"><p className="text-gray-500">No sales data available</p></div>
          )}
        </div>


      </div>

      {/* ── Date Range Picker ── filters Top Products, Categories and summary cards */}
      <DateRangePicker
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onRangeChange={setDateRange}
      />

      {/* ── Top Products + Categories ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-900">My Top Selling Products</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {productGroupBy === 'month' ? `${dateRange.startDate} → ${dateRange.endDate}` : `Weekly · ${dateRange.startDate} → ${dateRange.endDate}`}
          </p>

          {/* Controls row */}
          <div className="flex flex-wrap gap-2 mb-5">
            {/* Chart type */}
            <div className="flex gap-1">
              <ChartBtn current={productChartType} value="horizontal" label="Bar" setter={setProductChartType} />
              <ChartBtn current={productChartType} value="vertical" label="Column" setter={setProductChartType} />
            </div>
            {/* Month / Week toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {[{ v: 'month', l: 'Month' }, { v: 'week', l: 'Week' }].map(opt => (
                <button key={opt.v} onClick={() => setProductGroupBy(opt.v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    productGroupBy === opt.v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>{opt.l}</button>
              ))}
            </div>
            <select value={productSortBy} onChange={e => setProductSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600">
              <option value="revenue">By Revenue</option>
              <option value="sales">By Units Sold</option>
            </select>
            <select value={productLimit} onChange={e => setProductLimit(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600">
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>



          {sortedProducts.length > 0 ? (
            <>
              {productChartType === 'horizontal' && sortedProducts.map((p, i) => (
                <HorizontalBar key={i} label={p.name}
                  value={productSortBy === 'revenue' ? parseFloat(p.revenue) : p.sales}
                  maxValue={productSortBy === 'revenue' ? Math.max(...sortedProducts.map(x => parseFloat(x.revenue))) : Math.max(...sortedProducts.map(x => x.sales))}
                  color={COLORS.products}
                  prefix={productSortBy === 'revenue' ? '₱' : ''}
                  suffix={productSortBy === 'sales' ? ' units' : ''} />
              ))}
              {productChartType === 'vertical' && (
                <VerticalBarChart
                  data={sortedProducts.map(p => ({ ...p, revenue: parseFloat(p.revenue), name: p.name }))}
                  valueKey={productSortBy === 'revenue' ? 'revenue' : 'sales'}
                  labelKey="name" color={COLORS.products}
                  prefix={productSortBy === 'revenue' ? '₱' : ''}
                  suffix={productSortBy === 'sales' ? ' units' : ''} />
              )}
              {productChartType === 'horizontal' && (
                <div className="mt-2 space-y-1">
                  {sortedProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-1">
                      <span className="text-xs text-gray-400 truncate max-w-[60%]">{p.name}</span>
                      <StockBadge status={p.stockStatus}
                        label={p.stockStatus === 'out_of_stock' ? 'Out of stock' : p.stockStatus === 'low_stock' ? `${p.stock} left` : `${p.stock} in stock`} />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center mt-4 pt-3 border-t border-gray-100">
                Showing {sortedProducts.length} products · {productGroupBy} view · sorted by {productSortBy}
              </p>
            </>
          ) : (
            <div className="text-center py-12"><p className="text-gray-500 text-sm">No product data for selected period</p></div>
          )}
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-900">My Sales by Category</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">{dateRange.startDate} → {dateRange.endDate}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            <ChartBtn current={categoryChartType} value="donut" label="Donut" setter={setCategoryChartType} />
            <ChartBtn current={categoryChartType} value="horizontal" label="Bar" setter={setCategoryChartType} />
            <ChartBtn current={categoryChartType} value="vertical" label="Column" setter={setCategoryChartType} />
          </div>
          {categoryData.length > 0 ? (
            <>
              {categoryChartType === 'donut' && <DonutChart data={categoryData} />}
              {categoryChartType === 'horizontal' && categoryData.map((cat, i) => (
                <HorizontalBar key={i} label={cat.name} value={cat.value} maxValue={100}
                  color={cat.color || '#3b82f6'} suffix="%" />
              ))}
              {categoryChartType === 'vertical' && (
                <VerticalBarChart data={categoryData} valueKey="value" labelKey="name" color="#3b82f6" suffix="%" />
              )}
              <p className="text-xs text-gray-400 text-center mt-4 pt-3 border-t border-gray-100">
                {categoryData.length} categories · % of revenue in selected period
              </p>
            </>
          ) : (
            <div className="text-center py-12"><p className="text-gray-500 text-sm">No category data for selected period</p></div>
          )}
        </div>
      </div>

      {/* ── Product Stock Overview ── */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Product Stock Overview</h3>
            <p className="text-sm text-gray-500">Current inventory levels (always live)</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <div className="px-3 py-1.5 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 font-medium">{stockSummary.outOfStock} Out of Stock</p>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-600 font-medium">{stockSummary.lowStock} Low Stock</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Products', value: stockSummary.totalProducts, theme: 'blue' },
            { label: 'Active Products', value: stockSummary.activeProducts, theme: 'green' },
            { label: 'Low Stock Alert', value: stockSummary.lowStock, theme: 'amber' },
            { label: 'Inventory Value', value: formatCurrency(stockSummary.totalValue), theme: 'purple', currency: true },
          ].map(card => (
            <div key={card.label} className={`bg-gradient-to-br from-${card.theme}-50 to-${card.theme}-100 rounded-lg p-4`}>
              <p className={`text-xs text-${card.theme}-600 font-medium mb-1`}>{card.label}</p>
              <p className={`text-2xl font-bold text-${card.theme}-900`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { value: 'all', label: `All (${productStock.length})` },
              { value: 'low', label: `Low Stock (${stockSummary.lowStock})` },
              { value: 'out', label: `Out of Stock (${stockSummary.outOfStock})` },
            ].map(opt => (
              <button key={opt.value} onClick={() => setStockFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  stockFilter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{opt.label}</button>
            ))}
          </div>
          <select value={stockSortBy} onChange={e => setStockSortBy(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
            <option value="stock">Sort: Stock (Low → High)</option>
            <option value="name">Sort: Name (A → Z)</option>
            <option value="price">Sort: Price (High → Low)</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search products..." value={stockSearch}
              onChange={e => setStockSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

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
              {filteredStock.slice(0, 15).map((product, i) => (
                <tr key={i} className={`hover:bg-gray-50 transition-colors ${
                  product.stockStatus === 'out_of_stock' ? 'bg-red-50' :
                  product.stockStatus === 'low_stock' ? 'bg-amber-50' : ''
                }`}>
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
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{product.category}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className={`text-sm font-semibold ${
                      product.stockStatus === 'out_of_stock' ? 'text-red-600' :
                      product.stockStatus === 'low_stock' ? 'text-amber-600' : 'text-gray-900'
                    }`}>{product.stock}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StockBadge status={product.stockStatus} label={product.stockStatusLabel} />
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
          {filteredStock.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No products match your filters</p>
            </div>
          )}
        </div>
        {filteredStock.length > 15 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Showing 15 of {filteredStock.length} products</p>
          </div>
        )}
      </div>

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