// analytics.js - Add this to your routes folder
import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// GET - Dashboard summary statistics
router.get("/summary", async (req, res) => {
  try {
    const { user_id } = req.query;
    
    console.log('📊 Fetching analytics summary');

    // Get all orders for the seller
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        order_date,
        order_status,
        order_items (
          quantity,
          product:product_id (
            category
          )
        )
      `)
      .eq("order_status", "delivered");

    if (ordersError) throw ordersError;

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    // Calculate products sold
    const productsSold = orders.reduce((sum, order) => {
      return sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Calculate average order value
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate revenue growth (compare with previous period)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthOrders = orders.filter(o => new Date(o.order_date) >= currentMonthStart);
    const lastMonthOrders = orders.filter(o => {
      const date = new Date(o.order_date);
      return date >= lastMonthStart && date < currentMonthStart;
    });

    const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Find top category
    const categoryCount = {};
    orders.forEach(order => {
      order.order_items.forEach(item => {
        const category = item.product?.category || 'Uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
      });
    });

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Calculate AOV change
    const currentMonthAOV = currentMonthOrders.length > 0 
      ? currentMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / currentMonthOrders.length
      : 0;
    const lastMonthAOV = lastMonthOrders.length > 0
      ? lastMonthOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / lastMonthOrders.length
      : 0;
    
    const avgOrderChange = lastMonthAOV > 0
      ? ((currentMonthAOV - lastMonthAOV) / lastMonthAOV * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue.toFixed(2),
        revenueGrowth: parseFloat(revenueGrowth),
        productsSold,
        avgOrderValue: avgOrderValue.toFixed(2),
        avgOrderChange: parseFloat(avgOrderChange),
        topCategory
      }
    });

  } catch (error) {
    console.error("❌ Error fetching analytics summary:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Monthly sales data for charts
router.get("/sales-by-month", async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    console.log('📈 Fetching monthly sales data');

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        order_date,
        total_amount,
        order_status,
        user_id
      `)
      .eq("order_status", "delivered")
      .gte("order_date", `${year}-01-01`)
      .lte("order_date", `${year}-12-31`);

    if (error) throw error;

    // Group by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i).toLocaleString('default', { month: 'short' }),
      revenue: 0,
      orders: 0,
      customers: new Set()
    }));

    orders.forEach(order => {
      const month = new Date(order.order_date).getMonth();
      monthlyData[month].revenue += parseFloat(order.total_amount);
      monthlyData[month].orders += 1;
      monthlyData[month].customers.add(order.user_id);
    });

    // Convert Set to count
    const result = monthlyData.map(data => ({
      month: data.month,
      revenue: Math.round(data.revenue),
      orders: data.orders,
      customers: data.customers.size
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Error fetching monthly sales:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Category distribution
router.get("/category-distribution", async (req, res) => {
  try {
    console.log('🎯 Fetching category distribution');

    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        quantity,
        product:product_id (
          category
        )
      `);

    if (error) throw error;

    // Count by category
    const categoryCount = {};
    let totalItems = 0;

    orderItems.forEach(item => {
      const category = item.product?.category || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
      totalItems += item.quantity;
    });

    // Convert to percentage and format
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const result = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry, index) => ({
        name: entry[0],
        value: parseFloat(((entry[1] / totalItems) * 100).toFixed(1)),
        color: colors[index % colors.length]
      }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Error fetching category distribution:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Top selling products
router.get("/top-products", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    console.log('🏆 Fetching top products');

    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        product_id,
        product_name,
        quantity,
        unit_price
      `);

    if (error) throw error;

    // Aggregate by product
    const productStats = {};
    
    orderItems.forEach(item => {
      if (!productStats[item.product_id]) {
        productStats[item.product_id] = {
          name: item.product_name,
          sales: 0,
          revenue: 0
        };
      }
      productStats[item.product_id].sales += item.quantity;
      productStats[item.product_id].revenue += item.quantity * parseFloat(item.unit_price);
    });

    // Convert to array and sort by sales
    const result = Object.values(productStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, parseInt(limit))
      .map(product => ({
        name: product.name,
        sales: product.sales,
        revenue: Math.round(product.revenue)
      }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Error fetching top products:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Revenue by date range
router.get("/revenue-range", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "start_date and end_date are required"
      });
    }

    console.log('💰 Fetching revenue for date range');

    const { data: orders, error } = await supabase
      .from("orders")
      .select("total_amount, order_date")
      .eq("order_status", "delivered")
      .gte("order_date", start_date)
      .lte("order_date", end_date);

    if (error) throw error;

    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    res.json({
      success: true,
      data: {
        total_revenue: totalRevenue.toFixed(2),
        order_count: orders.length,
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error("❌ Error fetching revenue range:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

/*
INTEGRATION INSTRUCTIONS:

1. Create a new file: routes/analytics.js with this content

2. Add this route to your server.js:
   import analyticsRoutes from "./routes/analytics.js";
   app.use("/api/analytics", analyticsRoutes);

3. Update the API_BASE_URL in SellerAnalytics.jsx to match your server

4. The analytics dashboard will fetch data from:
   - GET /api/analytics/summary - Dashboard summary stats
   - GET /api/analytics/sales-by-month?year=2024 - Monthly sales data
   - GET /api/analytics/category-distribution - Category breakdown
   - GET /api/analytics/top-products?limit=5 - Top selling products
   - GET /api/analytics/revenue-range?start_date=2024-01-01&end_date=2024-12-31

5. Make sure your database has proper indexes on:
   - orders.order_date
   - orders.order_status
   - order_items.product_id
*/