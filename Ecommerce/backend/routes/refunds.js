// routes/refunds.js
import express from "express";
import multer  from "multer";
import axios   from "axios";
import crypto  from "crypto";
import { supabase } from "../server.js";
import { logActivity } from "./activityLogger.js";

const router  = express.Router();
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"), false)
});

// ── Message encryption (lazy key read — matches fixed messages.js) ─────────────
function getEncKey() {
  const hex = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!hex) return null;
  return Buffer.from(hex, "hex");
}

function encryptMsg(text) {
  const key = getEncKey();
  if (!key) return text;
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let enc = cipher.update(text, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + cipher.getAuthTag().toString("hex") + ":" + enc;
}

// ── PayMongo config ───────────────────────────────────────────────────────────
const PM_KEY  = process.env.PAYMONGO_SECRET_KEY;
const PM_AUTH = PM_KEY ? Buffer.from(PM_KEY).toString("base64") : null;
const PM_URL  = "https://api.paymongo.com/v1";

// ── PayPal config ─────────────────────────────────────────────────────────────
const PP_ID     = process.env.PAYPAL_CLIENT_ID;
const PP_SECRET = process.env.PAYPAL_SECRET;
const PP_URL    = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getPayPalToken() {
  const auth = Buffer.from(`${PP_ID}:${PP_SECRET}`).toString("base64");
  const { data } = await axios.post(
    `${PP_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data.access_token;
}

// ── Image upload helper ───────────────────────────────────────────────────────
async function uploadImage(file, folder = "refunds") {
  const ext  = file.originalname.split(".").pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
  return publicUrl;
}

// ── GCash: get payment_id from payment_intent_id ─────────────────────────────
async function getPayMongoPaymentId(paymentIntentId) {
  const { data: res } = await axios.get(
    `${PM_URL}/payment_intents/${paymentIntentId}`,
    { headers: { Authorization: `Basic ${PM_AUTH}` } }
  );
  const payments = res.data?.attributes?.payments || [];
  if (!payments.length) throw new Error("No payment found for this intent");
  return payments[0].id;
}

// ── Send system message helper ────────────────────────────────────────────────
async function sendSystemMessage(senderId, receiverId, text, orderId = null) {
  try {
    await supabase.from("messages").insert({
      sender_id:   senderId,
      receiver_id: receiverId,
      message:     encryptMsg(text),
      // ✅ FIX: order_id is a UUID — no parseInt()
      order_id:    orderId || null,
      is_read:     false,
      created_at:  new Date().toISOString()
    });
  } catch (e) {
    console.error("⚠️ System message failed:", e.message);
  }
}

// ── Get admin ID helper ───────────────────────────────────────────────────────
async function getAdminId() {
  const { data } = await supabase
    .from("users").select("id").eq("role", "admin").limit(1).single();
  return data?.id || null;
}

// ── Get seller IDs from order ─────────────────────────────────────────────────
async function getSellerIds(orderId) {
  // ✅ FIX: orderId is a UUID string — no parseInt()
  const { data } = await supabase
    .from("orders")
    .select("order_items(product:product_id(user_id))")
    .eq("id", orderId)
    .single();
  return [...new Set(
    (data?.order_items || []).map(i => i.product?.user_id).filter(Boolean)
  )];
}

// ── Reverse analytics when a refund is approved ───────────────────────────────
async function reverseAnalyticsOnRefund(orderId, refundAmount) {
  try {
    console.log("📊 Reversing analytics for approved refund, order:", orderId);

    const { data: order } = await supabase
      .from("orders")
      .select("order_date, order_items(quantity, unit_price, product_category, product_id, product_name)")
      .eq("id", orderId)
      .single();

    if (!order) return;

    const orderDate   = new Date(order.order_date);
    const year        = orderDate.getFullYear();
    const month       = orderDate.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const items       = order.order_items || [];
    const totalItems  = items.reduce((s, i) => s + i.quantity, 0);
    const revenue     = parseFloat(refundAmount || 0);

    // 1. Monthly summary
    const { data: monthly } = await supabase
      .from("analytics_monthly_summary")
      .select("*").eq("year", year).eq("month", month).maybeSingle();

    if (monthly) {
      await supabase.from("analytics_monthly_summary").update({
        total_revenue:    Math.max(0, parseFloat(monthly.total_revenue  || 0) - revenue),
        total_items_sold: Math.max(0, (monthly.total_items_sold || 0)   - totalItems),
        updated_at:       new Date().toISOString()
      }).eq("year", year).eq("month", month);
    }

    // 2. Category analytics
    const catMap = {};
    items.forEach(i => {
      const cat = i.product_category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = { revenue: 0, items: 0 };
      catMap[cat].revenue += i.quantity * parseFloat(i.unit_price || 0);
      catMap[cat].items   += i.quantity;
    });

    for (const [category, stats] of Object.entries(catMap)) {
      const { data: cat } = await supabase
        .from("analytics_category").select("*")
        .eq("category", category).eq("period_type", "monthly")
        .eq("period_start", periodStart).maybeSingle();

      if (cat) {
        await supabase.from("analytics_category").update({
          total_revenue: Math.max(0, parseFloat(cat.total_revenue || 0) - stats.revenue),
          items_sold:    Math.max(0, (cat.items_sold || 0)             - stats.items),
          updated_at:    new Date().toISOString()
        }).eq("category", category).eq("period_type", "monthly").eq("period_start", periodStart);
      }
    }

    // 3. Product analytics
    for (const item of items) {
      const { data: prod } = await supabase
        .from("analytics_product").select("*")
        .eq("product_id", item.product_id).eq("period_type", "monthly")
        .eq("period_start", periodStart).maybeSingle();

      if (prod) {
        const itemRevenue = item.quantity * parseFloat(item.unit_price || 0);
        await supabase.from("analytics_product").update({
          units_sold:    Math.max(0, (prod.units_sold    || 0) - item.quantity),
          total_revenue: Math.max(0, parseFloat(prod.total_revenue || 0) - itemRevenue),
          updated_at:    new Date().toISOString()
        }).eq("product_id", item.product_id).eq("period_type", "monthly").eq("period_start", periodStart);
      }
    }

    console.log("✅ Analytics reversed for refund on order:", orderId);
  } catch (error) {
    console.error("⚠️ Analytics reversal failed (non-fatal):", error.message);
  }
}

// ================================================================
// POST /api/refunds
// Buyer submits a refund request
// ================================================================
router.post("/", upload.single("evidence"), async (req, res) => {
  try {
    const { order_id, reason, description, user_id } = req.body;

    if (!order_id || !reason || !description || !user_id)
      return res.status(400).json({ success: false, error: "order_id, reason, description, user_id are required" });

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, order_status, total_amount, payment_method, payment_status, payment_intent_id, payment_capture_id")
      .eq("id", order_id).single();

    if (orderErr || !order)
      return res.status(404).json({ success: false, error: "Order not found" });
    if (order.user_id !== user_id)
      return res.status(403).json({ success: false, error: "Not your order" });

    const isCancelled = order.order_status === "cancelled";
    const isDelivered = order.order_status === "delivered";

    if (!isDelivered && !isCancelled)
      return res.status(400).json({ success: false, error: "Only delivered or cancelled orders can be refunded" });
    if (isCancelled && order.payment_method === "cod")
      return res.status(400).json({ success: false, error: "COD cancelled orders do not require a refund — no online payment was made" });
    if (isCancelled && order.payment_status !== "paid")
      return res.status(400).json({ success: false, error: "This order was not paid — no refund required" });
    if (isDelivered && order.payment_status !== "paid" && order.payment_method !== "cod")
      return res.status(400).json({ success: false, error: "Order payment was not completed" });

    const { data: existing } = await supabase
      .from("refund_requests").select("id, status")
      .eq("order_id", order_id).in("status", ["pending", "approved", "seller_pending"]).maybeSingle();

    if (existing)
      return res.status(409).json({
        success: false,
        error: existing.status === "approved"
          ? "This order has already been refunded"
          : "A refund request for this order is already under review"
      });

    let evidenceUrl = null;
    if (req.file) evidenceUrl = await uploadImage(req.file);

    // ✅ FIX: order_id is a UUID — no parseInt()
    const isCancelledOrder = order.order_status === "cancelled";
    const sellerIds        = (!isCancelledOrder && order.payment_method === "cod") ? await getSellerIds(order_id) : [];
    const primarySellerId  = sellerIds[0] || null;
    const initialStatus    = (!isCancelledOrder && order.payment_method === "cod") ? "seller_pending" : "pending";

    const { data: refundReq, error: insertErr } = await supabase
      .from("refund_requests")
      .insert({
        // ✅ FIX: order_id is a UUID — no parseInt()
        order_id:           order_id,
        user_id,
        seller_id:          primarySellerId,
        reason,
        description,
        evidence_url:       evidenceUrl,
        refund_amount:      parseFloat(order.total_amount),
        payment_method:     order.payment_method,
        payment_intent_id:  order.payment_intent_id  || null,
        payment_capture_id: order.payment_capture_id || null,
        status:             initialStatus,
        seller_confirmed:   false,
        created_at:         new Date().toISOString(),
        updated_at:         new Date().toISOString()
      })
      .select().single();

    if (insertErr) throw insertErr;

    // COD delivered: notify seller to arrange return
    if (!isCancelledOrder && order.payment_method === "cod" && sellerIds.length > 0) {
      const { data: orderData } = await supabase
        .from("orders").select("order_number").eq("id", order_id).single();

      const sellerNotif =
        `[COD Refund Request]\n\n` +
        `Order #${orderData?.order_number} — ₱${parseFloat(order.total_amount).toFixed(2)}\n\n` +
        `A buyer has requested a refund for a Cash on Delivery order.\n\n` +
        `Reason: ${reason}\nDetails: ${description}\n\n` +
        `Please:\n1. Contact the buyer to arrange item return\n` +
        `2. Once you receive the item, go to your Seller Refunds page\n` +
        `3. Upload proof and confirm the return\n` +
        `4. Admin will then process the final refund\n\n` +
        `Reply here to start coordinating with the buyer.`;

      for (const sellerId of sellerIds) {
        // ✅ FIX: order_id is a UUID — no parseInt()
        await sendSystemMessage(user_id, sellerId, sellerNotif, order_id);
      }
    }

    console.log(`✅ Refund request #${refundReq.id} created (${initialStatus})`);

    await logActivity({
      userId:      user_id,
      role:        "buyer",
      action:      isCancelledOrder ? "refund_submitted_cancelled" : "refund_submitted",
      category:    "refund",
      description: `Buyer submitted refund request for Order #${refundReq.order_id} — ₱${parseFloat(order.total_amount).toFixed(2)} (${order.payment_method?.toUpperCase()})`,
      metadata:    { refund_id: refundReq.id, order_id: refundReq.order_id, amount: order.total_amount, reason, payment_method: order.payment_method, status: initialStatus },
      req,
    });

    res.status(201).json({
      success: true,
      message: isCancelledOrder
        ? "Refund request submitted. Admin will process your refund within 1–3 business days."
        : order.payment_method === "cod"
        ? "Refund request sent to seller. They will contact you to arrange the return."
        : "Refund request submitted successfully. Admin will review within 1–3 business days.",
      refund_request: refundReq
    });
  } catch (error) {
    console.error("❌ Create refund request error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/stats
// ================================================================
router.get("/stats", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("refund_requests")
      .select("status, refund_amount, order:order_id(order_status)");
    if (error) throw error;

    const all      = data || [];
    const approved = all.filter(r => r.status === "approved");

    const deliveredRefunds  = approved.filter(r => r.order?.order_status === "delivered");
    const totalRefunded     = deliveredRefunds.reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);
    const deliveredApproved = deliveredRefunds.length;

    res.json({
      success: true,
      stats: {
        pending:            all.filter(r => r.status === "pending").length,
        seller_pending:     all.filter(r => r.status === "seller_pending").length,
        approved:           approved.length,
        approved_delivered: deliveredApproved,
        rejected:           all.filter(r => r.status === "rejected").length,
        total_refunded:     totalRefunded.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/backfill-analytics  (admin — run once)
// ================================================================
router.get("/backfill-analytics", async (req, res) => {
  try {
    const { data: approvedRefunds, error } = await supabase
      .from("refund_requests")
      .select("id, order_id, refund_amount, analytics_reversed")
      .eq("status", "approved");

    if (error) throw error;

    const toFix = (approvedRefunds || []).filter(r => !r.analytics_reversed);

    if (toFix.length === 0) {
      return res.json({
        success: true,
        message: "No refunds need backfilling — all analytics are up to date.",
        count: 0
      });
    }

    let fixed = 0, failed = 0;

    for (const refund of toFix) {
      try {
        await reverseAnalyticsOnRefund(refund.order_id, refund.refund_amount);
        await supabase
          .from("refund_requests")
          .update({ analytics_reversed: true, updated_at: new Date().toISOString() })
          .eq("id", refund.id);
        fixed++;
      } catch (e) {
        failed++;
        console.error(`❌ Failed to backfill refund #${refund.id}:`, e.message);
      }
    }

    res.json({ success: true, message: `Backfill complete. Fixed: ${fixed}, Failed: ${failed}`, fixed, failed });
  } catch (error) {
    console.error("❌ Backfill error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/order/:orderId
// ================================================================
router.get("/order/:orderId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("refund_requests").select("*")
      .eq("order_id", req.params.orderId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.json({ success: true, refund_request: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/user/:userId
// ================================================================
router.get("/user/:userId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("refund_requests")
      .select(`*, order:order_id (order_number, total_amount, order_items (product_name, product_image, quantity))`)
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, refund_requests: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/seller/:sellerId
// ================================================================
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from("refund_requests")
      .select(`*, order:order_id (order_number, total_amount), buyer:user_id (full_name, email)`)
      .eq("seller_id", req.params.sellerId)
      .eq("payment_method", "cod")
      .order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, refund_requests: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds   (admin)
// ================================================================
router.get("/", async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from("refund_requests")
      .select(`*, order:order_id (order_number, total_amount, payment_method), buyer:user_id (id, full_name, email)`)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, refund_requests: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// PATCH /api/refunds/:id/seller-confirm
// ================================================================
router.patch("/:id/seller-confirm", upload.single("proof"), async (req, res) => {
  try {
    const { seller_id, seller_notes } = req.body;
    if (!seller_id)
      return res.status(400).json({ success: false, error: "seller_id required" });

    const { data: refReq, error: fetchErr } = await supabase
      .from("refund_requests").select("*").eq("id", req.params.id).single();
    if (fetchErr || !refReq)
      return res.status(404).json({ success: false, error: "Refund request not found" });
    if (refReq.seller_id !== seller_id)
      return res.status(403).json({ success: false, error: "Not your refund request" });
    if (refReq.status !== "seller_pending")
      return res.status(400).json({ success: false, error: `Cannot confirm — status is ${refReq.status}` });

    let proofUrl = null;
    if (req.file) proofUrl = await uploadImage(req.file, "refund-proofs");

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("refund_requests")
      .update({
        status:              "pending",
        seller_confirmed:    true,
        seller_confirmed_at: now,
        seller_notes:        seller_notes || null,
        return_proof_url:    proofUrl || null,
        updated_at:          now
      })
      .eq("id", req.params.id).select().single();

    if (updateErr) throw updateErr;

    const adminId = await getAdminId();
    if (adminId) {
      const { data: orderData } = await supabase
        .from("orders").select("order_number").eq("id", refReq.order_id).single();

      const adminMsg =
        `[COD Return Confirmed — Action Required]\n\n` +
        `Order #${orderData?.order_number} — ₱${parseFloat(refReq.refund_amount).toFixed(2)}\n\n` +
        `The seller has confirmed that the item has been returned by the buyer.\n\n` +
        `${proofUrl ? "Proof of return photo has been uploaded.\n\n" : ""}` +
        `${seller_notes ? `Seller notes: ${seller_notes}\n\n` : ""}` +
        `Please go to the Refunds page to approve the final refund to the buyer.`;

      // ✅ FIX: order_id is a UUID — no parseInt()
      await sendSystemMessage(seller_id, adminId, adminMsg, refReq.order_id);
    }

    await logActivity({
      userId:      seller_id,
      role:        "seller",
      action:      "refund_return_confirmed",
      category:    "refund",
      description: `Seller confirmed item return for refund #${req.params.id} — ₱${parseFloat(refReq.refund_amount).toFixed(2)}`,
      metadata:    { refund_id: req.params.id, order_id: refReq.order_id, amount: refReq.refund_amount, proof_uploaded: !!proofUrl },
      req,
    });

    res.json({
      success: true,
      message: "Return confirmed. Admin has been notified and will process the refund.",
      refund_request: updated
    });
  } catch (error) {
    console.error("❌ Seller confirm error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// PATCH /api/refunds/:id/approve
// ================================================================
router.patch("/:id/approve", async (req, res) => {
  try {
    const { admin_id, admin_notes } = req.body;
    if (!admin_id)
      return res.status(400).json({ success: false, error: "admin_id required" });

    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ success: false, error: "Admin only" });

    const { data: req_, error: fetchErr } = await supabase
      .from("refund_requests").select("*").eq("id", req.params.id).single();
    if (fetchErr || !req_)
      return res.status(404).json({ success: false, error: "Refund request not found" });
    if (!["pending"].includes(req_.status))
      return res.status(400).json({
        success: false,
        error: req_.status === "seller_pending"
          ? "Cannot approve yet — waiting for seller to confirm the return first"
          : `Request is already ${req_.status}`
      });

    let gatewayResult = { method: req_.payment_method, status: "manual" };

    // GCash
    if (req_.payment_method === "gcash" && req_.payment_intent_id && PM_AUTH) {
      try {
        const paymentId      = await getPayMongoPaymentId(req_.payment_intent_id);
        const amountCentavos = Math.round(parseFloat(req_.refund_amount) * 100);
        const { data: refundRes } = await axios.post(
          `${PM_URL}/refunds`,
          { data: { attributes: { amount: amountCentavos, payment_id: paymentId, reason: "others", notes: admin_notes || "Approved refund" } } },
          { headers: { Authorization: `Basic ${PM_AUTH}`, "Content-Type": "application/json" } }
        );
        gatewayResult = { method: "gcash", status: "issued", refund_id: refundRes.data?.id };
      } catch (gwErr) {
        return res.status(502).json({
          success: false,
          error: "PayMongo refund failed: " + (gwErr.response?.data?.errors?.[0]?.detail || gwErr.message)
        });
      }

    // PayPal
    } else if (req_.payment_method === "paypal" && req_.payment_capture_id && PP_ID) {
      try {
        const token     = await getPayPalToken();
        const phpAmount = parseFloat(req_.refund_amount).toFixed(2);
        const { data: ppRes } = await axios.post(
          `${PP_URL}/v2/payments/captures/${req_.payment_capture_id}/refund`,
          { amount: { value: phpAmount, currency_code: "PHP" }, note_to_payer: admin_notes || "Approved refund" },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        gatewayResult = { method: "paypal", status: "issued", refund_id: ppRes.id };
      } catch (gwErr) {
        return res.status(502).json({
          success: false,
          error: "PayPal refund failed: " + (gwErr.response?.data?.message || gwErr.message)
        });
      }

    // COD
    } else if (req_.payment_method === "cod") {
      gatewayResult = { method: "cod", status: "manual" };
      if (req_.seller_id) {
        const { data: orderData } = await supabase
          .from("orders").select("order_number").eq("id", req_.order_id).single();
        // ✅ FIX: order_id is a UUID — no parseInt()
        await sendSystemMessage(admin_id, req_.seller_id,
          `[COD Refund — Final Approval]\n\nOrder #${orderData?.order_number} — ₱${parseFloat(req_.refund_amount).toFixed(2)}\n\n` +
          `Admin has approved the refund. Please transfer ₱${parseFloat(req_.refund_amount).toFixed(2)} to the buyer via GCash or cash.\n\n` +
          `${admin_notes ? `Admin notes: ${admin_notes}` : ""}`,
          req_.order_id
        );
      }
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("refund_requests")
      .update({
        status:              "approved",
        admin_notes:         admin_notes || null,
        reviewed_by:         admin_id,
        reviewed_at:         now,
        refunded_at:         gatewayResult.status === "issued" ? now : null,
        analytics_reversed:  true,
        updated_at:          now
      })
      .eq("id", req.params.id).select().single();

    if (updateErr) throw updateErr;

    // Only reverse analytics if order was delivered
    const { data: refundedOrder } = await supabase
      .from("orders")
      .select("order_status")
      .eq("id", req_.order_id)
      .single();

    if (refundedOrder?.order_status === "delivered") {
      await reverseAnalyticsOnRefund(req_.order_id, req_.refund_amount);
    } else {
      console.log(`ℹ️ Skipping analytics reversal — order status is '${refundedOrder?.order_status}', not 'delivered'.`);
    }

    await logActivity({
      userId:      admin_id,
      role:        "admin",
      action:      "refund_approved",
      category:    "refund",
      description: `Admin approved refund of ₱${parseFloat(req_.refund_amount).toFixed(2)} for Order #${req_.order_id} via ${req_.payment_method?.toUpperCase()}`,
      metadata:    { refund_id: req.params.id, order_id: req_.order_id, amount: req_.refund_amount, payment_method: req_.payment_method, gateway_status: gatewayResult.status, gateway_refund_id: gatewayResult.refund_id || null, admin_notes: admin_notes || null },
      req,
    });

    res.json({
      success: true,
      message: req_.payment_method === "cod"
        ? "Refund approved. Seller has been notified to complete the manual transfer to the buyer."
        : `Refund of ₱${req_.refund_amount} issued successfully via ${req_.payment_method.toUpperCase()}.`,
      refund_request: updated,
      gateway: gatewayResult
    });
  } catch (error) {
    console.error("❌ Approve refund error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// PATCH /api/refunds/:id/reject
// ================================================================
router.patch("/:id/reject", async (req, res) => {
  try {
    const { admin_id, admin_notes } = req.body;
    if (!admin_id)
      return res.status(400).json({ success: false, error: "admin_id required" });

    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== "admin")
      return res.status(403).json({ success: false, error: "Admin only" });

    const { data: req_ } = await supabase
      .from("refund_requests").select("status, seller_id, order_id, refund_amount")
      .eq("id", req.params.id).single();
    if (!req_)
      return res.status(404).json({ success: false, error: "Not found" });
    if (!["pending", "seller_pending"].includes(req_.status))
      return res.status(400).json({ success: false, error: `Already ${req_.status}` });

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("refund_requests")
      .update({
        status:      "rejected",
        admin_notes: admin_notes || "Request rejected",
        reviewed_by: admin_id,
        reviewed_at: now,
        updated_at:  now
      })
      .eq("id", req.params.id).select().single();

    if (error) throw error;

    if (req_.seller_id) {
      const { data: orderData } = await supabase
        .from("orders").select("order_number").eq("id", req_.order_id).single();
      // ✅ FIX: order_id is a UUID — no parseInt()
      await sendSystemMessage(admin_id, req_.seller_id,
        `[COD Refund Rejected]\n\nOrder #${orderData?.order_number} — The refund request has been rejected by admin.\n${admin_notes ? `Reason: ${admin_notes}` : ""}`,
        req_.order_id
      );
    }

    await logActivity({
      userId:      admin_id,
      role:        "admin",
      action:      "refund_rejected",
      category:    "refund",
      description: `Admin rejected refund request #${req.params.id} — ${admin_notes || "No reason provided"}`,
      metadata:    { refund_id: req.params.id, order_id: req_.order_id, amount: req_.refund_amount, admin_notes: admin_notes || null },
      req,
    });

    res.json({ success: true, message: "Refund request rejected", refund_request: updated });
  } catch (error) {
    console.error("❌ Reject refund error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// GET /api/refunds/backfill-wrong-refunds  (admin — run once)
// ================================================================
router.get("/backfill-wrong-refunds", async (req, res) => {
  try {
    const { data: allApprovedRefunds, error } = await supabase
      .from("refund_requests")
      .select(`id, order_id, refund_amount, analytics_reversed, order:order_id ( order_status, order_date, order_number )`)
      .eq("status", "approved");

    if (error) throw error;

    const wronglyDeducted = (allApprovedRefunds || []).filter(r =>
      r.analytics_reversed === true &&
      r.order?.order_status !== "delivered"
    );

    if (wronglyDeducted.length === 0) {
      return res.json({
        success: true,
        message: "✅ No incorrect deductions found — analytics are clean.",
        checked: allApprovedRefunds?.length || 0,
        fixed: 0,
      });
    }

    let fixed = 0, failed = 0;
    const details = [];

    for (const refund of wronglyDeducted) {
      try {
        const orderDate   = new Date(refund.order?.order_date);
        const year        = orderDate.getFullYear();
        const month       = orderDate.getMonth() + 1;
        const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const amount      = parseFloat(refund.refund_amount || 0);

        const { data: orderItems } = await supabase
          .from("order_items")
          .select("quantity, unit_price, product_category, product_id")
          .eq("order_id", refund.order_id);

        const items      = orderItems || [];
        const totalItems = items.reduce((s, i) => s + i.quantity, 0);

        const { data: monthly } = await supabase
          .from("analytics_monthly_summary").select("*")
          .eq("year", year).eq("month", month).maybeSingle();

        if (monthly) {
          await supabase.from("analytics_monthly_summary").update({
            total_revenue:    parseFloat(monthly.total_revenue    || 0) + amount,
            total_items_sold: (monthly.total_items_sold || 0)           + totalItems,
            updated_at:       new Date().toISOString()
          }).eq("year", year).eq("month", month);
        }

        const catMap = {};
        items.forEach(i => {
          const cat = i.product_category || "Uncategorized";
          if (!catMap[cat]) catMap[cat] = { revenue: 0, items: 0 };
          catMap[cat].revenue += i.quantity * parseFloat(i.unit_price || 0);
          catMap[cat].items   += i.quantity;
        });

        for (const [category, stats] of Object.entries(catMap)) {
          const { data: cat } = await supabase
            .from("analytics_category").select("*")
            .eq("category", category).eq("period_type", "monthly")
            .eq("period_start", periodStart).maybeSingle();
          if (cat) {
            await supabase.from("analytics_category").update({
              total_revenue: parseFloat(cat.total_revenue || 0) + stats.revenue,
              items_sold:    (cat.items_sold || 0)               + stats.items,
              updated_at:    new Date().toISOString()
            }).eq("category", category).eq("period_type", "monthly").eq("period_start", periodStart);
          }
        }

        for (const item of items) {
          const { data: prod } = await supabase
            .from("analytics_product").select("*")
            .eq("product_id", item.product_id).eq("period_type", "monthly")
            .eq("period_start", periodStart).maybeSingle();
          if (prod) {
            const itemRevenue = item.quantity * parseFloat(item.unit_price || 0);
            await supabase.from("analytics_product").update({
              units_sold:    (prod.units_sold    || 0) + item.quantity,
              total_revenue: parseFloat(prod.total_revenue || 0) + itemRevenue,
              updated_at:    new Date().toISOString()
            }).eq("product_id", item.product_id).eq("period_type", "monthly").eq("period_start", periodStart);
          }
        }

        await supabase.from("refund_requests")
          .update({ analytics_reversed: false, updated_at: new Date().toISOString() })
          .eq("id", refund.id);

        fixed++;
        details.push({
          refund_id:         refund.id,
          order_id:          refund.order_id,
          order_number:      refund.order?.order_number,
          order_status:      refund.order?.order_status,
          amount_added_back: amount.toFixed(2),
          period:            `${year}-${String(month).padStart(2, "0")}`,
        });
      } catch (e) {
        failed++;
        console.error(`❌ Failed to fix refund #${refund.id}:`, e.message);
      }
    }

    res.json({
      success: true,
      message: `Backfill complete. Fixed: ${fixed}, Failed: ${failed}`,
      checked: allApprovedRefunds?.length || 0,
      wrong:   wronglyDeducted.length,
      fixed,
      failed,
      details,
    });
  } catch (error) {
    console.error("❌ Backfill error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;