import express from "express";
import { supabase } from "../server.js";

const router = express.Router();

// Get all users
// In your users.js file
router.get("/", async (req, res) => {
  console.log("🔍 GET /api/users endpoint hit");
  try {
    const { data, error } = await supabase.from("users").select("*");
    console.log("📊 Query result:", { data, error, count: data?.length });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Create a new user
router.post("/", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: "full_name, email, password, and role are required." });
    }
    const { data, error } = await supabase
      .from("users")
      .insert([{ full_name, email, password, role }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role } = req.body;
    const updateFields = {};
    if (full_name) updateFields.full_name = full_name;
    if (email) updateFields.email = email;
    if (password) updateFields.password = password;
    if (role) updateFields.role = role;

    const { data, error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);
    if (error) throw error;
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
