import express from "express";
import { supabase } from "../server.js";
import crypto from "crypto";

const router = express.Router();

// ================================================================
// 🔐 ENCRYPTION CONFIGURATION
// ================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// ✅ Use the SAME key as messages for consistency
// OR create a separate ORDER_ENCRYPTION_KEY in .env
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY 
  ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

console.log('🔐 Order encryption enabled:', !!process.env.MESSAGE_ENCRYPTION_KEY);
console.log('🔑 Key buffer length:', ENCRYPTION_KEY.length, 'bytes (should be 32)');

/**
 * 🔒 Encrypt sensitive data
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV:AuthTag:EncryptedText
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 🔓 Decrypt sensitive data
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.warn('⚠️ Invalid encrypted format, returning as-is');
      return encryptedText; // Fallback for unencrypted legacy data
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return '[Encrypted Data]'; // Fallback
  }
}

/**
 * 🔒 Encrypt order shipping information
 * Encrypts: full_name, email, phone, address, city, province, postal_code
 */
function encryptShippingInfo(shippingInfo) {
  return {
    fullName: encrypt(shippingInfo.fullName),
    email: encrypt(shippingInfo.email),
    phone: encrypt(shippingInfo.phone),
    address: encrypt(shippingInfo.address),
    city: encrypt(shippingInfo.city),
    province: encrypt(shippingInfo.province),
    postalCode: shippingInfo.postalCode ? encrypt(shippingInfo.postalCode) : null
  };
}

/**
 * 🔓 Decrypt order shipping information
 */
function decryptShippingInfo(order) {
  if (!order) return null;
  
  return {
    ...order,
    shipping_full_name: decrypt(order.shipping_full_name),
    shipping_email: decrypt(order.shipping_email),
    shipping_phone: decrypt(order.shipping_phone),
    shipping_address: decrypt(order.shipping_address),
    shipping_city: decrypt(order.shipping_city),
    shipping_province: decrypt(order.shipping_province),
    shipping_postal_code: order.shipping_postal_code ? decrypt(order.shipping_postal_code) : null
  };
}

/**
 * 🔓 Decrypt multiple orders
 */
function decryptOrders(orders) {
  if (!orders || orders.length === 0) return orders;
  return orders.map(order => decryptShippingInfo(order));
}

// ================================================================
// Helper function to generate order number (unchanged)
// ================================================================

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// ================================================================
// Analytics Update Functions (unchanged from original)
// ================================================================

async function updateAnalyticsOnDelivery(order) {
  try {
    console.log('📊 Updating analytics for delivered order:', order.order_number);
    
    const orderDate = new Date(order.order_date);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (!orderItems || orderItems.length === 0) {
      console.warn('⚠️ No order items found for order:', order.id);
      return;
    }

    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    await updateMonthlySummary(year, month, periodStart, periodEnd, order, totalItems);
    await updateCategoryAnalytics(periodStart, periodEnd, orderItems);
    await updateProductAnalytics(periodStart, periodEnd, orderItems);
    
    console.log('✅ Analytics updated successfully');
  } catch (error) {
    console.error('❌ Error updating analytics:', error);
  }
}

async function updateMonthlySummary(year, month, periodStart, periodEnd, order, totalItems) {
  const { data: existing } = await supabase
    .from('analytics_monthly_summary')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  const orderRevenue = parseFloat(order.total_amount || 0);

  if (existing) {
    const { error } = await supabase
      .from('analytics_monthly_summary')
      .update({
        total_revenue: parseFloat(existing.total_revenue || 0) + orderRevenue,
        total_orders: (existing.total_orders || 0) + 1,
        total_customers: (existing.total_customers || 0) + 1,
        total_items_sold: (existing.total_items_sold || 0) + totalItems,
        updated_at: new Date().toISOString()
      })
      .eq('year', year)
      .eq('month', month);

    if (error) console.error('Error updating monthly summary:', error);
  } else {
    const { error } = await supabase
      .from('analytics_monthly_summary')
      .insert({
        year,
        month,
        period_type: 'monthly',
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: orderRevenue,
        total_orders: 1,
        total_customers: 1,
        total_items_sold: totalItems,
        revenue_growth_percentage: 0,
        top_category: null
      });

    if (error) console.error('Error inserting monthly summary:', error);
  }
}

