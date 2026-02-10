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
    // Get the authorization token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "No authorization token provided" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    // Get user from database to verify role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.userId)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    // Verify user is a seller
    if (userData.role !== "seller" && userData.role !== "sellers") {
      return res.status(403).json({ success: false, error: "Access denied. Seller account required." });
    }

    req.sellerId = userData.id;
    req.userRole = userData.role;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};

// Apply middleware to all routes
router.use(getSellerId);

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

    // Pull current + last month from analytics_seller if available
    const { data: current } = await supabase
      .from("analytics_seller")
      .select("total_revenue, total_orders, items_sold, average_order_value")
      .eq("seller_id", sellerId)
      .eq("period_type", "monthly")
      .gte("period_start", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
      .lt("period_start", currentMonth === 12 
        ? `${currentYear + 1}-01-01` 
        : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`)
      .single();

    const { data: last } = await supabase
      .from("analytics_seller")
      .select("total_revenue, total_orders, average_order_value")
      .eq("seller_id", sellerId)
      .eq("period_type", "monthly")
      .gte("period_start", `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`)
      .lt("period_start", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
      .single();

    if (current) {
      const totalRevenue = parseFloat(current.total_revenue);
      const lastRevenue = last ? parseFloat(last.total_revenue) : 0;
      const currentAOV = parseFloat(current.average_order_value || 0);
      const lastAOV = last ? parseFloat(last.average_order_value || 0) : 0;
      const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
      const avgOrderChange = lastAOV > 0 ? ((currentAOV - lastAOV) / lastAOV) * 100 : 0;

      // Get top category for this seller
      const { data: topCat } = await supabase
        .from("analytics_category")
        .select("category, total_revenue")
        .eq("period_type", "monthly")
        .gte("period_start", `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)
        .order("total_revenue", { ascending: false })
        .limit(1)
        .single();

      return res.json({
        success: true,
        stats: {
          totalRevenue: totalRevenue.toFixed(2),
          revenueGrowth: revenueGrowth.toFixed(1),
          productsSold: current.items_sold || 0,
          avgOrderValue: currentAOV.toFixed(2),
          avgOrderChange: avgOrderChange.toFixed(1),
          topCategory: topCat?.category || "N/A"
        }
      });
    }

    // ── Fallback: calculate directly from orders ──
    const currentStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const nextStart = currentMonth === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastStart = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;

    // Get seller's products first
    const { data: sellerProducts } = await supabase
      .from("product")
      .select("id")
      .eq("seller_id", sellerId);

    const sellerProductIds = sellerProducts?.map(p => p.id) || [];

    if (sellerProductIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRevenue: "0.00",
          revenueGrowth: "0.0",
          productsSold: 0,
          avgOrderValue: "0.00",
          avgOrderChange: "0.0",
          topCategory: "N/A"
        }
      });
    }

    // Get current month order items for this seller's products
    const { data: currentOrderItems } = await supabase
      .from("order_items")
      .select(`
        quantity,
        unit_price,
        product_category,
        order_id,
        product_id
      `)
      .in("product_id", sellerProductIds);

    if (!currentOrderItems || currentOrderItems.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRevenue: "0.00",
          revenueGrowth: "0.0",
          productsSold: 0,
          avgOrderValue: "0.00",
          avgOrderChange: "0.0",
          topCategory: "N/A"
        }
      });
    }

    // Get the orders to filter by date and status
    const orderIds = [...new Set(currentOrderItems.map(item => item.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_date, order_status")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", currentStart)
      .lt("order_date", nextStart);

    const currentDeliveredOrderIds = orders?.map(o => o.id) || [];
    const currentMonthItems = currentOrderItems.filter(item => 
      currentDeliveredOrderIds.includes(item.order_id)
    );

    // Calculate current month metrics
    const productsSold = currentMonthItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = currentMonthItems.reduce((sum, item) => 
      sum + (item.quantity * parseFloat(item.unit_price)), 0
    );
    const totalOrders = currentDeliveredOrderIds.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get last month data for comparison
    const { data: lastOrders } = await supabase
      .from("orders")
      .select("id, order_date, order_status")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", lastStart)
      .lt("order_date", currentStart);

    const lastDeliveredOrderIds = lastOrders?.map(o => o.id) || [];
    const lastMonthItems = currentOrderItems.filter(item => 
      lastDeliveredOrderIds.includes(item.order_id)
    );

    const lastRevenue = lastMonthItems.reduce((sum, item) => 
      sum + (item.quantity * parseFloat(item.unit_price)), 0
    );
    const lastOrderCount = lastDeliveredOrderIds.length;
    const lastAOV = lastOrderCount > 0 ? lastRevenue / lastOrderCount : 0;

    const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const avgOrderChange = lastAOV > 0 ? ((avgOrderValue - lastAOV) / lastAOV) * 100 : 0;

    // Get top category
    const catMap = {};
    currentMonthItems.forEach(item => {
      const cat = item.product_category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + item.quantity;
    });
    const topCategory = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

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

// ─────────────────────────────────────────
// GET /api/analytics/sales-by-month?year=2025
// ─────────────────────────────────────────
router.get("/sales-by-month", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Get seller's products
    const { data: sellerProducts } = await supabase
      .from("product")
      .select("id")
      .eq("seller_id", sellerId);

    const sellerProductIds = sellerProducts?.map(p => p.id) || [];

    if (sellerProductIds.length === 0) {
      return res.json({ 
        success: true, 
        data: monthNames.map(month => ({ month, revenue: 0, orders: 0, customers: 0 }))
      });
    }

    // Get all order items for seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity,
        unit_price,
        order_id
      `)
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({ 
        success: true, 
        data: monthNames.map(month => ({ month, revenue: 0, orders: 0, customers: 0 }))
      });
    }

    // Get corresponding orders for this year
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_date, order_status, user_id")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", `${year}-01-01`)
      .lt("order_date", `${year + 1}-01-01`);

    const deliveredOrderIds = orders?.map(o => o.id) || [];
    const yearOrderItems = orderItems.filter(item => deliveredOrderIds.includes(item.order_id));

    // Create a map of order_id to order details
    const orderMap = {};
    orders?.forEach(order => {
      orderMap[order.id] = order;
    });

    // Aggregate by month
    const buckets = monthNames.map(name => ({
      month: name,
      revenue: 0,
      orders: new Set(),
      customers: new Set()
    }));

    yearOrderItems.forEach(item => {
      const order = orderMap[item.order_id];
      if (order) {
        const monthIndex = new Date(order.order_date).getMonth();
        const itemRevenue = item.quantity * parseFloat(item.unit_price);
        
        buckets[monthIndex].revenue += itemRevenue;
        buckets[monthIndex].orders.add(item.order_id);
        buckets[monthIndex].customers.add(order.user_id);
      }
    });

    const result = buckets.map(b => ({
      month: b.month,
      revenue: Math.round(b.revenue),
      orders: b.orders.size,
      customers: b.customers.size
    }));

    res.json({ success: true, data: result });
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
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Get seller's products
    const { data: sellerProducts } = await supabase
      .from("product")
      .select("id, category")
      .eq("seller_id", sellerId);

    const sellerProductIds = sellerProducts?.map(p => p.id) || [];

    if (sellerProductIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get order items for seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select(`
        product_id,
        product_category,
        quantity,
        unit_price,
        order_id
      `)
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get orders for this month
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", monthStart)
      .lt("order_date", nextMonthStart);

    const deliveredOrderIds = orders?.map(o => o.id) || [];
    const monthOrderItems = orderItems.filter(item => deliveredOrderIds.includes(item.order_id));

    // Calculate revenue by category
    const catMap = {};
    let totalRevenue = 0;

    monthOrderItems.forEach(item => {
      const cat = item.product_category || "Uncategorized";
      const revenue = item.quantity * parseFloat(item.unit_price);
      catMap[cat] = (catMap[cat] || 0) + revenue;
      totalRevenue += revenue;
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
// GET /api/analytics/top-products?limit=5
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const limit = parseInt(req.query.limit) || 5;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart = month === 12 
      ? `${year + 1}-01-01` 
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Get seller's products with stock information
    const { data: sellerProducts } = await supabase
      .from("product")
      .select("id, product_name, stock_quantity, price")
      .eq("user_id", sellerId)
      .eq("is_active", true);

    const sellerProductIds = sellerProducts?.map(p => p.id) || [];

    if (sellerProductIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Create a product info map
    const productInfoMap = {};
    sellerProducts.forEach(p => {
      productInfoMap[p.id] = {
        name: p.product_name,
        stock: p.stock_quantity,
        price: parseFloat(p.price)
      };
    });

    // Get order items for seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity,
        unit_price,
        order_id
      `)
      .in("product_id", sellerProductIds);

    if (!orderItems || orderItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get orders for this month
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .in("id", orderIds)
      .eq("order_status", "delivered")
      .gte("order_date", monthStart)
      .lt("order_date", nextMonthStart);

    const deliveredOrderIds = orders?.map(o => o.id) || [];
    const monthOrderItems = orderItems.filter(item => deliveredOrderIds.includes(item.order_id));

    // Aggregate by product
    const productMap = {};
    monthOrderItems.forEach(item => {
      if (!productMap[item.product_id]) {
        const info = productInfoMap[item.product_id];
        productMap[item.product_id] = {
          id: item.product_id,
          name: info?.name || "Unknown Product",
          stock: info?.stock || 0,
          price: info?.price || 0,
          sales: 0,
          revenue: 0
        };
      }
      productMap[item.product_id].sales += item.quantity;
      productMap[item.product_id].revenue += item.quantity * parseFloat(item.unit_price);
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
        stockStatus: p.stock === 0 ? 'out_of_stock' : p.stock < 10 ? 'low_stock' : 'in_stock'
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error /top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/product-stock
// Returns all seller's products with stock info
// ─────────────────────────────────────────
router.get("/product-stock", async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const status = req.query.status; // 'low', 'out', 'all'
    const sortBy = req.query.sortBy || 'stock'; // 'stock', 'name', 'price'

    // Get all seller's active products
    const { data: products, error } = await supabase
      .from("product")
      .select("id, product_name, stock_quantity, price, category, product_image, sold_count, is_active")
      .eq("user_id", sellerId)
      .order(sortBy === 'name' ? 'product_name' : sortBy === 'price' ? 'price' : 'stock_quantity', 
             { ascending: sortBy === 'stock' ? true : false });

    if (error) {
      throw error;
    }

    let filteredProducts = products || [];

    // Filter by stock status if specified
    if (status === 'low') {
      filteredProducts = filteredProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10);
    } else if (status === 'out') {
      filteredProducts = filteredProducts.filter(p => p.stock_quantity === 0);
    }

    // Add stock status to each product
    const result = filteredProducts.map(p => ({
      id: p.id,
      name: p.product_name,
      stock: p.stock_quantity,
      price: parseFloat(p.price).toFixed(2),
      category: p.category || 'Uncategorized',
      image: p.product_image,
      totalSold: p.sold_count || 0,
      isActive: p.is_active,
      stockStatus: p.stock_quantity === 0 ? 'out_of_stock' : 
                   p.stock_quantity < 10 ? 'low_stock' : 'in_stock',
      stockStatusLabel: p.stock_quantity === 0 ? 'Out of Stock' : 
                        p.stock_quantity < 10 ? 'Low Stock' : 'In Stock'
    }));

    // Calculate summary
    const summary = {
      totalProducts: products?.length || 0,
      activeProducts: products?.filter(p => p.is_active).length || 0,
      lowStock: products?.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length || 0,
      outOfStock: products?.filter(p => p.stock_quantity === 0).length || 0,
      totalValue: products?.reduce((sum, p) => sum + (p.stock_quantity * parseFloat(p.price)), 0) || 0
    };

    res.json({ 
      success: true, 
      data: result,
      summary
    });
  } catch (error) {
    console.error("Error /product-stock:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;