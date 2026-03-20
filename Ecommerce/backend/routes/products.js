import express from "express";
import multer from "multer";
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

// ─────────────────────────────────────────────────────────────
// IMAGE UPLOAD HELPER
// ─────────────────────────────────────────────────────────────
const uploadImageToSupabase = async (file, productId) => {
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${productId || 'temp'}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: '3600' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return publicUrl;
};

// ─────────────────────────────────────────────────────────────
// AUTO-APPROVAL ENGINE
// ─────────────────────────────────────────────────────────────
const runAutoApproval = async ({ category, price, brand }) => {
  if (!category) return { status: 'pending', reason: 'No category provided — manual review required.' };

  const { data: rule, error } = await supabase
    .from('category_rules').select('*').ilike('category', category.trim()).maybeSingle();

  if (error) {
    console.error('❌ Error fetching category rule:', error);
    return { status: 'pending', reason: 'Could not fetch category rules — manual review required.' };
  }

  if (!rule) {
    console.log(`ℹ️ No rule for "${category}" — auto-approving.`);
    return { status: 'approved', reason: null };
  }

  if (rule.min_price !== null && price < rule.min_price)
    return { status: 'rejected', reason: `Price ₱${price} is below the minimum of ₱${rule.min_price} for category "${category}".` };

  if (rule.max_price !== null && price > rule.max_price)
    return { status: 'rejected', reason: `Price ₱${price} exceeds the maximum of ₱${rule.max_price} for category "${category}".` };

  if (rule.allowed_materials && rule.allowed_materials.length > 0 && brand) {
    const normalizedBrand = brand.trim().toLowerCase();
    const allowed = rule.allowed_materials.map(m => m.toLowerCase());
    const isAllowed = allowed.some(m => normalizedBrand.includes(m));
    if (!isAllowed)
      return { status: 'rejected', reason: `Brand/material "${brand}" is not allowed for category "${category}". Allowed: ${rule.allowed_materials.join(', ')}.` };
  }

  return { status: 'approved', reason: null };
};

