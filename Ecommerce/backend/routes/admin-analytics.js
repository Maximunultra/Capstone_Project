// routes/adminAnalytics.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// Middleware: verify admin JWT
// ─────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, error: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const { data: user } = await supabase.from("users").select("id, role").eq("id", decoded.userId).single();
    if (!user || user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    req.adminId = user.id;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};
router.use(requireAdmin);

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const parseDateRange = (query) => {
  const now = new Date();
  const startDate = query.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endDate = query.endDate
    ? (() => { const d = new Date(query.endDate); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()
    : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
  return { startDate, endDate };
};

const getPriorRange = (startDate, endDate) => {
  const diffMs = new Date(endDate) - new Date(startDate);
  const priorEnd = new Date(startDate);
  const priorStart = new Date(new Date(startDate).getTime() - diffMs);
  return {
    priorStart: priorStart.toISOString().split("T")[0],
    priorEnd:   priorEnd.toISOString().split("T")[0]
  };
};

const getWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
};

// ─────────────────────────────────────────
// GET /api/admin/analytics/summary
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { priorStart, priorEnd } = getPriorRange(startDate, endDate);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount, subtotal, tax, shipping_fee, payment_method, payment_status, order_status, order_date")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const { data: priorOrders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("order_status", "delivered")
      .gte("order_date", priorStart)
      .lt("order_date", priorEnd);

    const allOrders  = orders || [];
    const delivered  = allOrders.filter(o => o.order_status === "delivered");
    const cancelled  = allOrders.filter(o => o.order_status === "cancelled");
    const pending    = allOrders.filter(o => o.order_status === "pending");
    const processing = allOrders.filter(o => o.order_status === "processing");
    const shipped    = allOrders.filter(o => o.order_status === "shipped");

    // ── Gross revenue figures (delivered orders only) ─────────────────────
    const grossRevenue    = delivered.reduce((s, o) => s + parseFloat(o.total_amount  || 0), 0);
    const grossCommission = delivered.reduce((s, o) => s + parseFloat(o.tax           || 0), 0);
    const grossShipping   = delivered.reduce((s, o) => s + parseFloat(o.shipping_fee  || 0), 0);
    const grossSubtotal   = delivered.reduce((s, o) => s + parseFloat(o.subtotal      || 0), 0);
    const priorRevenue    = (priorOrders || []).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    const cancelledRevenue = cancelled.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    const cancelledFees    = cancelled.reduce((s, o) => s + parseFloat(o.tax          || 0), 0);

    const gcash  = delivered.filter(o => o.payment_method === "gcash");
    const paypal = delivered.filter(o => o.payment_method === "paypal");
    const cod    = delivered.filter(o => o.payment_method === "cod");

    // ── Fetch approved refunds — DELIVERED orders only ────────────────────
    // Analytics only records revenue for delivered orders.
    // Refunds on cancelled/pending orders should NOT be deducted because
    // those orders were never added to analytics in the first place.
    // Deducting them would drive revenue below zero incorrectly.
    const { data: approvedRefunds } = await supabase
      .from("refund_requests")
      .select("refund_amount, order_id, order:order_id(order_status)")
      .eq("status", "approved");

    const deliveredRefunds = (approvedRefunds || []).filter(
      r => r.order?.order_status === "delivered"
    );

    const refundedOrderIds = deliveredRefunds.map(r => r.order_id);
    let refundedTax      = 0;
    let refundedShipping = 0;
    let refundedSubtotal = 0;
    const totalRefunded  = deliveredRefunds.reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);

    if (refundedOrderIds.length > 0) {
      const { data: refundedOrders } = await supabase
        .from("orders")
        .select("tax, shipping_fee, subtotal")
        .in("id", refundedOrderIds);
      refundedTax      = (refundedOrders || []).reduce((s, o) => s + parseFloat(o.tax          || 0), 0);
      refundedShipping = (refundedOrders || []).reduce((s, o) => s + parseFloat(o.shipping_fee  || 0), 0);
      refundedSubtotal = (refundedOrders || []).reduce((s, o) => s + parseFloat(o.subtotal      || 0), 0);
    }

    // ── Net figures after deducting delivered-order refunds ───────────────
    const totalRevenue    = Math.max(0, grossRevenue    - totalRefunded);
    const systemCommission = Math.max(0, grossCommission - refundedTax);
    const shippingRevenue  = Math.max(0, grossShipping  - refundedShipping);
    const sellerRevenue    = Math.max(0, grossSubtotal  - refundedSubtotal);

    const revenueGrowth = priorRevenue > 0
      ? ((totalRevenue - priorRevenue) / priorRevenue) * 100
      : 0;
    const avgOrderValue = delivered.length > 0 ? totalRevenue / delivered.length : 0;

    // ── Products sold ─────────────────────────────────────────────────────
    const deliveredIds = delivered.map(o => o.id);
    let totalProductsSold = 0;
    if (deliveredIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items").select("quantity").in("order_id", deliveredIds);
      totalProductsSold = (items || []).reduce((s, i) => s + i.quantity, 0);
    }

    res.json({
      success: true,
      stats: {
        // ── Revenue (net after delivered-order refunds) ────────────────
        totalRevenue:      totalRevenue.toFixed(2),
        grossRevenue:      grossRevenue.toFixed(2),
        totalRefunded:     totalRefunded.toFixed(2),
        systemCommission:  systemCommission.toFixed(2),
        sellerRevenue:     sellerRevenue.toFixed(2),
        shippingRevenue:   shippingRevenue.toFixed(2),
        revenueGrowth:     revenueGrowth.toFixed(1),
        avgOrderValue:     avgOrderValue.toFixed(2),
        // ── Orders ────────────────────────────────────────────────────
        totalOrders:       allOrders.length,
        deliveredOrders:   delivered.length,
        cancelledOrders:   cancelled.length,
        pendingOrders:     pending.length,
        processingOrders:  processing.length,
        shippedOrders:     shipped.length,
        productsSold:      totalProductsSold,
        // ── Payment methods (net — refunds deducted per method) ───────────
        // Build a map of refunded order_id → { amount, payment_method }
        // so we can subtract from the correct payment method bucket.
        gcashRevenue: (() => {
          const refundedGcash = deliveredRefunds
            .filter(r => gcash.some(o => o.id === r.order_id))
            .reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);
          return Math.max(0, gcash.reduce((s,o)=>s+parseFloat(o.total_amount||0),0) - refundedGcash).toFixed(2);
        })(),
        gcashOrders:  gcash.length,
        paypalRevenue: (() => {
          const refundedPaypal = deliveredRefunds
            .filter(r => paypal.some(o => o.id === r.order_id))
            .reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);
          return Math.max(0, paypal.reduce((s,o)=>s+parseFloat(o.total_amount||0),0) - refundedPaypal).toFixed(2);
        })(),
        paypalOrders:  paypal.length,
        codRevenue: (() => {
          const refundedCod = deliveredRefunds
            .filter(r => cod.some(o => o.id === r.order_id))
            .reduce((s, r) => s + parseFloat(r.refund_amount || 0), 0);
          return Math.max(0, cod.reduce((s,o)=>s+parseFloat(o.total_amount||0),0) - refundedCod).toFixed(2);
        })(),
        codOrders:     cod.length,
        // ── Cancellations ─────────────────────────────────────────────
        cancelledRevenue:  cancelledRevenue.toFixed(2),
        cancelledFees:     cancelledFees.toFixed(2),
        lastMonthRevenue:  priorRevenue.toFixed(2),
        dateRange:         { startDate, endDate }
      }
    });
  } catch (error) {
    console.error("Error /admin/analytics/summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/sales-by-period
// groupBy=month|week
// ─────────────────────────────────────────
router.get("/sales-by-period", async (req, res) => {
  try {
    const groupBy = req.query.groupBy || "month";
    const { startDate, endDate } = parseDateRange(req.query);
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // ── Fetch approved refunds on DELIVERED orders only ───────────────────
    // Used to deduct from bar chart so it matches the stat cards.
    // Build a map: order_id → { amount, tax } for quick lookup
    const { data: approvedRefunds } = await supabase
      .from("refund_requests")
      .select("order_id, refund_amount, order:order_id(order_status, order_date, tax)")
      .eq("status", "approved");

    // Only include refunds where the order was delivered
    const refundByOrderId = {};
    (approvedRefunds || [])
      .filter(r => r.order?.order_status === "delivered")
      .forEach(r => {
        refundByOrderId[r.order_id] = {
          amount: parseFloat(r.refund_amount || 0),
          tax:    parseFloat(r.order?.tax    || 0),
        };
      });

    if (groupBy === "month") {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount, tax, order_date")
        .eq("order_status", "delivered")
        .gte("order_date", `${year}-01-01`)
        .lt("order_date", `${year+1}-01-01`);

      const buckets = monthNames.map(m => ({ month: m, revenue: 0, commission: 0, orders: 0 }));
      (orders || []).forEach(o => {
        const m          = new Date(o.order_date).getMonth();
        const refund     = refundByOrderId[o.id];
        const revenue    = parseFloat(o.total_amount || 0) - (refund?.amount || 0);
        const commission = parseFloat(o.tax          || 0) - (refund?.tax   || 0);
        buckets[m].revenue    += revenue;
        buckets[m].commission += commission;
        buckets[m].orders     += 1;
      });

      return res.json({ success: true, groupBy: "month", data: buckets.map(b => ({
        month:      b.month,
        revenue:    Math.max(0, Math.round(b.revenue)),
        commission: Math.max(0, Math.round(b.commission)),
        orders:     b.orders
      }))});
    }

    // ── Weekly ────────────────────────────────────────────────────────────
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount, tax, order_date")
      .eq("order_status", "delivered")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const weekMap = {};
    (orders || []).forEach(o => {
      const monday     = getWeekMonday(o.order_date);
      const refund     = refundByOrderId[o.id];
      const revenue    = parseFloat(o.total_amount || 0) - (refund?.amount || 0);
      const commission = parseFloat(o.tax          || 0) - (refund?.tax   || 0);
      if (!weekMap[monday]) weekMap[monday] = { revenue: 0, commission: 0, orders: 0 };
      weekMap[monday].revenue    += revenue;
      weekMap[monday].commission += commission;
      weekMap[monday].orders     += 1;
    });

    const data = Object.entries(weekMap)
      .sort(([a],[b]) => new Date(a)-new Date(b))
      .map(([monday, b]) => {
        const d = new Date(monday);
        return {
          label:      `${d.toLocaleString("default",{month:"short"})} ${String(d.getDate()).padStart(2,"0")}`,
          week:       monday,
          revenue:    Math.max(0, Math.round(b.revenue)),
          commission: Math.max(0, Math.round(b.commission)),
          orders:     b.orders
        };
      });

    res.json({ success: true, groupBy: "week", data });
  } catch (error) {
    console.error("Error /admin/analytics/sales-by-period:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/orders-by-status
// ─────────────────────────────────────────
router.get("/orders-by-status", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: orders } = await supabase
      .from("orders")
      .select("order_status, total_amount, payment_method")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const statuses = ["pending","processing","shipped","delivered","cancelled"];
    const colors   = {
      pending:    "#f59e0b",
      processing: "#3b82f6",
      shipped:    "#8b5cf6",
      delivered:  "#10b981",
      cancelled:  "#ef4444"
    };

    const data = statuses.map(status => {
      const group = (orders || []).filter(o => o.order_status === status);
      return {
        status,
        label:   status.charAt(0).toUpperCase() + status.slice(1),
        count:   group.length,
        revenue: group.reduce((s,o) => s + parseFloat(o.total_amount||0), 0).toFixed(2),
        color:   colors[status]
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/cancelled-orders
// ─────────────────────────────────────────
router.get("/cancelled-orders", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const limit = parseInt(req.query.limit) || 50;

    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, tax, payment_method, payment_status, order_date, cancelled_at, shipping_city, shipping_province")
      .eq("order_status", "cancelled")
      .gte("order_date", startDate)
      .lt("order_date", endDate)
      .order("cancelled_at", { ascending: false })
      .limit(limit);

    const allCancelled = orders || [];
    const totalRevenueLost = allCancelled.reduce((s,o) => s + parseFloat(o.total_amount||0), 0);
    const totalFeesLost    = allCancelled.reduce((s,o) => s + parseFloat(o.tax||0), 0);

    // Group by payment method
    const byPayment = {};
    allCancelled.forEach(o => {
      const m = o.payment_method || "unknown";
      if (!byPayment[m]) byPayment[m] = { count: 0, revenue: 0 };
      byPayment[m].count   += 1;
      byPayment[m].revenue += parseFloat(o.total_amount||0);
    });

    res.json({
      success: true,
      summary: {
        totalCancelled:  allCancelled.length,
        totalRevenueLost: totalRevenueLost.toFixed(2),
        totalFeesLost:    totalFeesLost.toFixed(2),
        byPaymentMethod:  byPayment
      },
      data: allCancelled.map(o => ({
        order_number:    o.order_number,
        total_amount:    parseFloat(o.total_amount||0).toFixed(2),
        fee_lost:        parseFloat(o.tax||0).toFixed(2),
        payment_method:  o.payment_method,
        payment_status:  o.payment_status,
        order_date:      o.order_date,
        cancelled_at:    o.cancelled_at,
        was_paid:        o.payment_status === "paid"
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/category-distribution
// ─────────────────────────────────────────
router.get("/category-distribution", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4"];

    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("order_status", "delivered")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const orderIds = (orders || []).map(o => o.id);
    if (!orderIds.length) return res.json({ success: true, data: [] });

    const { data: items } = await supabase
      .from("order_items")
      .select("product_category, quantity, unit_price")
      .in("order_id", orderIds);

    const catMap = {}; let total = 0;
    (items || []).forEach(i => {
      const cat = i.product_category || "Uncategorized";
      const rev = i.quantity * parseFloat(i.unit_price||0);
      catMap[cat] = (catMap[cat]||0) + rev;
      total += rev;
    });

    const data = Object.entries(catMap)
      .sort((a,b) => b[1]-a[1])
      .slice(0,7)
      .map(([name, rev], idx) => ({
        name,
        color: colors[idx % colors.length],
        value: total > 0 ? parseFloat(((rev/total)*100).toFixed(1)) : 0,
        revenue: rev.toFixed(2)
      }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-products
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const limit = parseInt(req.query.limit) || 10;

    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("order_status", "delivered")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const orderIds = (orders || []).map(o => o.id);
    if (!orderIds.length) return res.json({ success: true, data: [] });

    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price")
      .in("order_id", orderIds);

    const productMap = {};
    (items || []).forEach(i => {
      if (!productMap[i.product_id])
        productMap[i.product_id] = { id: i.product_id, name: i.product_name, sales: 0, revenue: 0 };
      productMap[i.product_id].sales   += i.quantity;
      productMap[i.product_id].revenue += i.quantity * parseFloat(i.unit_price||0);
    });

    const data = Object.values(productMap)
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(p => ({ ...p, revenue: Math.round(p.revenue) }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-sellers
// ─────────────────────────────────────────
router.get("/top-sellers", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const limit = parseInt(req.query.limit) || 10;

    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("order_status", "delivered")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const orderIds = (orders || []).map(o => o.id);
    if (!orderIds.length) return res.json({ success: true, data: [] });

    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, order_id")
      .in("order_id", orderIds);

    if (!items?.length) return res.json({ success: true, data: [] });

    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from("product")
      .select("id, user_id, users:user_id(id, full_name, store_name, email)")
      .in("id", productIds);

    const productSellerMap = {};
    (products || []).forEach(p => { productSellerMap[p.id] = p.users; });

    const sellerMap = {};
    items.forEach(i => {
      const seller = productSellerMap[i.product_id];
      if (!seller) return;
      const sid = seller.id;
      if (!sellerMap[sid])
        sellerMap[sid] = { seller_id: sid, seller_name: seller.store_name || seller.full_name, seller_email: seller.email, items_sold: 0, total_revenue: 0, orders: new Set() };
      sellerMap[sid].items_sold    += i.quantity;
      sellerMap[sid].total_revenue += i.quantity * parseFloat(i.unit_price||0);
      sellerMap[sid].orders.add(i.order_id);
    });

    const data = Object.values(sellerMap)
      .sort((a,b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)
      .map(s => ({ ...s, total_revenue: Math.round(s.total_revenue), total_orders: s.orders.size, orders: undefined }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/payment-transactions
// GCash + PayPal — ALL order statuses so admin can monitor payment vs delivery
// ─────────────────────────────────────────
router.get("/payment-transactions", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const { data } = await supabase
      .from("orders")
      .select(`
        id, order_number, total_amount, subtotal, tax, shipping_fee,
        payment_method, payment_status, payment_intent_id, payment_capture_id,
        order_status, order_date, cancelled_at,
        user:user_id ( full_name, email )
      `)
      .in("payment_method", ["gcash", "paypal", "cod"])
      .gte("order_date", startDate)
      .lt("order_date",  endDate)
      .order("order_date", { ascending: false });

    // Enrich with refund info
    const orderIds = (data || []).map(o => o.id);
    let refundMap = {};
    if (orderIds.length > 0) {
      const { data: refunds } = await supabase
        .from("refund_requests")
        .select("order_id, status, refund_amount")
        .in("order_id", orderIds);
      (refunds || []).forEach(r => { refundMap[r.order_id] = r; });
    }

    const enriched = (data || []).map(o => ({
      id:                 o.id,
      order_number:       o.order_number,
      customer_name:      o.user?.full_name  || "—",
      customer_email:     o.user?.email      || "—",
      total_amount:       parseFloat(o.total_amount   || 0).toFixed(2),
      subtotal:           parseFloat(o.subtotal       || 0).toFixed(2),
      tax:                parseFloat(o.tax            || 0).toFixed(2),
      shipping_fee:       parseFloat(o.shipping_fee   || 0).toFixed(2),
      payment_method:     o.payment_method,
      payment_status:     o.payment_status,
      payment_intent_id:  o.payment_intent_id  || null,
      payment_capture_id: o.payment_capture_id || null,
      order_status:       o.order_status,
      order_date:         o.order_date,
      cancelled_at:       o.cancelled_at || null,
      refund:             refundMap[o.id] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error /admin/analytics/payment-transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/sellers-by-payment
// ─────────────────────────────────────────
router.get("/sellers-by-payment", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount, payment_method")
      .eq("order_status", "delivered")
      .in("payment_method", ["gcash","paypal"])
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const orderIds = (orders || []).map(o => o.id);
    if (!orderIds.length) return res.json({ success: true, data: [] });

    const orderMap = {};
    (orders || []).forEach(o => { orderMap[o.id] = o; });

    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, order_id")
      .in("order_id", orderIds);

    if (!items?.length) return res.json({ success: true, data: [] });

    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from("product")
      .select("id, user_id, users:user_id(id, full_name, store_name, email)")
      .in("id", productIds);

    const productSellerMap = {};
    (products || []).forEach(p => { productSellerMap[p.id] = p.users; });

    const sellerMap = {};
    items.forEach(i => {
      const seller = productSellerMap[i.product_id];
      const order  = orderMap[i.order_id];
      if (!seller || !order) return;
      const sid = seller.id;
      if (!sellerMap[sid])
        sellerMap[sid] = { seller_name: seller.store_name || seller.full_name, seller_email: seller.email, gcash_orders: 0, gcash_revenue: 0, paypal_orders: 0, paypal_revenue: 0, orders: new Set() };
      const rev = i.quantity * parseFloat(i.unit_price||0);
      if (order.payment_method === "gcash") { sellerMap[sid].gcash_orders++; sellerMap[sid].gcash_revenue += rev; }
      if (order.payment_method === "paypal") { sellerMap[sid].paypal_orders++; sellerMap[sid].paypal_revenue += rev; }
      sellerMap[sid].orders.add(i.order_id);
    });

    const data = Object.values(sellerMap).map(s => ({
      ...s,
      gcash_revenue:  s.gcash_revenue.toFixed(2),
      paypal_revenue: s.paypal_revenue.toFixed(2),
      total_orders:   s.orders.size,
      total_revenue:  (s.gcash_revenue + s.paypal_revenue).toFixed(2),
      orders: undefined
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/orders-all
// Fetches all orders in date range with decrypted shipping + seller info
// Query: ?startDate=&endDate=&limit=200
// ─────────────────────────────────────────
import crypto from "crypto";

const ORDER_ENC_KEY = process.env.MESSAGE_ENCRYPTION_KEY
  ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, "hex")
  : null;

function safeDecrypt(text) {
  if (!text) return text;
  if (!ORDER_ENC_KEY) return text;
  try {
    const parts = String(text).split(":");
    if (parts.length !== 3) return text;
    if (!/^[0-9a-f]+$/i.test(parts[0])) return text;
    const iv      = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ORDER_ENC_KEY, iv);
    decipher.setAuthTag(authTag);
    let dec = decipher.update(parts[2], "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch {
    return text; // already plain text or wrong key — return as-is
  }
}

router.get("/orders-all", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const limit = parseInt(req.query.limit) || 200;

    // Fetch orders with order_items → product → seller
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, order_date, order_status,
        payment_method, payment_status, payment_intent_id,
        total_amount, subtotal, tax, shipping_fee,
        shipping_full_name, shipping_email, shipping_city, shipping_province,
        order_items (
          product_id,
          product:product_id ( user_id, brand )
        )
      `)
      .gte("order_date", startDate)
      .lt("order_date",  endDate)
      .order("order_date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Collect all unique seller IDs across all orders
    const sellerIdSet = new Set();
    (orders || []).forEach(o => {
      (o.order_items || []).forEach(item => {
        if (item.product?.user_id) sellerIdSet.add(item.product.user_id);
      });
    });

    // Fetch seller names in one query
    const sellerMap = {};
    if (sellerIdSet.size > 0) {
      const { data: sellers } = await supabase
        .from("users")
        .select("id, full_name, store_name")
        .in("id", [...sellerIdSet]);
      (sellers || []).forEach(s => {
        sellerMap[s.id] = s.store_name || s.full_name || "Unknown Seller";
      });
    }

    // Build enriched response — decrypt shipping fields + attach sellers
    const enriched = (orders || []).map(o => {
      const sellers = [...new Map(
        (o.order_items || [])
          .filter(i => i.product?.user_id)
          .map(i => [i.product.user_id, {
            id:   i.product.user_id,
            name: sellerMap[i.product.user_id] || "Unknown Seller"
          }])
      ).values()];

      return {
        id:                 o.id,
        order_number:       o.order_number,
        order_date:         o.order_date,
        order_status:       o.order_status,
        payment_method:     o.payment_method,
        payment_status:     o.payment_status,
        payment_intent_id:  o.payment_intent_id,
        total_amount:       o.total_amount,
        subtotal:           o.subtotal,
        tax:                o.tax,
        shipping_fee:       o.shipping_fee,
        // Decrypt shipping fields — safeDecrypt returns plain text if already decrypted
        shipping_full_name: safeDecrypt(o.shipping_full_name),
        shipping_email:     safeDecrypt(o.shipping_email),
        shipping_city:      safeDecrypt(o.shipping_city),
        shipping_province:  safeDecrypt(o.shipping_province),
        // Seller info for filtering
        seller_id:          sellers[0]?.id   || null,
        seller_name:        sellers[0]?.name || null,
        sellers,
      };
    });

    res.json({ success: true, orders: enriched });
  } catch (error) {
    console.error("Error /admin/analytics/orders-all:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/payment-breakdown
// Revenue breakdown by payment method (delivered orders, net of refunds)
// ─────────────────────────────────────────
router.get("/payment-breakdown", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, payment_method, total_amount, tax, subtotal")
      .eq("order_status", "delivered")
      .gte("order_date", startDate)
      .lt("order_date", endDate);

    const stats = {
      gcash:  { count: 0, revenue: 0, commission: 0, orderIds: [] },
      paypal: { count: 0, revenue: 0, commission: 0, orderIds: [] },
      cod:    { count: 0, revenue: 0, commission: 0, orderIds: [] },
    };

    const total = (orders || []).length;

    (orders || []).forEach(o => {
      const m = o.payment_method?.toLowerCase();
      if (stats[m]) {
        stats[m].count      += 1;
        stats[m].revenue    += parseFloat(o.total_amount || 0);
        stats[m].commission += parseFloat(o.tax || 0);
        stats[m].orderIds.push(o.id);
      }
    });

    // Deduct approved refunds per payment method
    const allOrderIds = Object.values(stats).flatMap(s => s.orderIds);
    if (allOrderIds.length > 0) {
      const { data: refunds } = await supabase
        .from("refund_requests")
        .select("order_id, refund_amount, order:order_id(tax)")
        .eq("status", "approved")
        .in("order_id", allOrderIds);

      (refunds || []).forEach(r => {
        for (const [method, s] of Object.entries(stats)) {
          if (s.orderIds.includes(r.order_id)) {
            s.revenue    -= parseFloat(r.refund_amount || 0);
            s.commission -= parseFloat(r.order?.tax    || 0);
          }
        }
      });
    }

    const data = Object.entries(stats).map(([method, s]) => ({
      method:     method.toUpperCase(),
      orders:     s.count,
      revenue:    Math.max(0, s.revenue).toFixed(2),
      commission: Math.max(0, s.commission).toFixed(2),
      percentage: total > 0 ? ((s.count / total) * 100).toFixed(1) : "0.0",
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /admin/analytics/payment-breakdown:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/activity-logs
// Query: ?category=all&role=all&limit=50&offset=0
// ─────────────────────────────────────────
router.get("/activity-logs", async (req, res) => {
  try {
    const { category, role, action, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("activity_logs")
      .select(`
        id, action, category, description, metadata,
        ip_address, created_at, role,
        user:user_id ( id, full_name, email )
      `)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category && category !== "all") query = query.eq("category", category);
    if (role     && role     !== "all") query = query.eq("role",     role);
    if (action   && action   !== "all") query = query.eq("action",   action);

    const { data, error } = await query;
    if (error) throw error;

    // Count total for pagination
    let countQuery = supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true });
    if (category && category !== "all") countQuery = countQuery.eq("category", category);
    if (role     && role     !== "all") countQuery = countQuery.eq("role",     role);
    if (action   && action   !== "all") countQuery = countQuery.eq("action",   action);
    const { count } = await countQuery;

    res.json({ success: true, logs: data || [], total: count || 0 });
  } catch (error) {
    console.error("Error /admin/analytics/activity-logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;