import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/category-rules
// Returns all category rules — used by seller form dropdown
// and the rules banner
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("category_rules")
      .select("*")
      .order("category", { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${data.length} category rules`);
    res.json(data);
  } catch (error) {
    console.error("❌ Error fetching category rules:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/category-rules/:category
// Returns a single rule by category name
// ─────────────────────────────────────────────────────────────
router.get("/:category", async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);

    const { data, error } = await supabase
      .from("category_rules")
      .select("*")
      .ilike("category", category.trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: `No rule found for category "${category}"` });

    res.json(data);
  } catch (error) {
    console.error("❌ Error fetching category rule:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/category-rules
// Create or update a category rule (upsert by category name)
// Admin only
// Body: { admin_id, category, min_price, max_price, allowed_materials[] }
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { admin_id, category, min_price, max_price, allowed_materials } = req.body;

    // ── Validate required fields ─────────────────────────────
    if (!admin_id) return res.status(400).json({ error: "admin_id is required" });
    if (!category || !category.trim())
      return res.status(400).json({ error: "category name is required" });

    // ── Verify admin ─────────────────────────────────────────
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (adminError || !admin)
      return res.status(404).json({ error: "User not found" });
    if (admin.role !== "admin")
      return res.status(403).json({ error: "Only admins can manage category rules" });

    // ── Validate price range ─────────────────────────────────
    const parsedMin = min_price !== undefined && min_price !== "" ? parseFloat(min_price) : null;
    const parsedMax = max_price !== undefined && max_price !== "" ? parseFloat(max_price) : null;

    if (parsedMin !== null && isNaN(parsedMin))
      return res.status(400).json({ error: "min_price must be a valid number" });
    if (parsedMax !== null && isNaN(parsedMax))
      return res.status(400).json({ error: "max_price must be a valid number" });
    if (parsedMin !== null && parsedMin < 0)
      return res.status(400).json({ error: "min_price cannot be negative" });
    if (parsedMax !== null && parsedMax < 0)
      return res.status(400).json({ error: "max_price cannot be negative" });
    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax)
      return res.status(400).json({ error: "min_price cannot be greater than max_price" });

    // ── Validate allowed_materials ───────────────────────────
    const materials = Array.isArray(allowed_materials)
      ? allowed_materials.map(m => m.trim().toLowerCase()).filter(Boolean)
      : [];

    const ruleData = {
      category:          category.trim(),
      min_price:         parsedMin,
      max_price:         parsedMax,
      allowed_materials: materials,
      updated_at:        new Date().toISOString()
    };

    // Upsert: update if category exists, insert if it doesn't
    const { data, error } = await supabase
      .from("category_rules")
      .upsert(ruleData, { onConflict: "category" })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Category rule saved for "${category}"`);
    res.status(201).json({
      ...data,
      _message: `Rule for "${category}" saved successfully.`
    });
  } catch (error) {
    console.error("❌ Error saving category rule:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/category-rules/:category
// Update an existing rule by category name
// Admin only
// Body: { admin_id, min_price?, max_price?, allowed_materials? }
// ─────────────────────────────────────────────────────────────
router.put("/:category", async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const { admin_id, min_price, max_price, allowed_materials } = req.body;

    if (!admin_id) return res.status(400).json({ error: "admin_id is required" });

    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (adminError || !admin) return res.status(404).json({ error: "User not found" });
    if (admin.role !== "admin")
      return res.status(403).json({ error: "Only admins can manage category rules" });

    // Check rule exists
    const { data: existing } = await supabase
      .from("category_rules")
      .select("id")
      .ilike("category", category.trim())
      .maybeSingle();

    if (!existing)
      return res.status(404).json({ error: `No rule found for category "${category}"` });

    // Build update object with only provided fields
    const updateFields = { updated_at: new Date().toISOString() };

    if (min_price !== undefined) {
      const parsed = min_price === "" || min_price === null ? null : parseFloat(min_price);
      if (parsed !== null && isNaN(parsed))
        return res.status(400).json({ error: "min_price must be a valid number" });
      updateFields.min_price = parsed;
    }
    if (max_price !== undefined) {
      const parsed = max_price === "" || max_price === null ? null : parseFloat(max_price);
      if (parsed !== null && isNaN(parsed))
        return res.status(400).json({ error: "max_price must be a valid number" });
      updateFields.max_price = parsed;
    }
    if (allowed_materials !== undefined) {
      updateFields.allowed_materials = Array.isArray(allowed_materials)
        ? allowed_materials.map(m => m.trim().toLowerCase()).filter(Boolean)
        : [];
    }

    const { data, error } = await supabase
      .from("category_rules")
      .update(updateFields)
      .ilike("category", category.trim())
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Category rule updated for "${category}"`);
    res.json({
      ...data,
      _message: `Rule for "${category}" updated successfully.`
    });
  } catch (error) {
    console.error("❌ Error updating category rule:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/category-rules/:category
// Delete a rule by category name
// Admin only
// Body: { admin_id }
// ─────────────────────────────────────────────────────────────
router.delete("/:category", async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const { admin_id } = req.body;

    if (!admin_id) return res.status(400).json({ error: "admin_id is required" });

    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (adminError || !admin) return res.status(404).json({ error: "User not found" });
    if (admin.role !== "admin")
      return res.status(403).json({ error: "Only admins can delete category rules" });

    // Check rule exists before deleting
    const { data: existing } = await supabase
      .from("category_rules")
      .select("id")
      .ilike("category", category.trim())
      .maybeSingle();

    if (!existing)
      return res.status(404).json({ error: `No rule found for category "${category}"` });

    const { error } = await supabase
      .from("category_rules")
      .delete()
      .ilike("category", category.trim());

    if (error) throw error;

    console.log(`🗑️ Category rule deleted for "${category}"`);
    res.json({ message: `Rule for "${category}" deleted successfully.` });
  } catch (error) {
    console.error("❌ Error deleting category rule:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;