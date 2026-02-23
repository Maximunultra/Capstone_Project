// routes/analytics.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// Middleware to get seller_id from JWT token
// ─────────────────────────────────────────
const getSellerId = async (req, res, next) => {
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

    if (userError || !userData) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    if (userData.role !== "seller" && userData.role !== "sellers") {
      return res.status(403).json({ success: false, error: "Access denied. Seller account required." });
    }

    req.sellerId = userData.id; // This is a UUID matching product.user_id
    req.userRole = userData.role;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};

router.use(getSellerId);

// ─────────────────────────────────────────
// HELPER: get date range strings
// ─────────────────────────────────────────
const getMonthRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
};

// ─────────────────────────────────────────
// HELPER: get seller's product IDs
// FIX: product table uses user_id (uuid), not seller_id
// ─────────────────────────────────────────
const getSellerProductIds = async (sellerId) => {
  const { data: products, error } = await supabase
    .from("product")
    .select("id")
    .eq("user_id", sellerId); // ✅ correct column: user_id

  if (error) {
    console.error("Error fetching seller products:", error);
    return [];
  }
  return (products || []).map(p => p.id);
};

// ─────────────────────────────────────────
// HELPER: get delivered order IDs for a date range
// from a list of order_ids
// ─────────────────────────────────────────
const getDeliveredOrderIds = async (orderIds, dateStart, dateEnd) => {
  if (!orderIds || orderIds.length === 0) return [];
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("order_status", "delivered")
    .gte("order_date", dateStart)
    .lt("order_date", dateEnd);
  return (orders || []).map(o => o.id);
};

