// routes/analytics.js
import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/analytics/summary
// ─────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Pull current + last month from analytics_monthly_summary
    const { data: current } = await supabase
      .from("analytics_monthly_summary")
      .select("total_revenue, total_orders, total_customers, revenue_growth_percentage, top_category")
      .eq("year", currentYear)
      .eq("month", currentMonth)
      .single();

    const { data: last } = await supabase
      .from("analytics_monthly_summary")
      .select("total_revenue, total_orders")
      .eq("year", lastMonthYear)
      .eq("month", lastMonth)
      .single();

    if (current) {
      const totalRevenue = parseFloat(current.total_revenue);
      const lastRevenue = last ? parseFloat(last.total_revenue) : 0;
      const lastOrders = last ? last.total_orders : 0;
      const currentAOV = current.total_orders > 0 ? totalRevenue / current.total_orders : 0;
      const lastAOV = lastOrders > 0 ? lastRevenue / lastOrders : 0;

      return res.json({
        success: true,
        stats: {
          totalRevenue: totalRevenue.toFixed(2),
          revenueGrowth: parseFloat(current.revenue_growth_percentage || 0).toFixed(1),
          productsSold: current.total_customers,
          avgOrderValue: currentAOV.toFixed(2),
          avgOrderChange: lastAOV > 0 ? (((currentAOV - lastAOV) / lastAOV) * 100).toFixed(1) : 0,
          topCategory: current.top_category || "N/A"
        }
      });
    }

    // ── Fallback: calculate directly from orders + order_items ──
    const currentStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const nextStart =
      currentMonth === 12
        ? `${currentYear + 1}-01-01`
        : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastStart = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;

    const { data: currentOrders } = await supabase
      .from("orders")
      .select("id, total_amount, user_id")
      .eq("order_status", "delivered")
      .gte("order_date", currentStart)
      .lt("order_date", nextStart);

    const { data: lastOrders2 } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("order_status", "delivered")
      .gte("order_date", lastStart)
      .lt("order_date", currentStart);

    // total items sold from order_items for current month orders
    const currentOrderIds = (currentOrders || []).map((o) => o.id);
    let productsSold = 0;
    if (currentOrderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity")
        .in("order_id", currentOrderIds);
      productsSold = (items || []).reduce((sum, i) => sum + i.quantity, 0);
    }

    const totalRevenue = (currentOrders || []).reduce((s, o) => s + parseFloat(o.total_amount), 0);
    const lastRevenue = (lastOrders2 || []).reduce((s, o) => s + parseFloat(o.total_amount), 0);
    const revenueGrowth = lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const avgOrderValue = currentOrders?.length > 0 ? totalRevenue / currentOrders.length : 0;

    // top category from product table via order_items
    const { data: catItems } = await supabase
      .from("order_items")
      .select("product_category, quantity")
      .in("order_id", currentOrderIds);

    const catMap = {};
    (catItems || []).forEach((i) => {
      const cat = i.product_category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + i.quantity;
    });
    const topCategory =
      Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue.toFixed(2),
        revenueGrowth: revenueGrowth.toFixed(1),
        productsSold,
        avgOrderValue: avgOrderValue.toFixed(2),
        avgOrderChange: 0,
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
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Pull from analytics_monthly_summary
    const { data: rows } = await supabase
      .from("analytics_monthly_summary")
      .select("month, total_revenue, total_orders, total_customers")
      .eq("year", year)
      .order("month", { ascending: true });

    if (rows && rows.length > 0) {
      const result = monthNames.map((name, i) => {
        const row = rows.find((r) => r.month === i + 1);
        return {
          month: name,
          revenue: row ? Math.round(parseFloat(row.total_revenue)) : 0,
          orders: row ? row.total_orders : 0,
          customers: row ? row.total_customers : 0
        };
      });

      return res.json({ success: true, data: result });
    }

    // ── Fallback: aggregate from orders ──
    const { data: orders } = await supabase
      .from("orders")
      .select("order_date, total_amount, user_id")
      .eq("order_status", "delivered")
      .gte("order_date", `${year}-01-01`)
      .lt("order_date", `${year + 1}-01-01`);

    const buckets = monthNames.map((name) => ({
      month: name,
      revenue: 0,
      orders: 0,
      customers: new Set()
    }));

    (orders || []).forEach((o) => {
      const m = new Date(o.order_date).getMonth();
      buckets[m].revenue += parseFloat(o.total_amount);
      buckets[m].orders += 1;
      buckets[m].customers.add(o.user_id);
    });

    const result = buckets.map((b) => ({
      month: b.month,
      revenue: Math.round(b.revenue),
      orders: b.orders,
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
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

    // Pull from analytics_category for current month
    const { data: rows } = await supabase
      .from("analytics_category")
      .select("category, revenue_percentage")
      .eq("period_type", "monthly")
      .eq("period_start", periodStart)
      .order("revenue_percentage", { ascending: false })
      .limit(5);

    if (rows && rows.length > 0) {
      const result = rows.map((r, i) => ({
        name: r.category,
        value: parseFloat(r.revenue_percentage),
        color: colors[i % colors.length]
      }));

      return res.json({ success: true, data: result });
    }

    // ── Fallback: aggregate from order_items for delivered orders this month ──
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart =
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

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
    console.error("Error /category-distribution:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/analytics/top-products?limit=5
// ─────────────────────────────────────────
router.get("/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;

    // Pull from analytics_product for current month
    const { data: rows } = await supabase
      .from("analytics_product")
      .select("product_name, units_sold, total_revenue")
      .eq("period_type", "monthly")
      .eq("period_start", periodStart)
      .order("total_revenue", { ascending: false })
      .limit(limit);

    if (rows && rows.length > 0) {
      const result = rows.map((r) => ({
        name: r.product_name,
        sales: r.units_sold,
        revenue: Math.round(parseFloat(r.total_revenue))
      }));

      return res.json({ success: true, data: result });
    }

    // ── Fallback: aggregate from order_items for delivered orders this month ──
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonthStart =
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

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
    console.error("Error /top-products:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;