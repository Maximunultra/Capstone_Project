import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Upload, X, AlertCircle, RefreshCw, Eye } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const currency = (v) =>
  new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:2 }).format(parseFloat(v)||0);

const StatusBadge = ({ status }) => {
  const cfg = {
    seller_pending: { cls:'bg-amber-100 text-amber-800 border-amber-200', label:'Awaiting Your Confirmation' },
    pending:        { cls:'bg-blue-100 text-blue-800 border-blue-200',    label:'Sent to Admin'             },
    approved:       { cls:'bg-green-100 text-green-800 border-green-200', label:'Approved'                  },
    rejected:       { cls:'bg-red-100 text-red-800 border-red-200',       label:'Rejected'                  },
  };
  const c = cfg[status] || { cls:'bg-gray-100 text-gray-700', label: status };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── Confirm Return Modal ──────────────────────────────────────────────────────
const ConfirmReturnModal = ({ request, sellerId, onClose, onConfirmed }) => {
  const [notes,       setNotes]       = useState('');
  const [proofFile,   setProofFile]   = useState(null);
  const [proofPreview,setProofPreview]= useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleConfirm = async () => {
    setError('');
    if (!proofFile) { setError('Please upload a photo as proof that you received the returned item.'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('seller_id',    sellerId);
      formData.append('seller_notes', notes.trim());
      formData.append('proof',        proofFile);

      const res  = await fetch(`${API_BASE_URL}/refunds/${request.id}/seller-confirm`, {
        method: 'PATCH',
        body:   formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');
      onConfirmed(data.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 flex items-center justify-between flex-shrink-0">
          <div className="text-white">
            <h2 className="font-bold text-lg">Confirm Item Returned</h2>
            <p className="text-green-100 text-xs">Order #{request.order?.order_number}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Request summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Buyer reason</span>
              <span className="font-semibold text-gray-900">{request.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Refund amount</span>
              <span className="font-semibold text-gray-900">{currency(request.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Buyer</span>
              <span className="text-gray-700">{request.buyer?.full_name}</span>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-1">
            <p className="font-semibold mb-1">What happens after you confirm:</p>
            <p>1. Admin will be notified that the item is back</p>
            <p>2. Admin reviews and approves the refund</p>
            <p>3. Admin will instruct you to transfer {currency(request.refund_amount)} to the buyer</p>
          </div>

          {/* Proof upload — required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload proof of returned item <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(photo of item you received)</span>
            </label>
            {proofPreview ? (
              <div className="relative inline-block">
                <img src={proofPreview} alt="Proof" className="max-h-40 rounded-xl object-cover border border-gray-200"/>
                <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition">
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition">
                <Upload className="w-6 h-6 text-gray-400 mb-1"/>
                <span className="text-xs text-gray-500">Click to upload photo proof (max 5MB)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile}/>
              </label>
            )}
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes <span className="text-gray-400 font-normal">(optional — condition of returned item, etc.)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Item received in damaged condition, packaging was opened..."
              rows={3} maxLength={300}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100 transition resize-none"/>
            <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/300</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting || !proofFile}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Confirming...</>
              : <><CheckCircle className="w-4 h-4"/>Confirm & Notify Admin</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detail View ───────────────────────────────────────────────────────────────
const RefundDetailView = ({ request, onBack, sellerId, onConfirmed }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white flex-shrink-0">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition">←</button>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Refund Request #{request.id}</p>
          <p className="text-xs text-gray-500">Order #{request.order?.order_number}</p>
        </div>
        <StatusBadge status={request.status}/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* What seller needs to do */}
        {request.status === 'seller_pending' && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-900 text-sm mb-1">Action Required</p>
            <p className="text-xs text-amber-800">
              Contact the buyer to arrange the return of the item. Once you physically receive it,
              come back here and click <strong>"Confirm Item Received"</strong> to notify admin.
              Admin will then approve the final refund to the buyer.
            </p>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-semibold text-blue-900 text-sm mb-1">Waiting for Admin</p>
            <p className="text-xs text-blue-800">
              You've confirmed the item was returned. Admin has been notified and will approve
              the final refund to the buyer shortly.
            </p>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-green-900 text-sm mb-1">Refund Approved</p>
            <p className="text-xs text-green-800">
              Admin has approved this refund. Please transfer {currency(request.refund_amount)} to
              the buyer via GCash or cash if you haven't done so already.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Buyer</span><span className="font-semibold text-gray-900">{request.buyer?.full_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Refund Amount</span><span className="font-bold text-gray-900 text-base">{currency(request.refund_amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Reason</span><span className="font-medium text-gray-900">{request.reason}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Submitted</span><span className="text-gray-600">{fmtDate(request.created_at)}</span></div>
          {request.seller_confirmed_at && (
            <div className="flex justify-between"><span className="text-gray-500">You confirmed</span><span className="text-gray-600">{fmtDate(request.seller_confirmed_at)}</span></div>
          )}
        </div>

        {/* Buyer description */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Buyer's description</p>
          <p className="text-sm text-gray-700">{request.description}</p>
        </div>

        {/* Buyer evidence */}
        {request.evidence_url && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Buyer's evidence photo</p>
            <a href={request.evidence_url} target="_blank" rel="noopener noreferrer">
              <img src={request.evidence_url} alt="Buyer evidence" className="max-h-36 rounded-xl object-cover border border-gray-200 hover:opacity-90 transition cursor-pointer"/>
            </a>
          </div>
        )}

        {/* Seller proof uploaded */}
        {request.return_proof_url && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your return proof photo</p>
            <a href={request.return_proof_url} target="_blank" rel="noopener noreferrer">
              <img src={request.return_proof_url} alt="Return proof" className="max-h-36 rounded-xl object-cover border border-gray-200 hover:opacity-90 transition cursor-pointer"/>
            </a>
            {request.seller_notes && <p className="text-xs text-gray-600 mt-2">{request.seller_notes}</p>}
          </div>
        )}

        {/* Admin notes */}
        {request.admin_notes && (
          <div className={`rounded-xl p-4 border ${request.status==='approved'?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${request.status==='approved'?'text-green-600':'text-red-600'}`}>Admin Response</p>
            <p className={`text-sm ${request.status==='approved'?'text-green-800':'text-red-800'}`}>{request.admin_notes}</p>
          </div>
        )}
      </div>

      {/* Confirm button — only when seller_pending */}
      {request.status === 'seller_pending' && (
        <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5"/>
            Confirm Item Received & Notify Admin
          </button>
        </div>
      )}

      {showConfirm && (
        <ConfirmReturnModal
          request={request}
          sellerId={sellerId}
          onClose={() => setShowConfirm(false)}
          onConfirmed={(msg) => { setShowConfirm(false); onConfirmed(msg); }}
        />
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SellerRefundsPage = () => {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('seller_pending');
  const [selected,  setSelected]  = useState(null);
  const [toast,     setToast]     = useState('');

  const sellerId = JSON.parse(localStorage.getItem('user') || '{}').id;

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/refunds/seller/${sellerId}?status=${filter}`);
      const data = await res.json();
      if (data.success) setRequests(data.refund_requests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (sellerId) load(); }, [filter, sellerId]);

  const handleConfirmed = (msg) => {
    setSelected(null);
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
    load();
  };

  const pendingCount = requests.filter(r => r.status === 'seller_pending').length;

  const TABS = [
    { k:'seller_pending', l:'Need Action', badge: pendingCount },
    { k:'pending',        l:'Sent to Admin' },
    { k:'approved',       l:'Approved'      },
    { k:'rejected',       l:'Rejected'      },
    { k:'all',            l:'All'           },
  ];

  if (selected) return (
    <div className="min-h-screen bg-gray-50">
      <RefundDetailView
        request={selected}
        sellerId={sellerId}
        onBack={() => { setSelected(null); load(); }}
        onConfirmed={handleConfirmed}
      />
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/>{toast}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/>{toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">COD refund requests from your buyers</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-5 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition relative ${filter===t.k?'text-blue-600 bg-blue-50':'text-gray-600 hover:bg-gray-50'}`}>
              {t.l}
              {t.badge > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full font-bold bg-orange-500 text-white animate-pulse">{t.badge}</span>
              )}
              {filter===t.k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"/>}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-16">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
            <p className="text-gray-500 font-medium">No refund requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map(r => (
              <button key={r.id} onClick={() => setSelected(r)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition ${r.status==='seller_pending'?'bg-amber-50/40':''}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Order #{r.order?.order_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.buyer?.full_name} · {r.reason}</p>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="font-bold text-gray-900 text-sm">{currency(r.refund_amount)}</span>
                </div>
                {r.status === 'seller_pending' && (
                  <p className="text-xs text-amber-700 mt-1.5 font-medium">
                    ⚠️ Tap to view and confirm item return
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerRefundsPage;