import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// ★ Helper: recalculate and sync rating_average + rating_count
//   on the product table whenever a review is added/updated/deleted
// ─────────────────────────────────────────────────────────────
const syncProductRating = async (productId) => {
  try {
    // Fetch all ratings for this product
    const { data: feedbacks, error } = await supabase
      .from("feedback")
      .select("rating")
      .eq("product_id", productId);

    if (error) throw error;

    const count = feedbacks?.length || 0;
    const average = count > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / count
      : 0;

    // Update the product row with the freshly calculated values
    const { error: updateError } = await supabase
      .from("product")
      .update({
        rating_average: parseFloat(average.toFixed(2)),
        rating_count: count,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId);

    if (updateError) throw updateError;

    console.log(`✅ Rating synced for product ${productId}: avg=${average.toFixed(2)}, count=${count}`);
  } catch (err) {
    console.error("❌ Failed to sync product rating:", err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /product/:productId  — all reviews for a product
// ─────────────────────────────────────────────────────────────
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          profile_image
        )
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("❌ Error fetching feedback:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /product/:productId/user/:userId  — one user's review
// ─────────────────────────────────────────────────────────────
router.get("/product/:productId/user/:userId", async (req, res) => {
  try {
    const { productId, userId } = req.params;

    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          profile_image
        )
      `)
      .eq("product_id", productId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json(data || null);
  } catch (error) {
    console.error("❌ Error fetching user feedback:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /  — create a new review
// ★ FIX: calls syncProductRating after insert
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { product_id, user_id, rating, comment } = req.body;

    if (!product_id || !user_id || !rating || !comment) {
      return res.status(400).json({
        error: "product_id, user_id, rating, and comment are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({ error: "Comment must be at least 10 characters long" });
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("feedback")
      .select("id")
      .eq("product_id", product_id)
      .eq("user_id", user_id)
      .single();

    if (existingReview) {
      return res.status(409).json({
        error: "You have already reviewed this product. Please update your existing review."
      });
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert([{
        product_id,
        user_id,
        rating,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          profile_image
        )
      `)
      .single();

    if (error) throw error;

    // ★ Recalculate product rating now that a new review was added
    await syncProductRating(product_id);

    console.log("✅ Review created successfully");
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error creating review:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /:id  — update an existing review
// ★ FIX: calls syncProductRating after update
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, user_id } = req.body;

    const { data: existingReview, error: fetchError } = await supabase
      .from("feedback")
      .select("user_id, product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (existingReview.user_id !== user_id) {
      return res.status(403).json({ error: "You can only edit your own reviews" });
    }

    const updateData = { updated_at: new Date().toISOString() };

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      updateData.rating = rating;
    }

    if (comment !== undefined) {
      if (comment.trim().length < 10) {
        return res.status(400).json({ error: "Comment must be at least 10 characters long" });
      }
      updateData.comment = comment.trim();
    }

    const { data, error } = await supabase
      .from("feedback")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          profile_image
        )
      `)
      .single();

    if (error) throw error;

    // ★ Recalculate product rating now that a review was changed
    await syncProductRating(existingReview.product_id);

    console.log("✅ Review updated successfully");
    res.json(data);
  } catch (error) {
    console.error("❌ Error updating review:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /:id  — delete a review
// ★ FIX: calls syncProductRating after delete
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const { data: existingReview, error: fetchError } = await supabase
      .from("feedback")
      .select("user_id, product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (existingReview.user_id !== user_id) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // ★ Recalculate product rating now that a review was removed
    await syncProductRating(existingReview.product_id);

    console.log("✅ Review deleted successfully");
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting review:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /user/:userId  — all reviews by a user across products
// ─────────────────────────────────────────────────────────────
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        product:product_id (
          id,
          product_name,
          product_image,
          price
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("❌ Error fetching user feedback:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /sync-all  — one-time fix: recalculate ratings for ALL
//   products (useful to fix existing stale data)
// ─────────────────────────────────────────────────────────────
router.post("/sync-all", async (req, res) => {
  try {
    // Get all distinct product_ids that have feedback
    const { data: products, error } = await supabase
      .from("feedback")
      .select("product_id");

    if (error) throw error;

    const uniqueProductIds = [...new Set(products.map(f => f.product_id))];

    await Promise.all(uniqueProductIds.map(id => syncProductRating(id)));

    res.json({
      success: true,
      message: `Ratings synced for ${uniqueProductIds.length} products`,
      synced_products: uniqueProductIds.length
    });
  } catch (error) {
    console.error("❌ Error syncing all ratings:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;