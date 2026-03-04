// routes/admin-analytics.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// Middleware: verify admin JWT
// ─────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ success: false, error: "No authorization token provided" });

    const token = authHeader.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    const { data: userData, error: userError } = await supabase
      .from("users").select("id, role").eq("id", decoded.userId).single();

    if (userError || !userData || userData.role !== "admin")
      return res.status(403).json({ success: false, error: "Access denied. Admin account required." });

    req.adminId = userData.id;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};
router.use(verifyAdmin);

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/**
 * Parse ?startDate & ?endDate.
 * Client sends inclusive end (e.g. Feb 28) → make exclusive (+1 day).
 * Falls back to current calendar month.
 */
const parseDateRange = (query) => {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

  const startDate = query.startDate || defaultStart;
  const endDate   = query.endDate
    ? (() => { const d = new Date(query.endDate); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()
    : defaultEnd;

  return { startDate, endDate };
};

/** Equal-length prior period for growth comparison */
const getPriorRange = (startDate, endDate) => {
  const diffMs     = new Date(endDate) - new Date(startDate);
  const priorEnd   = new Date(startDate);
  const priorStart = new Date(new Date(startDate).getTime() - diffMs);
  return { priorStart: priorStart.toISOString().split("T")[0], priorEnd: priorEnd.toISOString().split("T")[0] };
};

/** Monday of the ISO week containing `date` */
const getWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
};

// ─────────────────────────────────────────
// GET /api/admin/analytics/summary
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { priorStart, priorEnd } = getPriorRange(startDate, endDate);

    // Current period orders
    const { data: currentOrders } = await supabase
      .from("orders")
      .select("id, total_amount, subtotal, tax, shipping_fee, payment_method")
      .eq("order_status", "delivered")
      .gte("order_date", startDate).lt("order_date", endDate);

    // Prior period orders (for growth)
    const { data: priorOrders } = await supabase
      .from("orders").select("total_amount")
      .eq("order_status", "delivered")
      .gte("order_date", priorStart).lt("order_date", priorEnd);

    const curr = currentOrders || [];
    const prior = priorOrders || [];

    const totalRevenue   = curr.reduce((s,o) => s+parseFloat(o.total_amount||0), 0);
    const totalSubtotal  = curr.reduce((s,o) => s+parseFloat(o.subtotal||0), 0);
    const totalTax       = curr.reduce((s,o) => s+parseFloat(o.tax||0), 0);
    const totalShipping  = curr.reduce((s,o) => s+parseFloat(o.shipping_fee||0), 0);
    const priorRevenue   = prior.reduce((s,o) => s+parseFloat(o.total_amount||0), 0);

    const gcash  = curr.filter(o => o.payment_method === "gcash");
    const paypal = curr.filter(o => o.payment_method === "paypal");
    const cod    = curr.filter(o => o.payment_method === "cod");

    const revenueGrowth  = priorRevenue > 0 ? ((totalRevenue - priorRevenue) / priorRevenue) * 100 : 0;
    const avgOrderValue  = curr.length > 0 ? totalRevenue / curr.length : 0;

    // Products sold + top category from order_items
    const currentOrderIds = curr.map(o => o.id);
    let productsSold = 0; let topCategory = "N/A";
    if (currentOrderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items").select("quantity, product_category").in("order_id", currentOrderIds);
      productsSold = (items||[]).reduce((s,i) => s+i.quantity, 0);
      const catMap = {};
      (items||[]).forEach(i => { const c=i.product_category||"Uncategorized"; catMap[c]=(catMap[c]||0)+i.quantity; });
      topCategory = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || "N/A";
    }

    res.json({
      success: true,
      stats: {
        totalRevenue:     totalRevenue.toFixed(2),
        revenueGrowth:    revenueGrowth.toFixed(1),
        productsSold,
        avgOrderValue:    avgOrderValue.toFixed(2),
        avgOrderChange:   "0",
        topCategory,
        sellerRevenue:    totalSubtotal.toFixed(2),
        systemCommission: totalTax.toFixed(2),
        shippingRevenue:  totalShipping.toFixed(2),
        gcashRevenue:     gcash.reduce((s,o)=>s+parseFloat(o.total_amount||0),0).toFixed(2),
        gcashOrders:      gcash.length,
        paypalRevenue:    paypal.reduce((s,o)=>s+parseFloat(o.total_amount||0),0).toFixed(2),
        paypalOrders:     paypal.length,
        codRevenue:       cod.reduce((s,o)=>s+parseFloat(o.total_amount||0),0).toFixed(2),
        codOrders:        cod.length,
        totalOrders:      curr.length,
        lastMonthRevenue: priorRevenue.toFixed(2),
        dateRange:        { startDate, endDate }
      }
    });
  } catch (error) {
    console.error("Error /admin/analytics/summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/sales-by-period
// Query: ?groupBy=month|week  &year=YYYY  &startDate=  &endDate=
//   month → 12 bars for the given year
//   week  → one bar per ISO week within the date range
// ─────────────────────────────────────────
router.get("/sales-by-period", async (req, res) => {
  try {
    const groupBy    = req.query.groupBy || "month";
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    if (groupBy === "month") {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const { data: orders } = await supabase
        .from("orders").select("order_date, total_amount, subtotal, tax, user_id")
        .eq("order_status", "delivered")
        .gte("order_date", `${year}-01-01`).lt("order_date", `${year+1}-01-01`);

      const buckets = monthNames.map(m => ({ month: m, revenue: 0, commission: 0, orders: 0, customers: new Set() }));
      (orders||[]).forEach(o => {
        const m = new Date(o.order_date).getMonth();
        buckets[m].revenue    += parseFloat(o.total_amount||0);
        buckets[m].commission += parseFloat(o.tax||0);
        buckets[m].orders     += 1;
        buckets[m].customers.add(o.user_id);
      });

      return res.json({ success: true, groupBy: "month", data: buckets.map(b => ({ month: b.month, revenue: Math.round(b.revenue), commission: Math.round(b.commission), orders: b.orders, customers: b.customers.size })) });
    }

    // ── Weekly ──
    const { startDate, endDate } = parseDateRange(req.query);
    const { data: orders } = await supabase
      .from("orders").select("id, order_date, total_amount, tax, user_id")
      .eq("order_status", "delivered")
      .gte("order_date", startDate).lt("order_date", endDate);

    const weekMap = {};
    (orders||[]).forEach(o => {
      const monday = getWeekMonday(o.order_date);
      if (!weekMap[monday]) weekMap[monday] = { revenue: 0, commission: 0, orders: 0, customers: new Set() };
      weekMap[monday].revenue    += parseFloat(o.total_amount||0);
      weekMap[monday].commission += parseFloat(o.tax||0);
      weekMap[monday].orders     += 1;
      weekMap[monday].customers.add(o.user_id);
    });

    const data = Object.entries(weekMap).sort(([a],[b])=>new Date(a)-new Date(b)).map(([monday,b]) => {
      const d = new Date(monday);
      return {
        label:      `${d.toLocaleString("default",{month:"short"})} ${String(d.getDate()).padStart(2,"0")}`,
        week:       monday,
        revenue:    Math.round(b.revenue),
        commission: Math.round(b.commission),
        orders:     b.orders,
        customers:  b.customers.size
      };
    });

    res.json({ success: true, groupBy: "week", data });
  } catch (error) {
    console.error("Error /admin/analytics/sales-by-period:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backwards-compatible alias
router.get("/sales-by-month", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const { data: orders } = await supabase.from("orders").select("order_date, total_amount, tax, user_id")
      .eq("order_status","delivered").gte("order_date",`${year}-01-01`).lt("order_date",`${year+1}-01-01`);
    const buckets = monthNames.map(m=>({month:m,revenue:0,commission:0,orders:0,customers:new Set()}));
    (orders||[]).forEach(o=>{const m=new Date(o.order_date).getMonth();buckets[m].revenue+=parseFloat(o.total_amount||0);buckets[m].commission+=parseFloat(o.tax||0);buckets[m].orders+=1;buckets[m].customers.add(o.user_id);});
    res.json({ success:true, data: buckets.map(b=>({month:b.month,revenue:Math.round(b.revenue),commission:Math.round(b.commission),orders:b.orders,customers:b.customers.size})) });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/category-distribution
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/category-distribution", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981"];

    const { data: deliveredOrders } = await supabase
      .from("orders").select("id").eq("order_status","delivered")
      .gte("order_date", startDate).lt("order_date", endDate);

    const ids = (deliveredOrders||[]).map(o=>o.id);
    if (!ids.length) return res.json({ success: true, data: [] });

    const { data: items } = await supabase
      .from("order_items").select("product_category, quantity").in("order_id", ids);

    const catMap = {}; let total = 0;
    (items||[]).forEach(i => { const c=i.product_category||"Uncategorized"; catMap[c]=(catMap[c]||0)+i.quantity; total+=i.quantity; });

    const data = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,qty],i) => ({
      name, color: colors[i%colors.length],
      value: total>0 ? parseFloat(((qty/total)*100).toFixed(1)) : 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /admin/analytics/category-distribution:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-products
// Query: ?limit=5&startDate=&endDate=&groupBy=month|week
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit) || 5;
    const groupBy = req.query.groupBy || "month";
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: deliveredOrders } = await supabase
      .from("orders").select("id").eq("order_status","delivered")
      .gte("order_date", startDate).lt("order_date", endDate);

    const ids = (deliveredOrders||[]).map(o=>o.id);
    if (!ids.length) return res.json({ success: true, data: [], groupBy });

    const { data: items } = await supabase
      .from("order_items").select("product_id, product_name, quantity, unit_price").in("order_id", ids);

    const map = {};
    (items||[]).forEach(i => {
      if (!map[i.product_id]) map[i.product_id] = { name: i.product_name, sales: 0, revenue: 0 };
      map[i.product_id].sales   += i.quantity;
      map[i.product_id].revenue += i.quantity * parseFloat(i.unit_price);
    });

    const data = Object.values(map).sort((a,b)=>b.revenue-a.revenue).slice(0,limit).map(p => ({
      name: p.name, sales: p.sales, revenue: Math.round(p.revenue)
    }));

    res.json({ success: true, data, groupBy });
  } catch (error) {
    console.error("Error /admin/analytics/top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-sellers
// Query: ?limit=10&startDate=&endDate=&groupBy=month|week
// ─────────────────────────────────────────
router.get("/top-sellers", async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit) || 10;
    const groupBy = req.query.groupBy || "month";
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: sellers } = await supabase.from("users").select("id, full_name, email").eq("role","seller");
    if (!sellers?.length) return res.json({ success: true, data: [], groupBy });

    const sellerStats = [];

    for (const seller of sellers) {
      const { data: products } = await supabase.from("product").select("id").eq("user_id", seller.id);
      const productIds = (products||[]).map(p=>p.id);
      if (!productIds.length) continue;

      const { data: orderItems } = await supabase
        .from("order_items").select("quantity, unit_price, order_id").in("product_id", productIds);
      if (!orderItems?.length) continue;

      const orderIds = [...new Set(orderItems.map(i=>i.order_id))];
      const { data: orders } = await supabase.from("orders").select("id")
        .in("id", orderIds).eq("order_status","delivered")
        .gte("order_date", startDate).lt("order_date", endDate);

      const deliveredIds = new Set((orders||[]).map(o=>o.id));
      const periodItems  = orderItems.filter(i => deliveredIds.has(i.order_id));
      if (!periodItems.length) continue;

      const revenue   = periodItems.reduce((s,i) => s+i.quantity*parseFloat(i.unit_price), 0);
      const itemsSold = periodItems.reduce((s,i) => s+i.quantity, 0);

      sellerStats.push({
        seller_id: seller.id, seller_name: seller.full_name, seller_email: seller.email,
        total_revenue: revenue, items_sold: itemsSold, total_orders: deliveredIds.size
      });
    }

    const data = sellerStats.sort((a,b)=>b.total_revenue-a.total_revenue).slice(0,limit)
      .map(s => ({ ...s, total_revenue: s.total_revenue.toFixed(2) }));

    res.json({ success: true, data, groupBy });
  } catch (error) {
    console.error("Error /admin/analytics/top-sellers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/payment-breakdown
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/payment-breakdown", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { data: orders } = await supabase
      .from("orders").select("payment_method, total_amount, tax, subtotal")
      .eq("order_status","delivered").gte("order_date", startDate).lt("order_date", endDate);

    const stats = { gcash:{count:0,revenue:0,commission:0}, paypal:{count:0,revenue:0,commission:0}, cod:{count:0,revenue:0,commission:0} };
    const total = (orders||[]).length;

    (orders||[]).forEach(o => {
      const m = o.payment_method?.toLowerCase();
      if (stats[m]) {
        stats[m].count      += 1;
        stats[m].revenue    += parseFloat(o.total_amount||0);
        stats[m].commission += parseFloat(o.tax||0);
      }
    });

    const data = Object.entries(stats).map(([method,s]) => ({
      method:     method.toUpperCase(),
      orders:     s.count,
      revenue:    s.revenue.toFixed(2),
      commission: s.commission.toFixed(2),
      percentage: total > 0 ? ((s.count/total)*100).toFixed(1) : 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /admin/analytics/payment-breakdown:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/sellers-by-payment
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/sellers-by-payment", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { data: sellers } = await supabase.from("users").select("id, full_name, email").eq("role","seller");
    if (!sellers?.length) return res.json({ success: true, data: [] });

    const results = [];

    for (const seller of sellers) {
      const { data: products } = await supabase.from("product").select("id").eq("user_id", seller.id);
      const productIds = (products||[]).map(p=>p.id);
      if (!productIds.length) continue;

      const { data: orderItems } = await supabase
        .from("order_items").select("order_id, quantity, unit_price").in("product_id", productIds);
      if (!orderItems?.length) continue;

      const orderIds = [...new Set(orderItems.map(i=>i.order_id))];
      const { data: orders } = await supabase
        .from("orders").select("id, payment_method")
        .in("id", orderIds).eq("order_status","delivered")
        .gte("order_date", startDate).lt("order_date", endDate);
      if (!orders?.length) continue;

      const deliveredIds = new Set(orders.map(o=>o.id));
      const orderMethodMap = {}; orders.forEach(o => { orderMethodMap[o.id] = o.payment_method; });
      const itemsByOrder = {};
      orderItems.forEach(i => { if(!itemsByOrder[i.order_id]) itemsByOrder[i.order_id]=[]; itemsByOrder[i.order_id].push(i); });

      const stats = { gcash:{orders:0,revenue:0}, paypal:{orders:0,revenue:0}, cod:{orders:0,revenue:0}, total:{orders:0,revenue:0} };

      orders.forEach(order => {
        const items = itemsByOrder[order.id]||[];
        const rev   = items.reduce((s,i)=>s+i.quantity*parseFloat(i.unit_price),0);
        const m     = order.payment_method?.toLowerCase();
        if (stats[m]) { stats[m].orders+=1; stats[m].revenue+=rev; }
        stats.total.orders+=1; stats.total.revenue+=rev;
      });

      if (stats.total.orders > 0) {
        results.push({
          seller_id: seller.id, seller_name: seller.full_name, seller_email: seller.email,
          gcash_orders:   stats.gcash.orders,   gcash_revenue:  stats.gcash.revenue.toFixed(2),
          paypal_orders:  stats.paypal.orders,  paypal_revenue: stats.paypal.revenue.toFixed(2),
          cod_orders:     stats.cod.orders,     cod_revenue:    stats.cod.revenue.toFixed(2),
          total_orders:   stats.total.orders,   total_revenue:  stats.total.revenue.toFixed(2)
        });
      }
    }

    res.json({ success: true, data: results.sort((a,b)=>parseFloat(b.total_revenue)-parseFloat(a.total_revenue)) });
  } catch (error) {
    console.error("Error /admin/analytics/sellers-by-payment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/payment-transactions
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=100
// ─────────────────────────────────────────
router.get("/payment-transactions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, payment_method, payment_intent_id, payment_capture_id, payment_status, order_date, shipping_full_name, shipping_email")
      .in("payment_method", ["gcash","paypal"])
      .eq("order_status","delivered")
      .gte("order_date", startDate).lt("order_date", endDate)
      .order("order_date", { ascending: false })
      .limit(limit);

    if (!orders?.length) return res.json({ success: true, data: [] });

    const data = orders.map(o => ({
      order_id:          o.id,
      order_number:      o.order_number,
      customer_name:     o.shipping_full_name,
      customer_email:    o.shipping_email,
      total_amount:      parseFloat(o.total_amount).toFixed(2),
      payment_method:    o.payment_method,
      payment_intent_id: o.payment_intent_id,
      payment_capture_id:o.payment_capture_id,
      payment_status:    o.payment_status,
      order_date:        o.order_date
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /admin/analytics/payment-transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;