// ─────────────────────────────────────────
// GET /api/analytics/summary
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const current = getMonthRange(currentYear, currentMonth);
    const last = getMonthRange(lastMonthYear, lastMonth);

    // ── Try analytics_seller table first ──
    // analytics_seller.seller_id references users.id ✅
    const { data: cachedCurrent } = await supabase
      .from("analytics_seller")
      .select("total_revenue, total_orders, items_sold, average_order_value")
      .eq("seller_id", sellerId)
      .eq("period_type", "monthly")
      .gte("period_start", current.start)
      .lt("period_start", current.end)
      .single();

    const { data: cachedLast } = await supabase
      .from("analytics_seller")
      .select("total_revenue, total_orders, average_order_value")
      .eq("seller_id", sellerId)
      .eq("period_type", "monthly")
      .gte("period_start", last.start)
      .lt("period_start", current.start)
      .single();

    if (cachedCurrent) {
      const totalRevenue = parseFloat(cachedCurrent.total_revenue);
      const lastRevenue = cachedLast ? parseFloat(cachedLast.total_revenue) : 0;
      const currentAOV = parseFloat(cachedCurrent.average_order_value || 0);
      const lastAOV = cachedLast ? parseFloat(cachedLast.average_order_value || 0) : 0;
      const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
      const avgOrderChange = lastAOV > 0 ? ((currentAOV - lastAOV) / lastAOV) * 100 : 0;

      // analytics_category has no seller_id, so get top category from live data
      const sellerProductIds = await getSellerProductIds(sellerId);
      const topCategory = await getTopCategoryLive(sellerProductIds, current.start, current.end);

      return res.json({
        success: true,
        stats: {
          totalRevenue: totalRevenue.toFixed(2),
          revenueGrowth: revenueGrowth.toFixed(1),
          productsSold: cachedCurrent.items_sold || 0,
          avgOrderValue: currentAOV.toFixed(2),
          avgOrderChange: avgOrderChange.toFixed(1),
          topCategory
        }
      });
    }

    // ── Fallback: calculate live from orders ──
    const sellerProductIds = await getSellerProductIds(sellerId);

    if (sellerProductIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRevenue: "0.00", revenueGrowth: "0.0",
          productsSold: 0, avgOrderValue: "0.00",
          avgOrderChange: "0.0", topCategory: "N/A"
        }
      });
    }

    // Get all order items for this seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, product_category, order_id, product_id")
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRevenue: "0.00", revenueGrowth: "0.0",
          productsSold: 0, avgOrderValue: "0.00",
          avgOrderChange: "0.0", topCategory: "N/A"
        }
      });
    }

    const allOrderIds = [...new Set(orderItems.map(i => i.order_id))];

    // Current month delivered orders
    const currentDeliveredIds = await getDeliveredOrderIds(allOrderIds, current.start, current.end);
    const currentItems = orderItems.filter(i => currentDeliveredIds.includes(i.order_id));

    const productsSold = currentItems.reduce((s, i) => s + i.quantity, 0);
    const totalRevenue = currentItems.reduce((s, i) => s + (i.quantity * parseFloat(i.unit_price)), 0);
    const avgOrderValue = currentDeliveredIds.length > 0 ? totalRevenue / currentDeliveredIds.length : 0;

    // Last month delivered orders
    const lastDeliveredIds = await getDeliveredOrderIds(allOrderIds, last.start, current.start);
    const lastItems = orderItems.filter(i => lastDeliveredIds.includes(i.order_id));
    const lastRevenue = lastItems.reduce((s, i) => s + (i.quantity * parseFloat(i.unit_price)), 0);
    const lastAOV = lastDeliveredIds.length > 0 ? lastRevenue / lastDeliveredIds.length : 0;

    const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const avgOrderChange = lastAOV > 0 ? ((avgOrderValue - lastAOV) / lastAOV) * 100 : 0;

    // Top category from current month
    const catMap = {};
    currentItems.forEach(i => {
      const cat = i.product_category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + i.quantity;
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue.toFixed(2),
        revenueGrowth: revenueGrowth.toFixed(1),
        productsSold,
        avgOrderValue: avgOrderValue.toFixed(2),
        avgOrderChange: avgOrderChange.toFixed(1),
        topCategory
      }
    });
  } catch (error) {
    console.error("Error /summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: get top category live (analytics_category has no seller_id so we compute from order_items)
async function getTopCategoryLive(sellerProductIds, dateStart, dateEnd) {
  if (!sellerProductIds.length) return "N/A";
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_category, quantity, order_id")
    .in("product_id", sellerProductIds);
  if (!orderItems || !orderItems.length) return "N/A";
  const orderIds = [...new Set(orderItems.map(i => i.order_id))];
  const deliveredIds = await getDeliveredOrderIds(orderIds, dateStart, dateEnd);
  const catMap = {};
  orderItems.filter(i => deliveredIds.includes(i.order_id)).forEach(i => {
    const cat = i.product_category || "Uncategorized";
    catMap[cat] = (catMap[cat] || 0) + i.quantity;
  });
  return Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
}

// ─────────────────────────────────────────
// GET /api/analytics/sales-by-month?year=2025
// ─────────────────────────────────────────
router.get("/sales-by-month", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // FIX: product.user_id = sellerId
    const sellerProductIds = await getSellerProductIds(sellerId);

    if (sellerProductIds.length === 0) {
      return res.json({
        success: true,
        data: monthNames.map(month => ({ month, revenue: 0, orders: 0, customers: 0 }))
      });
    }

    // Get all order items for seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({
        success: true,
        data: monthNames.map(month => ({ month, revenue: 0, orders: 0, customers: 0 }))
      });
    }

    // Get delivered orders for the year
    const orderIds = [...new Set(orderItems.map(i => i.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_date, user_id")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", `${year}-01-01`)
      .lt("order_date", `${year + 1}-01-01`);

    const deliveredOrderIds = new Set((orders || []).map(o => o.id));
    const orderMap = {};
    (orders || []).forEach(o => { orderMap[o.id] = o; });

    // Aggregate by month
    const buckets = monthNames.map(name => ({
      month: name,
      revenue: 0,
      orders: new Set(),
      customers: new Set()
    }));

    orderItems
      .filter(i => deliveredOrderIds.has(i.order_id))
      .forEach(i => {
        const order = orderMap[i.order_id];
        if (!order) return;
        const m = new Date(order.order_date).getMonth();
        buckets[m].revenue += i.quantity * parseFloat(i.unit_price);
        buckets[m].orders.add(i.order_id);
        buckets[m].customers.add(order.user_id);
      });

    res.json({
      success: true,
      data: buckets.map(b => ({
        month: b.month,
        revenue: Math.round(b.revenue),
        orders: b.orders.size,
        customers: b.customers.size
      }))
    });
  } catch (error) {
    console.error("Error /sales-by-month:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/category-distribution
// ─────────────────────────────────────────
router.get("/category-distribution", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const now = new Date();
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
    const { start, end } = getMonthRange(now.getFullYear(), now.getMonth() + 1);

    // FIX: product.user_id = sellerId
    const sellerProductIds = await getSellerProductIds(sellerId);

    if (sellerProductIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get order items for seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_category, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Filter to this month's delivered orders
    const orderIds = [...new Set(orderItems.map(i => i.order_id))];
    const deliveredIds = await getDeliveredOrderIds(orderIds, start, end);
    const monthItems = orderItems.filter(i => deliveredIds.includes(i.order_id));

    if (monthItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Revenue by category
    const catMap = {};
    let totalRevenue = 0;
    monthItems.forEach(i => {
      const cat = i.product_category || "Uncategorized";
      const rev = i.quantity * parseFloat(i.unit_price);
      catMap[cat] = (catMap[cat] || 0) + rev;
      totalRevenue += rev;
    });

    const result = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue], i) => ({
        name,
        value: totalRevenue > 0 ? parseFloat(((revenue / totalRevenue) * 100).toFixed(1)) : 0,
        color: colors[i % colors.length]
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /category-distribution:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/top-products?limit=10
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const limit = parseInt(req.query.limit) || 5;
    const now = new Date();
    const { start, end } = getMonthRange(now.getFullYear(), now.getMonth() + 1);

    // FIX: product.user_id = sellerId ✅ (this was already correct in original)
    const { data: sellerProducts } = await supabase
      .from("product")
      .select("id, product_name, stock_quantity, price")
      .eq("user_id", sellerId)
      .eq("is_active", true);

    const sellerProductIds = (sellerProducts || []).map(p => p.id);

    if (sellerProductIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const productInfoMap = {};
    (sellerProducts || []).forEach(p => {
      productInfoMap[p.id] = {
        name: p.product_name,
        stock: p.stock_quantity,
        price: parseFloat(p.price)
      };
    });

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, order_id")
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = [...new Set(orderItems.map(i => i.order_id))];
    const deliveredIds = await getDeliveredOrderIds(orderIds, start, end);
    const monthItems = orderItems.filter(i => deliveredIds.includes(i.order_id));

    if (monthItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const productMap = {};
    monthItems.forEach(i => {
      if (!productMap[i.product_id]) {
        const info = productInfoMap[i.product_id];
        productMap[i.product_id] = {
          id: i.product_id,
          name: info?.name || "Unknown Product",
          stock: info?.stock || 0,
          price: info?.price || 0,
          sales: 0,
          revenue: 0
        };
      }
      productMap[i.product_id].sales += i.quantity;
      productMap[i.product_id].revenue += i.quantity * parseFloat(i.unit_price);
    });

    const result = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(p => ({
        id: p.id,
        name: p.name,
        sales: p.sales,
        revenue: Math.round(p.revenue),
        stock: p.stock,
        price: p.price.toFixed(2),
        stockStatus: p.stock === 0 ? 'out_of_stock' : p.stock < 10 ? 'low_stock' : 'in_stock',
        stockStatusLabel: p.stock === 0 ? 'Out of Stock' : p.stock < 10 ? 'Low Stock' : 'In Stock'
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/product-stock
// ─────────────────────────────────────────
router.get("/product-stock", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const sortBy = req.query.sortBy || 'stock';

    // FIX: product.user_id = sellerId ✅ (this was already correct in original)
    const { data: products, error } = await supabase
      .from("product")
      .select("id, product_name, stock_quantity, price, category, product_image, sold_count, is_active")
      .eq("user_id", sellerId)
      .order(
        sortBy === 'name' ? 'product_name' : sortBy === 'price' ? 'price' : 'stock_quantity',
        { ascending: sortBy === 'stock' }
      );

    if (error) throw error;

    const all = products || [];

    const result = all.map(p => ({
      id: p.id,
      name: p.product_name,
      stock: p.stock_quantity,
      price: parseFloat(p.price).toFixed(2),
      category: p.category || 'Uncategorized',
      image: p.product_image,
      totalSold: p.sold_count || 0,
      isActive: p.is_active,
      stockStatus: p.stock_quantity === 0 ? 'out_of_stock'
                 : p.stock_quantity < 10  ? 'low_stock'
                 : 'in_stock',
      stockStatusLabel: p.stock_quantity === 0 ? 'Out of Stock'
                      : p.stock_quantity < 10  ? 'Low Stock'
                      : 'In Stock'
    }));

    const summary = {
      totalProducts:   all.length,
      activeProducts:  all.filter(p => p.is_active).length,
      lowStock:        all.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length,
      outOfStock:      all.filter(p => p.stock_quantity === 0).length,
      totalValue:      all.reduce((s, p) => s + (p.stock_quantity * parseFloat(p.price)), 0)
    };

    res.json({ success: true, data: result, summary });
  } catch (error) {
    console.error("Error /product-stock:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;