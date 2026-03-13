import express from "express";
import multer from "multer";
import { supabase } from "../server.js";

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
// 📦 IMAGE UPLOAD HELPER
// ─────────────────────────────────────────────────────────────
const uploadImageToSupabase = async (file, productId) => {
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${productId || 'temp'}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: '3600' });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
};

// ─────────────────────────────────────────────────────────────
// 🤖 AUTO-APPROVAL ENGINE
// ─────────────────────────────────────────────────────────────
const runAutoApproval = async ({ category, price, brand }) => {
  if (!category) {
    return { status: 'pending', reason: 'No category provided — manual review required.' };
  }

  const { data: rule, error } = await supabase
    .from('category_rules')
    .select('*')
    .ilike('category', category.trim())
    .maybeSingle();

  if (error) {
    console.error('❌ Error fetching category rule:', error);
    return { status: 'pending', reason: 'Could not fetch category rules — manual review required.' };
  }

  if (!rule) {
    console.log(`ℹ️ No rule for "${category}" — auto-approving.`);
    return { status: 'approved', reason: null };
  }

  if (rule.min_price !== null && price < rule.min_price) {
    return {
      status: 'rejected',
      reason: `Price ₱${price} is below the minimum of ₱${rule.min_price} for category "${category}".`
    };
  }
  if (rule.max_price !== null && price > rule.max_price) {
    return {
      status: 'rejected',
      reason: `Price ₱${price} exceeds the maximum of ₱${rule.max_price} for category "${category}".`
    };
  }

  if (rule.allowed_materials && rule.allowed_materials.length > 0 && brand) {
    const normalizedBrand = brand.trim().toLowerCase();
    const allowed = rule.allowed_materials.map(m => m.toLowerCase());
    const isAllowed = allowed.some(m => normalizedBrand.includes(m));

    if (!isAllowed) {
      return {
        status: 'rejected',
        reason: `Brand/material "${brand}" is not allowed for category "${category}". Allowed: ${rule.allowed_materials.join(', ')}.`
      };
    }
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
      .from('category_rules')
      .select('category, min_price, max_price, allowed_materials')
      .order('category', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /  — list products with filters
// ★ UPDATED: store search is STRICT — only shows that store's products
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      category, user_id, seller_id, is_active, is_featured,
      min_price, max_price, search, approval_status, buyer_view,
      limit = 50, offset = 0
    } = req.query;

    // ── Step 1: Check if search term matches any store or seller name ──
    let storeMatchUserIds = [];
    let isStoreSearch = false;

    if (search) {
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .or(`store_name.ilike.%${search}%,full_name.ilike.%${search}%`);

      storeMatchUserIds = matchedUsers?.map(u => u.id) || [];
      // If ANY store/seller matched → treat as a pure store search
      isStoreSearch = storeMatchUserIds.length > 0;
    }

    // ── Step 2: Build main product query ──
    let query = supabase
      .from("product")
      .select(`
        *,
        users:user_id(id,full_name,email,profile_image,store_name),
        approver:approved_by(id,full_name)
      `, { count: 'exact' });

    if (buyer_view === 'true') {
      query = query.eq('approval_status', 'approved').eq('is_active', true);
    }

    if (category)    query = query.eq('category', category);
    if (user_id)     query = query.eq('user_id', user_id);
    if (seller_id)   query = query.eq('user_id', seller_id);
    if (is_active !== undefined && buyer_view !== 'true') query = query.eq('is_active', is_active === 'true');
    if (is_featured !== undefined) query = query.eq('is_featured', is_featured === 'true');
    if (min_price)   query = query.gte('price', min_price);
    if (max_price)   query = query.lte('price', max_price);
    if (approval_status && buyer_view !== 'true') query = query.eq('approval_status', approval_status);

    // ── Step 3: Apply search filter ──────────────────────────────
    if (search) {
      if (isStoreSearch) {
        // ★ Store name matched → ONLY show products from that exact store
        // No mixing with other stores even if their products match the keyword
        query = query.in('user_id', storeMatchUserIds);
      } else {
        // No store matched → search product fields only
        query = query.or([
          `product_name.ilike.%${search}%`,
          `description.ilike.%${search}%`,
          `brand.ilike.%${search}%`,
          `category.ilike.%${search}%`,
        ].join(','));
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ products: data, total: count, limit: parseInt(limit), offset: parseInt(offset) });
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
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Product not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /  — create product
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    console.log('📝 Product creation request received');
    const {
      user_id, product_name, description, price, stock_quantity,
      category, brand, product_image, images, is_active, is_featured,
      discount_percentage, discount_start_date, discount_end_date, shipping_fee, material,
      weight, weight_unit, tags
    } = req.body;

    if (!user_id || !product_name || !price)
      return res.status(400).json({ error: "user_id, product_name, and price are required" });

    const { data: user, error: userError } = await supabase
      .from("users").select("id, role").eq("id", user_id).single();

    if (userError || !user) return res.status(404).json({ error: "User not found" });
    if (user.role !== 'seller' && user.role !== 'admin')
      return res.status(403).json({ error: "Only sellers and admins can create products" });

    if (parseFloat(price) < 0) return res.status(400).json({ error: "Price must be positive" });
    if (stock_quantity < 0)    return res.status(400).json({ error: "Stock quantity cannot be negative" });
    if (shipping_fee !== undefined && shipping_fee < 0)
      return res.status(400).json({ error: "Shipping fee cannot be negative" });
    if (weight !== undefined && parseFloat(weight) < 0)
      return res.status(400).json({ error: "Weight cannot be negative" });

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

      if (approvalStatus === 'approved') {
        approvedAt = new Date().toISOString();
        console.log(`✅ Auto-approved for category "${category}"`);
      } else if (approvalStatus === 'rejected') {
        console.log(`❌ Auto-rejected: ${approvalReason}`);
      } else {
        console.log(`⏳ Pending manual review: ${approvalReason}`);
      }
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
      discount_percentage:  discount_percentage || 0,
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
      .from("product")
      .insert([productData])
      .select(`*, users:user_id(id,full_name,email,store_name)`)
      .single();

    if (error) throw error;

    console.log(`✅ Product created (${approvalStatus}):`, data.product_name);

    res.status(201).json({
      ...data,
      _approval_message:
        approvalStatus === 'approved'
          ? '✅ Your product has been automatically approved and is now live!'
          : approvalStatus === 'rejected'
          ? `❌ Auto-rejected: ${approvalReason}`
          : `⏳ Under review: ${approvalReason}`
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

    const u = {};
    if (product_name      !== undefined) u.product_name      = product_name;
    if (description       !== undefined) u.description       = description;
    if (price             !== undefined) u.price             = parseFloat(price);
    if (stock_quantity    !== undefined) u.stock_quantity    = parseInt(stock_quantity);
    if (category          !== undefined) u.category          = category;
    if (brand             !== undefined) u.brand             = brand;
    if (product_image     !== undefined) u.product_image     = product_image;
    if (images            !== undefined) u.images            = images;
    if (is_active         !== undefined) u.is_active         = is_active;
    if (is_featured       !== undefined) u.is_featured       = is_featured;
    if (material          !== undefined) u.material          = material || null;
    if (discount_percentage  !== undefined) u.discount_percentage  = discount_percentage;
    if (discount_start_date !== undefined) u.discount_start_date = discount_start_date || null;
    if (discount_end_date   !== undefined) u.discount_end_date   = discount_end_date   || null;
    if (tags              !== undefined) u.tags              = tags;
    if (weight            !== undefined) u.weight            = parseFloat(weight);
    if (weight_unit       !== undefined) u.weight_unit       = weight_unit;
    if (shipping_fee !== undefined) {
      if (parseFloat(shipping_fee) < 0) return res.status(400).json({ error: "Shipping fee cannot be negative" });
      u.shipping_fee = parseFloat(shipping_fee);
    }
    u.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("product").update(u).eq("id", id)
      .select(`*, users:user_id(id,full_name,email,store_name)`).single();

    if (error) throw error;
    res.json(data);
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
      .from("product").select("user_id,product_image,images").eq("id", id).single();
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
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /stats/pending
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
// ADMIN: Category Rules CRUD
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
      category:          category.trim(),
      min_price:         min_price !== undefined ? parseFloat(min_price) : null,
      max_price:         max_price !== undefined ? parseFloat(max_price) : null,
      allowed_materials: allowed_materials || [],
      updated_at:        new Date().toISOString()
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

export default router;