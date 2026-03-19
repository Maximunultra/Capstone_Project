import React, { useState, useEffect, useCallback } from 'react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─── Export Utilities ────────────────────────────────────────────────────────
const loadSheetJS = () => new Promise((resolve, reject) => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = () => resolve(window.XLSX); s.onerror = reject;
  document.head.appendChild(s);
});
const exportToCSV = (rows, filename) => {
  if (!rows.length) return;
  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map(r => header.map(h => {
    const v = r[h] === null || r[h] === undefined ? '' : String(r[h]);
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v;
  }).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};
const exportToExcel = async (sheets, filename) => {
  const XLSX = await loadSheetJS();
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, ...data.map(r => String(r[k] ?? '').length), 10) }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
};
const ExportBtn = ({ onClick, label, color = 'green' }) => {
  const colors = { green:'bg-green-600 hover:bg-green-700', blue:'bg-blue-600 hover:bg-blue-700' };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${colors[color]}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      {label}
    </button>
  );
};
const ExportGroup = ({ onExcel, onCSV }) => (
  <div className="flex items-center gap-1.5">
    <ExportBtn onClick={onExcel} label="Excel" color="green"/>
    <ExportBtn onClick={onCSV}   label="CSV"   color="blue"/>
  </div>
);

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => d.toISOString().split('T')[0];
const lastDay  = (y, m) => new Date(y, m + 1, 0);
const getPreset = (key) => {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  if (key === 'this_month')    return { s: fmtDate(new Date(y,m,1)),   e: fmtDate(lastDay(y,m))    };
  if (key === 'last_month')    return { s: fmtDate(new Date(y,m-1,1)), e: fmtDate(lastDay(y,m-1))  };
  if (key === 'last_3_months') return { s: fmtDate(new Date(y,m-2,1)), e: fmtDate(lastDay(y,m))    };
  if (key === 'last_6_months') return { s: fmtDate(new Date(y,m-5,1)), e: fmtDate(lastDay(y,m))    };
  if (key === 'this_year')     return { s: fmtDate(new Date(y,0,1)),   e: fmtDate(new Date(y,11,31)) };
  return { s: fmtDate(new Date(y,m,1)), e: fmtDate(lastDay(y,m)) };
};
const PRESETS = [
  { k:'this_month',l:'This Month' }, { k:'last_month',l:'Last Month' },
  { k:'last_3_months',l:'3 Months' }, { k:'last_6_months',l:'6 Months' },
  { k:'this_year',l:'This Year' }, { k:'custom',l:'Custom' },
];
const currency = (v) => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(parseFloat(v)||0);
const num      = (v) => new Intl.NumberFormat('en-US').format(Math.round(parseFloat(v)||0));