async function updateCategoryAnalytics(periodStart, periodEnd, orderItems) {
  const categoryMap = {};
  
  orderItems.forEach(item => {
    const category = item.product_category || 'Uncategorized';
    if (!categoryMap[category]) {
      categoryMap[category] = {
        revenue: 0,
        orders: 1,
        items: 0
      };
    }
    
    const revenue = (item.quantity || 0) * parseFloat(item.unit_price || 0);
    categoryMap[category].revenue += revenue;
    categoryMap[category].items += item.quantity || 0;
  });

  for (const [category, stats] of Object.entries(categoryMap)) {
    const { data: existing } = await supabase
      .from('analytics_category')
      .select('*')
      .eq('category', category)
      .eq('period_type', 'monthly')
      .eq('period_start', periodStart)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('analytics_category')
        .update({
          total_revenue: parseFloat(existing.total_revenue || 0) + stats.revenue,
          total_orders: (existing.total_orders || 0) + 1,
          items_sold: (existing.items_sold || 0) + stats.items,
          updated_at: new Date().toISOString()
        })
        .eq('category', category)
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart);
    } else {
      await supabase
        .from('analytics_category')
        .insert({
          category,
          period_type: 'monthly',
          period_start: periodStart,
          period_end: periodEnd,
          total_revenue: stats.revenue,
          total_orders: 1,
          items_sold: stats.items,
          revenue_percentage: 0
        });
    }
  }
}

async function updateProductAnalytics(periodStart, periodEnd, orderItems) {
  for (const item of orderItems) {
    const { data: existing } = await supabase
      .from('analytics_product')
      .select('*')
      .eq('product_id', item.product_id)
      .eq('period_type', 'monthly')
      .eq('period_start', periodStart)
      .maybeSingle();

    const revenue = (item.quantity || 0) * parseFloat(item.unit_price || 0);

    if (existing) {
      await supabase
        .from('analytics_product')
        .update({
          units_sold: (existing.units_sold || 0) + item.quantity,
          total_revenue: parseFloat(existing.total_revenue || 0) + revenue,
          total_orders: (existing.total_orders || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', item.product_id)
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart);
    } else {
      await supabase
        .from('analytics_product')
        .insert({
          product_id: item.product_id,
          product_name: item.product_name,
          period_type: 'monthly',
          period_start: periodStart,
          period_end: periodEnd,
          units_sold: item.quantity,
          total_revenue: revenue,
          total_orders: 1,
          average_price: parseFloat(item.unit_price || 0)
        });
    }
  }
}

async function reverseAnalyticsOnCancellation(order) {
  try {
    console.log('📊 Reversing analytics for cancelled order:', order.order_number);
    
    const orderDate = new Date(order.order_date);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (!orderItems || orderItems.length === 0) return;

    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const orderRevenue = parseFloat(order.total_amount || 0);

    const { data: monthlySummary } = await supabase
      .from('analytics_monthly_summary')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (monthlySummary) {
      await supabase
        .from('analytics_monthly_summary')
        .update({
          total_revenue: Math.max(0, parseFloat(monthlySummary.total_revenue || 0) - orderRevenue),
          total_orders: Math.max(0, (monthlySummary.total_orders || 0) - 1),
          total_customers: Math.max(0, (monthlySummary.total_customers || 0) - 1),
          total_items_sold: Math.max(0, (monthlySummary.total_items_sold || 0) - totalItems),
          updated_at: new Date().toISOString()
        })
        .eq('year', year)
        .eq('month', month);
    }

    const categoryMap = {};
    orderItems.forEach(item => {
      const category = item.product_category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { revenue: 0, items: 0 };
      }
      const revenue = (item.quantity || 0) * parseFloat(item.unit_price || 0);
      categoryMap[category].revenue += revenue;
      categoryMap[category].items += item.quantity || 0;
    });

    for (const [category, stats] of Object.entries(categoryMap)) {
      const { data: existing } = await supabase
        .from('analytics_category')
        .select('*')
        .eq('category', category)
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('analytics_category')
          .update({
            total_revenue: Math.max(0, parseFloat(existing.total_revenue || 0) - stats.revenue),
            total_orders: Math.max(0, (existing.total_orders || 0) - 1),
            items_sold: Math.max(0, (existing.items_sold || 0) - stats.items),
            updated_at: new Date().toISOString()
          })
          .eq('category', category)
          .eq('period_type', 'monthly')
          .eq('period_start', periodStart);
      }
    }

    for (const item of orderItems) {
      const { data: existing } = await supabase
        .from('analytics_product')
        .select('*')
        .eq('product_id', item.product_id)
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart)
        .maybeSingle();

      if (existing) {
        const revenue = (item.quantity || 0) * parseFloat(item.unit_price || 0);
        await supabase
          .from('analytics_product')
          .update({
            units_sold: Math.max(0, (existing.units_sold || 0) - item.quantity),
            total_revenue: Math.max(0, parseFloat(existing.total_revenue || 0) - revenue),
            total_orders: Math.max(0, (existing.total_orders || 0) - 1),
            updated_at: new Date().toISOString()
          })
          .eq('product_id', item.product_id)
          .eq('period_type', 'monthly')
          .eq('period_start', periodStart);
      }
    }

    console.log('✅ Analytics reversed successfully');
  } catch (error) {
    console.error('❌ Error reversing analytics:', error);
  }
}

