import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../server.js";
import crypto from "crypto";
import { logActivity } from "./activityLogger.js";

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 3;
const SUSPENSION_MINUTES  = 15;

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email/username and password are required" });

    const identifier = email.trim().toLowerCase();
    const isEmail = identifier.includes('@');

    let user = null;
    let dbError = null;

    if (isEmail) {
      const { data, error } = await supabase.from("users").select("*").eq("email", identifier).single();
      user = data; dbError = error;
    } else {
      const { data, error } = await supabase.from("users").select("*").eq("username", identifier).single();
      user = data; dbError = error;
    }

    if (dbError || !user)
      return res.status(401).json({ error: "Invalid email/username or password" });

    if (user.approval_status === 'blocked') {
      return res.status(403).json({
        error: "Your account has been blocked by an administrator. Please contact support.",
        code: "ACCOUNT_BLOCKED"
      });
    }

    if (user.login_suspended_until) {
      const suspendedUntil = new Date(user.login_suspended_until);
      const now = new Date();
      if (now < suspendedUntil) {
        const msLeft   = suspendedUntil - now;
        const minsLeft = Math.ceil(msLeft / 60000);
        const secsLeft = Math.ceil(msLeft / 1000);
        const displayTime = minsLeft >= 1
          ? `${minsLeft} minute${minsLeft !== 1 ? 's' : ''}`
          : `${secsLeft} second${secsLeft !== 1 ? 's' : ''}`;
        return res.status(403).json({
          error: `Your account is temporarily suspended. Try again in ${displayTime}.`,
          code: "ACCOUNT_SUSPENDED",
          suspended_until: suspendedUntil.toISOString(),
          minutes_left: minsLeft,
          seconds_left: secsLeft,
        });
      }
      await supabase.from("users").update({ login_suspended_until: null, failed_login_attempts: 0, failed_login_at: null }).eq("id", user.id);
      user.login_suspended_until = null;
      user.failed_login_attempts = 0;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const suspendedUntil = new Date(Date.now() + SUSPENSION_MINUTES * 60 * 1000);
        await supabase.from("users").update({ failed_login_attempts: newFailedAttempts, failed_login_at: new Date().toISOString(), login_suspended_until: suspendedUntil.toISOString() }).eq("id", user.id);
        await logActivity({ userId: user.id, role: user.role, action: "login_suspended", category: "auth", description: `Account suspended after ${MAX_FAILED_ATTEMPTS} failed attempts (${user.email})`, metadata: { email: user.email, username: user.username || null, failed_attempts: newFailedAttempts, suspended_until: suspendedUntil.toISOString(), suspension_minutes: SUSPENSION_MINUTES }, req });
        return res.status(403).json({ error: `Too many failed attempts. Your account has been temporarily suspended for ${SUSPENSION_MINUTES} minutes.`, code: "ACCOUNT_SUSPENDED", suspended_until: suspendedUntil.toISOString(), minutes_left: SUSPENSION_MINUTES, seconds_left: SUSPENSION_MINUTES * 60, auto_suspended: true });
      }

      await supabase.from("users").update({ failed_login_attempts: newFailedAttempts, failed_login_at: new Date().toISOString() }).eq("id", user.id);
      await logActivity({ userId: user.id, role: user.role, action: "login_failed", category: "auth", description: `Failed login attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS} for ${user.email}`, metadata: { email: user.email, username: user.username || null, attempt_number: newFailedAttempts, attempts_left: MAX_FAILED_ATTEMPTS - newFailedAttempts }, req });
      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      return res.status(401).json({ error: `Invalid email/username or password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before your account is temporarily suspended.`, attempts_left: attemptsLeft });
    }

    const sessionToken = crypto.randomUUID();
    await supabase.from("users").update({ session_token: sessionToken, failed_login_attempts: 0, failed_login_at: null, login_suspended_until: null }).eq("id", user.id);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, sessionToken }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "24h" });
    const { password_hash, session_token, ...userWithoutPassword } = user;
    await logActivity({ userId: user.id, role: user.role, action: "login_success", category: "auth", description: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} logged in: ${user.email}${user.username ? ` (@${user.username})` : ''}`, metadata: { email: user.email, username: user.username || null }, req });
    res.json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role = "buyers" } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const { data, error } = await supabase.from("users").insert([{ full_name, email, password_hash, role }]).select().single();
    if (error) { if (error.code === '23505') return res.status(400).json({ error: "Email already exists" }); throw error; }
    const token = jwt.sign({ userId: data.id, email: data.email, role: data.role }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "24h" });
    const { password_hash: _, ...userWithoutPassword } = data;
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) { console.error("Register error:", error); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: "Email and new password are required" });
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    const { data, error } = await supabase.from("users").update({ password_hash, failed_login_attempts: 0, failed_login_at: null, login_suspended_until: null }).eq("email", email).select().single();
    if (error) { console.log("Update error:", error); return res.status(400).json({ error: "Failed to update password" }); }
    res.json({ message: "Password updated successfully" });
  } catch (error) { console.error("Password reset error:", error); res.status(500).json({ error: "Internal server error" }); }
});

export default router;