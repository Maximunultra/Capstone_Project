import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// Get all cart items for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from("cart")
      .select(`
        *,
        product:product_id (
          id,
          product_name,
          price,
          product_image,
          category,
          stock_quantity,
          discount_percentage,
          brand,
          is_active,
          rating_average,
          rating_count
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      cart_items: data,
      total_items: data.length
    });
  } catch (error) {
    console.error("❌ Error fetching cart items:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Add item to cart or update if exists
router.post("/", async (req, res) => {
  try {
    console.log('📝 Add to cart request received');
    const { user_id, product_id, quantity } = req.body;

    // Validation
    if (!user_id || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: "user_id, product_id, and quantity are required"
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be at least 1"
      });
    }

    // Verify product exists and has enough stock
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("id, stock_quantity, is_active, product_name, price, discount_percentage")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    if (!product.is_active) {
      return res.status(400).json({
        success: false,
        error: "Product is not available"
      });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.stock_quantity} items available in stock`
      });
    }

    // Calculate price (with discount if applicable)
    let finalPrice = product.price;
    if (product.discount_percentage > 0) {
      finalPrice = product.price - (product.price * product.discount_percentage / 100);
    }

    // Check if item already exists in cart
    const { data: existingItem, error: checkError } = await supabase
      .from("cart")
      .select("id, quantity")
      .eq("user_id", user_id)
      .eq("product_id", product_id)
      .single();

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          error: `Cannot add ${quantity} more. Only ${product.stock_quantity - existingItem.quantity} additional items available`
        });
      }

      const { data, error } = await supabase
        .from("cart")
        .update({
          quantity: newQuantity,
          price: finalPrice,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Cart updated successfully');
      res.json({
        success: true,
        message: "Cart updated successfully",
        cart_item: data
      });
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from("cart")
        .insert([{
          user_id,
          product_id,
          quantity,
          price: finalPrice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Item added to cart successfully');
      res.status(201).json({
        success: true,
        message: "Item added to cart successfully",
        cart_item: data
      });
    }
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update cart item quantity
router.put("/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be at least 1"
      });
    }

    // Get cart item and check stock
    const { data: cartItem, error: cartError } = await supabase
      .from("cart")
      .select(`
        id,
        product_id,
        product:product_id (
          stock_quantity,
          is_active,
          price,
          discount_percentage
        )
      `)
      .eq("id", cartItemId)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({
        success: false,
        error: "Cart item not found"
      });
    }

    if (!cartItem.product.is_active) {
      return res.status(400).json({
        success: false,
        error: "Product is no longer available"
      });
    }

    if (quantity > cartItem.product.stock_quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${cartItem.product.stock_quantity} items available in stock`
      });
    }

    // Calculate updated price
    let finalPrice = cartItem.product.price;
    if (cartItem.product.discount_percentage > 0) {
      finalPrice = cartItem.product.price - (cartItem.product.price * cartItem.product.discount_percentage / 100);
    }

    // Update quantity and price
    const { data, error } = await supabase
      .from("cart")
      .update({
        quantity,
        price: finalPrice,
        updated_at: new Date().toISOString()
      })
      .eq("id", cartItemId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Quantity updated successfully');
    res.json({
      success: true,
      message: "Quantity updated successfully",
      cart_item: data
    });
  } catch (error) {
    console.error('❌ Update quantity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete cart item
router.delete("/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;

    // Check if cart item exists
    const { data: cartItem, error: checkError } = await supabase
      .from("cart")
      .select("id")
      .eq("id", cartItemId)
      .single();

    if (checkError || !cartItem) {
      return res.status(404).json({
        success: false,
        error: "Cart item not found"
      });
    }

    // Delete the cart item
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("id", cartItemId);

    if (error) throw error;

    console.log('✅ Item removed from cart successfully');
    res.json({
      success: true,
      message: "Item removed from cart successfully"
    });
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear entire cart for a user
router.delete("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    console.log('✅ Cart cleared successfully');
    res.json({
      success: true,
      message: "Cart cleared successfully"
    });
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cart count for a user
router.get("/:userId/count", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("cart")
      .select("quantity")
      .eq("user_id", userId);

    if (error) throw error;

    const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      unique_items: data.length,
      total_items: totalItems
    });
  } catch (error) {
    console.error('❌ Get cart count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cart summary (total price, items count, etc.)
router.get("/:userId/summary", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("cart")
      .select(`
        quantity,
        price,
        product:product_id (
          is_active
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    // Filter only active products
    const activeItems = data.filter(item => item.product && item.product.is_active);

    // Calculate totals using stored price
    const subtotal = activeItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    res.json({
      success: true,
      unique_items: activeItems.length,
      total_items: activeItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    });
  } catch (error) {
    console.error('❌ Get cart summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;