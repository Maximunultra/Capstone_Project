import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const REFUND_REASONS = [
  'Item not as described',
  'Received wrong item',
  'Item damaged or defective',
  'Item never arrived',
  'Missing parts or accessories',
  'Quality not acceptable',
  'Other',
];

// ── Status badge — includes seller_pending ────────────────────────────────────
const RefundStatusBadge = ({ status }) => {
  const cfg = {
    seller_pending: { color: 'bg-blue-100 text-blue-800 border-blue-200',   icon: <Clock className="w-3 h-3"/>,       label: 'Waiting for Seller' },
    pending:        { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3"/>,       label: 'Pending Review'     },
    approved:       { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-3 h-3"/>, label: 'Approved'           },
    rejected:       { color: 'bg-red-100 text-red-800 border-red-200',       icon: <XCircle className="w-3 h-3"/>,     label: 'Rejected'           },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

// ── Existing request view ─────────────────────────────────────────────────────
const ExistingRefundView = ({ refundRequest, order, onClose }) => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-gray-900">Refund Request #{refundRequest.id}</h3>
      <RefundStatusBadge status={refundRequest.status} />
    </div>

    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-gray-500">Order</span><span className="font-medium">#{order.order_number}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Order Status</span>
        <span className={`font-medium ${order.order_status === 'cancelled' ? 'text-red-600' : 'text-green-600'}`}>
          {order.order_status?.charAt(0).toUpperCase() + order.order_status?.slice(1)}
        </span>
      </div>
      <div className="flex justify-between"><span className="text-gray-500">Refund Amount</span><span className="font-semibold text-gray-900">₱{parseFloat(refundRequest.refund_amount).toFixed(2)}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Reason</span><span className="font-medium">{refundRequest.reason}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Submitted</span><span className="text-gray-600">{new Date(refundRequest.created_at).toLocaleDateString()}</span></div>
      {refundRequest.reviewed_at && (
        <div className="flex justify-between"><span className="text-gray-500">Reviewed</span><span className="text-gray-600">{new Date(refundRequest.reviewed_at).toLocaleDateString()}</span></div>
      )}
    </div>

    {/* Cancelled order context */}
    {order.order_status === 'cancelled' && refundRequest.status === 'pending' && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-800 mb-1">Cancelled Order — Awaiting Refund</p>
        <p className="text-xs text-red-700">
          Your order was cancelled. Since you paid via {order.payment_method?.toUpperCase()},
          admin is reviewing your refund request. No item return is required.
          You will be notified once the refund is processed.
        </p>
      </div>
    )}

    {refundRequest.description && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your description</p>
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{refundRequest.description}</p>
      </div>
    )}

    {refundRequest.evidence_url && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evidence photo</p>
        <a href={refundRequest.evidence_url} target="_blank" rel="noopener noreferrer">
          <img src={refundRequest.evidence_url} alt="Evidence" className="rounded-lg max-h-40 object-cover border border-gray-200 hover:opacity-90 transition"/>
        </a>
      </div>
    )}

    {refundRequest.admin_notes && (
      <div className={`rounded-xl p-4 border ${refundRequest.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${refundRequest.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
          Admin Response
        </p>
        <p className={`text-sm ${refundRequest.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
          {refundRequest.admin_notes}
        </p>
      </div>
    )}

    {/* ── seller_pending: COD waiting for seller ── */}
    {refundRequest.status === 'seller_pending' && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Waiting for Seller</p>
        <p className="text-xs text-blue-700">
          Your refund request has been sent to the seller. They will contact you via
          Messages to arrange the return of the item. Once the seller confirms receipt,
          admin will review and approve your refund. This typically takes 2–5 business days.
        </p>
      </div>
    )}

    {/* ── approved: show refund timeline ── */}
    {refundRequest.status === 'approved' && (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-800 mb-1">Refund Approved!</p>
        <p className="text-xs text-green-700">
          {refundRequest.payment_method === 'gcash'
            ? 'Your refund has been processed via GCash. It will appear in your wallet within 5–10 business days.'
            : refundRequest.payment_method === 'paypal'
            ? 'Your refund has been processed via PayPal. It will appear in your account within 3–5 business days.'
            : 'Your refund will be transferred by the seller. Please expect contact within 2 business days.'}
        </p>
      </div>
    )}

    <button onClick={onClose}
      className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition">
      Close
    </button>
  </div>
);

// ── Main Modal ────────────────────────────────────────────────────────────────
const RefundRequestModal = ({ order, userId, onClose, onSubmitted }) => {
  const [loading,         setLoading]         = useState(true);
  const [existingRequest, setExistingRequest] = useState(null);
  const [reason,          setReason]          = useState('');
  const [description,     setDescription]     = useState('');
  const [evidenceFile,    setEvidenceFile]     = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/refunds/order/${order.id}`);
        const data = await res.json();
        if (data.success && data.refund_request) setExistingRequest(data.refund_request);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [order.id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError('');
    if (!reason)                    { setError('Please select a reason'); return; }
    if (!description.trim())        { setError('Please describe the issue'); return; }
    if (description.trim().length < 20) { setError('Description must be at least 20 characters'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('order_id',    order.id);
      formData.append('user_id',     userId);
      formData.append('reason',      reason);
      formData.append('description', description.trim());
      if (evidenceFile) formData.append('evidence', evidenceFile);

      const res  = await fetch(`${API_BASE_URL}/refunds`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit refund request');

      setSuccess(true);
      setTimeout(() => { onSubmitted?.(); onClose(); }, 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isCOD       = order.payment_method?.toLowerCase() === 'cod';
  const isCancelled = order.order_status?.toLowerCase() === 'cancelled';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 flex items-center justify-between flex-shrink-0">
          <div className="text-white">
            <h2 className="font-bold text-lg">Refund Request</h2>
            <p className="text-orange-100 text-xs">Order #{order.order_number}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"/>
            </div>
          ) : existingRequest ? (
            <ExistingRefundView refundRequest={existingRequest} order={order} onClose={onClose}/>
          ) : success ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600"/>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-sm text-gray-600">
                {isCancelled
                  ? 'Your refund request has been submitted. Admin will process your refund within 1–3 business days. No item return needed.'
                  : isCOD
                  ? 'Your request has been sent to the seller. They will contact you via Messages to arrange the return.'
                  : 'Our team will review your request within 1–3 business days and get back to you.'}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Cancelled order info banner */}
              {isCancelled && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1">Cancelled Order Refund</p>
                  <p className="text-xs text-red-700">
                    Your order was cancelled but you already paid via {order.payment_method?.toUpperCase()}.
                    Submit this request and admin will process your refund within 1–3 business days.
                    No item return is needed since the order was cancelled before delivery.
                  </p>
                </div>
              )}

              {/* COD delivered info banner */}
              {isCOD && !isCancelled && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Cash on Delivery Refund</p>
                  <p className="text-xs text-blue-700">
                    Your refund request will be sent to the seller who collected the payment.
                    They will contact you to arrange the item return before the refund is processed.
                  </p>
                </div>
              )}

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                {order.order_items?.[0]?.product?.product_image && (
                  <img src={order.order_items[0].product.product_image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {order.order_items?.[0]?.product_name}
                    {order.order_items?.length > 1 && ` +${order.order_items.length - 1} more`}
                  </p>
                  <p className="text-xs text-gray-500">Total: ₱{parseFloat(order.total_amount).toFixed(2)} via {order.payment_method?.toUpperCase()}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for refund *</label>
                <div className="grid grid-cols-2 gap-2">
                  {REFUND_REASONS.map(r => (
                    <button key={r} onClick={() => setReason(r)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition ${
                        reason === r
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Describe the issue * <span className="text-gray-400 font-normal">(min. 20 chars)</span>
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Please describe the problem with your order in detail..."
                  rows={4} maxLength={500}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition resize-none"/>
                <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
              </div>

              {/* Evidence upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload photo evidence <span className="text-gray-400 font-normal">(optional but recommended)</span>
                </label>
                {evidencePreview ? (
                  <div className="relative inline-block">
                    <img src={evidencePreview} alt="Evidence" className="max-h-32 rounded-xl object-cover border border-gray-200"/>
                    <button onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition">
                      <X className="w-3 h-3"/>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition">
                    <Upload className="w-6 h-6 text-gray-400 mb-1"/>
                    <span className="text-xs text-gray-500">Click to upload (max 5MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
                  </label>
                )}
              </div>

              {/* Policy note */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800">
                <p className="font-semibold mb-1">Return & Refund Policy</p>
                {isCancelled ? (
                  <>
                    <p>• Cancelled order refunds go directly to admin review</p>
                    <p>• No item return required — order was not delivered</p>
                    <p>• GCash refunds: 5–10 days · PayPal: 3–5 days after approval</p>
                    <p>• Admin review takes 1–3 business days</p>
                  </>
                ) : (
                  <>
                    <p>• Requests must be submitted within 7 days of delivery</p>
                    <p>• Review takes 1–3 business days</p>
                    <p>• GCash refunds: 5–10 days · PayPal: 3–5 days · COD: via seller</p>
                    <p>• You may be asked to return the item before refund is released</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !existingRequest && !success && (
          <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button onClick={onClose} disabled={submitting}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || !reason || !description.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Submitting...</>
                : 'Submit Refund Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefundRequestModal;
export { RefundStatusBadge };