import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

const CART_LIMIT = 10;

// ── Price helper: always calculate from current product price ──────
const calcFinalPrice = (price, discountPercentage) => {
  if (!discountPercentage || discountPercentage <= 0) return parseFloat(price);
  return parseFloat(price) - (parseFloat(price) * discountPercentage / 100);
};

// ─────────────────────────────────────────────────────────────
// GET /:userId  — fetch cart items
// ★ FIX: after fetching, sync each cart row's price with the
//         current product price so seller price updates are
//         reflected immediately.
// ─────────────────────────────────────────────────────────────
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
          rating_count,
          shipping_fee,
          weight,
          weight_unit,
          user_id
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // ── Sync stale prices: if product price changed, update the cart row ──
    const priceUpdatePromises = [];
    const syncedData = data.map(item => {
      if (!item.product) return item;

      const livePrice = calcFinalPrice(item.product.price, item.product.discount_percentage);
      const cartPrice = parseFloat(item.price);

      // If the price stored in cart differs from the current product price, sync it
      if (Math.abs(livePrice - cartPrice) > 0.001) {
        priceUpdatePromises.push(
          supabase
            .from("cart")
            .update({ price: livePrice, updated_at: new Date().toISOString() })
            .eq("id", item.id)
        );
        // Return the item with the updated price so the frontend gets fresh data immediately
        return { ...item, price: livePrice };
      }

      return item;
    });

    // Fire price sync updates in the background (don't block the response)
    if (priceUpdatePromises.length > 0) {
      Promise.all(priceUpdatePromises).catch(err =>
        console.error("❌ Price sync error:", err)
      );
    }

    res.json({
      success: true,
      cart_items: syncedData,
      total_items: syncedData.length,
      cart_limit: CART_LIMIT,
      at_limit: syncedData.length >= CART_LIMIT,
      prices_synced: priceUpdatePromises.length, // useful for debugging
    });
  } catch (error) {
    console.error("❌ Error fetching cart items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /  — add item to cart or update quantity if exists
// ★ FIX: always recalculate price from live product data
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    console.log('📝 Add to cart request received');
    const { user_id, product_id, quantity } = req.body;

    if (!user_id || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: "user_id, product_id, and quantity are required"
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ success: false, error: "Quantity must be at least 1" });
    }

    const { data: product, error: productError } = await supabase
      .from("product")
      .select("id, stock_quantity, is_active, product_name, price, discount_percentage")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    if (!product.is_active) {
      return res.status(400).json({ success: false, error: "Product is not available" });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.stock_quantity} items available in stock`
      });
    }

    const { data: existingItem } = await supabase
      .from("cart")
      .select("id, quantity")
      .eq("user_id", user_id)
      .eq("product_id", product_id)
      .single();

    // Cart limit check — only for NEW unique products
    if (!existingItem) {
      const { data: currentCart, error: countError } = await supabase
        .from("cart")
        .select("id")
        .eq("user_id", user_id);

      if (countError) throw countError;

      if (currentCart.length >= CART_LIMIT) {
        return res.status(400).json({
          success: false,
          error: `Cart limit reached. You can only have ${CART_LIMIT} unique products in your cart at a time.`,
          cart_limit_reached: true,
          cart_limit: CART_LIMIT
        });
      }
    }

    // ★ Always use the LIVE price from the product table
    const finalPrice = calcFinalPrice(product.price, product.discount_percentage);

    if (existingItem) {
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
          price: finalPrice, // ★ refresh price on every update
          updated_at: new Date().toISOString()
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Cart updated successfully');
      res.json({ success: true, message: "Cart updated successfully", cart_item: data });
    } else {
      const { data, error } = await supabase
        .from("cart")
        .insert([{
          user_id,
          product_id,
          quantity,
          price: finalPrice, // ★ always current price
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Item added to cart successfully');
      res.status(201).json({ success: true, message: "Item added to cart successfully", cart_item: data });
    }
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /:cartItemId  — update quantity
// ★ FIX: always recalculate price from live product data
// ─────────────────────────────────────────────────────────────
router.put("/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: "Quantity must be at least 1" });
    }

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
      return res.status(404).json({ success: false, error: "Cart item not found" });
    }

    if (!cartItem.product.is_active) {
      return res.status(400).json({ success: false, error: "Product is no longer available" });
    }

    if (quantity > cartItem.product.stock_quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${cartItem.product.stock_quantity} items available in stock`
      });
    }

    // ★ Always use the LIVE price from the product table
    const finalPrice = calcFinalPrice(cartItem.product.price, cartItem.product.discount_percentage);

    const { data, error } = await supabase
      .from("cart")
      .update({ quantity, price: finalPrice, updated_at: new Date().toISOString() })
      .eq("id", cartItemId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Quantity updated successfully');
    res.json({ success: true, message: "Quantity updated successfully", cart_item: data });
  } catch (error) {
    console.error('❌ Update quantity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /:cartItemId  — remove single item
// ─────────────────────────────────────────────────────────────
router.delete("/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;

    const { data: cartItem, error: checkError } = await supabase
      .from("cart")
      .select("id")
      .eq("id", cartItemId)
      .single();

    if (checkError || !cartItem) {
      return res.status(404).json({ success: false, error: "Cart item not found" });
    }

    const { error } = await supabase.from("cart").delete().eq("id", cartItemId);
    if (error) throw error;

    console.log('✅ Item removed from cart successfully');
    res.json({ success: true, message: "Item removed from cart successfully" });
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /user/:userId  — clear entire cart
// ─────────────────────────────────────────────────────────────
router.delete("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabase.from("cart").delete().eq("user_id", userId);
    if (error) throw error;

    console.log('✅ Cart cleared successfully');
    res.json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /:userId/count
// ─────────────────────────────────────────────────────────────
router.get("/:userId/count", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase.from("cart").select("quantity").eq("user_id", userId);
    if (error) throw error;

    const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);
    res.json({
      success: true,
      unique_items: data.length,
      total_items: totalItems,
      cart_limit: CART_LIMIT,
      at_limit: data.length >= CART_LIMIT
    });
  } catch (error) {
    console.error('❌ Get cart count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /:userId/summary
// ─────────────────────────────────────────────────────────────
router.get("/:userId/summary", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("cart")
      .select(`quantity, price, product:product_id (is_active, price, discount_percentage)`)
      .eq("user_id", userId);

    if (error) throw error;

    const activeItems = data.filter(item => item.product && item.product.is_active);

    // ★ Use live product price for summary calculations
    const subtotal = activeItems.reduce((sum, item) => {
      const livePrice = calcFinalPrice(item.product.price, item.product.discount_percentage);
      return sum + (livePrice * item.quantity);
    }, 0);

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    res.json({
      success: true,
      unique_items: activeItems.length,
      total_items: activeItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      cart_limit: CART_LIMIT,
      at_limit: activeItems.length >= CART_LIMIT
    });
  } catch (error) {
    console.error('❌ Get cart summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;