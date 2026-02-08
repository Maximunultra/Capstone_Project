import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// Get all feedback for a product
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

// Get feedback by a specific user for a product
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

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

    res.json(data || null);
  } catch (error) {
    console.error("❌ Error fetching user feedback:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new review
router.post("/", async (req, res) => {
  try {
    const { product_id, user_id, rating, comment } = req.body;

    // Validate required fields
    if (!product_id || !user_id || !rating || !comment) {
      return res.status(400).json({
        error: "product_id, user_id, rating, and comment are required"
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5"
      });
    }

    // Validate comment length
    if (comment.trim().length < 10) {
      return res.status(400).json({
        error: "Comment must be at least 10 characters long"
      });
    }

    // Check if user has already reviewed this product
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

    // Create the review
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

    console.log("✅ Review created successfully");
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error creating review:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update an existing review
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, user_id } = req.body;

    // Get the existing review to verify ownership
    const { data: existingReview, error: fetchError } = await supabase
      .from("feedback")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Verify user owns this review
    if (existingReview.user_id !== user_id) {
      return res.status(403).json({ error: "You can only edit your own reviews" });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

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

    console.log("✅ Review updated successfully");
    res.json(data);
  } catch (error) {
    console.error("❌ Error updating review:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a review
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Get the existing review to verify ownership
    const { data: existingReview, error: fetchError } = await supabase
      .from("feedback")
      .select("user_id, product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Verify user owns this review (or allow admin to delete - you can add admin check here)
    if (existingReview.user_id !== user_id) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("✅ Review deleted successfully");
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting review:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all feedback by a user (across all products)
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

export default router;