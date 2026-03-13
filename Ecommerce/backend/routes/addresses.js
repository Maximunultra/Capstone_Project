import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// ─── Middleware: always respond with JSON ─────────────────────────────────────
router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// ─── Helper: verify the requesting user owns this address ─────────────────────
async function verifyOwnership(addressId, userId) {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, user_id")
    .eq("id", addressId)
    .single();

  if (error || !data) return { ok: false, status: 404, msg: "Address not found" };
  if (data.user_id !== userId) return { ok: false, status: 403, msg: "Access denied" };
  return { ok: true };
}

// ─── GET /api/addresses/user/:userId ─────────────────────────────────────────
// List all addresses for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })  // default first
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("❌ Error fetching addresses:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/addresses/:id?user_id=xxx ──────────────────────────────────────
// Get a single address (owner only)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id query param is required" });
    }

    const ownership = await verifyOwnership(id, user_id);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: ownership.msg });
    }

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Address not found" });

    res.json(data);
  } catch (error) {
    console.error("❌ Error fetching address:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/addresses ──────────────────────────────────────────────────────
// Create a new address
router.post("/", async (req, res) => {
  try {
    const {
      user_id, label, full_name, phone,
      street, city, province, zip_code, is_default,
    } = req.body;

    // ── Required field validation ────────────────────────────────────────────
    const missing = [];
    if (!user_id)           missing.push("user_id");
    if (!full_name?.trim()) missing.push("full_name");
    if (!phone?.trim())     missing.push("phone");
    if (!street?.trim())    missing.push("street");
    if (!city?.trim())      missing.push("city");
    if (!province?.trim())  missing.push("province");
    if (!zip_code?.trim())  missing.push("zip_code");

    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    }

    // ── PH phone validation ──────────────────────────────────────────────────
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      return res.status(400).json({ error: "Phone number must be exactly 11 digits" });
    }
    if (!digits.startsWith("09")) {
      return res.status(400).json({ error: "Phone number must start with 09" });
    }

    // ── Verify user exists ───────────────────────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ── Check if this is the user's first address (auto-default) ────────────
    const { count } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id);

    const shouldBeDefault = is_default || count === 0;

    // ── If setting as default, clear existing defaults ───────────────────────
    if (shouldBeDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user_id);
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("addresses")
      .insert([{
        user_id,
        label:      label?.trim()    || null,
        full_name:  full_name.trim(),
        phone:      digits,
        street:     street.trim(),
        city:       city.trim(),
        province:   province.trim(),
        zip_code:   zip_code.trim(),
        is_default: shouldBeDefault,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Address created:", data.id);
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error creating address:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT /api/addresses/:id ───────────────────────────────────────────────────
// Update an address (owner only)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id, label, full_name, phone,
      street, city, province, zip_code, is_default,
    } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const ownership = await verifyOwnership(id, user_id);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: ownership.msg });
    }

    // ── Phone validation if provided ─────────────────────────────────────────
    let cleanPhone;
    if (phone) {
      cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 11) {
        return res.status(400).json({ error: "Phone number must be exactly 11 digits" });
      }
      if (!cleanPhone.startsWith("09")) {
        return res.status(400).json({ error: "Phone number must start with 09" });
      }
    }

    // ── Clear other defaults if this becomes default ──────────────────────────
    if (is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user_id)
        .neq("id", id);
    }

    const updateFields = { updated_at: new Date().toISOString() };
    if (label      !== undefined) updateFields.label      = label?.trim() || null;
    if (full_name  !== undefined) updateFields.full_name  = full_name.trim();
    if (phone      !== undefined) updateFields.phone      = cleanPhone;
    if (street     !== undefined) updateFields.street     = street.trim();
    if (city       !== undefined) updateFields.city       = city.trim();
    if (province   !== undefined) updateFields.province   = province.trim();
    if (zip_code   !== undefined) updateFields.zip_code   = zip_code.trim();
    if (is_default !== undefined) updateFields.is_default = is_default;

    const { data, error } = await supabase
      .from("addresses")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Address updated:", id);
    res.json(data);
  } catch (error) {
    console.error("❌ Error updating address:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/addresses/:id/default ────────────────────────────────────────
// Set address as default (owner only)
router.patch("/:id/default", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const ownership = await verifyOwnership(id, user_id);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: ownership.msg });
    }

    // Clear all defaults for this user
    await supabase
      .from("addresses")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", user_id);

    // Set new default
    const { data, error } = await supabase
      .from("addresses")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Default address set:", id);
    res.json(data);
  } catch (error) {
    console.error("❌ Error setting default address:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/addresses/:id ────────────────────────────────────────────────
// Delete an address (owner only)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const ownership = await verifyOwnership(id, user_id);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: ownership.msg });
    }

    // Check if this was the default before deleting
    const { data: addr } = await supabase
      .from("addresses")
      .select("is_default")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // If deleted address was default, promote the most recent remaining one
    if (addr?.is_default) {
      const { data: remaining } = await supabase
        .from("addresses")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining?.length > 0) {
        await supabase
          .from("addresses")
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq("id", remaining[0].id);
      }
    }

    console.log("✅ Address deleted:", id);
    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting address:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;