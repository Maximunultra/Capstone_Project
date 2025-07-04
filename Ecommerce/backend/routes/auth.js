import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

const router = express.Router();

// Enhanced login route with debugging
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("Login attempt for email:", email);

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    console.log("Supabase query result:", { user: user ? "found" : "not found", error });

    if (error) {
      console.log("Supabase error:", error);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user) {
      console.log("No user found for email:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log("User found, checking password...");
    console.log("Stored hash exists:", !!user.password_hash);

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid:", isValidPassword);
    
    if (!isValidPassword) {
      console.log("Invalid password for user:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    console.log("Login successful for:", email);
    res.json({
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Register route (optional)
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role = "buyers" } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Hash password
    const saltRounds = 10;
    let password_hash = await bcrypt.hash(password, saltRounds); // First declaration

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([{ full_name, email, password_hash, role }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: "Email already exists" });
      }
      throw error;
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: data.id, 
        email: data.email, 
        role: data.role 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Return user data (excluding password)
    const { password_hash: _, ...userWithoutPassword } = data; // Exclude password_hash

    res.status(201).json({
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Add this temporary route to your auth.js for testing
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    // Hash the new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log("New hash generated:", password_hash);

    // Update user's password
    const { data, error } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("email", email)
      .select()
      .single();

    if (error) {
      console.log("Update error:", error);
      return res.status(400).json({ error: "Failed to update password" });
    }

    console.log("Password updated for:", email);
    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;