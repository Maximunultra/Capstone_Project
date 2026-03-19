import { supabase } from "../server.js";

export async function logActivity({
  userId, role, action, category, description, metadata = {}, req = null
}) {
  try {
    await supabase.from("activity_logs").insert({
      user_id:     userId     || null,
      role:        role       || null,
      action,
      category,
      description,
      metadata,
      ip_address:  req?.ip    || req?.headers?.["x-forwarded-for"] || null,
      created_at:  new Date().toISOString()
    });
  } catch (e) {
    // Non-fatal — never crash the main request
    console.error("⚠️ Activity log failed:", e.message);
  }
}