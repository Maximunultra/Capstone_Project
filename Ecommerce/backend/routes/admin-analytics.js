// routes/admin-analytics.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// Middleware to verify admin access
// ─────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "No authorization token provided" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (jwtError) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.userId)
      .single();

    if (userError || !userData || userData.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admin account required." });
    }

    req.adminId = userData.id;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};

// Apply admin middleware to all routes
router.use(verifyAdmin);

// ─────────────────────────────────────────
// GET /api/admin/analytics/summary
// Platform-wide summary with revenue breakdown
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const currentStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const nextStart = currentMonth === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastStart = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;

    // Get current month delivered orders
    const { data: currentOrders } = await supabase
      .from("orders")
      .select("id, total_amount, subtotal, tax, shipping_fee, payment_method")
      .eq("order_status", "delivered")
      .gte("order_date", currentStart)
      .lt("order_date", nextStart);

    // Get last month delivered orders
    const { data: lastOrders } = await supabase
      .from("orders")
      .select("total_amount, subtotal, tax")
      .eq("order_status", "delivered")
      .gte("order_date", lastStart)
      .lt("order_date", currentStart);

    // Calculate current month metrics
    const totalRevenue = (currentOrders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalSubtotal = (currentOrders || []).reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);
    const totalTax = (currentOrders || []).reduce((sum, o) => sum + parseFloat(o.tax || 0), 0); // System commission
    const totalShipping = (currentOrders || []).reduce((sum, o) => sum + parseFloat(o.shipping_fee || 0), 0);

    // Payment method breakdown
    const gcashOrders = (currentOrders || []).filter(o => o.payment_method === 'gcash');
    const paypalOrders = (currentOrders || []).filter(o => o.payment_method === 'paypal');
    const codOrders = (currentOrders || []).filter(o => o.payment_method === 'cod');

    const gcashRevenue = gcashOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const paypalRevenue = paypalOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const codRevenue = codOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    // Get total products sold (quantity from order_items)
    const currentOrderIds = (currentOrders || []).map(o => o.id);
    let productsSold = 0;
    if (currentOrderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity")
        .in("order_id", currentOrderIds);
      productsSold = (items || []).reduce((sum, i) => sum + i.quantity, 0);
    }

    // Last month comparison
    const lastRevenue = (lastOrders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const lastTax = (lastOrders || []).reduce((sum, o) => sum + parseFloat(o.tax || 0), 0);
    
    const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const avgOrderValue = currentOrders?.length > 0 ? totalRevenue / currentOrders.length : 0;

    // Top category
    const { data: catItems } = await supabase
      .from("order_items")
      .select("product_category, quantity")
      .in("order_id", currentOrderIds);

    const catMap = {};
    (catItems || []).forEach((i) => {
      const cat = i.product_category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + i.quantity;
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    res.json({
      success: true,
      stats: {
        // Main metrics
        totalRevenue: totalRevenue.toFixed(2),
        revenueGrowth: revenueGrowth.toFixed(1),
        productsSold,
        avgOrderValue: avgOrderValue.toFixed(2),
        topCategory,
        
        // Revenue breakdown
        sellerRevenue: totalSubtotal.toFixed(2), // What sellers earn
        systemCommission: totalTax.toFixed(2),   // Platform commission (tax)
        shippingRevenue: totalShipping.toFixed(2),
        
        // Payment methods
        gcashRevenue: gcashRevenue.toFixed(2),
        gcashOrders: gcashOrders.length,
        paypalRevenue: paypalRevenue.toFixed(2),
        paypalOrders: paypalOrders.length,
        codRevenue: codRevenue.toFixed(2),
        codOrders: codOrders.length,
        
        // Comparisons
        lastMonthRevenue: lastRevenue.toFixed(2),
        lastMonthCommission: lastTax.toFixed(2),
        totalOrders: currentOrders?.length || 0,
        
        // Add default values for compatibility
        avgOrderChange: "0"
      }
    });
  } catch (error) {
    console.error("Error /admin/analytics/summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/sales-by-month?year=2025
// ─────────────────────────────────────────
router.get("/sales-by-month", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const { data: orders } = await supabase
      .from("orders")
      .select("order_date, total_amount, subtotal, tax, user_id")
      .eq("order_status", "delivered")
      .gte("order_date", `${year}-01-01`)
      .lt("order_date", `${year + 1}-01-01`);

    const buckets = monthNames.map((name) => ({
      month: name,
      revenue: 0,
      commission: 0,
      orders: 0,
      customers: new Set()
    }));

    (orders || []).forEach((o) => {
      const m = new Date(o.order_date).getMonth();
      buckets[m].revenue += parseFloat(o.total_amount || 0);
      buckets[m].commission += parseFloat(o.tax || 0);
      buckets[m].orders += 1;
      buckets[m].customers.add(o.user_id);
    });

    const result = buckets.map((b) => ({
      month: b.month,
      revenue: Math.round(b.revenue),
      commission: Math.round(b.commission),
      orders: b.orders,
      customers: b.customers.size
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /admin/analytics/sales-by-month:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/category-distribution
// ─────────────────────────────────────────
router.get("/category-distribution", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

    const { data: deliveredOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("order_status", "delivered")
      .gte("order_date", monthStart)
      .lt("order_date", nextMonthStart);

    const deliveredIds = (deliveredOrders || []).map((o) => o.id);

    if (deliveredIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_category, quantity")
      .in("order_id", deliveredIds);

    const catMap = {};
    let total = 0;
    (items || []).forEach((i) => {
      const cat = i.product_category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + i.quantity;
      total += i.quantity;
    });

    const result = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty], i) => ({
        name,
        value: total > 0 ? parseFloat(((qty / total) * 100).toFixed(1)) : 0,
        color: colors[i % colors.length]
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /admin/analytics/category-distribution:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-products?limit=5
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data: deliveredOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("order_status", "delivered")
      .gte("order_date", monthStart)
      .lt("order_date", nextMonthStart);

    const deliveredIds = (deliveredOrders || []).map((o) => o.id);

    if (deliveredIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price")
      .in("order_id", deliveredIds);

    const map = {};
    (items || []).forEach((i) => {
      if (!map[i.product_id]) {
        map[i.product_id] = { name: i.product_name, sales: 0, revenue: 0 };
      }
      map[i.product_id].sales += i.quantity;
      map[i.product_id].revenue += i.quantity * parseFloat(i.unit_price);
    });

    const result = Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({
        name: p.name,
        sales: p.sales,
        revenue: Math.round(p.revenue)
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /admin/analytics/top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/top-sellers?limit=10
// Top sellers by revenue
// ─────────────────────────────────────────
router.get("/top-sellers", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Get all sellers
    const { data: sellers } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("role", "seller");

    if (!sellers || sellers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get products for each seller
    const sellerStats = [];
    
    for (const seller of sellers) {
      const { data: products } = await supabase
        .from("product")
        .select("id")
        .eq("user_id", seller.id);

      const productIds = (products || []).map(p => p.id);

      if (productIds.length === 0) continue;

      // Get order items for this seller's products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          quantity,
          unit_price,
          order_id
        `)
        .in("product_id", productIds);

      if (!orderItems || orderItems.length === 0) continue;

      // Get delivered orders for this month
      const orderIds = [...new Set(orderItems.map(item => item.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_date")
        .in("id", orderIds)
        .eq("order_status", "delivered")
        .gte("order_date", monthStart)
        .lt("order_date", nextMonthStart);

      const deliveredIds = (orders || []).map(o => o.id);
      const monthItems = orderItems.filter(item => deliveredIds.includes(item.order_id));

      if (monthItems.length === 0) continue;

      const revenue = monthItems.reduce((sum, item) => 
        sum + (item.quantity * parseFloat(item.unit_price)), 0
      );
      const itemsSold = monthItems.reduce((sum, item) => sum + item.quantity, 0);

      sellerStats.push({
        seller_id: seller.id,
        seller_name: seller.full_name,
        seller_email: seller.email,
        total_revenue: revenue,
        items_sold: itemsSold,
        total_orders: deliveredIds.length
      });
    }

    // Sort by revenue and limit
    const result = sellerStats
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)
      .map(s => ({
        ...s,
        total_revenue: s.total_revenue.toFixed(2)
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /admin/analytics/top-sellers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/analytics/payment-breakdown
// Detailed payment method analytics
// ─────────────────────────────────────────
router.get("/payment-breakdown", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data: orders } = await supabase
      .from("orders")
      .select("payment_method, total_amount, tax, subtotal")
      .eq("order_status", "delivered")
      .gte("order_date", monthStart)
      .lt("order_date", nextMonthStart);

    const paymentStats = {
      gcash: { count: 0, revenue: 0, commission: 0 },
      paypal: { count: 0, revenue: 0, commission: 0 },
      cod: { count: 0, revenue: 0, commission: 0 }
    };

    (orders || []).forEach(order => {
      const method = order.payment_method?.toLowerCase();
      if (paymentStats[method]) {
        paymentStats[method].count += 1;
        paymentStats[method].revenue += parseFloat(order.total_amount || 0);
        paymentStats[method].commission += parseFloat(order.tax || 0);
      }
    });

    const result = Object.entries(paymentStats).map(([method, stats]) => ({
      method: method.toUpperCase(),
      orders: stats.count,
      revenue: stats.revenue.toFixed(2),
      commission: stats.commission.toFixed(2),
      percentage: orders.length > 0 ? ((stats.count / orders.length) * 100).toFixed(1) : 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /admin/analytics/payment-breakdown:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;