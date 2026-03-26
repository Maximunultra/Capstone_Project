import express from "express";
import multer from "multer";
import bcrypt from 'bcrypt';
import { supabase } from "../server.js";
import { logActivity } from "./activityLogger.js";
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hashPassword(password) {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(password, saltRounds);
  console.log('✅ Password hashed successfully');
  return hashed;
}

function validateUsername(username) {
  if (!username) return null;
  if (username.length < 3)    return 'Username must be at least 3 characters';
  if (username.length > 30)   return 'Username must be 30 characters or less';
  if (!/^[a-z0-9_]+$/.test(username))
    return 'Username can only contain lowercase letters, numbers, and underscores';
  return null;
}

function validatePhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length !== 11)     return 'Phone number must be exactly 11 digits';
  if (!digits.startsWith('09')) return 'Phone number must start with 09';
  return null;
}

const uploadImageToSupabase = async (file, userId) => {
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${userId || 'temp'}-${Date.now()}.${fileExt}`;
  const filePath = `profiles/${fileName}`;
  const { error } = await supabase.storage
    .from('user-profile-images')
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: '3600' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('user-profile-images').getPublicUrl(filePath);
  return publicUrl;
};

const VALID_APPROVAL_STATUSES = ['approved', 'blocked'];

// ── Image Upload ──────────────────────────────────────────────────────────────

router.post("/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });
    const imageUrl = await uploadImageToSupabase(req.file);
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Get All Users ─────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.json(data.map(({ password_hash, ...rest }) => rest));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Get Admin User (MUST be before /:id) ─────────────────────────────────────

router.get('/admin', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users').select('id, full_name, email').eq('role', 'admin').single();
    if (error || !data) return res.status(404).json({ error: 'Admin not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create User ───────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const {
      full_name, email, password, role, phone,
      address, birthdate, profile_image,
      proof_document, valid_id_front, valid_id_back, store_name,
      username
    } = req.body;

    if (!full_name || !email || !password || !role)
      return res.status(400).json({ error: "full_name, email, password, and role are required." });
    if (!['buyer', 'seller'].includes(role))
      return res.status(400).json({ error: "Role must be 'buyer' or 'seller'" });
    if (role === 'seller' && !store_name?.trim())
      return res.status(400).json({ error: "Store name is required for sellers" });
    if (phone) {
      const phoneError = validatePhoneNumber(phone);
      if (phoneError) return res.status(400).json({ error: phoneError });
    }
    if (username) {
      const usernameError = validateUsername(String(username).toLowerCase());
      if (usernameError) return res.status(400).json({ error: usernameError });
    
      // ✅ Use .maybeSingle() instead of .single()
      // .single() throws a PostgREST error when no row is found (PGRST116)
      // .maybeSingle() returns null cleanly when no match exists
      const { data: existingUsername, error: uErr } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
    
      if (uErr) throw uErr; // real DB error — surface it
      if (existingUsername) return res.status(409).json({ error: "Username is already taken" });
    }
    if (birthdate) {
      const birth = new Date(birthdate), today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) return res.status(400).json({ error: "Must be at least 18 years old" });
    }
    if (role === 'seller') {
      if (!proof_document) return res.status(400).json({ error: "Barangay certificate is required for sellers" });
      if (!valid_id_front) return res.status(400).json({ error: "Valid ID front is required for sellers" });
      if (!valid_id_back)  return res.status(400).json({ error: "Valid ID back is required for sellers" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Invalid email format" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const { data: existing } = await supabase.from("users").select("email").eq("email", email).single();
    if (existing) return res.status(409).json({ error: "User with this email already exists" });

    const password_hash = await hashPassword(password);
    const { data, error } = await supabase.from("users").insert([{
      full_name,
      username:       username ? username.toLowerCase() : null,
      email,
      password_hash,
      role,
      phone:          phone          || null,
      address:        address        || null,
      birthdate:      birthdate      || null,
      store_name:     role === 'seller' ? (store_name || null) : null,
      profile_image:  profile_image  || null,
      proof_document: proof_document || null,
      valid_id_front: valid_id_front || null,
      valid_id_back:  valid_id_back  || null,
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]).select().single();

    if (error) throw error;
    const { password_hash: _, ...userResponse } = data;

    await logActivity({
      userId:   data.id,
      role:     data.role,
      action:   "user_registered",
      category: "auth",
      description: `New ${role} registered: ${full_name} (${email})`,
      metadata: { user_id: data.id, email, role, store_name: store_name || null },
      req,
    });
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Get Single User ───────────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "User not found" });
    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Update User ───────────────────────────────────────────────────────────────

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 PUT /users/:id called with id:', id);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    const {
      full_name, email, password, role, phone,
      address, birthdate, profile_image,
      proof_document, valid_id_front, valid_id_back, store_name,
      username
    } = req.body;

    const { data: existingUser, error: fetchError } = await supabase
      .from("users").select("id, role").eq("id", id).single();

    console.log('🔍 Existing user lookup:', existingUser, 'Error:', fetchError);

    if (fetchError || !existingUser)
      return res.status(404).json({ error: "User not found" });

    if (phone) {
      const phoneError = validatePhoneNumber(String(phone));
      if (phoneError) return res.status(400).json({ error: phoneError });
    }

    if (username !== undefined && username) {
      const usernameError = validateUsername(String(username).toLowerCase());
      if (usernameError) return res.status(400).json({ error: usernameError });

      const { data: existingUsername, error: uErr } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", id)
        .maybeSingle();

      if (uErr) throw uErr;
      if (existingUsername) return res.status(409).json({ error: "Username is already taken" });
    }

    if (birthdate) {
      const birth = new Date(birthdate), today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) return res.status(400).json({ error: "Must be at least 18 years old" });
    }

    const u = {};
    if (full_name      !== undefined) u.full_name      = full_name      || null;
    if (email          !== undefined) u.email          = email          || null;
    if (username       !== undefined) u.username       = username ? username.toLowerCase() : null;
    if (store_name     !== undefined) u.store_name     = store_name     || null;
    if (phone          !== undefined) u.phone          = phone          || null;
    if (address        !== undefined) u.address        = address        || null;
    if (birthdate      !== undefined) u.birthdate      = birthdate      || null;
    if (profile_image  !== undefined) u.profile_image  = profile_image  || null;
    if (proof_document !== undefined) u.proof_document = proof_document || null;
    if (valid_id_front !== undefined) u.valid_id_front = valid_id_front || null;
    if (valid_id_back  !== undefined) u.valid_id_back  = valid_id_back  || null;

    if (password) { u.password_hash = await hashPassword(password); }

    if (role) {
      if (!['buyer', 'seller'].includes(role))
        return res.status(400).json({ error: "Role must be 'buyer' or 'seller'" });
      u.role = role;
    }

    u.updated_at = new Date().toISOString();
    console.log('💾 Updating user with fields:', JSON.stringify(u, null, 2));

    const { data, error } = await supabase
      .from("users").update(u).eq("id", id).select().single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Update failed — user not found in DB" });

    // ── Activity log ──────────────────────────────────────────────────────────
    const changedFields = Object.keys(u).filter(k => k !== 'updated_at' && k !== 'password_hash');
    const adminId   = req.body.admin_id || req.headers['x-admin-id'] || null;
    const actorId   = adminId || id;
    const actorRole = adminId ? 'admin' : (data.role || 'user');
    const isAdminAction = !!adminId;

    await logActivity({
      userId:   actorId,          // ✅ now reliably the admin's ID when admin acts
      role:     actorRole,
      action:   'user_updated',
      category: 'user',
      description: isAdminAction
        ? `Admin (ID: ${adminId}) updated profile for ${data.full_name} (${data.email})`
        : `${data.full_name} updated their own profile`,
      metadata: {
        updated_user_id:  id,          // the seller being edited
        updated_by:       actorId,     // who made the change
        is_admin_action:  isAdminAction,
        fields_changed:   changedFields,
        password_changed: !!u.password_hash,
        email:            data.email,
      },
      req,
    });
    // ─────────────────────────────────────────────────────────────────────────

    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    console.error('❌ User update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Delete User ───────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user } = await supabase
      .from("users")
      .select("profile_image, proof_document, valid_id_front, valid_id_back, role")
      .eq("id", id).single();

    if (user?.role === 'seller') {
      const { data: products } = await supabase.from("products").select("id").eq("seller_id", id);
      if (products?.length > 0) {
        const productIds = products.map(p => p.id);
        await supabase.from("order_items").delete().in("product_id", productIds);
        await supabase.from("products").delete().eq("seller_id", id);
      }
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    if (user) {
      const toDelete = [user.profile_image, user.proof_document, user.valid_id_front, user.valid_id_back]
        .filter(Boolean).map(url => `profiles/${url.split('/').pop()}`);
      if (toDelete.length) {
        try { await supabase.storage.from('user-profile-images').remove(toDelete); } catch {}
      }
    }

    await logActivity({
      userId:   null,
      role:     "admin",
      action:   "user_deleted",
      category: "user",
      description: `User deleted (ID: ${id}, role: ${user?.role || "unknown"})`,
      metadata: { deleted_user_id: id, role: user?.role },
      req,
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Block / Unblock ───────────────────────────────────────────────────────────

router.patch("/:id/approval", async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!VALID_APPROVAL_STATUSES.includes(approval_status))
      return res.status(400).json({ error: `approval_status must be: ${VALID_APPROVAL_STATUSES.join(', ')}` });

    const { data: user, error: fetchError } = await supabase
      .from("users").select("role, approval_status").eq("id", id).single();
    if (fetchError || !user) return res.status(404).json({ error: "User not found" });

    const { data, error } = await supabase
      .from("users")
      .update({ approval_status, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;

    await logActivity({
      userId:   req.body.admin_id || null,
      role:     "admin",
      action:   approval_status === "blocked" ? "user_blocked" : "user_unblocked",
      category: "user",
      description: `Admin ${approval_status === "blocked" ? "blocked" : "unblocked"} user: ${user.role} (ID: ${id})`,
      metadata: { target_user_id: id, target_role: user.role, approval_status },
      req,
    });
    const { password_hash, ...userResponse } = data;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Change Password ───────────────────────────────────────────────────────────

router.put("/:id/change-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password)
      return res.status(400).json({ error: "current_password and new_password are required" });
    if (new_password.length < 6)
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    if (current_password === new_password)
      return res.status(400).json({ error: "New password must be different from your current password" });

    const { data: user, error: fetchError } = await supabase
      .from("users").select("id, password_hash, role").eq("id", id).single();
    if (fetchError || !user)
      return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: "Current password is incorrect" });

    const new_password_hash = await hashPassword(new_password);
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: new_password_hash, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw updateError;

    await logActivity({
      userId: id, role: user.role,
      action: "password_changed", category: "auth",
      description: `User changed their password`,
      metadata: { user_id: id },
      req,
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;