// ================================================================
// 🆕 ENCRYPTED GET All Orders with Seller Filtering
// ================================================================

router.get("/", async (req, res) => {
  try {
    const { 
      status, 
      seller_id,
      limit = 50, 
      offset = 0, 
      sort = 'desc' 
    } = req.query;

    console.log('📊 Fetching orders with filters:', { status, seller_id, limit, offset });

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:product_id (
            id,
            product_name,
            product_image,
            category,
            brand,
            user_id
          )
        )
      `)
      .order("order_date", { ascending: sort === 'asc' });

    if (status && status !== 'all') {
      query = query.eq("order_status", status);
    }

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching orders:', error);
      throw error;
    }

    let filteredOrders = data;

    // Filter orders by seller if seller_id is provided
    if (seller_id) {
      console.log('🔒 Filtering orders for seller:', seller_id);
      
      filteredOrders = data.filter(order => {
        return order.order_items && order.order_items.some(item => {
          return item.product && item.product.user_id === seller_id;
        });
      });

      console.log(`✅ Filtered ${filteredOrders.length} orders for seller ${seller_id} (from ${data.length} total)`);
    }

    // 🔓 DECRYPT shipping information before sending to client
    const decryptedOrders = decryptOrders(filteredOrders);

    console.log(`✅ Fetched and decrypted ${decryptedOrders.length} orders`);

    res.json({
      success: true,
      orders: decryptedOrders,
      total: decryptedOrders.length
    });
  } catch (error) {
    console.error("❌ Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// Dashboard Stats (no decryption needed - only aggregates)
// ================================================================

router.get("/stats/dashboard", async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics');

    const { data: allOrders, error } = await supabase
      .from("orders")
      .select("order_status, total_amount, payment_status, order_date");

    if (error) throw error;

    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const stats = {
      total_orders: allOrders.length,
      total_revenue: allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0).toFixed(2),
      
      this_month_orders: allOrders.filter(o => new Date(o.order_date) >= thisMonth).length,
      this_month_revenue: allOrders
        .filter(o => new Date(o.order_date) >= thisMonth)
        .reduce((sum, order) => sum + parseFloat(order.total_amount), 0)
        .toFixed(2),
      
      last_month_orders: allOrders.filter(o => {
        const date = new Date(o.order_date);
        return date >= lastMonth && date < thisMonth;
      }).length,
      
      pending: allOrders.filter(o => o.order_status === 'pending').length,
      processing: allOrders.filter(o => o.order_status === 'processing').length,
      shipped: allOrders.filter(o => o.order_status === 'shipped').length,
      delivered: allOrders.filter(o => o.order_status === 'delivered').length,
      cancelled: allOrders.filter(o => o.order_status === 'cancelled').length,
      
      paid: allOrders.filter(o => o.payment_status === 'paid').length,
      pending_payment: allOrders.filter(o => o.payment_status === 'pending').length
    };

    console.log('✅ Dashboard statistics calculated');

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("❌ Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// 🆕 ENCRYPTED POST - Create Order with Encrypted Shipping Info
// ================================================================

router.post("/", async (req, res) => {
  try {
    console.log('📝 Create order request received');
    const { 
      user_id,
      shipping_info,
      payment_method,
      cart_items,
      subtotal,
      tax,
      shipping_fee,
      total,
      payment_intent_id,
      payment_capture_id, // ✅ ADD THIS LINE
      payment_status
    } = req.body;

    if (!user_id || !shipping_info || !payment_method || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const orderNumber = generateOrderNumber();

    let finalPaymentStatus = payment_status || 'pending';
    
    if ((payment_method === 'gcash' || payment_method === 'card') && payment_intent_id) {
      finalPaymentStatus = 'paid';
    }
    
    if (payment_method === 'cod') {
      finalPaymentStatus = 'pending';
    }

    const productIds = cart_items.map(item => item.product_id);
    const { data: products } = await supabase
      .from('product')
      .select('id, category')
      .in('id', productIds);

    const productCategoryMap = {};
    (products || []).forEach(p => {
      productCategoryMap[p.id] = p.category;
    });

    // 🔒 ENCRYPT SHIPPING INFORMATION
    console.log('🔒 Encrypting shipping information...');
    const encryptedShipping = encryptShippingInfo(shipping_info);
    console.log('✅ Shipping information encrypted');

    const orderData = {
  order_number: orderNumber,
  user_id: user_id,
  
  // Shipping info (encrypted)
  shipping_full_name: encryptedShipping.fullName,
  shipping_email: encryptedShipping.email,
  shipping_phone: encryptedShipping.phone,
  shipping_address: encryptedShipping.address,
  shipping_city: encryptedShipping.city,
  shipping_province: encryptedShipping.province,
  shipping_postal_code: encryptedShipping.postalCode,
  
  // Amounts
  subtotal: parseFloat(subtotal),
  tax: parseFloat(tax),
  shipping_fee: parseFloat(shipping_fee) || 0,
  total_amount: parseFloat(total),
  
  // Payment
  payment_method: payment_method,
  payment_status: finalPaymentStatus,
  payment_intent_id: payment_intent_id || null,
  payment_capture_id: payment_capture_id || null, // ✅ ADD THIS LINE
  
  // Order status
  order_status: 'pending',
  tracking_number: null,
  
  // Timestamps
  order_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
    console.log('💾 Creating order in database...');

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation error:', orderError);
      throw orderError;
    }

    console.log('✅ Order created:', order.order_number);

    const orderItems = cart_items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product?.product_name || 'Unknown Product',
      product_image: item.product?.product_image || null,
      product_category: productCategoryMap[item.product_id] || 'Uncategorized',
      product_brand: item.product?.brand || null,
      unit_price: parseFloat(item.price || item.product?.price || 0),
      quantity: parseInt(item.quantity),
      subtotal: parseFloat(item.price || item.product?.price || 0) * parseInt(item.quantity),
      created_at: new Date().toISOString()
    }));

    console.log('💾 Creating order items...');
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('❌ Order items creation error:', itemsError);
      throw itemsError;
    }

    console.log('✅ Order items created');

    for (const item of cart_items) {
      const { data: product } = await supabase
        .from("product")
        .select("stock_quantity, sold_count")
        .eq("id", item.product_id)
        .single();

      if (product) {
        await supabase
          .from("product")
          .update({
            stock_quantity: product.stock_quantity - item.quantity,
            sold_count: (product.sold_count || 0) + item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq("id", item.product_id);
      }
    }

    console.log('✅ Product stock updated');

   // ✅ FIX — only delete the specific items that were ordered
const cartItemIds = cart_items.map(item => item.id).filter(Boolean);

const { error: clearCartError } = await supabase
  .from("cart")
  .delete()
  .in("id", cartItemIds);

if (clearCartError) {
  console.error('⚠️ Error clearing cart items:', clearCartError);
} else {
  console.log(`✅ Cleared ${cartItemIds.length} cart items (remaining items kept)`);
}

    // 🔓 DECRYPT before sending to client
    const decryptedOrder = decryptShippingInfo(order);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        ...decryptedOrder,
        items: items
      }
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// 🆕 ENCRYPTED GET User Orders
// ================================================================

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:product_id (
            id,
            product_name,
            product_image,
            user_id
          )
        )
      `)
      .eq("user_id", userId)
      .order("order_date", { ascending: false });

    if (status) {
      query = query.eq("order_status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    // 🔓 DECRYPT shipping information
    const decryptedOrders = decryptOrders(data);

    res.json({
      success: true,
      orders: decryptedOrders,
      total: decryptedOrders.length
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// 🆕 ENCRYPTED GET Single Order by ID
// ================================================================

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:product_id (
            id,
            product_name,
            product_image,
            category,
            brand,
            user_id
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // 🔓 DECRYPT shipping information
    const decryptedOrder = decryptShippingInfo(data);

    const orderStatus = decryptedOrder.order_status.toLowerCase();
    const permissions = {
      can_cancel: ['pending', 'processing'].includes(orderStatus),
      can_message_seller: ['pending', 'processing', 'shipped'].includes(orderStatus)
    };

    res.json({
      success: true,
      order: decryptedOrder,
      permissions
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// 🆕 ENCRYPTED GET Order by Order Number
// ================================================================

router.get("/number/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:product_id (
            id,
            product_name,
            product_image,
            user_id
          )
        )
      `)
      .eq("order_number", orderNumber)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // 🔓 DECRYPT shipping information
    const decryptedOrder = decryptShippingInfo(data);

    const orderStatus = decryptedOrder.order_status.toLowerCase();
    const permissions = {
      can_cancel: ['pending', 'processing'].includes(orderStatus),
      can_message_seller: ['pending', 'processing', 'shipped'].includes(orderStatus)
    };

    res.json({
      success: true,
      order: decryptedOrder,
      permissions
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// Rest of the routes (status updates, payment, tracking, etc.)
// These don't need encryption changes
// ================================================================

router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, tracking_number } = req.body;

    if (!order_status) {
      return res.status(400).json({
        success: false,
        error: "order_status is required"
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order status. Must be one of: " + validStatuses.join(', ')
      });
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    if (currentOrder.order_status === 'delivered') {
      return res.status(403).json({
        success: false,
        error: "Cannot change status of delivered orders"
      });
    }

    const statusFlow = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    const allowedTransitions = statusFlow[currentOrder.order_status];
    if (!allowedTransitions.includes(order_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${currentOrder.order_status} to ${order_status}`,
        allowed_transitions: allowedTransitions
      });
    }

    const updateData = {
      order_status,
      updated_at: new Date().toISOString()
    };

    if (order_status === 'shipped' && tracking_number) {
      updateData.tracking_number = tracking_number;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Order ${orderId} status updated to ${order_status}`);

    if (order_status === 'delivered' && currentOrder.order_status !== 'delivered') {
      await updateAnalyticsOnDelivery({ ...data, order_items: currentOrder.order_items });
    }

    if (order_status === 'cancelled' && currentOrder.order_status === 'delivered') {
      await reverseAnalyticsOnCancellation({ ...data, order_items: currentOrder.order_items });
    }

    // 🔓 DECRYPT before sending
    const decryptedData = decryptShippingInfo(data);

    res.json({
      success: true,
      message: "Order status updated",
      order: decryptedData
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.patch("/:orderId/payment", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({
        success: false,
        error: "payment_status is required"
      });
    }

    const validPaymentStatuses = ['pending', 'paid', 'failed'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment status. Must be one of: " + validPaymentStatuses.join(', ')
      });
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("payment_method, payment_status, payment_intent_id")
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    if (currentOrder.payment_method !== 'cod' && currentOrder.payment_intent_id) {
      return res.status(403).json({
        success: false,
        error: "Payment status for online payments is managed by PayMongo and cannot be modified manually"
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Order ${orderId} payment status updated to ${payment_status}`);

    // 🔓 DECRYPT before sending
    const decryptedData = decryptShippingInfo(data);

    res.json({
      success: true,
      message: "Payment status updated",
      order: decryptedData
    });
  } catch (error) {
    console.error("❌ Update payment status error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.patch("/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tracking_number } = req.body;

    if (!tracking_number) {
      return res.status(400).json({
        success: false,
        error: "tracking_number is required"
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        tracking_number,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Order ${orderId} tracking number updated`);

    // 🔓 DECRYPT before sending
    const decryptedData = decryptShippingInfo(data);

    res.json({
      success: true,
      message: "Tracking number updated",
      order: decryptedData
    });
  } catch (error) {
    console.error("❌ Update tracking number error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          product_id,
          quantity,
          unit_price,
          product_category
        )
      `)
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.order_status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order with status: ${order.order_status}`,
        message: "Only orders with status 'pending' or 'processing' can be cancelled",
        current_status: order.order_status
      });
    }

    if ((order.payment_method === 'gcash' || order.payment_method === 'card') && order.payment_status === 'paid') {
      console.log('⚠️ Note: This order was paid online. Consider initiating a refund through PayMongo.');
    }

    console.log('🔄 Restoring product stock...');
    for (const item of order.order_items) {
      const { data: product } = await supabase
        .from("product")
        .select("stock_quantity, sold_count")
        .eq("id", item.product_id)
        .single();

      if (product) {
        await supabase
          .from("product")
          .update({
            stock_quantity: product.stock_quantity + item.quantity,
            sold_count: Math.max(0, (product.sold_count || 0) - item.quantity),
            updated_at: new Date().toISOString()
          })
          .eq("id", item.product_id);
      }
    }
    console.log('✅ Product stock restored');

    const { data, error } = await supabase
      .from("orders")
      .update({
        order_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    if (order.order_status === 'delivered') {
      await reverseAnalyticsOnCancellation(order);
    }

    console.log(`✅ Order ${orderId} cancelled successfully`);

    // 🔓 DECRYPT before sending
    const decryptedData = decryptShippingInfo(data);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: decryptedData,
      refund_status: order.payment_status === 'paid' ? 'Refund may be required' : 'No refund needed'
    });
  } catch (error) {
    console.error("❌ Cancel order error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .select("order_status, total_amount")
      .eq("user_id", userId);

    if (error) throw error;

    const stats = {
      total_orders: data.length,
      total_spent: data.reduce((sum, order) => sum + parseFloat(order.total_amount), 0).toFixed(2),
      pending: data.filter(o => o.order_status === 'pending').length,
      processing: data.filter(o => o.order_status === 'processing').length,
      shipped: data.filter(o => o.order_status === 'shipped').length,
      delivered: data.filter(o => o.order_status === 'delivered').length,
      cancelled: data.filter(o => o.order_status === 'cancelled').length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("❌ Get order stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;