import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";
import crypto from "crypto";

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 3;

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const { data: user, error } = await supabase
      .from("users").select("*").eq("email", email).single();

    if (error || !user)
      return res.status(401).json({ error: "Invalid email or password" });

    // ✅ Blocked — applies to ALL roles (buyer, seller, admin)
    if (user.approval_status === 'blocked') {
      return res.status(403).json({
        error: "Your account has been blocked by an administrator. Please contact support.",
        code: "ACCOUNT_BLOCKED"
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // ✅ Auto-block the account after 3 failed attempts
        await supabase
          .from("users")
          .update({
            approval_status: 'blocked',
            failed_login_attempts: newFailedAttempts,
            failed_login_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        return res.status(403).json({
          error: "Your account has been blocked due to too many failed login attempts. Please contact support.",
          code: "ACCOUNT_BLOCKED",
          auto_blocked: true,
        });
      }

      // ✅ Increment failed attempts counter
      await supabase
        .from("users")
        .update({
          failed_login_attempts: newFailedAttempts,
          failed_login_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;

      return res.status(401).json({
        error: `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before your account is blocked.`,
        attempts_left: attemptsLeft,
      });
    }

    // ✅ Successful login — reset failed attempts counter
    const sessionToken = crypto.randomUUID();

    await supabase
      .from("users")
      .update({
        session_token: sessionToken,
        failed_login_attempts: 0,
        failed_login_at: null,
      })
      .eq("id", user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sessionToken },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    const { password_hash, session_token, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Register ──────────────────────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role = "buyers" } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from("users")
      .insert([{ full_name, email, password_hash, role }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Email already exists" });
      }
      throw error;
    }

    const token = jwt.sign(
      { userId: data.id, email: data.email, role: data.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    const { password_hash: _, ...userWithoutPassword } = data;
    res.status(201).json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const { data, error } = await supabase
      .from("users")
      .update({ password_hash, failed_login_attempts: 0, failed_login_at: null })
      .eq("email", email)
      .select()
      .single();

    if (error) {
      console.log("Update error:", error);
      return res.status(400).json({ error: "Failed to update password" });
    }

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;