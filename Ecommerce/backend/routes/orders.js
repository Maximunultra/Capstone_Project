import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// Helper function to generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

router.get("/", async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, sort = 'desc' } = req.query;

    console.log('📊 Fetching all orders for seller dashboard');

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

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq("order_status", status);
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching orders:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} orders`);

    res.json({
      success: true,
      orders: data,
      total: data.length
    });
  } catch (error) {
    console.error("❌ Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Get dashboard statistics (total orders, revenue, etc.)
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
      
      // Monthly stats
      this_month_orders: allOrders.filter(o => new Date(o.order_date) >= thisMonth).length,
      this_month_revenue: allOrders
        .filter(o => new Date(o.order_date) >= thisMonth)
        .reduce((sum, order) => sum + parseFloat(order.total_amount), 0)
        .toFixed(2),
      
      last_month_orders: allOrders.filter(o => {
        const date = new Date(o.order_date);
        return date >= lastMonth && date < thisMonth;
      }).length,
      
      // Status breakdown
      pending: allOrders.filter(o => o.order_status === 'pending').length,
      processing: allOrders.filter(o => o.order_status === 'processing').length,
      shipped: allOrders.filter(o => o.order_status === 'shipped').length,
      delivered: allOrders.filter(o => o.order_status === 'delivered').length,
      cancelled: allOrders.filter(o => o.order_status === 'cancelled').length,
      
      // Payment status
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

// POST - Create a new order
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
      payment_status
    } = req.body;

    // Validation
    if (!user_id || !shipping_info || !payment_method || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Determine payment status based on payment method
    let finalPaymentStatus = payment_status || 'pending';
    
    if ((payment_method === 'gcash' || payment_method === 'card') && payment_intent_id) {
      finalPaymentStatus = 'paid';
    }
    
    if (payment_method === 'cod') {
      finalPaymentStatus = 'pending';
    }

    // Create order
    const orderData = {
      order_number: orderNumber,
      user_id: user_id,
      
      // Shipping info
      shipping_full_name: shipping_info.fullName,
      shipping_email: shipping_info.email,
      shipping_phone: shipping_info.phone,
      shipping_address: shipping_info.address,
      shipping_city: shipping_info.city,
      shipping_province: shipping_info.province,
      shipping_postal_code: shipping_info.postalCode || null,
      
      // Amounts
      subtotal: parseFloat(subtotal),
      tax: parseFloat(tax),
      shipping_fee: parseFloat(shipping_fee) || 0,
      total_amount: parseFloat(total),
      
      // Payment
      payment_method: payment_method,
      payment_status: finalPaymentStatus,
      payment_intent_id: payment_intent_id || null,
      
      // Order status
      order_status: 'pending',
      
      // Tracking number (null initially)
      tracking_number: null,
      
      // Timestamps
      order_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Creating order in database...');
    console.log('Payment method:', payment_method);
    console.log('Payment status:', finalPaymentStatus);
    console.log('Payment intent ID:', payment_intent_id);

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

    // Create order items
    const orderItems = cart_items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product?.product_name || 'Unknown Product',
      product_image: item.product?.product_image || null,
      product_category: item.product?.category || null,
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

    // Update product stock quantities
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

    // Clear user's cart
    const { error: clearCartError } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user_id);

    if (clearCartError) {
      console.error('⚠️ Error clearing cart:', clearCartError);
    } else {
      console.log('✅ Cart cleared');
    }

    // Return order details
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        ...order,
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

// GET - Fetch all orders for a user
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

    res.json({
      success: true,
      orders: data,
      total: data.length
    });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET - Fetch a single order by ID (ENHANCED with permissions)
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

    // Add permission flags based on order status
    const orderStatus = data.order_status.toLowerCase();
    const permissions = {
      can_cancel: ['pending', 'processing'].includes(orderStatus),
      can_message_seller: ['pending', 'processing', 'shipped'].includes(orderStatus)
    };

    res.json({
      success: true,
      order: data,
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

// GET - Fetch order by order number
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

    // Add permission flags
    const orderStatus = data.order_status.toLowerCase();
    const permissions = {
      can_cancel: ['pending', 'processing'].includes(orderStatus),
      can_message_seller: ['pending', 'processing', 'shipped'].includes(orderStatus)
    };

    res.json({
      success: true,
      order: data,
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

// PATCH - Update order status (ENHANCED with validation)
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

    // Validate order status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order status. Must be one of: " + validStatuses.join(', ')
      });
    }

    // Check current order status
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("order_status")
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // RESTRICTION: Cannot change status if already delivered
    if (currentOrder.order_status === 'delivered') {
      return res.status(403).json({
        success: false,
        error: "Cannot change status of delivered orders"
      });
    }

    // Validate status transitions
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

    // Prepare update data
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

    res.json({
      success: true,
      message: "Order status updated",
      order: data
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH - Update payment status
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

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment status. Must be one of: " + validPaymentStatuses.join(', ')
      });
    }

    // Check order details
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

    // RESTRICTION: Only COD orders can have payment status modified manually
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

    res.json({
      success: true,
      message: "Payment status updated",
      order: data
    });
  } catch (error) {
    console.error("❌ Update payment status error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH - Update tracking number
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

    res.json({
      success: true,
      message: "Tracking number updated",
      order: data
    });
  } catch (error) {
    console.error("❌ Update tracking number error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Cancel order (ENHANCED with stock restoration)
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if order exists and get full details
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          product_id,
          quantity
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

    // Only allow cancellation for pending and processing orders
    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.order_status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order with status: ${order.order_status}`,
        message: "Only orders with status 'pending' or 'processing' can be cancelled",
        current_status: order.order_status
      });
    }

    // Note: For online payments, you might want to initiate a refund with PayMongo here
    if ((order.payment_method === 'gcash' || order.payment_method === 'card') && order.payment_status === 'paid') {
      console.log('⚠️ Note: This order was paid online. Consider initiating a refund through PayMongo.');
    }

    // Restore product stock quantities
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

    // Update status to cancelled instead of deleting
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

    console.log(`✅ Order ${orderId} cancelled successfully`);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: data,
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

// GET - Get order statistics for a user
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