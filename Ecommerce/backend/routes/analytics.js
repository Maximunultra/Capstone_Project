// routes/analytics.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// Middleware: verify seller JWT
// ─────────────────────────────────────────
const getSellerId = async (req, res, next) => {
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

    if (userError || !userData)
      return res.status(401).json({ success: false, error: "User not found" });
    if (userData.role !== "seller" && userData.role !== "sellers")
      return res.status(403).json({ success: false, error: "Access denied. Seller account required." });

    req.sellerId = userData.id;
    req.userRole = userData.role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};
router.use(getSellerId);

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/**
 * Parse ?startDate & ?endDate from query.
 * Client sends inclusive endDate (e.g. Feb 28) → we make it exclusive (+1 day).
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

/** Equal-length prior period for growth % comparison */
const getPriorRange = (startDate, endDate) => {
  const diffMs   = new Date(endDate) - new Date(startDate);
  const priorEnd = new Date(startDate);
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

/** product.user_id is the seller reference */
const getSellerProductIds = async (sellerId) => {
  const { data } = await supabase.from("product").select("id").eq("user_id", sellerId);
  return (data || []).map(p => p.id);
};

/** Delivered orders from a list of IDs within a date range */
const getDeliveredOrders = async (orderIds, startDate, endDate, select = "id") => {
  if (!orderIds.length) return [];
  const { data } = await supabase
    .from("orders").select(select)
    .in("id", orderIds).eq("order_status", "delivered")
    .gte("order_date", startDate).lt("order_date", endDate);
  return data || [];
};

/** Top category live from order_items (analytics_category has no seller_id) */
const getTopCategoryLive = async (sellerProductIds, startDate, endDate) => {
  if (!sellerProductIds.length) return "N/A";
  const { data: items } = await supabase
    .from("order_items").select("product_category, quantity, order_id")
    .in("product_id", sellerProductIds);
  if (!items?.length) return "N/A";
  const orderIds = [...new Set(items.map(i => i.order_id))];
  const delivered = await getDeliveredOrders(orderIds, startDate, endDate);
  const deliveredIds = new Set(delivered.map(o => String(o.id)));
  const catMap = {};
  items.filter(i => deliveredIds.has(String(i.order_id))).forEach(i => {
    const cat = i.product_category || "Uncategorized";
    catMap[cat] = (catMap[cat] || 0) + i.quantity;
  });
  return Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
};

// ─────────────────────────────────────────
// GET /api/analytics/summary
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const { priorStart, priorEnd } = getPriorRange(startDate, endDate);
    const sellerProductIds = await getSellerProductIds(req.sellerId);

    const empty = {
      totalRevenue: "0.00", revenueGrowth: "0.0", productsSold: 0,
      avgOrderValue: "0.00", avgOrderChange: "0.0", topCategory: "N/A",
      dateRange: { startDate, endDate }
    };
    if (!sellerProductIds.length) return res.json({ success: true, stats: empty });

    const { data: orderItems } = await supabase
      .from("order_items").select("quantity, unit_price, product_category, order_id")
      .in("product_id", sellerProductIds);
    if (!orderItems?.length) return res.json({ success: true, stats: empty });

    const allOrderIds = [...new Set(orderItems.map(i => i.order_id))];

    // Current period
    const currentOrders  = await getDeliveredOrders(allOrderIds, startDate, endDate);
    const currentIds     = new Set(currentOrders.map(o => String(o.id)));
    const currentItems   = orderItems.filter(i => currentIds.has(String(i.order_id)));
    const productsSold   = currentItems.reduce((s, i) => s + i.quantity, 0);
    const totalRevenue   = currentItems.reduce((s, i) => s + i.quantity * parseFloat(i.unit_price), 0);
    const avgOrderValue  = currentIds.size > 0 ? totalRevenue / currentIds.size : 0;

    // Prior period
    const priorOrders   = await getDeliveredOrders(allOrderIds, priorStart, priorEnd);
    const priorIds      = new Set(priorOrders.map(o => String(o.id)));
    const priorItems    = orderItems.filter(i => priorIds.has(String(i.order_id)));
    const priorRevenue  = priorItems.reduce((s, i) => s + i.quantity * parseFloat(i.unit_price), 0);
    const priorAOV      = priorIds.size > 0 ? priorRevenue / priorIds.size : 0;

    const revenueGrowth  = priorRevenue > 0 ? ((totalRevenue - priorRevenue) / priorRevenue) * 100 : 0;
    const avgOrderChange = priorAOV > 0 ? ((avgOrderValue - priorAOV) / priorAOV) * 100 : 0;

    // Top category
    const catMap = {};
    currentItems.forEach(i => { const c = i.product_category || "Uncategorized"; catMap[c] = (catMap[c]||0) + i.quantity; });
    const topCategory = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0]?.[0] || "N/A";

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue.toFixed(2), revenueGrowth: revenueGrowth.toFixed(1),
        productsSold, avgOrderValue: avgOrderValue.toFixed(2),
        avgOrderChange: avgOrderChange.toFixed(1), topCategory,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error("Error /summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/sales-by-period
// Query: ?groupBy=month|week  &year=YYYY  &startDate=  &endDate=
//   month → 12 bars for selected year (same as old sales-by-month)
//   week  → one bar per ISO week within the date range
// ─────────────────────────────────────────
router.get("/sales-by-period", async (req, res) => {
  try {
    const groupBy = req.query.groupBy || "month";
    const sellerProductIds = await getSellerProductIds(req.sellerId);
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    if (!sellerProductIds.length)
      return res.json({ success: true, groupBy, data: groupBy === "month" ? monthNames.map(m => ({ month: m, revenue: 0, orders: 0, customers: 0 })) : [] });

    const { data: orderItems } = await supabase
      .from("order_items").select("product_id, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);

    if (!orderItems?.length)
      return res.json({ success: true, groupBy, data: groupBy === "month" ? monthNames.map(m => ({ month: m, revenue: 0, orders: 0, customers: 0 })) : [] });

    const orderIds = [...new Set(orderItems.map(i => i.order_id))];

    if (groupBy === "month") {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const { data: orders } = await supabase
        .from("orders").select("id, order_date, user_id").in("id", orderIds)
        .eq("order_status", "delivered")
        .gte("order_date", `${year}-01-01`).lt("order_date", `${year+1}-01-01`);

      const orderMap = {}; (orders||[]).forEach(o => { orderMap[String(o.id)] = o; });
      const deliveredSet = new Set((orders||[]).map(o => String(o.id)));
      const buckets = monthNames.map(m => ({ month: m, revenue: 0, orders: new Set(), customers: new Set() }));

      orderItems.filter(i => deliveredSet.has(String(i.order_id))).forEach(i => {
        const o = orderMap[String(i.order_id)]; if (!o) return;
        const m = new Date(o.order_date).getMonth();
        buckets[m].revenue += i.quantity * parseFloat(i.unit_price);
        buckets[m].orders.add(i.order_id);
        buckets[m].customers.add(o.user_id);
      });

      return res.json({ success: true, groupBy: "month", data: buckets.map(b => ({ month: b.month, revenue: Math.round(b.revenue), orders: b.orders.size, customers: b.customers.size })) });
    }

    // ── Weekly ──
    const { startDate, endDate } = parseDateRange(req.query);
    const { data: orders } = await supabase
      .from("orders").select("id, order_date, user_id").in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", startDate).lt("order_date", endDate);

    const orderMap = {}; (orders||[]).forEach(o => { orderMap[String(o.id)] = o; });
    const deliveredSet = new Set((orders||[]).map(o => String(o.id)));

    const weekMap = {};
    orderItems.filter(i => deliveredSet.has(String(i.order_id))).forEach(i => {
      const o = orderMap[String(i.order_id)]; if (!o) return;
      const monday = getWeekMonday(o.order_date);
      if (!weekMap[monday]) weekMap[monday] = { revenue: 0, orders: new Set(), customers: new Set() };
      weekMap[monday].revenue += i.quantity * parseFloat(i.unit_price);
      weekMap[monday].orders.add(i.order_id);
      weekMap[monday].customers.add(o.user_id);
    });

    const data = Object.entries(weekMap).sort(([a],[b]) => new Date(a)-new Date(b)).map(([monday, b]) => {
      const d = new Date(monday);
      return {
        label: `${d.toLocaleString("default",{month:"short"})} ${String(d.getDate()).padStart(2,"0")}`,
        week: monday,
        revenue: Math.round(b.revenue),
        orders: b.orders.size,
        customers: b.customers.size
      };
    });

    res.json({ success: true, groupBy: "week", data });
  } catch (error) {
    console.error("Error /sales-by-period:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backwards-compatible alias
router.get("/sales-by-month", async (req, res) => {
  req.query.groupBy = "month";
  // Re-use sales-by-period logic via internal redirect workaround:
  // Just inline the month logic here for simplicity
  try {
    const sellerProductIds = await getSellerProductIds(req.sellerId);
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (!sellerProductIds.length) return res.json({ success: true, data: monthNames.map(m=>({month:m,revenue:0,orders:0,customers:0})) });
    const { data: orderItems } = await supabase.from("order_items").select("product_id,quantity,unit_price,order_id").in("product_id", sellerProductIds);
    if (!orderItems?.length) return res.json({ success: true, data: monthNames.map(m=>({month:m,revenue:0,orders:0,customers:0})) });
    const orderIds = [...new Set(orderItems.map(i=>i.order_id))];
    const { data: orders } = await supabase.from("orders").select("id,order_date,user_id").in("id",orderIds).eq("order_status","delivered").gte("order_date",`${year}-01-01`).lt("order_date",`${year+1}-01-01`);
    const orderMap = {}; (orders||[]).forEach(o=>{orderMap[String(o.id)]=o;});
    const deliveredSet = new Set((orders||[]).map(o=>String(o.id)));
    const buckets = monthNames.map(m=>({month:m,revenue:0,orders:new Set(),customers:new Set()}));
    orderItems.filter(i=>deliveredSet.has(String(i.order_id))).forEach(i=>{
      const o=orderMap[String(i.order_id)]; if(!o) return;
      const m=new Date(o.order_date).getMonth();
      buckets[m].revenue+=i.quantity*parseFloat(i.unit_price); buckets[m].orders.add(i.order_id); buckets[m].customers.add(o.user_id);
    });
    res.json({ success: true, data: buckets.map(b=>({month:b.month,revenue:Math.round(b.revenue),orders:b.orders.size,customers:b.customers.size})) });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────
// GET /api/analytics/category-distribution
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ─────────────────────────────────────────
router.get("/category-distribution", async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981"];
    const sellerProductIds = await getSellerProductIds(req.sellerId);
    if (!sellerProductIds.length) return res.json({ success: true, data: [] });

    const { data: orderItems } = await supabase
      .from("order_items").select("product_category, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);
    if (!orderItems?.length) return res.json({ success: true, data: [] });

    const orderIds = [...new Set(orderItems.map(i => i.order_id))];
    const delivered = await getDeliveredOrders(orderIds, startDate, endDate);
    const deliveredIds = new Set(delivered.map(o => String(o.id)));
    const periodItems = orderItems.filter(i => deliveredIds.has(String(i.order_id)));
    if (!periodItems.length) return res.json({ success: true, data: [] });

    const catMap = {}; let total = 0;
    periodItems.forEach(i => {
      const cat = i.product_category || "Uncategorized";
      const rev = i.quantity * parseFloat(i.unit_price);
      catMap[cat] = (catMap[cat]||0) + rev; total += rev;
    });

    const data = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,rev],idx) => ({
      name, color: colors[idx%colors.length],
      value: total > 0 ? parseFloat(((rev/total)*100).toFixed(1)) : 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /category-distribution:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/top-products
// Query: ?limit=10&startDate=&endDate=&groupBy=month|week
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit) || 10;
    const groupBy = req.query.groupBy || "month";
    const { startDate, endDate } = parseDateRange(req.query);

    const { data: sellerProducts } = await supabase
      .from("product").select("id, product_name, stock_quantity, price")
      .eq("user_id", req.sellerId).eq("is_active", true);

    const sellerProductIds = (sellerProducts||[]).map(p => p.id);
    if (!sellerProductIds.length) return res.json({ success: true, data: [], groupBy });

    const infoMap = {};
    (sellerProducts||[]).forEach(p => { infoMap[p.id] = { name: p.product_name, stock: p.stock_quantity, price: parseFloat(p.price) }; });

    const { data: orderItems } = await supabase
      .from("order_items").select("product_id, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);
    if (!orderItems?.length) return res.json({ success: true, data: [], groupBy });

    const orderIds = [...new Set(orderItems.map(i => i.order_id))];
    const delivered = await getDeliveredOrders(orderIds, startDate, endDate);
    const deliveredIds = new Set(delivered.map(o => String(o.id)));
    const periodItems = orderItems.filter(i => deliveredIds.has(String(i.order_id)));
    if (!periodItems.length) return res.json({ success: true, data: [], groupBy });

    const productMap = {};
    periodItems.forEach(i => {
      if (!productMap[i.product_id]) {
        const info = infoMap[i.product_id];
        productMap[i.product_id] = { id: i.product_id, name: info?.name||"Unknown", stock: info?.stock||0, price: info?.price||0, sales: 0, revenue: 0 };
      }
      productMap[i.product_id].sales   += i.quantity;
      productMap[i.product_id].revenue += i.quantity * parseFloat(i.unit_price);
    });

    const data = Object.values(productMap).sort((a,b)=>b.revenue-a.revenue).slice(0,limit).map(p => ({
      id: p.id, name: p.name, sales: p.sales, revenue: Math.round(p.revenue),
      stock: p.stock, price: p.price.toFixed(2),
      stockStatus: p.stock===0?"out_of_stock":p.stock<10?"low_stock":"in_stock",
      stockStatusLabel: p.stock===0?"Out of Stock":p.stock<10?"Low Stock":"In Stock"
    }));

    res.json({ success: true, data, groupBy });
  } catch (error) {
    console.error("Error /top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/product-stock  (always live)
// ─────────────────────────────────────────
router.get("/product-stock", async (req, res) => {
  try {
    const sortBy = req.query.sortBy || "stock";
    const { data: products, error } = await supabase
      .from("product")
      .select("id, product_name, stock_quantity, price, category, product_image, sold_count, is_active")
      .eq("user_id", req.sellerId)
      .order(sortBy==="name"?"product_name":sortBy==="price"?"price":"stock_quantity", { ascending: sortBy==="stock" });

    if (error) throw error;
    const all = products || [];

    const data = all.map(p => ({
      id: p.id, name: p.product_name, stock: p.stock_quantity,
      price: parseFloat(p.price).toFixed(2), category: p.category||"Uncategorized",
      image: p.product_image, totalSold: p.sold_count||0, isActive: p.is_active,
      stockStatus: p.stock_quantity===0?"out_of_stock":p.stock_quantity<10?"low_stock":"in_stock",
      stockStatusLabel: p.stock_quantity===0?"Out of Stock":p.stock_quantity<10?"Low Stock":"In Stock"
    }));

    const summary = {
      totalProducts:  all.length,
      activeProducts: all.filter(p=>p.is_active).length,
      lowStock:       all.filter(p=>p.stock_quantity>0&&p.stock_quantity<10).length,
      outOfStock:     all.filter(p=>p.stock_quantity===0).length,
      totalValue:     all.reduce((s,p)=>s+p.stock_quantity*parseFloat(p.price),0)
    };

    res.json({ success: true, data, summary });
  } catch (error) {
    console.error("Error /product-stock:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/payment-transactions", async (req, res) => {
  try {
    const sellerProductIds = await getSellerProductIds(req.sellerId);
    if (!sellerProductIds.length) return res.json({ success: true, data: [] });
 
    // Get all order IDs that contain this seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id")
      .in("product_id", sellerProductIds);
 
    const orderIds = [...new Set((orderItems || []).map(i => i.order_id))];
    if (!orderIds.length) return res.json({ success: true, data: [] });
 
    // Fetch those orders — all statuses, all payment methods
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, order_date, order_status,
        payment_method, payment_status,
        total_amount, subtotal, tax, shipping_fee
      `)
      .in("id", orderIds)
      .order("order_date", { ascending: false });
 
    if (error) throw error;
 
    // Return WITHOUT gateway IDs (payment_intent_id, payment_capture_id)
    // Seller only needs to know payment method, status, and order status
    const data = (orders || []).map(o => ({
      order_number:   o.order_number,
      order_date:     o.order_date,
      order_status:   o.order_status,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      total_amount:   parseFloat(o.total_amount  || 0).toFixed(2),
      subtotal:       parseFloat(o.subtotal       || 0).toFixed(2),
      tax:            parseFloat(o.tax            || 0).toFixed(2),
      shipping_fee:   parseFloat(o.shipping_fee   || 0).toFixed(2),
    }));
 
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error /analytics/payment-transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;