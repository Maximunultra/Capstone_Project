import React, { useState, useEffect, useCallback } from 'react';

// ─── Export Utilities (SheetJS + CSV) ────────────────────────────────────────
const loadSheetJS = () => new Promise((resolve, reject) => {
  if (window.XLSX) { resolve(window.XLSX); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = () => resolve(window.XLSX);
  s.onerror = reject;
  document.head.appendChild(s);
});

const exportToCSV = (rows, filename) => {
  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map(r => header.map(h => {
    const v = r[h] === null || r[h] === undefined ? '' : String(r[h]);
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v;
  }).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
};

const exportToExcel = async (sheets, filename) => {
  const XLSX = await loadSheetJS();
  const wb   = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto column widths
    const cols = Object.keys(data[0] || {}).map(k => ({
      wch: Math.max(k.length, ...data.map(r => String(r[k] ?? '').length), 10)
    }));
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
};

const ExportBtn = ({ onClick, label, color = 'green', icon }) => {
  const colors = {
    green:  'bg-green-600 hover:bg-green-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${colors[color]}`}>
      {icon || (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      )}
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


// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

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
  { k:'this_month',    l:'This Month'   },
  { k:'last_month',    l:'Last Month'   },
  { k:'last_3_months', l:'3 Months'     },
  { k:'last_6_months', l:'6 Months'     },
  { k:'this_year',     l:'This Year'    },
  { k:'custom',        l:'Custom'       },
];

const currency = (v) => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(parseFloat(v)||0);
const num      = (v) => new Intl.NumberFormat('en-US').format(Math.round(parseFloat(v)||0));

// ─── Sub-components ───────────────────────────────────────────────────────────

const DatePicker = ({ start, end, onChange }) => {
  const [active, setActive] = useState('this_month');
  const [cs, setCs] = useState(start);
  const [ce, setCe] = useState(end);
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
            <input type="date" value={cs} onChange={e=>setCs(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To:</label>
            <input type="date" value={ce} min={cs} onChange={e=>setCe(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button onClick={()=>cs&&ce&&cs<=ce&&onChange(cs,ce)} disabled={!cs||!ce||cs>ce}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-50">
            Apply
          </button>
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
  const bg = { blue:'from-blue-500 to-blue-600', green:'from-green-500 to-green-600', amber:'from-amber-500 to-amber-600', purple:'from-purple-500 to-purple-600', red:'from-red-500 to-red-600', teal:'from-teal-500 to-teal-600' };
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

const Badge = ({ label, color }) => {
  const styles = {
    pending:    'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped:    'bg-purple-100 text-purple-800',
    delivered:  'bg-green-100 text-green-800',
    cancelled:  'bg-red-100 text-red-800',
    gcash:      'bg-blue-100 text-blue-800',
    paypal:     'bg-indigo-100 text-indigo-800',
    cod:        'bg-amber-100 text-amber-800',
    paid:       'bg-green-100 text-green-800',
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[label?.toLowerCase()]||'bg-gray-100 text-gray-700'}`}>{label}</span>;
};

// ─── Revenue Bar Chart (SVG) ──────────────────────────────────────────────────
const BarChart = ({ data, valueKey, labelKey, color='#3b82f6', prefix='₱', height=220 }) => {
  const [hovered, setHovered] = useState(null);
  const vals = data.map(d=>parseFloat(d[valueKey])||0);
  const max  = Math.max(...vals, 1);

  const fmtVal = (v) => {
    if (prefix==='₱') return v>=1000?`₱${(v/1000).toFixed(0)}k`:`₱${v}`;
    return `${v}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex items-end gap-1.5 px-2`} style={{height, minWidth: Math.max(data.length*40,300)}}>
        {data.map((d,i)=>{
          const val = parseFloat(d[valueKey])||0;
          const pct = max>0?(val/max)*100:0;
          const barH = (pct/100)*(height-40);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative"
              onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
              {hovered===i && val>0 && (
                <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                  <span className="font-semibold">{d[labelKey]}</span><br/>{fmtVal(val)}
                </div>
              )}
              {val>0 && (
                <span className="text-xs text-gray-600 mb-1 font-medium" style={{fontSize: data.length>8?'9px':'11px'}}>
                  {fmtVal(val)}
                </span>
              )}
              <div className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                style={{height:Math.max(barH,val>0?3:0), backgroundColor:color}}/>
              <span className="text-xs text-gray-500 mt-1.5 text-center truncate w-full"
                style={{fontSize:data.length>8?'9px':'11px'}}>
                {d[labelKey]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
const DonutChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const size=180; const cx=90; const cy=90; const R=70; const r=42;
  let cumulative=0;
  const slices = data.map(d=>{
    const startAngle=(cumulative/100)*2*Math.PI-Math.PI/2;
    cumulative+=d.value;
    const endAngle=(cumulative/100)*2*Math.PI-Math.PI/2;
    const x1=cx+R*Math.cos(startAngle), y1=cy+R*Math.sin(startAngle);
    const x2=cx+R*Math.cos(endAngle),   y2=cy+R*Math.sin(endAngle);
    const xi1=cx+r*Math.cos(startAngle),yi1=cy+r*Math.sin(startAngle);
    const xi2=cx+r*Math.cos(endAngle),  yi2=cy+r*Math.sin(endAngle);
    const large=d.value>50?1:0;
    return { ...d, path:`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${r} ${r} 0 ${large} 0 ${xi1} ${yi1}Z` };
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
          <div key={i} className="flex items-center gap-1.5 cursor-pointer"
            onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:d.color}}/>
            <span className="text-xs text-gray-600">{d.name} {d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Status Funnel ────────────────────────────────────────────────────────────
const StatusFunnel = ({ data }) => {
  const max = Math.max(...data.map(d=>d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((d,i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:d.color}}/>
              <span className="text-sm font-medium text-gray-700 capitalize">{d.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{currency(d.revenue)}</span>
              <span className="text-sm font-bold text-gray-900 min-w-[32px] text-right">{d.count}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-700"
              style={{width:`${max>0?(d.count/max)*100:0}%`, backgroundColor:d.color}}/>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminReports = () => {
  const initR = getPreset('this_month');
  const [start, setStart] = useState(initR.s);
  const [end,   setEnd  ] = useState(initR.e);
  const [year,  setYear ] = useState(new Date().getFullYear());
  const [groupBy, setGroupBy] = useState('month');
  const [metric,  setMetric ] = useState('revenue');
  const [activeTab, setActiveTab] = useState('overview');
  const [payView,   setPayView  ] = useState('breakdown');
  const [loading,   setLoading  ] = useState(true);
  const [error,     setError    ] = useState(null);

  // Data state
  const [summary,      setSummary     ] = useState(null);
  const [salesData,    setSalesData   ] = useState([]);
  const [orderStatus,  setOrderStatus ] = useState([]);
  const [categories,   setCategories  ] = useState([]);
  const [topProducts,  setTopProducts ] = useState([]);
  const [topSellers,   setTopSellers  ] = useState([]);
  const [payBreakdown, setPayBreakdown] = useState([]);
  const [sellersPay,   setSellersPay  ] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [refundStats,  setRefundStats]  = useState({ pending:0, seller_pending:0, approved:0, rejected:0, total_refunded:0 });
  const [logs,         setLogs]         = useState([]);
  const [logsTotal,    setLogsTotal]    = useState(0);
  const [logsLoading,  setLogsLoading]  = useState(false);
  const [logCategory,  setLogCategory]  = useState('all');
  const [logRole,      setLogRole]      = useState('all');
  const [logOffset,    setLogOffset]    = useState(0);
  const LOG_LIMIT = 50;
  const [orders,       setOrders]       = useState([]);
  const [ordersLoading,setOrdersLoading]= useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusF,setOrdersStatusF]= useState('all');
  const [ordersPayF,   setOrdersPayF]   = useState('all');
  const [refundMap,    setRefundMap]    = useState({});  // orderId → refund request
  const [ordersSellerF,setOrdersSellerF]= useState('all'); // seller filter
  const [ordersSortKey, setOrdersSortKey] = useState('order_date');
  const [ordersSortDir, setOrdersSortDir] = useState('desc');
  const [sellerList,   setSellerList]   = useState([]);    // list of sellers for dropdown
  // ── Payment tab filters ──────────────────────────────────────────────────
  const [txnMethodF,   setTxnMethodF]   = useState('all'); // transaction method filter
  const [txnStatusF,   setTxnStatusF]   = useState('all'); // transaction order status filter
  const [txnSearch,    setTxnSearch]    = useState('');    // transaction search
  const [sellerSearch, setSellerSearch] = useState('');    // seller table search

  const getOrderSortValue = (o, key) => {
    if (key === 'order_date') return new Date(o.order_date).getTime() || 0;
    if (key === 'order_number') return o.order_number || '';
    if (key === 'customer') return o.shipping_full_name || '';
    if (key === 'status') return o.order_status || '';
    if (key === 'payment') return o.payment_method || '';
    if (key === 'total') return parseFloat(o.total_amount) || 0;
    if (key === 'seller') return (o.sellers?.[0]?.name) || o.seller_name || '';
    if (key === 'refund') return refundMap[o.id]?.status || '';
    return '';
  };

  const sortOrders = (list) => {
    const arr = [...list];
    arr.sort((a, b) => {
      const va = getOrderSortValue(a, ordersSortKey);
      const vb = getOrderSortValue(b, ordersSortKey);
      const cmp = (typeof va === 'number' && typeof vb === 'number')
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
      return ordersSortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  };

  const toggleOrdersSort = (key) => {
    if (ordersSortKey === key) {
      setOrdersSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdersSortKey(key);
      setOrdersSortDir('asc');
    }
  };

  const token = () => localStorage.getItem('token');
  const fetchJ = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const dp = useCallback(() => `startDate=${start}&endDate=${end}`, [start, end]);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const base = `${API_BASE_URL}/admin/analytics`;
      const p    = dp();
      const [s, sp, os, cat, prod, sell, pb, sellP, txn] = await Promise.all([
        fetchJ(`${base}/summary?${p}`),
        fetchJ(`${base}/sales-by-period?groupBy=${groupBy}&year=${year}&${p}`),
        fetchJ(`${base}/orders-by-status?${p}`).catch(()=>({success:false,data:[]})),
        fetchJ(`${base}/category-distribution?${p}`),
        fetchJ(`${base}/top-products?limit=10&${p}`),
        fetchJ(`${base}/top-sellers?limit=10&${p}`),
        fetchJ(`${base}/payment-breakdown?${p}`).catch(()=>({success:false,data:[]})),
        fetchJ(`${base}/sellers-by-payment?${p}`).catch(()=>({success:false,data:[]})),
        fetchJ(`${base}/payment-transactions?${p}`).catch(()=>({success:false,data:[]})),
      ]);
      if (s.success)    setSummary(s.stats);
      if (sp.success)   setSalesData(sp.data||[]);
      if (os.success)   setOrderStatus(os.data||[]);
      if (cat.success)  setCategories(cat.data||[]);
      if (prod.success) setTopProducts(prod.data||[]);
      if (sell.success) setTopSellers(sell.data||[]);
      if (pb.success)   setPayBreakdown(pb.data||[]);
      if (sellP.success) setSellersPay(sellP.data||[]);
      if (txn.success)  setTransactions(txn.data||[]);

      // Fetch all orders for the orders table (non-fatal)
      try {
        const [ordRes, sellerRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/analytics/orders-all?startDate=${start}&endDate=${end}&limit=200`, {
            headers: { Authorization: `Bearer ${token()}` }
          }),
          fetch(`${API_BASE_URL}/admin/analytics/orders-all?startDate=${start}&endDate=${end}&limit=200&includeSellers=true`, {
            headers: { Authorization: `Bearer ${token()}` }
          }),
        ]);
        if (ordRes.ok) {
          const ordData = await ordRes.json();
          const fetchedOrders = ordData.orders || [];
          setOrders(fetchedOrders);
          // Build unique seller list from orders
          // Build seller list from enriched order data
          const sellerMap = {};
          fetchedOrders.forEach(o => {
            // Primary seller
            if (o.seller_id && o.seller_name) sellerMap[o.seller_id] = o.seller_name;
            // All sellers in multi-seller orders
            (o.sellers || []).forEach(s => { if (s.id && s.name) sellerMap[s.id] = s.name; });
          });
          setSellerList(
            Object.entries(sellerMap)
              .map(([id, name]) => ({ id, name }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      } catch (_) {}

      // Fetch refund requests to build order→refund map
      try {
        const rfAllRes  = await fetch(`${API_BASE_URL}/refunds?limit=500`);
        const rfAllData = await rfAllRes.json();
        if (rfAllData.success) {
          const map = {};
          (rfAllData.refund_requests || []).forEach(r => { map[r.order_id] = r; });
          setRefundMap(map);
        }
      } catch (_) {}

      // Fetch refund stats (separate call — non-fatal)
      try {
        const rf = await fetch(`${API_BASE_URL}/refunds/stats`);
        const rfData = await rf.json();
        if (rfData.success && rfData.stats) {
          setRefundStats({
            pending:        rfData.stats.pending        || 0,
            seller_pending: rfData.stats.seller_pending || 0,
            approved:       rfData.stats.approved       || 0,
            rejected:       rfData.stats.rejected       || 0,
            total_refunded: parseFloat(rfData.stats.total_refunded || 0),
          });
        }
      } catch (_) {
        console.warn('Could not fetch refund stats — using defaults');
      }
    } catch (e) {
      setError('Failed to load analytics. ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [start, end, groupBy, year]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRange = (s, e) => { setStart(s); setEnd(e); };

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

  // ─── Export Handlers ──────────────────────────────────────────────────────
  const exportSummary = async (type) => {
    const rows = [{
      'Period':              `${start} to ${end}`,
      'Total Revenue (₱)':  parseFloat(st.totalRevenue||0).toFixed(2),
      'Platform Fees (₱)':  parseFloat(st.systemCommission||0).toFixed(2),
      'Seller Revenue (₱)': parseFloat(st.sellerRevenue||0).toFixed(2),
      'Shipping (₱)':       parseFloat(st.shippingRevenue||0).toFixed(2),
      'Total Orders':       st.totalOrders||0,
      'Delivered Orders':   st.deliveredOrders||0,
      'Cancelled Orders':   st.cancelledOrders||0,
      'Products Sold':      st.productsSold||0,
      'Avg Order Value (₱)':parseFloat(st.avgOrderValue||0).toFixed(2),
      'Revenue Growth (%)': parseFloat(st.revenueGrowth||0).toFixed(1),
      'GCash Orders':       st.gcashOrders||0,
      'GCash Revenue (₱)':  parseFloat(st.gcashRevenue||0).toFixed(2),
      'PayPal Orders':      st.paypalOrders||0,
      'PayPal Revenue (₱)': parseFloat(st.paypalRevenue||0).toFixed(2),
      'COD Orders':         st.codOrders||0,
      'COD Revenue (₱)':    parseFloat(st.codRevenue||0).toFixed(2),
      'Cancelled Revenue (₱)':   parseFloat(st.cancelledRevenue||0).toFixed(2),
      'Cancelled Fees Lost (₱)':  parseFloat(st.cancelledFees||0).toFixed(2),
      'Refunds Approved':          refundStats?.approved || 0,
      'Total Refunded (₱)':        parseFloat(refundStats?.total_refunded||0).toFixed(2),
      'Net Revenue (₱)':           Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(refundStats?.total_refunded||0)).toFixed(2),
    }];
    const fn = `summary_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Summary', data: rows }], `${fn}.xlsx`);
  };

  const exportSalesData = async (type) => {
    const rows = salesData.map(d => ({
      'Period':        d.month || d.label || d.week || '',
      'Revenue (₱)':   d.revenue||0,
      'Commission (₱)':d.commission||0,
      'Orders':        d.orders||0,
    }));
    if (!rows.length) return;
    const fn = `sales_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Sales by Period', data: rows }], `${fn}.xlsx`);
  };

  const exportOrderStatus = async (type) => {
    const rows = orderStatus.map(d => ({
      'Status':       d.status,
      'Order Count':  d.count,
      'Revenue (₱)':  parseFloat(d.revenue||0).toFixed(2),
    }));
    if (!rows.length) return;
    const fn = `order_status_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Order Status', data: rows }], `${fn}.xlsx`);
  };

  const exportProducts = async (type) => {
    const rows = topProducts.map((p,i) => ({
      'Rank':         i+1,
      'Product Name': p.name,
      'Units Sold':   p.sales,
      'Revenue (₱)':  p.revenue,
    }));
    if (!rows.length) return;
    const fn = `top_products_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Top Products', data: rows }], `${fn}.xlsx`);
  };

  const exportSellers = async (type) => {
    const rows = topSellers.map((s,i) => ({
      'Rank':          i+1,
      'Seller Name':   s.seller_name,
      'Email':         s.seller_email,
      'Total Orders':  s.total_orders,
      'Items Sold':    s.items_sold,
      'Revenue (₱)':   parseFloat(s.total_revenue||0).toFixed(2),
    }));
    if (!rows.length) return;
    const fn = `top_sellers_${start}_${end}`;
    if (type==='csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Top Sellers', data: rows }], `${fn}.xlsx`);
  };

  const exportOrders = async (type) => {
    const rows = sortOrders(filteredOrders).map(o => ({
      'Order #':        o.order_number,
      'Date':           new Date(o.order_date).toLocaleDateString(),
      'Customer':       o.shipping_full_name || '—',
      'Status':         o.order_status,
      'Payment':        o.payment_method?.toUpperCase(),
      'Payment Status': o.payment_status,
      'Subtotal (₱)':   parseFloat(o.subtotal||0).toFixed(2),
      'Shipping (₱)':   parseFloat(o.shipping_fee||0).toFixed(2),
      'Total (₱)':      parseFloat(o.total_amount||0).toFixed(2),
      'Seller(s)':      (o.sellers||[]).map(s=>s.name).join(' / ') || o.seller_name || '—',
      'Refund Status':  refundMap[o.id]?.status || 'none',
      'Refund Amount (₱)': refundMap[o.id] ? parseFloat(refundMap[o.id].refund_amount||0).toFixed(2) : '—',
    }));
    if (!rows.length) return;
    const fn = `orders_${start}_${end}`;
    if (type === 'csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Orders', data: rows }], `${fn}.xlsx`);
  };

  const exportFinancial = async (type) => {
    const netRevenue = Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(refundStats?.total_refunded||0));
    const rows = [
      { 'Component': 'Gross Revenue',            'Amount (₱)': parseFloat(st.totalRevenue||0).toFixed(2),             'Note': 'All delivered orders before refunds' },
      { 'Component': 'Refunds Issued',            'Amount (₱)': `-${parseFloat(refundStats?.total_refunded||0).toFixed(2)}`, 'Note': `${refundStats?.approved||0} approved refunds` },
      { 'Component': 'Net Revenue',               'Amount (₱)': netRevenue.toFixed(2),                                'Note': 'Gross minus refunds' },
      { 'Component': '─────────────',             'Amount (₱)': '',                                                   'Note': '' },
      { 'Component': 'Seller Revenue (Subtotal)', 'Amount (₱)': parseFloat(st.sellerRevenue||0).toFixed(2),           'Note': 'After refund deductions' },
      { 'Component': 'Platform Fee (10%)',         'Amount (₱)': parseFloat(st.systemCommission||0).toFixed(2),       'Note': 'After refund deductions' },
      { 'Component': 'Shipping Collected',        'Amount (₱)': parseFloat(st.shippingRevenue||0).toFixed(2),         'Note': 'After refund deductions' },
      { 'Component': '─────────────',             'Amount (₱)': '',                                                   'Note': '' },
      { 'Component': 'Refunds Pending Review',    'Amount (₱)': refundStats?.pending||0,                             'Note': 'Awaiting admin decision' },
      { 'Component': 'Refunds With Seller (COD)', 'Amount (₱)': refundStats?.seller_pending||0,                      'Note': 'COD awaiting seller confirmation' },
      { 'Component': 'Refunds Approved',          'Amount (₱)': refundStats?.approved||0,                            'Note': 'Total approved refunds' },
      { 'Component': 'Refunds Rejected',          'Amount (₱)': refundStats?.rejected||0,                            'Note': 'Total rejected refunds' },
      { 'Component': '─────────────',             'Amount (₱)': '',                                                   'Note': '' },
      { 'Component': 'Cancelled Orders',          'Amount (₱)': st.cancelledOrders||0,                               'Note': '' },
      { 'Component': 'Revenue Lost (Cancelled)',  'Amount (₱)': parseFloat(st.cancelledRevenue||0).toFixed(2),       'Note': 'Orders cancelled before delivery' },
      { 'Component': 'Fees Lost (Cancelled)',     'Amount (₱)': parseFloat(st.cancelledFees||0).toFixed(2),          'Note': '10% of cancelled subtotals' },
    ];
    const fn = `financial_report_${start}_${end}`;
    if (type === 'csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Financial Report', data: rows }], `${fn}.xlsx`);
  };

  const exportTransactions = async (type) => {
    const rows = filteredTransactions.map(t => ({
      'Order #':        t.order_number,
      'Amount (₱)':     parseFloat(t.total_amount||0).toFixed(2),
      'Method':         t.payment_method?.toUpperCase(),
      'Payment Status': t.payment_status,
      'Order Status':   t.order_status,
      'Refund Status':  t.refund?.status || 'none',
      'Refund Amount':  t.refund ? parseFloat(t.refund.refund_amount||0).toFixed(2) : '—',
      'Gateway ID':     t.payment_capture_id || t.payment_intent_id || '—',
      'Date':           new Date(t.order_date).toLocaleDateString(),
    }));
    if (!rows.length) return;
    const fn = `transactions_${start}_${end}${txnMethodF !== 'all' ? '_' + txnMethodF : ''}${txnStatusF !== 'all' ? '_' + txnStatusF : ''}`;
    if (type === 'csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Transactions', data: rows }], `${fn}.xlsx`);
  };

  const exportSellersPay = async (type) => {
    const rows = filteredSellersPay.map(s => ({
      'Seller':         s.seller_name,
      'Email':          s.seller_email,
      'GCash Orders':   s.gcash_orders,
      'GCash Rev (₱)':  parseFloat(s.gcash_revenue||0).toFixed(2),
      'PayPal Orders':  s.paypal_orders,
      'PayPal Rev (₱)': parseFloat(s.paypal_revenue||0).toFixed(2),
      'COD Orders':     s.cod_orders || 0,
      'COD Rev (₱)':    parseFloat(s.cod_revenue||0).toFixed(2),
      'Total Orders':   s.total_orders,
      'Total Rev (₱)':  parseFloat(s.total_revenue||0).toFixed(2),
    }));
    if (!rows.length) return;
    const fn = `sellers_payment_${start}_${end}${sellerSearch ? '_filtered' : ''}`;
    if (type === 'csv') exportToCSV(rows, `${fn}.csv`);
    else await exportToExcel([{ name: 'Sellers Payment', data: rows }], `${fn}.xlsx`);
  };

  const exportPayments = async (type) => {
    const fn = `payments_${start}_${end}`;
    const sheets = [
      { name: 'By Seller', data: sellersPay.map(s => ({
          'Seller':          s.seller_name,
          'Email':           s.seller_email,
          'GCash Orders':    s.gcash_orders,
          'GCash Revenue':   parseFloat(s.gcash_revenue||0).toFixed(2),
          'PayPal Orders':   s.paypal_orders,
          'PayPal Revenue':  parseFloat(s.paypal_revenue||0).toFixed(2),
          'COD Orders':      s.cod_orders||0,
          'COD Revenue':     parseFloat(s.cod_revenue||0).toFixed(2),
          'Total Orders':    s.total_orders,
          'Total Revenue':   parseFloat(s.total_revenue||0).toFixed(2),
        }))
      },
      { name: 'Transactions', data: transactions.map(t => ({
          'Order #':         t.order_number,
          'Customer':        t.customer_name || '—',
          'Email':           t.customer_email || '—',
          'Amount (₱)':      parseFloat(t.total_amount||0).toFixed(2),
          'Method':          t.payment_method?.toUpperCase(),
          'Payment Status':  t.payment_status,
          'Order Status':    t.order_status,
          'Refund Status':   t.refund?.status || 'none',
          'Refund Amount':   t.refund ? parseFloat(t.refund.refund_amount||0).toFixed(2) : '—',
          'Intent ID':       t.payment_intent_id||'',
          'Capture ID':      t.payment_capture_id||'',
          'Date':            new Date(t.order_date).toLocaleDateString(),
        }))
      },
    ].filter(s => s.data.length > 0);
    if (!sheets.length) return;
    if (type==='csv') {
      sheets.forEach(s => exportToCSV(s.data, `${fn}_${s.name.toLowerCase().replace(' ','_')}.csv`));
    } else {
      await exportToExcel(sheets, `${fn}.xlsx`);
    }
  };

  const exportFullReport = async () => {
    const sheets = [];
    // Add financial summary as first detailed sheet
    const netRev = Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(refundStats?.total_refunded||0));
    sheets.unshift({ name: 'Financial Summary', data: [
      { 'Item': 'Gross Revenue',            'Amount': parseFloat(st.totalRevenue||0).toFixed(2) },
      { 'Item': 'Total Refunded',           'Amount': `-${parseFloat(refundStats?.total_refunded||0).toFixed(2)}` },
      { 'Item': 'Net Revenue',              'Amount': netRev.toFixed(2) },
      { 'Item': 'Platform Fee (net)',        'Amount': parseFloat(st.systemCommission||0).toFixed(2) },
      { 'Item': 'Seller Revenue (net)',     'Amount': parseFloat(st.sellerRevenue||0).toFixed(2) },
      { 'Item': 'Shipping (net)',           'Amount': parseFloat(st.shippingRevenue||0).toFixed(2) },
      { 'Item': 'Cancelled Revenue Lost',   'Amount': parseFloat(st.cancelledRevenue||0).toFixed(2) },
      { 'Item': 'Cancelled Fees Lost',      'Amount': parseFloat(st.cancelledFees||0).toFixed(2) },
      { 'Item': 'Refunds Approved',         'Amount': refundStats?.approved||0 },
      { 'Item': 'Refunds Pending',          'Amount': refundStats?.pending||0 },
    ]});
    if (salesData.length) sheets.push({ name: 'Sales by Period', data: salesData.map(d=>({'Period':d.month||d.label||'','Revenue':d.revenue||0,'Commission':d.commission||0,'Orders':d.orders||0})) });
    if (orderStatus.length) sheets.push({ name: 'Order Status', data: orderStatus.map(d=>({'Status':d.status,'Count':d.count,'Revenue':parseFloat(d.revenue||0).toFixed(2)})) });
    if (topProducts.length) sheets.push({ name: 'Top Products', data: topProducts.map((p,i)=>({'Rank':i+1,'Product':p.name,'Units':p.sales,'Revenue':p.revenue})) });
    if (topSellers.length) sheets.push({ name: 'Top Sellers', data: topSellers.map((s,i)=>({'Rank':i+1,'Seller':s.seller_name,'Orders':s.total_orders,'Items':s.items_sold,'Revenue':parseFloat(s.total_revenue||0).toFixed(2)})) });
    if (categories.length) sheets.push({ name: 'Categories', data: categories.map(c=>({'Category':c.name,'Share (%)':c.value,'Revenue':c.revenue||''})) });
    if (sellersPay.length) sheets.push({ name: 'Payments by Seller', data: sellersPay.map(s=>({'Seller':s.seller_name,'GCash Orders':s.gcash_orders,'GCash Rev':s.gcash_revenue,'PayPal Orders':s.paypal_orders,'PayPal Rev':s.paypal_revenue,'COD Orders':s.cod_orders||0,'Total':s.total_revenue})) });
    if (transactions.length) sheets.push({ name: 'Transactions', data: transactions.map(t=>({'Order#':t.order_number,'Amount':t.total_amount,'Method':t.payment_method,'Status':t.payment_status,'Date':new Date(t.order_date).toLocaleDateString()})) });
    sheets.unshift({ name: 'Summary', data: [{
      'Period': `${start} to ${end}`,
      'Total Revenue': parseFloat(st.totalRevenue||0).toFixed(2),
      'Platform Fees': parseFloat(st.systemCommission||0).toFixed(2),
      'Seller Revenue': parseFloat(st.sellerRevenue||0).toFixed(2),
      'Shipping': parseFloat(st.shippingRevenue||0).toFixed(2),
      'Total Orders': st.totalOrders||0,
      'Delivered': st.deliveredOrders||0,
      'Cancelled': st.cancelledOrders||0,
      'Products Sold': st.productsSold||0,
      'Avg Order Value': parseFloat(st.avgOrderValue||0).toFixed(2),
    }]});
    await exportToExcel(sheets, `full_report_${start}_${end}.xlsx`);
  };

  const st = summary || {};
  const chartLabel = groupBy==='week' ? 'label' : 'month';

  // Filtered orders for the orders table
  const filteredOrders = orders.filter(o => {
    const matchSearch = !ordersSearch ||
      o.order_number?.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      o.shipping_full_name?.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      o.shipping_email?.toLowerCase().includes(ordersSearch.toLowerCase());
    const matchStatus = ordersStatusF   === 'all' || o.order_status   === ordersStatusF;
    const matchPay    = ordersPayF      === 'all' || o.payment_method === ordersPayF;
    const matchSeller = ordersSellerF   === 'all' || o.seller_id      === ordersSellerF ||
                        o.sellers?.some?.(s => s.id === ordersSellerF);
    return matchSearch && matchStatus && matchPay && matchSeller;
  });
  const sortedOrders = sortOrders(filteredOrders);
  const years = [new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2];

  // Filtered transactions for payment tab
  const filteredTransactions = transactions.filter(t => {
    const matchMethod = txnMethodF === 'all' || t.payment_method?.toLowerCase() === txnMethodF;
    const matchStatus = txnStatusF === 'all' || t.order_status?.toLowerCase() === txnStatusF ||
                        (txnStatusF === 'cancelled' && ['cancelled','canceled'].includes(t.order_status?.toLowerCase()));
    const matchSearch = !txnSearch ||
      t.order_number?.toLowerCase().includes(txnSearch.toLowerCase());
    return matchMethod && matchStatus && matchSearch;
  });

  // Filtered sellers for payment tab
  const filteredSellersPay = sellersPay.filter(s =>
    !sellerSearch ||
    s.seller_name?.toLowerCase().includes(sellerSearch.toLowerCase()) ||
    s.seller_email?.toLowerCase().includes(sellerSearch.toLowerCase())
  );

  const TABS = [
    { k:'overview',  l:'Overview'           },
    { k:'orders',    l:'Orders'             },
    { k:'products',  l:'Products & Sellers' },
    { k:'financial', l:'Financial'          },
    { k:'payments',  l:'Payments'           },
    { k:'logs',      l:'Activity Logs'      },
  ];

  // Fetch logs when switching to the logs tab
  useEffect(() => {
    if (activeTab === 'logs') fetchLogs(logCategory, logRole, 0);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide performance dashboard</p>
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

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>
      )}

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
            <StatCard label="Total Revenue"     value={currency(st.totalRevenue)}    sub={`${st.totalOrders||0} delivered orders`}   icon="₱" color="blue"   badge={st.revenueGrowth}/>
            <StatCard label="Platform Fees"     value={currency(st.systemCommission)} sub="10% of subtotal collected"                icon="%" color="amber"  />
            <StatCard label="Products Sold"     value={num(st.productsSold)}          sub="Items delivered"                          icon="📦" color="purple"/>
            <StatCard label="Avg Order Value"   value={currency(st.avgOrderValue)}    sub="Per delivered order"                      icon="📊" color="green" />
          </div>

          {/* Revenue over time */}
          <Card>
            <CardHeader title="Revenue Over Time" sub={groupBy==='month'?`Monthly · ${year}`: `Weekly · ${start} → ${end}`}>
              <div className="flex flex-wrap gap-2">
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
                  <option value="commission">Commission</option>
                  <option value="orders">Orders</option>
                </select>
              </div>
              <ExportGroup onExcel={()=>exportSalesData('excel')} onCSV={()=>exportSalesData('csv')}/>
            </CardHeader>
            <div className="p-6">
              {salesData.length>0
                ? <BarChart data={salesData} valueKey={metric} labelKey={chartLabel} color={metric==='orders'?'#8b5cf6':'#3b82f6'} prefix={metric==='orders'?'':'₱'}/>
                : <p className="text-center text-gray-400 py-10 text-sm">No data for this period</p>}
            </div>
          </Card>

          {/* Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Sales by Category" sub="% of delivered items sold"/>
              <div className="p-6">
                {categories.length>0
                  ? <DonutChart data={categories}/>
                  : <p className="text-center text-gray-400 py-10 text-sm">No category data</p>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Order Status" sub="All orders this period"/>
              <div className="p-6">
                {orderStatus.length>0
                  ? <StatusFunnel data={orderStatus}/>
                  : <p className="text-center text-gray-400 py-10 text-sm">No order data</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══ ORDERS TAB ════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Status summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label:'Pending',    key:'pendingOrders',    icon:'⏳', color:'amber'  },
              { label:'Processing', key:'processingOrders', icon:'⚙️',  color:'blue'   },
              { label:'Shipped',    key:'shippedOrders',    icon:'🚚', color:'purple' },
              { label:'Delivered',  key:'deliveredOrders',  icon:'✅', color:'green'  },
              { label:'Cancelled',  key:'cancelledOrders',  icon:'❌', color:'red'    },
            ].map(item=>(
              <StatCard key={item.key} label={item.label} value={num(st[item.key]||0)} icon={item.icon} color={item.color}/>
            ))}
          </div>

          {/* Status chart */}
          <Card>
            <CardHeader title="Orders by Status" sub="Count and revenue per status"><ExportGroup onExcel={()=>exportOrderStatus('excel')} onCSV={()=>exportOrderStatus('csv')}/></CardHeader>
            <div className="p-6">
              {orderStatus.length>0 ? (
                <>
                  <StatusFunnel data={orderStatus}/>
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Count</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orderStatus.map((row,i)=>{
                          const total = orderStatus.reduce((s,r)=>s+r.count,0);
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3"><Badge label={row.status}/></td>
                              <td className="px-4 py-3 text-center font-semibold text-gray-900">{row.count}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{currency(row.revenue)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{total>0?((row.count/total)*100).toFixed(1):0}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="text-center text-gray-400 py-10 text-sm">No order data</p>}
            </div>
          </Card>

          {/* Cancellations impact */}
          <Card>
            <CardHeader title="Cancellations Impact" sub="Revenue and fees lost from cancelled orders"/>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Cancelled Orders</p>
                  <p className="text-3xl font-bold text-red-700">{num(st.cancelledOrders||0)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-orange-500 uppercase tracking-wide mb-1">Revenue Lost</p>
                  <p className="text-3xl font-bold text-orange-700">{currency(st.cancelledRevenue||0)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Fees Lost</p>
                  <p className="text-3xl font-bold text-amber-700">{currency(st.cancelledFees||0)}</p>
                </div>
              </div>
              {/* Cancellation rate */}
              {(() => {
                const total = (st.totalOrders||0) + (st.cancelledOrders||0);
                const rate  = total>0 ? ((st.cancelledOrders||0)/total*100).toFixed(1) : 0;
                return (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Cancellation Rate</p>
                      <p className="text-xs text-gray-400">Cancelled / Total Orders</p>
                    </div>
                    <span className={`text-2xl font-bold ${parseFloat(rate)>10?'text-red-600':parseFloat(rate)>5?'text-amber-600':'text-green-600'}`}>
                      {rate}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Avg order value */}
          <Card>
            <CardHeader title="Average Order Value" sub="Per delivered order this period"/>
            <div className="p-6">
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-blue-600 mb-2">{currency(st.avgOrderValue||0)}</p>
                  <p className="text-sm text-gray-500">Average order value · {num(st.deliveredOrders||0)} delivered orders</p>
                  <p className="text-xs text-gray-400 mt-1">Total Revenue {currency(st.totalRevenue||0)} ÷ {num(st.deliveredOrders||0)} orders</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── All Orders Table ── */}
          <Card>
            <CardHeader title="All Orders" sub={`${filteredOrders.length} orders matching filters`}>
              <ExportGroup onExcel={()=>exportOrders('excel')} onCSV={()=>exportOrders('csv')}/>
            </CardHeader>
            <div className="p-4 border-b border-gray-100 space-y-3">
              {/* Row 1: Search */}
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text"
                  placeholder="Search by order #, customer name, or email..."
                  value={ordersSearch} onChange={e=>setOrdersSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              {/* Row 2: Dropdowns */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Order Status */}
                <select value={ordersStatusF} onChange={e=>setOrdersStatusF(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {/* Payment Method */}
                <select value={ordersPayF} onChange={e=>setOrdersPayF(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                  <option value="all">All Payments</option>
                  <option value="gcash">GCash</option>
                  <option value="paypal">PayPal</option>
                  <option value="cod">COD</option>
                </select>
                {/* Seller Filter — populated from order data */}
                <select value={ordersSellerF} onChange={e=>setOrdersSellerF(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 max-w-[200px]">
                  <option value="all">All Sellers</option>
                  {sellerList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {/* Active filters summary */}
                <div className="ml-auto flex items-center gap-2">
                  {(ordersSearch || ordersStatusF !== 'all' || ordersPayF !== 'all' || ordersSellerF !== 'all') && (
                    <>
                      <span className="text-xs text-gray-500">{filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => { setOrdersSearch(''); setOrdersStatusF('all'); setOrdersPayF('all'); setOrdersSellerF('all'); }}
                        className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                        Clear all filters
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Active filter chips */}
              {(ordersStatusF !== 'all' || ordersPayF !== 'all' || ordersSellerF !== 'all') && (
                <div className="flex flex-wrap gap-1.5">
                  {ordersStatusF !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                      Status: {ordersStatusF}
                      <button onClick={()=>setOrdersStatusF('all')} className="hover:text-blue-900 ml-0.5">×</button>
                    </span>
                  )}
                  {ordersPayF !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                      Payment: {ordersPayF.toUpperCase()}
                      <button onClick={()=>setOrdersPayF('all')} className="hover:text-purple-900 ml-0.5">×</button>
                    </span>
                  )}
                  {ordersSellerF !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                      Seller: {sellerList.find(s=>s.id===ordersSellerF)?.name || ordersSellerF}
                      <button onClick={()=>setOrdersSellerF('all')} className="hover:text-green-900 ml-0.5">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">{orders.length === 0 ? 'No orders data — date range may be outside available records' : 'No orders match your filters'}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th onClick={() => toggleOrdersSort('order_number')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center gap-1">
                          Order #
                          {ordersSortKey === 'order_number' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('order_date')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center gap-1">
                          Date
                          {ordersSortKey === 'order_date' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('customer')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center gap-1">
                          Customer
                          {ordersSortKey === 'customer' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('status')}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center justify-center gap-1">
                          Status
                          {ordersSortKey === 'status' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('payment')}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center justify-center gap-1">
                          Payment
                          {ordersSortKey === 'payment' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('total')}
                        className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {ordersSortKey === 'total' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('seller')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center gap-1">
                          Seller
                          {ordersSortKey === 'seller' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleOrdersSort('refund')}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none">
                        <div className="flex items-center justify-center gap-1">
                          Refund
                          {ordersSortKey === 'refund' && (
                            <span className="text-[10px]">{ordersSortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedOrders.slice(0, 100).map((o, i) => {
                      const refund = refundMap[o.id];
                      const refundColors = {
                        seller_pending: 'bg-blue-100 text-blue-800',
                        pending:        'bg-amber-100 text-amber-800',
                        approved:       'bg-green-100 text-green-800',
                        rejected:       'bg-red-100 text-red-800',
                      };
                      const orderStatusColors = {
                        pending:    'bg-amber-100 text-amber-800',
                        processing: 'bg-blue-100 text-blue-800',
                        shipped:    'bg-purple-100 text-purple-800',
                        delivered:  'bg-green-100 text-green-800',
                        cancelled:  'bg-red-100 text-red-800',
                      };
                      const payColors = {
                        gcash:  'bg-blue-100 text-blue-800',
                        paypal: 'bg-indigo-100 text-indigo-800',
                        cod:    'bg-amber-100 text-amber-800',
                      };
                      return (
                        <tr key={o.id || i}
                          className={`hover:bg-gray-50 transition ${
                            refund?.status === 'pending' ? 'bg-amber-50/30' :
                            refund?.status === 'approved' ? 'bg-green-50/20' : ''
                          }`}>
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold text-gray-900">{o.order_number}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(o.order_date).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{o.shipping_full_name || '—'}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{o.shipping_email || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusColors[o.order_status] || 'bg-gray-100 text-gray-700'}`}>
                              {o.order_status?.charAt(0).toUpperCase() + o.order_status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${payColors[o.payment_method] || 'bg-gray-100 text-gray-700'}`}>
                              {o.payment_method?.toUpperCase()}
                            </span>
                            <p className={`text-[10px] mt-0.5 ${o.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {o.payment_status}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-gray-900 text-sm">{currency(o.total_amount)}</p>
                          </td>
                          <td className="px-4 py-3">
                            {o.sellers && o.sellers.length > 0 ? (
                              <div>
                                {o.sellers.slice(0, 2).map((s, si) => (
                                  <p key={si}
                                    className={`text-xs truncate max-w-[130px] cursor-pointer ${ordersSellerF === s.id ? 'font-bold text-blue-700' : 'text-gray-700 hover:text-blue-600'}`}
                                    onClick={() => setOrdersSellerF(ordersSellerF === s.id ? 'all' : s.id)}
                                    title={`Filter by ${s.name}`}>
                                    {s.name}
                                  </p>
                                ))}
                                {o.sellers.length > 2 && (
                                  <p className="text-[10px] text-gray-400">+{o.sellers.length - 2} more</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {refund ? (
                              <div>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${refundColors[refund.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {refund.status === 'seller_pending' ? 'With Seller' :
                                   refund.status === 'pending'        ? 'Pending'     :
                                   refund.status === 'approved'       ? 'Approved'    :
                                   refund.status === 'rejected'       ? 'Rejected'    : refund.status}
                                </span>
                                <p className="text-[10px] text-gray-500 mt-0.5">{currency(refund.refund_amount)}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {filteredOrders.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-500">Showing 100 of {filteredOrders.length} orders — use filters or export to see all</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ══ PRODUCTS & SELLERS TAB ════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader title="Best Selling Products" sub="By revenue · delivered orders"><ExportGroup onExcel={()=>exportProducts('excel')} onCSV={()=>exportProducts('csv')}/></CardHeader>
              <div className="p-6">
                {topProducts.length>0 ? (
                  <>
                    {topProducts.slice(0,8).map((p,i)=>(
                      <HBar key={i} label={`${i+1}. ${p.name}`}
                        value={parseFloat(p.revenue)}
                        max={parseFloat(topProducts[0].revenue)}
                        color="#3b82f6" prefix="₱"/>
                    ))}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Units</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {topProducts.map((p,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                              <td className="px-3 py-2 text-sm text-gray-800 font-medium truncate max-w-[150px]">{p.name}</td>
                              <td className="px-3 py-2 text-right text-sm text-gray-600">{num(p.sales)}</td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">{currency(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <p className="text-center text-gray-400 py-10 text-sm">No product data</p>}
              </div>
            </Card>

            {/* Top Sellers */}
            <Card>
              <CardHeader title="Top Sellers / Stores" sub="By revenue · delivered orders"><ExportGroup onExcel={()=>exportSellers('excel')} onCSV={()=>exportSellers('csv')}/></CardHeader>
              <div className="p-6">
                {topSellers.length>0 ? (
                  <>
                    {topSellers.slice(0,8).map((s,i)=>(
                      <HBar key={i} label={`${i+1}. ${s.seller_name}`}
                        value={parseFloat(s.total_revenue)}
                        max={parseFloat(topSellers[0].total_revenue)}
                        color="#10b981" prefix="₱"/>
                    ))}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Seller</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Orders</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Items</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {topSellers.map((s,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{s.seller_name}</p>
                                <p className="text-xs text-gray-400">{s.seller_email}</p>
                              </td>
                              <td className="px-3 py-2 text-right text-sm text-gray-600">{num(s.total_orders)}</td>
                              <td className="px-3 py-2 text-right text-sm text-gray-600">{num(s.items_sold)}</td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">{currency(s.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <p className="text-center text-gray-400 py-10 text-sm">No seller data</p>}
              </div>
            </Card>
          </div>

          {/* Category breakdown */}
          <Card>
            <CardHeader title="Sales by Category" sub="Revenue share from delivered orders"/>
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

      {/* ══ FINANCIAL TAB ═════════════════════════════════════════════════════ */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Revenue breakdown cards */}
          {/* Top-level financial summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gross Revenue"      value={currency(st.totalRevenue)}    sub="Before refunds"         icon="₱"  color="blue"   badge={st.revenueGrowth}/>
            <StatCard label="Total Refunded"     value={currency(parseFloat(refundStats?.total_refunded||0))} sub={`${(refundStats?.approved||0)} approved · delivered orders only`} icon="↩" color="red"/>
            <StatCard label="Net Revenue"        value={currency(Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(parseFloat(refundStats?.total_refunded||0))))} sub="After refunds" icon="✅" color="green"/>
            <StatCard label="Platform Fees"      value={currency(st.systemCommission)} sub="10% of subtotal"      icon="%" color="amber"  />
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader title="Revenue Over Time" sub="Platform-wide revenue from delivered orders">
              <div className="flex gap-2">
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
              </div>
            </CardHeader>
            <div className="p-6">
              {salesData.length>0
                ? <BarChart data={salesData} valueKey="revenue" labelKey={chartLabel} color="#3b82f6" prefix="₱"/>
                : <p className="text-center text-gray-400 py-10 text-sm">No data</p>}
            </div>
          </Card>

          {/* Commission chart */}
          <Card>
            <CardHeader title="Platform Commission Over Time" sub="10% fee collected per delivered order"/>
            <div className="p-6">
              {salesData.length>0
                ? <BarChart data={salesData} valueKey="commission" labelKey={chartLabel} color="#f59e0b" prefix="₱"/>
                : <p className="text-center text-gray-400 py-10 text-sm">No data</p>}
            </div>
          </Card>

          {/* Revenue breakdown table */}
          <Card>
            <CardHeader title="Revenue Breakdown" sub="Where the money comes from">
              <div className="flex items-center gap-2">
                <ExportGroup onExcel={()=>exportFinancial('excel')} onCSV={()=>exportFinancial('csv')}/>
              </div>
            </CardHeader>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Component</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: 'Product Subtotal (Seller Revenue)', val: st.sellerRevenue,    color:'#10b981' },
                    { label: 'Platform Fee (10%)',                val: st.systemCommission, color:'#f59e0b' },
                    { label: 'Shipping Fee',                      val: st.shippingRevenue,  color:'#8b5cf6' },
                  ].map((row,i)=>{
                    const total = parseFloat(st.totalRevenue)||1;
                    const pct   = ((parseFloat(row.val)||0)/total*100).toFixed(1);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:row.color}}/>
                          <span className="text-gray-700 font-medium">{row.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{currency(row.val||0)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 font-bold text-blue-900">Gross Revenue</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-900">{currency(st.totalRevenue||0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-900">100%</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-red-400"/>
                      <span className="text-red-700 font-medium">Refunds Issued</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">- {currency(parseFloat(refundStats?.total_refunded||0))}</td>
                    <td className="px-4 py-3 text-right text-red-500">
                      {parseFloat(st.totalRevenue||0)>0?((parseFloat(parseFloat(refundStats?.total_refunded||0))/parseFloat(st.totalRevenue||1))*100).toFixed(1):0}%
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-bold text-green-900">Net Revenue</td>
                    <td className="px-4 py-3 text-right font-bold text-green-900">
                      {currency(Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(parseFloat(refundStats?.total_refunded||0))))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-900">
                      {parseFloat(st.totalRevenue||0)>0?(((parseFloat(st.totalRevenue||0)-parseFloat(parseFloat(refundStats?.total_refunded||0)))/parseFloat(st.totalRevenue||1))*100).toFixed(1):100}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Refunds financial impact */}
          <Card>
            <CardHeader title="Refunds Impact" sub="Money returned to customers after delivery">
              <ExportGroup onExcel={()=>exportFinancial('excel')} onCSV={()=>exportFinancial('csv')}/>
            </CardHeader>
            <div className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Total Refunded</p>
                  <p className="text-3xl font-bold text-red-700">{currency(parseFloat(refundStats?.total_refunded||0))}</p>
                  <p className="text-xs text-red-400 mt-1">{(refundStats?.approved||0)} approved refunds</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-700">{(refundStats?.pending||0)}</p>
                  <p className="text-xs text-amber-500 mt-1">awaiting admin decision</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">With Seller (COD)</p>
                  <p className="text-3xl font-bold text-blue-700">{(refundStats?.seller_pending||0)}</p>
                  <p className="text-xs text-blue-500 mt-1">awaiting seller confirmation</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Net Revenue</p>
                  <p className="text-3xl font-bold text-green-700">
                    {currency(Math.max(0, parseFloat(st.totalRevenue||0) - parseFloat(parseFloat(refundStats?.total_refunded||0))))}
                  </p>
                  <p className="text-xs text-green-500 mt-1">gross minus refunds</p>
                </div>
              </div>

              {/* Refund rate */}
              {(() => {
                const refundRate = (st.totalOrders||0) > 0
                  ? ((((refundStats?.approved||0)) / (st.totalOrders||1)) * 100).toFixed(1)
                  : '0.0';
                const refundPct  = (st.totalRevenue||0) > 0
                  ? ((parseFloat(parseFloat(refundStats?.total_refunded||0)) / parseFloat(st.totalRevenue||1)) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Refund Rate</p>
                        <p className="text-xs text-gray-400">Refunded orders / Total delivered</p>
                      </div>
                      <span className={`text-2xl font-bold ${parseFloat(refundRate)>10?'text-red-600':parseFloat(refundRate)>5?'text-amber-600':'text-green-600'}`}>
                        {refundRate}%
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Revenue Refunded</p>
                        <p className="text-xs text-gray-400">Total refunded / Gross revenue</p>
                      </div>
                      <span className={`text-2xl font-bold ${parseFloat(refundPct)>10?'text-red-600':parseFloat(refundPct)>5?'text-amber-600':'text-green-600'}`}>
                        {refundPct}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Cancellation financial impact */}
          <Card>
            <CardHeader title="Cancellation Financial Impact" sub="Revenue and fees not collected due to cancelled orders"/>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Revenue Lost</p>
                  <p className="text-3xl font-bold text-red-700">{currency(st.cancelledRevenue||0)}</p>
                  <p className="text-xs text-red-400 mt-1">{num(st.cancelledOrders||0)} cancelled orders</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Platform Fees Lost</p>
                  <p className="text-3xl font-bold text-amber-700">{currency(st.cancelledFees||0)}</p>
                  <p className="text-xs text-amber-500 mt-1">10% of cancelled subtotals</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cancellation Rate</p>
                  {(() => {
                    const total = (st.totalOrders||0)+(st.cancelledOrders||0);
                    const rate  = total>0?((st.cancelledOrders||0)/total*100).toFixed(1):0;
                    return (
                      <>
                        <p className={`text-3xl font-bold ${parseFloat(rate)>10?'text-red-600':parseFloat(rate)>5?'text-amber-600':'text-green-600'}`}>{rate}%</p>
                        <p className="text-xs text-gray-400 mt-1">of all orders</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══ PAYMENTS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment method summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { method:'GCash',  orders: st.gcashOrders,  revenue: st.gcashRevenue,  color:'#3b82f6', icon:'G' },
              { method:'PayPal', orders: st.paypalOrders, revenue: st.paypalRevenue, color:'#6366f1', icon:'P' },
              { method:'COD',    orders: st.codOrders,    revenue: st.codRevenue,    color:'#f59e0b', icon:'C' },
            ].map((pm,i)=>{
              const total = (st.gcashOrders||0)+(st.paypalOrders||0)+(st.codOrders||0);
              const pct   = total>0?((pm.orders||0)/total*100).toFixed(1):0;
              return (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base" style={{backgroundColor:pm.color}}>{pm.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-900">{pm.method}</p>
                      <p className="text-xs text-gray-400">{pm.orders||0} orders · {pct}%</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{currency(pm.revenue||0)}</p>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{width:`${pct}%`,backgroundColor:pm.color}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment breakdown chart */}
          <Card>
            <CardHeader title="Revenue by Payment Method" sub="Delivered orders only"/>
            <div className="p-6">
              {payBreakdown.length>0 ? (
                <>
                  <BarChart data={payBreakdown} valueKey="revenue" labelKey="method" color="#3b82f6" prefix="₱"/>
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Commission</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payBreakdown.map((row,i)=>(
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><Badge label={row.method.toLowerCase()}/></td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">{row.orders}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{currency(row.revenue)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{currency(row.commission)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{row.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Orders</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { method:'GCash',  orders:st.gcashOrders||0,  revenue:st.gcashRevenue||0  },
                        { method:'PayPal', orders:st.paypalOrders||0, revenue:st.paypalRevenue||0 },
                        { method:'COD',    orders:st.codOrders||0,    revenue:st.codRevenue||0    },
                      ].map((row,i)=>{
                        const total=(st.gcashOrders||0)+(st.paypalOrders||0)+(st.codOrders||0);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><Badge label={row.method.toLowerCase()}/></td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">{row.orders}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{currency(row.revenue)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{total>0?((row.orders/total)*100).toFixed(1):0}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* View toggle: seller summary / transactions */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Payment Tracking</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Tab toggle */}
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    {[
                      {k:'breakdown',    l:`By Seller (${filteredSellersPay.length})`},
                      {k:'transactions', l:`Transactions (${filteredTransactions.length})`}
                    ].map(v=>(
                      <button key={v.k} onClick={()=>setPayView(v.k)}
                        className={`px-4 py-2 text-xs font-medium transition ${payView===v.k?'bg-blue-600 text-white':'bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {v.l}
                      </button>
                    ))}
                  </div>
                  {/* Context-aware export */}
                  {payView === 'breakdown'
                    ? <ExportGroup onExcel={()=>exportSellersPay('excel')} onCSV={()=>exportSellersPay('csv')}/>
                    : <ExportGroup onExcel={()=>exportTransactions('excel')} onCSV={()=>exportTransactions('csv')}/>
                  }
                </div>
              </div>

              {/* ── Filters row ── */}
              {payView === 'transactions' && (
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text" placeholder="Search order #..."
                      value={txnSearch} onChange={e=>setTxnSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  {/* Method filter */}
                  <select value={txnMethodF} onChange={e=>setTxnMethodF(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                    <option value="all">All Methods</option>
                    <option value="gcash">GCash</option>
                    <option value="paypal">PayPal</option>
                    <option value="cod">COD</option>
                  </select>
                  {/* Order status filter */}
                  <select value={txnStatusF} onChange={e=>setTxnStatusF(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {/* Clear filters */}
                  {(txnSearch || txnMethodF !== 'all' || txnStatusF !== 'all') && (
                    <button onClick={()=>{setTxnSearch('');setTxnMethodF('all');setTxnStatusF('all');}}
                      className="text-xs px-2.5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                      Clear
                    </button>
                  )}
                  <span className="ml-auto text-xs text-gray-400">{filteredTransactions.length} result{filteredTransactions.length!==1?'s':''}</span>
                </div>
              )}

              {/* ── Seller search ── */}
              {payView === 'breakdown' && (
                <div className="relative">
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Search seller name or email..."
                    value={sellerSearch} onChange={e=>setSellerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              )}
            </div>
            <div className="p-6">
              {payView === 'breakdown' ? (
                filteredSellersPay.length>0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Seller</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">GCash Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">GCash Revenue</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">PayPal Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">PayPal Revenue</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">COD Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase bg-blue-50">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredSellersPay.map((s,i)=>(
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-sm">{s.seller_name}</p>
                              <p className="text-xs text-gray-400">{s.seller_email}</p>
                            </td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.gcash_orders>0?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-400'}`}>{s.gcash_orders}</span></td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">{currency(s.gcash_revenue)}</td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.paypal_orders>0?'bg-indigo-100 text-indigo-800':'bg-gray-100 text-gray-400'}`}>{s.paypal_orders}</span></td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">{currency(s.paypal_revenue)}</td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cod_orders>0?'bg-amber-100 text-amber-800':'bg-gray-100 text-gray-400'}`}>{s.cod_orders}</span></td>
                            <td className="px-4 py-3 text-right bg-blue-50 font-bold text-blue-900">{currency(s.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-center text-gray-400 py-10 text-sm">{sellerSearch ? 'No sellers match your search' : 'No seller payment data'}</p>
              ) : (
                filteredTransactions.length>0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Method</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payment</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Order Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Refund</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gateway ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map((t,i)=>{
                          const orderStatusColors = {
                            pending:    'bg-amber-100 text-amber-800',
                            processing: 'bg-blue-100 text-blue-800',
                            shipped:    'bg-purple-100 text-purple-800',
                            delivered:  'bg-green-100 text-green-800',
                            cancelled:  'bg-red-100 text-red-800',
                            canceled:   'bg-red-100 text-red-800',
                          };
                          const refundColors = {
                            pending:        'bg-amber-100 text-amber-800',
                            seller_pending: 'bg-blue-100 text-blue-800',
                            approved:       'bg-green-100 text-green-800',
                            rejected:       'bg-red-100 text-red-800',
                          };
                          const orderStatus   = String(t.order_status || '');
                          const isRefundApproved = t.refund?.status === 'approved';
                          // "Refund needed" only if: cancelled + paid + NO approved refund yet
                          const cancelledPaid = ['cancelled','canceled'].includes(orderStatus.toLowerCase()) &&
                            t.payment_status === 'paid' &&
                            !isRefundApproved &&
                            t.payment_method !== 'cod';  // COD cancelled = no online payment
                          const pendingPaid   = orderStatus.toLowerCase() === 'pending' &&
                            t.payment_status === 'paid';

                          return (
                            <tr key={i} className={`hover:bg-gray-50 transition ${
                              cancelledPaid ? 'bg-red-50/40' : pendingPaid ? 'bg-amber-50/30' : ''
                            }`}>
                              <td className="px-4 py-3">
                                <p className="font-mono text-xs font-semibold text-gray-900">{t.order_number}</p>
                                {cancelledPaid && (
                                  <span className="inline-flex mt-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded">
                                    ⚠️ Refund needed
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <p className="font-semibold text-gray-900">{currency(t.total_amount)}</p>
                              </td>
                              <td className="px-4 py-3 text-center"><Badge label={t.payment_method}/></td>
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
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    orderStatusColors[orderStatus.toLowerCase()] || 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                                  </span>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {t.refund ? (
                                  <div>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      refundColors[t.refund.status] || 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {t.refund.status === 'approved'       ? '↩ Refunded'  :
                                       t.refund.status === 'pending'        ? '⏳ Pending'   :
                                       t.refund.status === 'seller_pending' ? '📦 With Seller':
                                       t.refund.status === 'rejected'       ? '✗ Rejected'  : t.refund.status}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{currency(t.refund.refund_amount)}</p>
                                  </div>
                                ) : <span className="text-[10px] text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                {t.payment_capture_id
                                  ? <p className="font-mono text-[10px] text-green-600 truncate max-w-[130px]" title={t.payment_capture_id}>{t.payment_capture_id}</p>
                                  : t.payment_intent_id
                                  ? <p className="font-mono text-[10px] text-gray-400 truncate max-w-[130px]" title={t.payment_intent_id}>{t.payment_intent_id}</p>
                                  : <span className="text-[10px] text-gray-300">—</span>
                                }
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(t.order_date).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-center text-gray-400 py-10 text-sm">{txnSearch || txnMethodF !== 'all' || txnStatusF !== 'all' ? 'No transactions match your filters' : 'No transactions found'}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ══ ACTIVITY LOGS TAB ══════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <div className="px-5 py-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter:</span>
              {/* Category */}
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
              {/* Role */}
              <select value={logRole}
                onChange={e => { setLogRole(e.target.value); fetchLogs(logCategory, e.target.value, 0); }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
              {/* Reset */}
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
          </Card>

          {/* Logs Table */}
          <Card>
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
                      {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log, i) => {
                      const catColors = {
                        auth:    'bg-green-100 text-green-800',
                        order:   'bg-blue-100 text-blue-800',
                        refund:  'bg-orange-100 text-orange-800',
                        product: 'bg-purple-100 text-purple-800',
                        user:    'bg-gray-100 text-gray-700',
                      };
                      const roleColors = {
                        admin:  'bg-purple-100 text-purple-700',
                        seller: 'bg-blue-100 text-blue-700',
                        buyer:  'bg-green-100 text-green-700',
                      };
                      const actionIcon = {
                        refund_approved:        '✅',
                        refund_rejected:        '❌',
                        refund_submitted:       '📋',
                        refund_return_confirmed:'📦',
                        order_created:          '🛒',
                        order_cancelled:        '❌',
                        order_status_delivered: '✅',
                        order_status_shipped:   '🚚',
                        user_registered:        '👤',
                        user_blocked:           '🚫',
                        user_unblocked:         '✅',
                        product_approved:       '✅',
                        product_rejected:       '❌',
                        product_created_approved:'📦',
                        product_deleted:        '🗑️',
                      };
                      return (
                        <tr key={log.id || i} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            <p>{new Date(log.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric' })}</p>
                            <p className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                              {log.user?.full_name || 'System'}
                            </p>
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[log.role] || 'bg-gray-100 text-gray-600'}`}>
                              {log.role || 'system'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${catColors[log.category] || 'bg-gray-100 text-gray-700'}`}>
                              {log.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-700 whitespace-nowrap">
                              {actionIcon[log.action] || '•'} {log.action?.replace(/_/g, ' ')}
                            </p>
                          </td>
                          <td className="px-4 py-3 max-w-[280px]">
                            <p className="text-xs text-gray-700 truncate" title={log.description}>
                              {log.description}
                            </p>
                            {/* Show key metadata inline */}
                            {log.metadata?.amount && (
                              <p className="text-[10px] text-gray-400 mt-0.5">₱{parseFloat(log.metadata.amount).toFixed(2)}</p>
                            )}
                          </td>
                          {/* <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">
                            {log.ip_address || '—'}
                          </td> */}
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
          </Card>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"/>
            <span className="text-sm font-medium text-gray-700">Loading reports...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;