// ─────────────────────────────────────────────────────────────
// POST /upload
// ─────────────────────────────────────────────────────────────
router.post("/upload", upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No image files provided" });
    const imageUrls = await Promise.all(req.files.map(f => uploadImageToSupabase(f)));
    res.json({ imageUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /categories
// ─────────────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('category_rules').select('category, min_price, max_price, allowed_materials')
      .order('category', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /stats/pending — must be before /:id
// ─────────────────────────────────────────────────────────────
router.get("/stats/pending", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("product").select("*", { count:'exact', head:true }).eq('approval_status','pending');
    if (error) throw error;
    res.json({ pending_count: count || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN: Category Rules — must be before /:id
// ─────────────────────────────────────────────────────────────
router.get("/admin/category-rules", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('category_rules').select('*').order('category', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/category-rules", async (req, res) => {
  try {
    const { admin_id, category, min_price, max_price, allowed_materials } = req.body;
    if (!admin_id || !category)
      return res.status(400).json({ error: "admin_id and category are required" });
    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== 'admin')
      return res.status(403).json({ error: "Only admins can manage category rules" });
    const ruleData = {
      category: category.trim(),
      min_price: min_price !== undefined ? parseFloat(min_price) : null,
      max_price: max_price !== undefined ? parseFloat(max_price) : null,
      allowed_materials: allowed_materials || [],
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('category_rules').upsert(ruleData, { onConflict: 'category' }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/admin/category-rules/:category", async (req, res) => {
  try {
    const { admin_id } = req.body;
    const category = decodeURIComponent(req.params.category);
    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== 'admin')
      return res.status(403).json({ error: "Only admins can delete category rules" });
    const { error } = await supabase.from('category_rules').delete().ilike('category', category);
    if (error) throw error;
    res.json({ message: `Rule for "${category}" deleted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DISCOUNT VALIDITY HELPER
// Adds discount_active + effective_price to every product
// ─────────────────────────────────────────────────────────────
const applyDiscountValidity = (product) => {
  const now   = new Date();
  const pct   = parseFloat(product.discount_percentage) || 0;
  const start = product.discount_start_date ? new Date(product.discount_start_date) : null;
  const end   = product.discount_end_date   ? new Date(product.discount_end_date)   : null;
  const discount_active =
    pct > 0 &&
    (!start || start <= now) &&
    (!end   || end   >= now);
  const effective_price = discount_active
    ? parseFloat((product.price - (product.price * pct / 100)).toFixed(2))
    : product.price;
  return { ...product, discount_active, effective_price };
};

// ─────────────────────────────────────────────────────────────
// GET /  — list products with filters
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      category, user_id, seller_id, is_active, is_featured,
      min_price, max_price, search, approval_status, buyer_view,
      limit = 50, offset = 0
    } = req.query;

    let query = supabase
      .from("product")
      .select(`*, users:user_id(id,full_name,email,profile_image,store_name), approver:approved_by(id,full_name)`, { count: 'exact' });

    if (buyer_view === 'true') query = query.eq('approval_status', 'approved').eq('is_active', true);
    if (category)    query = query.eq('category', category);
    if (user_id)     query = query.eq('user_id', user_id);
    if (seller_id)   query = query.eq('user_id', seller_id);
    if (is_active !== undefined && buyer_view !== 'true') query = query.eq('is_active', is_active === 'true');
    if (is_featured !== undefined) query = query.eq('is_featured', is_featured === 'true');
    if (min_price)   query = query.gte('price', min_price);
    if (max_price)   query = query.lte('price', max_price);
    if (approval_status && buyer_view !== 'true') query = query.eq('approval_status', approval_status);
    if (search)      query = query.or(`product_name.ilike.%${search}%,description.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    const products = data.map(applyDiscountValidity);
    res.json({ products, total: count, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /:id  — single product
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("product")
      .select(`*, users:user_id(id,full_name,email,profile_image,phone,store_name)`)
      .eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "Product not found" });
    res.json(applyDiscountValidity(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /  — create product
// ✅ DUPLICATE CHECK: hard block for same seller, soft warn for cross-seller
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    console.log('📝 Product creation request received');
    const {
      user_id, product_name, description, price, stock_quantity,
      category, brand, product_image, images, is_active, is_featured,
      discount_percentage, discount_start_date, discount_end_date,
      shipping_fee, material, weight, weight_unit, tags
    } = req.body;

    if (!user_id || !product_name || !price)
      return res.status(400).json({ error: "user_id, product_name, and price are required" });

    const { data: user, error: userError } = await supabase
      .from("users").select("id, role").eq("id", user_id).single();
    if (userError || !user) return res.status(404).json({ error: "User not found" });
    if (user.role !== 'seller' && user.role !== 'admin')
      return res.status(403).json({ error: "Only sellers and admins can create products" });

    if (parseFloat(price) < 0)    return res.status(400).json({ error: "Price must be positive" });
    if (stock_quantity < 0)        return res.status(400).json({ error: "Stock quantity cannot be negative" });
    if (shipping_fee !== undefined && shipping_fee < 0)
      return res.status(400).json({ error: "Shipping fee cannot be negative" });
    if (weight !== undefined && parseFloat(weight) < 0)
      return res.status(400).json({ error: "Weight cannot be negative" });

    // ── DUPLICATE CHECK ───────────────────────────────────────
    // 1. Hard block: same seller, same product name + category
    const { data: sellerDupe } = await supabase
      .from('product')
      .select('id, product_name, category')
      .eq('user_id', user_id)
      .ilike('product_name', product_name.trim())
      .eq('category', category)
      .maybeSingle();

    if (sellerDupe) {
      return res.status(409).json({
        error: `You already have a product named "${sellerDupe.product_name}" in the "${category}" category. Please use a different name or update your existing product.`,
        duplicate_type: 'seller',
        existing_id:    sellerDupe.id
      });
    }

    // 2. Soft warning: other sellers have the same product name + category
    //    Product still gets created — seller just gets a warning in the response
    const { data: crossSellerDupes } = await supabase
      .from('product')
      .select('id, product_name, users:user_id(store_name, full_name)')
      .ilike('product_name', product_name.trim())
      .eq('category', category)
      .neq('user_id', user_id)
      .eq('approval_status', 'approved')
      .limit(3);

    const similarProducts = crossSellerDupes?.length > 0 ? crossSellerDupes : null;
    // ─────────────────────────────────────────────────────────

    // ── Auto-approval ─────────────────────────────────────────
    let approvalStatus = 'pending';
    let approvalReason = null;
    let approvedBy     = null;
    let approvedAt     = null;

    if (user.role === 'admin') {
      approvalStatus = 'approved';
      approvedBy     = user_id;
      approvedAt     = new Date().toISOString();
      console.log('👑 Admin product — auto-approved.');
    } else {
      const autoResult = await runAutoApproval({ category, price: parseFloat(price), brand });
      approvalStatus = autoResult.status;
      approvalReason = autoResult.reason;
      if (approvalStatus === 'approved') approvedAt = new Date().toISOString();
      console.log(`${approvalStatus === 'approved' ? '✅' : approvalStatus === 'rejected' ? '❌' : '⏳'} Auto-approval: ${approvalStatus}${approvalReason ? ' — ' + approvalReason : ''}`);
    }

    const productData = {
      user_id,
      product_name,
      description:         description || null,
      price:               parseFloat(price),
      stock_quantity:      parseInt(stock_quantity) || 0,
      category:            category || null,
      brand:               brand || null,
      material:            material || null,
      product_image:       product_image || null,
      images:              images || null,
      is_active:           is_active !== undefined ? is_active : true,
      is_featured:         is_featured || false,
      discount_percentage: discount_percentage || 0,
      discount_start_date: discount_start_date || null,
      discount_end_date:   discount_end_date   || null,
      shipping_fee:        parseFloat(shipping_fee) || 50.00,
      weight:              weight ? parseFloat(weight) : null,
      weight_unit:         weight_unit || 'g',
      tags:                tags || null,
      approval_status:     approvalStatus,
      approved_by:         approvedBy,
      approved_at:         approvedAt,
      rejection_reason:    approvalReason,
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("product").insert([productData])
      .select(`*, users:user_id(id,full_name,email,store_name)`).single();
    if (error) throw error;

    console.log(`✅ Product created (${approvalStatus}):`, data.product_name);

    await logActivity({
      userId:   user_id,
      role:     user.role,
      action:   `product_created_${approvalStatus}`,
      category: "product",
      description: `${user.role === "admin" ? "Admin" : "Seller"} created product "${product_name}" (₱${parseFloat(price).toFixed(2)}) — ${approvalStatus}`,
      metadata: {
        product_id:       data.id,
        product_name,
        price,
        category,
        approval_status:  approvalStatus,
        rejection_reason: approvalReason || null,
        similar_products: similarProducts ? similarProducts.map(p => p.id) : null
      },
      req,
    });

    res.status(201).json({
      ...data,
      _approval_message:
        approvalStatus === 'approved'
          ? '✅ Your product has been automatically approved and is now live!'
          : approvalStatus === 'rejected'
          ? `❌ Auto-rejected: ${approvalReason}`
          : `⏳ Under review: ${approvalReason}`,
      // Soft warning: similar products from other sellers (product was still created)
      _similar_products: similarProducts
    });

  } catch (error) {
    console.error('❌ Product creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /:id  — update product
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name, description, price, stock_quantity, category, brand,
      material, product_image, images, is_active, is_featured,
      discount_percentage, discount_start_date, discount_end_date,
      shipping_fee, weight, weight_unit, tags, user_id
    } = req.body;

    const { data: existingProduct } = await supabase
      .from("product").select("user_id").eq("id", id).single();
    if (!existingProduct) return res.status(404).json({ error: "Product not found" });
    if (user_id && existingProduct.user_id !== user_id)
      return res.status(403).json({ error: "You don't have permission to update this product." });

    const { data: fullProduct } = await supabase
      .from("product").select("user_id, category, price, brand, approval_status").eq("id", id).single();

    const effectiveCategory = category  !== undefined ? category  : fullProduct.category;
    const effectivePrice    = price     !== undefined ? parseFloat(price) : fullProduct.price;
    const effectiveBrand    = brand     !== undefined ? brand : (material !== undefined ? material : fullProduct.brand);

    const { data: productOwner } = await supabase
      .from("users").select("role").eq("id", fullProduct.user_id).single();

    const isSellerEdit          = productOwner?.role === 'seller';
    const approvalFieldsChanged = category !== undefined || price !== undefined || brand !== undefined || material !== undefined;

    let approvalUpdates = {};
    if (isSellerEdit && approvalFieldsChanged) {
      const autoResult = await runAutoApproval({
        category: effectiveCategory,
        price:    effectivePrice,
        brand:    effectiveBrand,
      });
      approvalUpdates.approval_status  = autoResult.status;
      approvalUpdates.rejection_reason = autoResult.reason || null;
      approvalUpdates.approved_at      = autoResult.status === 'approved' ? new Date().toISOString() : null;
      approvalUpdates.approved_by      = null;
      console.log(`🔄 Re-approval on edit: ${autoResult.status}${autoResult.reason ? ' — ' + autoResult.reason : ''}`);
    }

    // ── Duplicate name check on update (same seller, different product) ──
    if (product_name && product_name.trim() !== '') {
      const { data: nameDupe } = await supabase
        .from('product')
        .select('id, product_name')
        .eq('user_id', fullProduct.user_id)
        .ilike('product_name', product_name.trim())
        .eq('category', effectiveCategory)
        .neq('id', id)
        .maybeSingle();

      if (nameDupe) {
        return res.status(409).json({
          error: `You already have another product named "${nameDupe.product_name}" in the "${effectiveCategory}" category.`,
          duplicate_type: 'seller',
          existing_id:    nameDupe.id
        });
      }
    }

    const u = {};
    if (product_name     !== undefined) u.product_name     = product_name;
    if (description      !== undefined) u.description      = description;
    if (price            !== undefined) u.price            = parseFloat(price);
    if (stock_quantity   !== undefined) u.stock_quantity   = parseInt(stock_quantity);
    if (category         !== undefined) u.category         = category;
    if (brand            !== undefined) u.brand            = brand;
    if (product_image    !== undefined) u.product_image    = product_image;
    if (images           !== undefined) u.images           = images;
    if (is_active        !== undefined) u.is_active        = is_active;
    if (is_featured      !== undefined) u.is_featured      = is_featured;
    if (material         !== undefined) u.material         = material || null;
    if (discount_percentage  !== undefined) u.discount_percentage  = discount_percentage;
    if (discount_start_date  !== undefined) u.discount_start_date  = discount_start_date || null;
    if (discount_end_date    !== undefined) u.discount_end_date    = discount_end_date   || null;
    if (tags             !== undefined) u.tags             = tags;
    if (weight           !== undefined) u.weight           = parseFloat(weight);
    if (weight_unit      !== undefined) u.weight_unit      = weight_unit;
    if (shipping_fee !== undefined) {
      if (parseFloat(shipping_fee) < 0) return res.status(400).json({ error: "Shipping fee cannot be negative" });
      u.shipping_fee = parseFloat(shipping_fee);
    }

    Object.assign(u, approvalUpdates);
    u.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("product").update(u).eq("id", id)
      .select(`*, users:user_id(id,full_name,email,store_name)`).single();
    if (error) throw error;

    const approvalMsg = approvalUpdates.approval_status === 'approved'
      ? '✅ Your product has been automatically approved and is now live!'
      : approvalUpdates.approval_status === 'rejected'
      ? `❌ Auto-rejected: ${approvalUpdates.rejection_reason}`
      : approvalUpdates.approval_status === 'pending'
      ? `⏳ Under review: ${approvalUpdates.rejection_reason}`
      : null;

    await logActivity({
      userId:   user_id || fullProduct.user_id,
      role:     productOwner?.role || "seller",
      action:   "product_updated",
      category: "product",
      description: `Product "${data.product_name}" updated${approvalUpdates.approval_status ? ` — re-approval: ${approvalUpdates.approval_status}` : ""}`,
      metadata: {
        product_id:      id,
        product_name:    data.product_name,
        approval_status: approvalUpdates.approval_status || data.approval_status
      },
      req,
    });

    res.json({ ...data, _approval_message: approvalMsg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const { data: product } = await supabase
      .from("product").select("user_id,product_name,product_image,images").eq("id", id).single();
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (user_id && product.user_id !== user_id)
      return res.status(403).json({ error: "You don't have permission to delete this product." });

    const { error } = await supabase.from("product").delete().eq("id", id);
    if (error) throw error;

    try {
      const del = [];
      if (product.product_image) del.push(`products/${product.product_image.split('/').pop()}`);
      if (product.images?.length) product.images.forEach(u => del.push(`products/${u.split('/').pop()}`));
      if (del.length) await supabase.storage.from('product-images').remove(del);
    } catch (e) { console.error('Image cleanup error:', e); }

    await logActivity({
      userId:   user_id || null,
      role:     "seller",
      action:   "product_deleted",
      category: "product",
      description: `Product deleted: "${product.product_name || id}"`,
      metadata: { product_id: id },
      req,
    });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /:id/stock
// ─────────────────────────────────────────────────────────────
router.patch("/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;
    if (!quantity || !operation) return res.status(400).json({ error: "quantity and operation are required" });

    const { data: product } = await supabase
      .from("product").select("stock_quantity,sold_count").eq("id", id).single();
    if (!product) return res.status(404).json({ error: "Product not found" });

    let newStock = product.stock_quantity;
    let newSold  = product.sold_count || 0;

    if (operation === 'subtract') {
      newStock -= parseInt(quantity);
      newSold  += parseInt(quantity);
      if (newStock < 0) return res.status(400).json({ error: "Insufficient stock" });
    } else if (operation === 'add') {
      newStock += parseInt(quantity);
    } else {
      return res.status(400).json({ error: "Invalid operation" });
    }

    const { data, error } = await supabase.from("product")
      .update({ stock_quantity: newStock, sold_count: newSold, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /:id/approve  |  PATCH /:id/reject
// ─────────────────────────────────────────────────────────────
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;
    if (!admin_id) return res.status(400).json({ error: "admin_id is required" });

    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: "Only admins can approve products" });

    const { data, error } = await supabase.from("product")
      .update({ approval_status:'approved', approved_by:admin_id, approved_at:new Date().toISOString(), rejection_reason:null, updated_at:new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;

    await logActivity({
      userId:   admin_id, role: "admin", action: "product_approved", category: "product",
      description: `Admin approved product "${data.product_name}"`,
      metadata: { product_id: id, product_name: data.product_name, admin_id },
      req,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, rejection_reason } = req.body;
    if (!admin_id) return res.status(400).json({ error: "admin_id is required" });

    const { data: admin } = await supabase.from("users").select("role").eq("id", admin_id).single();
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: "Only admins can reject products" });

    const { data, error } = await supabase.from("product")
      .update({ approval_status:'rejected', approved_by:admin_id, approved_at:new Date().toISOString(), rejection_reason:rejection_reason||'No reason provided', updated_at:new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;

    await logActivity({
      userId:   admin_id, role: "admin", action: "product_rejected", category: "product",
      description: `Admin rejected product "${data.product_name}" — ${rejection_reason || "No reason"}`,
      metadata: { product_id: id, product_name: data.product_name, rejection_reason: rejection_reason || null },
      req,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;