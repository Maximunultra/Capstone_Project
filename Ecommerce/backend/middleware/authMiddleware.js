import jwt from "jsonwebtoken";
import { supabase } from "../server.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    // ✅ Check if session token still matches DB (other device logged in = mismatch)
    const { data: user } = await supabase
      .from("users")
      .select("session_token")
      .eq("id", decoded.userId)
      .single();

    if (!user || user.session_token !== decoded.sessionToken) {
      return res.status(401).json({
        error: "Session expired. Your account was logged in on another device.",
        code: "SESSION_INVALIDATED"
      });
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}