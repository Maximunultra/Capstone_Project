import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Eye, X, MessageCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const currency = (v) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(parseFloat(v) || 0);

const StatusBadge = ({ status }) => {
  const cfg = {
    seller_pending: { cls: 'bg-blue-100 text-blue-800 border-blue-200',   label: 'With Seller'    },
    pending:        { cls: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending Review' },
    approved:       { cls: 'bg-green-100 text-green-800 border-green-200', label: 'Approved'       },
    rejected:       { cls: 'bg-red-100 text-red-800 border-red-200',       label: 'Rejected'       },
  };
  const c = cfg[status] || { cls: 'bg-gray-100 text-gray-700', label: status };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
};

const PaymentBadge = ({ method }) => {
  const cfg = {
    gcash:  'bg-blue-100 text-blue-800',
    paypal: 'bg-indigo-100 text-indigo-800',
    cod:    'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg[method] || 'bg-gray-100 text-gray-700'}`}>
      {method?.toUpperCase()}
    </span>
  );
};

// ── Message Buyer Modal ───────────────────────────────────────────────────────
const MessageBuyerModal = ({ request, adminId, onClose, onSent }) => {
  const QUICK_TEMPLATES = [
    {
      label: 'Return instructions',
      text: `Hi! Regarding your refund request for Order #${request.order?.order_number}, we have approved your refund request. To complete the process, please return the item to us. Here are the return instructions:\n\n1. Pack the item securely in its original packaging if possible.\n2. Contact us here to arrange the pickup or drop-off.\n3. Once we receive and inspect the item, your refund will be released.\n\nPlease reply here if you have any questions. Thank you!`,
    },
    {
      label: 'Need more info',
      text: `Hi! We received your refund request for Order #${request.order?.order_number}. To process this, we need a bit more information.\n\nCould you please provide:\n• Photos of the item showing the issue\n• A brief description of the problem\n\nWe will review and respond within 1-2 business days. Thank you for your patience!`,
    },
    {
      label: 'COD refund — manual transfer',
      text: `Hi! Your refund request for Order #${request.order?.order_number} has been approved.\n\nSince this was a Cash on Delivery order, we will process your refund via manual bank transfer or GCash.\n\nPlease provide your:\n• GCash number or bank account details\n• Account name\n\nWe will complete the transfer within 2 business days. Thank you!`,
    },
  ];

  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const handleTemplate = (tpl) => setMessage(tpl.text);

  const handleSend = async () => {
    setError('');
    if (!message.trim()) { setError('Please enter a message.'); return; }
    if (!request.user_id) { setError('Buyer information not available.'); return; }

    setSending(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sender_id:   adminId,
          receiver_id: request.user_id,
          message:     message.trim(),
          order_id:    request.order_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setSuccess(true);
      setTimeout(() => { onSent(); onClose(); }, 1800);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="font-bold text-lg">Message Buyer</h2>
              <p className="text-blue-200 text-xs">
                {request.buyer?.full_name} · Order #{request.order?.order_number}
              </p>
            </div>
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

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0"/>
              <p className="text-sm text-green-700">Message sent! Redirecting to messages...</p>
            </div>
          )}

          {/* Refund context card */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Refund Request</span>
              <StatusBadge status={request.status}/>
            </div>
            <p className="font-semibold text-orange-900">{request.reason}</p>
            <p className="text-orange-700 text-xs mt-1">{currency(request.refund_amount)} · <PaymentBadge method={request.payment_method}/></p>
          </div>

          {/* Quick templates */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Templates</p>
            <div className="flex flex-col gap-2">
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button key={i} onClick={() => handleTemplate(tpl)}
                  className="px-3 py-2 text-xs font-medium text-left rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition">
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your message <span className="text-gray-400 font-normal">(edit the template or write your own)</span>
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Type your message to the buyer about the return process..."
              rows={6} maxLength={1000}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none"/>
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/1000</p>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              This message will be sent to <strong>{request.buyer?.full_name}</strong> and will appear in your 
              <strong> Admin Messages</strong> page where you can continue the conversation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={sending}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || !message.trim() || success}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {sending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</>
              : <><Send className="w-4 h-4"/>Send Message</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Refund Detail Modal ───────────────────────────────────────────────────────
const RefundDetailModal = ({ request, adminId, onClose, onAction, onMessageBuyer }) => {
  const [notes,      setNotes]      = useState('');
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState('');

  const act = async (action) => {
    setError('');
    if (action === 'reject' && !notes.trim()) {
      setError('Please provide a reason for rejection'); return;
    }
    setProcessing(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/refunds/${request.id}/${action}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ admin_id: adminId, admin_notes: notes.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
      onAction(data.message);
    } catch (e) {
      setError(e.message);
      setProcessing(false);
    }
  };

  const isPending = request.status === 'pending';
  const isSellerPending = request.status === 'seller_pending';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Refund Request #{request.id}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Order #{request.order?.order_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status}/>
            {/* ── Message Buyer button ── */}
            <button onClick={onMessageBuyer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition">
              <MessageCircle className="w-3.5 h-3.5"/>
              Message Buyer
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* seller_pending — COD waiting for seller */}
          {isSellerPending && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">COD — Waiting for Seller Confirmation</p>
              <p className="text-xs text-blue-700">
                This is a Cash on Delivery refund. The seller has been notified and is coordinating
                the item return with the buyer. Once the seller confirms the return and <strong>uploads photo proof</strong>,
                this request will automatically move to <strong>Pending Review</strong> for your approval.
                You will receive a message notification when ready.
              </p>
            </div>
          )}

          {/* Two-column summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buyer</p>
              <p className="font-semibold text-gray-900">{request.buyer?.full_name || '—'}</p>
              <p className="text-gray-600">{request.buyer?.email || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Refund</p>
              <p className="text-2xl font-bold text-gray-900">{currency(request.refund_amount)}</p>
              <div className="flex items-center gap-2">
                <PaymentBadge method={request.payment_method}/>
                <span className="text-xs text-gray-500">
                  {request.payment_method === 'cod' ? 'Manual transfer needed' : 'Auto-refund via gateway'}
                </span>
              </div>
            </div>
          </div>

          {/* Cancelled order context — no return needed */}
          {request.order?.order_status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-200 text-red-800">
                  ORDER CANCELLED
                </span>
              </div>
              <p className="text-sm font-semibold text-red-800 mb-1">Cancelled Order — No Item Return Required</p>
              <p className="text-xs text-red-700">
                This order was cancelled before delivery. The buyer already paid via{' '}
                <strong>{request.payment_method?.toUpperCase()}</strong>.
                Since no item was delivered, no return is needed — you can approve the refund directly.
              </p>
            </div>
          )}

          {/* Reason + description */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Reason</p>
            <p className="font-semibold text-orange-900">{request.reason}</p>
            <p className="text-sm text-orange-800 mt-2">{request.description}</p>
          </div>

          {/* Buyer Evidence Photo */}
          {request.evidence_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Buyer's Evidence Photo
              </p>
              <a href={request.evidence_url} target="_blank" rel="noopener noreferrer">
                <img src={request.evidence_url} alt="Evidence"
                  className="max-h-48 rounded-xl object-cover border border-gray-200 hover:opacity-90 transition cursor-pointer"/>
              </a>
            </div>
          )}

          {/* ── Seller Return Confirmation (COD only) ── */}
          {request.payment_method === 'cod' && (
            <div className={`rounded-xl border overflow-hidden ${request.seller_confirmed ? 'border-green-200' : 'border-gray-200'}`}>
              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between ${request.seller_confirmed ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${request.seller_confirmed ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {request.seller_confirmed
                      ? <CheckCircle className="w-4 h-4 text-white"/>
                      : <Clock className="w-4 h-4 text-white"/>
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${request.seller_confirmed ? 'text-green-800' : 'text-gray-700'}`}>
                      {request.seller_confirmed ? 'Seller Confirmed Return' : 'Waiting for Seller Confirmation'}
                    </p>
                    {request.seller_confirmed_at && (
                      <p className="text-xs text-green-600">
                        Confirmed on {new Date(request.seller_confirmed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {request.seller_confirmed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="w-3 h-3"/> Item Returned
                  </span>
                )}
              </div>

              {/* Return proof photo */}
              {request.return_proof_url && (
                <div className="p-4 border-t border-green-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Return Proof Photo <span className="text-green-600 font-normal">(uploaded by seller)</span>
                  </p>
                  <a href={request.return_proof_url} target="_blank" rel="noopener noreferrer">
                    <img src={request.return_proof_url} alt="Return proof"
                      className="max-h-48 rounded-xl object-cover border border-green-200 hover:opacity-90 transition cursor-pointer shadow-sm"/>
                  </a>
                  <p className="text-xs text-gray-400 mt-1.5">Click to view full size</p>
                </div>
              )}

              {/* Seller notes */}
              {request.seller_notes && (
                <div className="px-4 pb-4 border-t border-green-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Seller Notes</p>
                  <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">{request.seller_notes}</p>
                </div>
              )}

              {/* Not yet confirmed */}
              {!request.seller_confirmed && (
                <div className="p-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    The seller has been notified and is coordinating the item return with the buyer.
                    This section will update once the seller uploads return proof.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* GCash/PayPal — return reminder for admin */}
          {request.payment_method !== 'cod' && isPending && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-violet-800 mb-1">
                Has the item been returned?
              </p>
              <p className="text-xs text-violet-700">
                For {request.payment_method?.toUpperCase()} orders, item return is not automatically confirmed.
                Use the <strong>Message Buyer</strong> button to request return if needed.
                Once you have confirmed the item is back, you may approve the refund.
              </p>
            </div>
          )}

          {/* COD warning */}
          {request.payment_method === 'cod' && isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">COD Order — Manual Refund Required</p>
              <p className="text-xs text-amber-700">
                This order was paid via Cash on Delivery. If you approve, you must manually transfer {currency(request.refund_amount)} to the customer via GCash or bank transfer.
              </p>
            </div>
          )}

          {/* Return instructions hint */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <MessageCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">Need the buyer to return the item?</p>
              <p className="text-xs text-blue-700">
                Use the <strong>Message Buyer</strong> button above to send return instructions.
                Quick templates are available for return process, COD refunds, and requesting more info.
                The conversation will continue in your <strong>Messages</strong> page.
              </p>
            </div>
          </div>

          {/* Admin notes */}
          {isPending ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Admin Notes <span className="text-gray-400 font-normal">(required for rejection, optional for approval)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Explain your decision to the customer..."
                rows={3} maxLength={300}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none"/>
              <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/300</p>
            </div>
          ) : (
            request.admin_notes && (
              <div className={`rounded-xl p-4 border ${request.status==='approved'?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${request.status==='approved'?'text-green-600':'text-red-600'}`}>Admin Notes</p>
                <p className={`text-sm ${request.status==='approved'?'text-green-800':'text-red-800'}`}>{request.admin_notes}</p>
              </div>
            )
          )}

          {/* Timestamps */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>Submitted: {new Date(request.created_at).toLocaleString()}</p>
            {request.reviewed_at && <p>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</p>}
            {request.refunded_at && <p>Refunded: {new Date(request.refunded_at).toLocaleString()}</p>}
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button onClick={() => act('reject')} disabled={processing}
              className="flex-1 py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4"/>Reject
            </button>
            <button onClick={() => act('approve')} disabled={processing}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {processing
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</>
                : <><CheckCircle className="w-4 h-4"/>Confirm Refund</>
              }
            </button>
          </div>
        )}
        {isSellerPending && (
          <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <p className="text-xs text-blue-600 text-center w-full py-2">
              Waiting for seller to confirm the item return. You can still reject below if needed.
            </p>
          </div>
        )}
        {isSellerPending && (
          <div className="px-5 pb-5 flex-shrink-0">
            <button onClick={() => act('reject')} disabled={processing}
              className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4"/>Reject Refund Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminRefundsPage = () => {
  const navigate = useNavigate();
  const [requests,        setRequests]        = useState([]);
  const [stats,           setStats]           = useState({ pending:0, seller_pending:0, approved:0, rejected:0, total_refunded:'0.00' });
  const [filter,          setFilter]          = useState('pending');
  // seller_pending = COD refund waiting for seller to confirm return
  const [loading,         setLoading]         = useState(true);
  const [selected,        setSelected]        = useState(null);
  const [showMsgModal,    setShowMsgModal]    = useState(false);
  const [toast,           setToast]           = useState('');

  const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;

  const load = async () => {
    setLoading(true);
    try {
      const [reqRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/refunds?status=${filter}&limit=100`),
        fetch(`${API_BASE_URL}/refunds/stats`)
      ]);
      const reqData   = await reqRes.json();
      const statsData = await statsRes.json();
      if (reqData.success)   setRequests(reqData.refund_requests || []);
      if (statsData.success) setStats(statsData.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = (message) => {
    setSelected(null);
    setToast(message);
    setTimeout(() => setToast(''), 4000);
    load();
  };

  // After sending message — close modals and go to messages page
  const handleMessageSent = () => {
    setShowMsgModal(false);
    setSelected(null);
    setToast('Message sent! Opening messages page...');
    setTimeout(() => {
      setToast('');
      navigate('/admin/messages');
    }, 1500);
  };

  const TABS = [
    { k:'pending',        l:'Pending Review', count: stats.pending,        urgent: true  },
    { k:'seller_pending', l:'With Seller',    count: stats.seller_pending, urgent: false },
    { k:'approved',       l:'Approved',       count: stats.approved                      },
    { k:'rejected',       l:'Rejected',       count: stats.rejected                      },
    { k:'all',            l:'All',            count: (stats.pending||0) + (stats.seller_pending||0) + (stats.approved||0) + (stats.rejected||0) },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and process customer refund requests</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Pending Review',  value: stats.pending,                  color:'amber',  icon: <Clock className="w-5 h-5 text-amber-600"/>    },
          { label:'With Seller (COD)',value: stats.seller_pending||0,        color:'blue',   icon: <Clock className="w-5 h-5 text-blue-600"/>     },
          { label:'Approved',        value: stats.approved,                  color:'green',  icon: <CheckCircle className="w-5 h-5 text-green-600"/> },
          { label:'Total Refunded',  value: currency(stats.total_refunded),  color:'purple', icon: <span className="text-purple-600 font-bold text-base">₱</span> },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-5 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition relative ${filter===t.k?'text-blue-600 bg-blue-50':'text-gray-600 hover:bg-gray-50'}`}>
              {t.l}
              {t.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${filter===t.k?'bg-blue-600 text-white':'bg-gray-200 text-gray-600'}`}>{t.count}</span>
              )}
              {filter===t.k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"/>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-16">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
            <p className="text-gray-500 font-medium">No {filter==='all'?'':filter} refund requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 transition ${r.status==='pending'?'bg-amber-50/40':r.status==='seller_pending'?'bg-blue-50/40':''}`}>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500">{r.id}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 text-sm">{r.buyer?.full_name||'—'}</p>
                      <p className="text-xs text-gray-400">{r.buyer?.email||'—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-semibold text-gray-700">{r.order?.order_number}</p>
                      {/* Cancelled order badge */}
                      {r.order?.order_status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded">
                          ✕ Cancelled
                        </span>
                      )}
                      {/* Return proof badge for COD */}
                      {r.payment_method === 'cod' && r.return_proof_url && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                          <CheckCircle className="w-2.5 h-2.5"/> Proof uploaded
                        </span>
                      )}
                      {r.payment_method === 'cod' && !r.return_proof_url && r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                          ⚠️ No proof yet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700 max-w-[160px] truncate" title={r.reason}>{r.reason}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">{currency(r.refund_amount)}</td>
                    <td className="px-4 py-4 text-center"><PaymentBadge method={r.payment_method}/></td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-4 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setSelected(r)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            r.status==='pending' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          <Eye className="w-3.5 h-3.5"/>
                          {r.status==='pending'?'Review':'View'}
                        </button>
                        {/* Inline message button in table row */}
                        <button onClick={() => { setSelected(r); setShowMsgModal(true); }}
                          title="Message buyer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">
                          <MessageCircle className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund detail modal */}
      {selected && !showMsgModal && (
        <RefundDetailModal
          request={selected}
          adminId={adminId}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onMessageBuyer={() => setShowMsgModal(true)}
        />
      )}

      {/* Message buyer modal */}
      {selected && showMsgModal && (
        <MessageBuyerModal
          request={selected}
          adminId={adminId}
          onClose={() => setShowMsgModal(false)}
          onSent={handleMessageSent}
        />
      )}
    </div>
  );
};

export default AdminRefundsPage;