// ─── Shared UI Components (same as AdminReports) ──────────────────────────────
const DatePicker = ({ start, end, onChange }) => {
  const [active, setActive] = useState('this_month');
  const [cs, setCs] = useState(start); const [ce, setCe] = useState(end);
  return (
    <div className="bg-white rounded-xl px-5 py-3.5 shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Period:</span>
        {PRESETS.map(p => (
          <button key={p.k} onClick={() => { setActive(p.k); if (p.k !== 'custom') { const r=getPreset(p.k); onChange(r.s,r.e); } }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${active===p.k?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {p.l}
          </button>
        ))}
        {active !== 'custom' && <span className="ml-auto text-xs text-gray-400 font-medium">{start} → {end}</span>}
      </div>
      {active === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">From:</label>
            <input type="date" value={cs} onChange={e=>setCs(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To:</label>
            <input type="date" value={ce} min={cs} onChange={e=>setCe(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button onClick={()=>cs&&ce&&cs<=ce&&onChange(cs,ce)} disabled={!cs||!ce||cs>ce}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-50">Apply</button>
        </div>
      )}
    </div>
  );
};

const Card = ({ children, className='' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>
);
const CardHeader = ({ title, sub, children }) => (
  <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);
const StatCard = ({ label, value, sub, icon, color, badge }) => {
  const bg = { blue:'from-blue-500 to-blue-600', green:'from-green-500 to-green-600', amber:'from-amber-500 to-amber-600', purple:'from-purple-500 to-purple-600', red:'from-red-500 to-red-600', pink:'from-pink-500 to-pink-600' };
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bg[color]||bg.blue} flex items-center justify-center text-lg text-white`}>{icon}</div>
        {badge !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${parseFloat(badge)>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
            {parseFloat(badge)>=0?'▲':'▼'} {Math.abs(parseFloat(badge)).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};
const HBar = ({ label, value, max, color, prefix='', suffix='', bold=false }) => {
  const pct = max>0 ? Math.min((value/max)*100,100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm truncate max-w-[60%] ${bold?'font-semibold text-gray-900':'text-gray-700'}`}>{label}</span>
        <span className="text-sm font-semibold text-gray-900 ml-2">{prefix}{typeof value==='number'?value.toLocaleString():value}{suffix}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:color}}/>
      </div>
    </div>
  );
};
const BarChart = ({ data, valueKey, labelKey, color='#3b82f6', prefix='₱', height=220 }) => {
  const [hovered, setHovered] = useState(null);
  const vals = data.map(d=>parseFloat(d[valueKey])||0);
  const max  = Math.max(...vals, 1);
  const fmtVal = (v) => prefix==='₱' ? (v>=1000?`₱${(v/1000).toFixed(0)}k`:`₱${v}`) : `${v}`;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1.5 px-2" style={{height, minWidth: Math.max(data.length*40,300)}}>
        {data.map((d,i)=>{
          const val=parseFloat(d[valueKey])||0; const pct=max>0?(val/max)*100:0; const barH=(pct/100)*(height-40);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative"
              onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
              {hovered===i && val>0 && (
                <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                  <span className="font-semibold">{d[labelKey]}</span><br/>{fmtVal(val)}
                </div>
              )}
              {val>0 && <span className="text-xs text-gray-600 mb-1 font-medium" style={{fontSize:data.length>8?'9px':'11px'}}>{fmtVal(val)}</span>}
              <div className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                style={{height:Math.max(barH,val>0?3:0),backgroundColor:color}}/>
              <span className="text-xs text-gray-500 mt-1.5 text-center truncate w-full" style={{fontSize:data.length>8?'9px':'11px'}}>{d[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
const DonutChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const size=180; const cx=90; const cy=90; const R=70; const r=42;
  let cumulative=0;
  const slices = data.map(d=>{
    const sa=(cumulative/100)*2*Math.PI-Math.PI/2; cumulative+=d.value;
    const ea=(cumulative/100)*2*Math.PI-Math.PI/2;
    const x1=cx+R*Math.cos(sa),y1=cy+R*Math.sin(sa),x2=cx+R*Math.cos(ea),y2=cy+R*Math.sin(ea);
    const xi1=cx+r*Math.cos(sa),yi1=cy+r*Math.sin(sa),xi2=cx+r*Math.cos(ea),yi2=cy+r*Math.sin(ea);
    const large=d.value>50?1:0;
    return {...d, path:`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${r} ${r} 0 ${large} 0 ${xi1} ${yi1}Z`};
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {slices.map((s,i)=>(
          <path key={i} d={s.path} fill={s.color} opacity={hovered===null||hovered===i?1:0.3}
            stroke="white" strokeWidth="2" className="cursor-pointer transition-all"
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}/>
        ))}
        <text x={cx} y={cy-6} textAnchor="middle" fill="#111827" fontSize="14" fontWeight="700">
          {hovered!==null?`${data[hovered].value}%`:`${data.length}`}
        </text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#6b7280" fontSize="11">
          {hovered!==null?data[hovered].name:'categories'}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map((d,i)=>(
          <div key={i} className="flex items-center gap-1.5 cursor-pointer" onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:d.color}}/>
            <span className="text-xs text-gray-600">{d.name} {d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
const StockBadge = ({ status, label }) => {
  const s = { out_of_stock:'bg-red-100 text-red-700', low_stock:'bg-amber-100 text-amber-700', in_stock:'bg-green-100 text-green-700' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s[status]||s.in_stock}`}>{label}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SellerAnalytics = () => {
  const initR = getPreset('this_month');
  const [start, setStart] = useState(initR.s);
  const [end,   setEnd  ] = useState(initR.e);
  const [year,  setYear ] = useState(new Date().getFullYear());
  const [groupBy,    setGroupBy   ] = useState('month');
  const [metric,     setMetric    ] = useState('revenue');
  const [activeTab,  setActiveTab ] = useState('overview');
  const [prodSort,   setProdSort  ] = useState('revenue');
  const [prodLimit,  setProdLimit ] = useState(5);
  const [catChart,   setCatChart  ] = useState('donut');
  const [stockFilter,setStockFilter] = useState('all');
  const [stockSort,  setStockSort ] = useState('stock');
  const [stockSearch,setStockSearch] = useState('');
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState(null);

  const [stats,      setStats     ] = useState({ totalRevenue:0, revenueGrowth:0, productsSold:0, avgOrderValue:0, avgOrderChange:0, topCategory:'N/A' });
  const [salesData,  setSalesData ] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topProducts,setTopProducts] = useState([]);
  const [stock,      setStock     ] = useState([]);
  const [stockSum,   setStockSum  ] = useState({ totalProducts:0, activeProducts:0, lowStock:0, outOfStock:0, totalValue:0 });
  const [refundStats,setRefundStats] = useState({ pending:0, seller_pending:0, approved:0, rejected:0, total_refunded:0 });
  const [payments,   setPayments   ] = useState([]);
  const [txnMethodF, setTxnMethodF ] = useState('all');
  const [txnStatusF, setTxnStatusF ] = useState('all');
  const [txnSearch,  setTxnSearch  ] = useState('');

  const token = () => localStorage.getItem('token');
  const fetchJ = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.status === 401) { localStorage.removeItem('token'); throw new Error('Session expired.'); }
    if (res.status === 403) throw new Error('Access denied. Seller account required.');
    if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error||'Failed to fetch'); }
    return res.json();
  };

  const dp = useCallback(() => `startDate=${start}&endDate=${end}`, [start, end]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const base = `${API_BASE_URL}/analytics`;
      const p    = dp();
      await Promise.all([
        fetchJ(`${base}/summary?${p}`).then(j => { if (j.success) setStats(j.stats); }).catch(e => console.error('summary:', e)),
        fetchJ(`${base}/sales-by-period?groupBy=${groupBy}&year=${year}&${p}`)
          .then(j => { if (j.success && j.data) setSalesData(j.data); })
          .catch(() => fetchJ(`${base}/sales-by-month?year=${year}`).then(j => { if (j.success && j.data) setSalesData(j.data); }).catch(()=>{})),
        fetchJ(`${base}/category-distribution?${p}`).then(j => { if (j.success) setCategories(j.data); }).catch(()=>{}),
        fetchJ(`${base}/top-products?limit=10&${p}`).then(j => { if (j.success) setTopProducts(j.data); }).catch(()=>{}),
        fetchJ(`${base}/product-stock`).then(j => { if (j.success) { setStock(j.data); setStockSum(j.summary); } }).catch(()=>{}),
      ]);
      // Fetch seller payment transactions (non-fatal)
      try {
        const payRes  = await fetch(`${API_BASE_URL}/analytics/payment-transactions`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const payData = await payRes.json();
        if (payData.success) setPayments(payData.data || []);
      } catch (_) {}

      // Fetch seller's own refund stats
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sellerId = user.id;
      if (sellerId) {
        try {
          const rfRes  = await fetch(`${API_BASE_URL}/refunds/seller/${sellerId}`);
          const rfData = await rfRes.json();
          if (rfData.success) {
            const requests = rfData.refund_requests || [];
            const totalRefunded = requests
              .filter(r => r.status === 'approved')
              .reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);
            setRefundStats({
              pending:        requests.filter(r => r.status === 'pending').length,
              seller_pending: requests.filter(r => r.status === 'seller_pending').length,
              approved:       requests.filter(r => r.status === 'approved').length,
              rejected:       requests.filter(r => r.status === 'rejected').length,
              total_refunded: totalRefunded,
            });
          }
        } catch (_) {}
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [start, end, groupBy, year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRange = (s, e) => { setStart(s); setEnd(e); };

  // ─── Export Handlers ──────────────────────────────────────────────────────
  const exportSales = async (type) => {
    const rows = salesData.map(d => ({ 'Period': d.month||d.label||'', 'Revenue (₱)': d.revenue||0, 'Orders': d.orders||0, 'Customers': d.customers||0 }));
    if (!rows.length) return;
    const fn = `my_sales_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name:'Sales by Period', data:rows }], `${fn}.xlsx`);
  };
  const exportProducts = async (type) => {
    const rows = sortedProducts.map((p,i) => ({ 'Rank':i+1, 'Product':p.name, 'Units Sold':p.sales, 'Revenue (₱)':p.revenue, 'Stock':p.stock, 'Price (₱)':p.price, 'Status':p.stockStatusLabel }));
    if (!rows.length) return;
    const fn = `my_top_products_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name:'Top Products', data:rows }], `${fn}.xlsx`);
  };
  const exportCategories = async (type) => {
    const rows = categories.map(c => ({ 'Category':c.name, 'Share (%)':c.value }));
    if (!rows.length) return;
    const fn = `my_categories_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name:'Categories', data:rows }], `${fn}.xlsx`);
  };
  const exportPaymentsData = async (type) => {
    const rows = filteredPayments.map(t => ({
      'Order #':        t.order_number,
      'Amount (₱)':     parseFloat(t.total_amount||0).toFixed(2),
      'Method':         t.payment_method?.toUpperCase(),
      'Payment Status': t.payment_status,
      'Order Status':   t.order_status,
      'Date':           new Date(t.order_date).toLocaleDateString(),
    }));
    if (!rows.length) return;
    const fn = `my_payments_${start}_${end}${txnMethodF !== 'all' ? '_' + txnMethodF : ''}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name:'Payments', data:rows }], `${fn}.xlsx`);
  };

  const exportStockData = async (type) => {
    const rows = filteredStock.map(p => ({ 'Product':p.name, 'Category':p.category, 'Stock':p.stock, 'Status':p.stockStatusLabel, 'Price (₱)':p.price, 'Total Sold':p.totalSold, 'Active':p.isActive?'Yes':'No' }));
    if (!rows.length) return;
    const fn = `my_inventory_${new Date().toISOString().split('T')[0]}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name:'Inventory', data:rows }], `${fn}.xlsx`);
  };
  const exportFullReport = async () => {
    const sheets = [
      { name:'Summary', data:[{
      'Period':              `${start} to ${end}`,
      'Total Revenue (₱)':  parseFloat(stats.totalRevenue||0).toFixed(2),
      'Products Sold':       stats.productsSold||0,
      'Avg Order Value (₱)': parseFloat(stats.avgOrderValue||0).toFixed(2),
      'Revenue Growth (%)':  parseFloat(stats.revenueGrowth||0).toFixed(1),
      'Top Category':        stats.topCategory||'N/A',
      'COD Refunds Approved':refundStats?.approved||0,
      'Total Refunded (₱)':  parseFloat(refundStats?.total_refunded||0).toFixed(2),
      'COD Refunds Pending': refundStats?.seller_pending||0,
    }] },
      ...(salesData.length ? [{ name:'Sales by Period', data:salesData.map(d=>({'Period':d.month||d.label||'','Revenue':d.revenue||0,'Orders':d.orders||0,'Customers':d.customers||0})) }] : []),
      ...(topProducts.length ? [{ name:'Top Products', data:topProducts.map((p,i)=>({'Rank':i+1,'Product':p.name,'Units':p.sales,'Revenue':p.revenue,'Stock':p.stock})) }] : []),
      ...(categories.length ? [{ name:'Categories', data:categories.map(c=>({'Category':c.name,'Share (%)':c.value})) }] : []),
      ...(stock.length ? [{ name:'Inventory', data:stock.map(p=>({'Product':p.name,'Category':p.category,'Stock':p.stock,'Status':p.stockStatusLabel,'Price':p.price,'Sold':p.totalSold})) }] : []),
    ];
    await exportToExcel(sheets, `my_full_report_${start}_${end}.xlsx`);
  };

  const st = stats;
  const chartLabel = groupBy==='week' ? 'label' : 'month';
  const years = [new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2];

  const sortedProducts = [...topProducts]
    .sort((a,b) => prodSort==='revenue' ? parseFloat(b.revenue)-parseFloat(a.revenue) : b.sales-a.sales)
    .slice(0, prodLimit);

  const filteredStock = stock
    .filter(p => stockFilter==='low' ? p.stockStatus==='low_stock' : stockFilter==='out' ? p.stockStatus==='out_of_stock' : true)
    .filter(p => !stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()))
    .sort((a,b) => stockSort==='name' ? a.name.localeCompare(b.name) : stockSort==='price' ? parseFloat(b.price)-parseFloat(a.price) : a.stock-b.stock);

  const filteredPayments = payments.filter(t => {
    const matchMethod = txnMethodF === 'all' || t.payment_method?.toLowerCase() === txnMethodF;
    const matchStatus = txnStatusF === 'all' || t.order_status?.toLowerCase() === txnStatusF ||
      (txnStatusF === 'cancelled' && ['cancelled','canceled'].includes(t.order_status?.toLowerCase()));
    const matchSearch = !txnSearch || t.order_number?.toLowerCase().includes(txnSearch.toLowerCase());
    return matchMethod && matchStatus && matchSearch;
  });

  const TABS = [
    { k:'overview', l:'Overview'    },
    { k:'products', l:'Products'    },
    { k:'inventory',l:'Inventory'   },
    { k:'payments', l:'Payments'    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your store performance and key metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition">
            <svg className={`w-4 h-4 ${loading?'animate-spin':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
          <button onClick={exportFullReport} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export Full Report (.xlsx)
          </button>
        </div>
      </div>

      <DatePicker start={start} end={end} onChange={handleRange}/>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={()=>setActiveTab(t.k)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition relative ${activeTab===t.k?'text-blue-600 bg-blue-50':'text-gray-600 hover:bg-gray-50'}`}>
              {t.l}
              {activeTab===t.k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"/>}
            </button>
          ))}
        </div>
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="My Revenue"       value={currency(st.totalRevenue)}  sub="Before COD refunds"         icon="₱"  color="blue"   badge={st.revenueGrowth}/>
            <StatCard label="Products Sold"    value={num(st.productsSold)}        sub="Items delivered"            icon="📦" color="purple"/>
            <StatCard label="COD Refunded"     value={currency(refundStats?.total_refunded||0)} sub={`${refundStats?.approved||0} approved`} icon="↩" color="red"/>
            <StatCard label="Top Category"     value={st.topCategory||'N/A'}       sub={categories.length>0?`${categories[0]?.value}% of sales`:''} icon="🏷️" color="pink"/>
          </div>

          {/* Revenue over time */}
          <Card>
            <CardHeader title="Revenue Over Time" sub={groupBy==='month'?`Monthly · ${year}`:`Weekly · ${start} → ${end}`}>
              <div className="flex flex-wrap gap-2">
                <ExportGroup onExcel={()=>exportSales('excel')} onCSV={()=>exportSales('csv')}/>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {['month','week'].map(g=>(
                    <button key={g} onClick={()=>setGroupBy(g)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${groupBy===g?'bg-white text-blue-600 shadow-sm':'text-gray-500'}`}>
                      {g.charAt(0).toUpperCase()+g.slice(1)}
                    </button>
                  ))}
                </div>
                {groupBy==='month' && (
                  <select value={year} onChange={e=>setYear(parseInt(e.target.value))}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                    {years.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                )}
                <select value={metric} onChange={e=>setMetric(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                  <option value="revenue">Revenue</option>
                  <option value="orders">Orders</option>
                  <option value="customers">Customers</option>
                </select>
              </div>
            </CardHeader>
            <div className="p-6">
              {salesData.length>0
                ? <BarChart data={salesData} valueKey={metric} labelKey={chartLabel} color={metric==='orders'?'#8b5cf6':'#3b82f6'} prefix={metric==='orders'?'':'₱'}/>
                : <p className="text-center text-gray-400 py-10 text-sm">No data for this period</p>}
            </div>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader title="Sales by Category" sub="% of revenue from delivered orders">
              <ExportGroup onExcel={()=>exportCategories('excel')} onCSV={()=>exportCategories('csv')}/>
            </CardHeader>
            <div className="p-6">
              {categories.length>0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <DonutChart data={categories}/>
                  <div>
                    {categories.map((c,i)=>(
                      <HBar key={i} label={c.name} value={c.value} max={100} color={c.color} suffix="%" bold/>
                    ))}
                  </div>
                </div>
              ) : <p className="text-center text-gray-400 py-10 text-sm">No category data</p>}
            </div>
          </Card>

          {/* COD Refunds card — only show if seller has any */}
          {(refundStats?.approved > 0 || refundStats?.seller_pending > 0 || refundStats?.pending > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">COD Refund Requests</h3>
                <p className="text-xs text-gray-400 mt-0.5">Refund requests on your Cash on Delivery orders</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Need Action</p>
                    <p className="text-3xl font-bold text-amber-700">{refundStats?.seller_pending||0}</p>
                    <p className="text-xs text-amber-500 mt-1">awaiting your confirmation</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Sent to Admin</p>
                    <p className="text-3xl font-bold text-blue-700">{refundStats?.pending||0}</p>
                    <p className="text-xs text-blue-500 mt-1">admin reviewing</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Approved</p>
                    <p className="text-3xl font-bold text-green-700">{refundStats?.approved||0}</p>
                    <p className="text-xs text-green-500 mt-1">transfer to buyer</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total Refunded</p>
                    <p className="text-2xl font-bold text-red-700">{currency(refundStats?.total_refunded||0)}</p>
                    <p className="text-xs text-red-500 mt-1">returned to buyers</p>
                  </div>
                </div>
                {refundStats?.seller_pending > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800">
                      ⚠️ You have {refundStats.seller_pending} COD refund{refundStats.seller_pending > 1 ? 's' : ''} waiting for your confirmation
                    </p>
                    <a href="/seller/refunds"
                      className="px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition">
                      View Refunds
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PRODUCTS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Summary mini-cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="My Revenue"      value={currency(st.totalRevenue)}  sub="Delivered orders"  icon="₱"  color="blue"   badge={st.revenueGrowth}/>
            <StatCard label="Products Sold"   value={num(st.productsSold)}        sub="Total items"       icon="📦" color="purple"/>
            <StatCard label="Avg Order Value" value={currency(st.avgOrderValue)}  sub="Per order"         icon="📊" color="amber"/>
            <StatCard label="Top Category"    value={st.topCategory||'N/A'}       sub="Most sold"         icon="🏷️" color="pink"/>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader title="Best Selling Products" sub="By revenue · delivered orders">
              <div className="flex flex-wrap items-center gap-2">
                <ExportGroup onExcel={()=>exportProducts('excel')} onCSV={()=>exportProducts('csv')}/>
                <select value={prodSort} onChange={e=>setProdSort(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="revenue">By Revenue</option>
                  <option value="sales">By Units</option>
                </select>
                <select value={prodLimit} onChange={e=>setProdLimit(Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>
            </CardHeader>
            <div className="p-6">
              {sortedProducts.length>0 ? (
                <>
                  {sortedProducts.map((p,i)=>(
                    <HBar key={i} label={`${i+1}. ${p.name}`}
                      value={prodSort==='revenue'?parseFloat(p.revenue):p.sales}
                      max={prodSort==='revenue'?parseFloat(sortedProducts[0].revenue):sortedProducts[0].sales}
                      color="#8b5cf6" prefix={prodSort==='revenue'?'₱':''} suffix={prodSort==='sales'?' units':''}/>
                  ))}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Units</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Revenue</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedProducts.map((p,i)=>(
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-800 truncate max-w-[160px]">{p.name}</td>
                            <td className="px-3 py-2 text-right text-sm text-gray-600">{num(p.sales)}</td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">{currency(p.revenue)}</td>
                            <td className="px-3 py-2 text-center"><StockBadge status={p.stockStatus} label={p.stockStatus==='out_of_stock'?'Out':p.stockStatus==='low_stock'?`${p.stock} left`:`${p.stock}`}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="text-center text-gray-400 py-10 text-sm">No product data for this period</p>}
            </div>
          </Card>

          {/* Categories breakdown */}
          <Card>
            <CardHeader title="Sales by Category" sub="Revenue share from delivered orders">
              <ExportGroup onExcel={()=>exportCategories('excel')} onCSV={()=>exportCategories('csv')}/>
            </CardHeader>
            <div className="p-6">
              {categories.length>0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <DonutChart data={categories}/>
                  <div>
                    {categories.map((c,i)=>(
                      <HBar key={i} label={c.name} value={c.value} max={100} color={c.color} suffix="%" bold/>
                    ))}
                  </div>
                </div>
              ) : <p className="text-center text-gray-400 py-10 text-sm">No category data</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ══ INVENTORY TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Stock summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Products"   value={num(stockSum.totalProducts)}  sub="In your store"     icon="📋" color="blue"  />
            <StatCard label="Active Products"  value={num(stockSum.activeProducts)} sub="Listed & visible"  icon="✅" color="green" />
            <StatCard label="Low Stock"        value={num(stockSum.lowStock)}        sub="Need restocking"   icon="⚠️" color="amber" />
            <StatCard label="Out of Stock"     value={num(stockSum.outOfStock)}      sub="Unavailable now"   icon="❌" color="red"   />
          </div>

          {/* Inventory value card */}
          <Card>
            <CardHeader title="Inventory Overview" sub="Live stock data — always current"/>
            <div className="p-6">
              <div className="flex items-center justify-center py-4 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600 mb-1">{currency(stockSum.totalValue)}</p>
                  <p className="text-sm text-gray-500">Total inventory value ({num(stockSum.totalProducts)} products)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">In Stock</p>
                  <p className="text-2xl font-bold text-green-700">{num(stockSum.totalProducts - stockSum.lowStock - stockSum.outOfStock)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Low Stock (&lt;10)</p>
                  <p className="text-2xl font-bold text-amber-700">{num(stockSum.lowStock)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-700">{num(stockSum.outOfStock)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Stock table */}
          <Card>
            <CardHeader title="Product Stock Details" sub="Search, filter and export your inventory">
              <ExportGroup onExcel={()=>exportStockData('excel')} onCSV={()=>exportStockData('csv')}/>
            </CardHeader>
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-5 items-center">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {[
                    { value:'all', label:`All (${stock.length})` },
                    { value:'low', label:`Low Stock (${stockSum.lowStock})` },
                    { value:'out', label:`Out of Stock (${stockSum.outOfStock})` },
                  ].map(opt => (
                    <button key={opt.value} onClick={()=>setStockFilter(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${stockFilter===opt.value?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <select value={stockSort} onChange={e=>setStockSort(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                  <option value="stock">Sort: Stock Low → High</option>
                  <option value="name">Sort: Name A → Z</option>
                  <option value="price">Sort: Price High → Low</option>
                </select>
                <div className="relative flex-1 min-w-[180px]">
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Search products..." value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                    {filteredStock.slice(0,20).map((p,i)=>(
                      <tr key={i} className={`hover:bg-gray-50 transition-colors ${p.stockStatus==='out_of_stock'?'bg-red-50':p.stockStatus==='low_stock'?'bg-amber-50':''}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover"/>
                              : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-500">ID: {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4"><span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{p.category}</span></td>
                        <td className="px-4 py-4 text-center">
                          <p className={`text-sm font-semibold ${p.stockStatus==='out_of_stock'?'text-red-600':p.stockStatus==='low_stock'?'text-amber-600':'text-gray-900'}`}>{p.stock}</p>
                        </td>
                        <td className="px-4 py-4 text-center"><StockBadge status={p.stockStatus} label={p.stockStatusLabel}/></td>
                        <td className="px-4 py-4 text-right"><p className="text-sm font-medium text-gray-900">{currency(p.price)}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-sm text-gray-600">{num(p.totalSold)}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStock.length===0 && <div className="text-center py-12"><p className="text-gray-500 text-sm">No products match your filters</p></div>}
              </div>
              {filteredStock.length>20 && (
                <div className="mt-4 text-center"><p className="text-sm text-gray-500">Showing 20 of {filteredStock.length} products</p></div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ══ PAYMENTS TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const gcashTotal  = payments.filter(t=>t.payment_method==='gcash'  && t.order_status==='delivered').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
              const paypalTotal = payments.filter(t=>t.payment_method==='paypal' && t.order_status==='delivered').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
              const codTotal    = payments.filter(t=>t.payment_method==='cod'    && t.order_status==='delivered').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
              const pendingPaid = payments.filter(t=>t.payment_status==='paid'   && !['delivered','cancelled','canceled'].includes(t.order_status?.toLowerCase())).length;
              return (<>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base">G</div>
                    <div><p className="font-semibold text-gray-900 text-sm">GCash</p><p className="text-xs text-gray-400">{payments.filter(t=>t.payment_method==='gcash'&&t.order_status==='delivered').length} delivered</p></div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{currency(gcashTotal)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">P</div>
                    <div><p className="font-semibold text-gray-900 text-sm">PayPal</p><p className="text-xs text-gray-400">{payments.filter(t=>t.payment_method==='paypal'&&t.order_status==='delivered').length} delivered</p></div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{currency(paypalTotal)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-base">C</div>
                    <div><p className="font-semibold text-gray-900 text-sm">COD</p><p className="text-xs text-gray-400">{payments.filter(t=>t.payment_method==='cod'&&t.order_status==='delivered').length} delivered</p></div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{currency(codTotal)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-base">⏳</div>
                    <div><p className="font-semibold text-gray-900 text-sm">Paid & Pending</p><p className="text-xs text-gray-400">paid but not delivered</p></div>
                  </div>
                  <p className="text-xl font-bold text-amber-600">{pendingPaid} order{pendingPaid!==1?'s':''}</p>
                </div>
              </>);
            })()}
          </div>

          {/* Transactions card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">My Payment Transactions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{filteredPayments.length} result{filteredPayments.length!==1?'s':''} · all payment methods</p>
                </div>
                <ExportGroup onExcel={()=>exportPaymentsData('excel')} onCSV={()=>exportPaymentsData('csv')}/>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Search order #..."
                    value={txnSearch} onChange={e=>setTxnSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <select value={txnMethodF} onChange={e=>setTxnMethodF(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                  <option value="all">All Methods</option>
                  <option value="gcash">GCash</option>
                  <option value="paypal">PayPal</option>
                  <option value="cod">COD</option>
                </select>
                <select value={txnStatusF} onChange={e=>setTxnStatusF(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {(txnSearch || txnMethodF !== 'all' || txnStatusF !== 'all') && (
                  <button onClick={()=>{setTxnSearch('');setTxnMethodF('all');setTxnStatusF('all');}}
                    className="text-xs px-2.5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">{payments.length === 0 ? 'No payment transactions found' : 'No transactions match your filters'}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payment</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Order Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((t,i) => {
                      const orderStatus = String(t.order_status || '');
                      const orderStatusColors = {
                        pending:    'bg-amber-100 text-amber-800',
                        processing: 'bg-blue-100 text-blue-800',
                        shipped:    'bg-purple-100 text-purple-800',
                        delivered:  'bg-green-100 text-green-800',
                        cancelled:  'bg-red-100 text-red-800',
                        canceled:   'bg-red-100 text-red-800',
                      };
                      const payColors = {
                        gcash:  'bg-blue-100 text-blue-800',
                        paypal: 'bg-indigo-100 text-indigo-800',
                        cod:    'bg-amber-100 text-amber-800',
                      };
                      const pendingPaidRow = t.payment_status === 'paid' &&
                        !['delivered','cancelled','canceled'].includes(orderStatus.toLowerCase());
                      return (
                        <tr key={i} className={`hover:bg-gray-50 transition ${pendingPaidRow ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{t.order_number}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{currency(t.total_amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${payColors[t.payment_method?.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                              {t.payment_method?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              t.payment_status === 'paid'   ? 'bg-green-100 text-green-800' :
                              t.payment_status === 'failed' ? 'bg-red-100 text-red-800'    :
                                                              'bg-amber-100 text-amber-800'
                            }`}>
                              {t.payment_status === 'paid' ? '✓ Paid' : (t.payment_status || '—')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {orderStatus ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusColors[orderStatus.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                                {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                              </span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(t.order_date).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"/>
            <span className="text-sm font-medium text-gray-700">Loading analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAnalytics;