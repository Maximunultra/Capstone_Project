import express from "express";
import multer from "multer";
import { supabase } from "../server.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, productId) => {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${productId || 'temp'}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Upload product images (single or multiple)
router.post("/upload", upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    const uploadPromises = req.files.map(file => uploadImageToSupabase(file));
    const imageUrls = await Promise.all(uploadPromises);
    
    res.json({ imageUrls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all products (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { 
      category, 
      user_id,
      seller_id, // Filter by seller ID
      is_active, 
      is_featured,
      min_price,
      max_price,
      search,
      approval_status,
      limit = 50,
      offset = 0
    } = req.query;

    console.log('🔍 Product query filters:', { 
      category, 
      user_id, 
      seller_id,
      is_active, 
      is_featured,
      approval_status 
    });

    let query = supabase
      .from("product")
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          profile_image
        ),
        approver:approved_by (
          id,
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (category) query = query.eq('category', category);
    if (user_id) query = query.eq('user_id', user_id);
    
    // Filter products by seller
    if (seller_id) {
      console.log('🔒 Filtering products for seller:', seller_id);
      query = query.eq('user_id', seller_id);
    }
    
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (is_featured !== undefined) query = query.eq('is_featured', is_featured === 'true');
    if (min_price) query = query.gte('price', min_price);
    if (max_price) query = query.lte('price', max_price);
    if (approval_status) query = query.eq('approval_status', approval_status);
    if (search) {
      query = query.or(`product_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    
    if (error) throw error;

    console.log(`✅ Fetched ${data.length} products (Total: ${count})`);
    
    res.json({
      products: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("product")
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          profile_image,
          phone
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product
router.post("/", async (req, res) => {
  try {
    console.log('📝 Product creation request received');
    const { 
      user_id,
      product_name,
      description,
      price,
      stock_quantity,
      category,
      brand,
      product_image,
      images,
      is_active,
      is_featured,
      discount_percentage,
      shipping_fee, // ✅ NEW: Accept shipping_fee
      tags
    } = req.body;

    // Validation
    if (!user_id || !product_name || !price) {
      return res.status(400).json({ 
        error: "user_id, product_name, and price are required" 
      });
    }

    // Verify user exists and has seller role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      return res.status(403).json({ 
        error: "Only sellers and admins can create products" 
      });
    }

    // Validate price
    if (price < 0) {
      return res.status(400).json({ error: "Price must be positive" });
    }

    // Validate stock
    if (stock_quantity < 0) {
      return res.status(400).json({ error: "Stock quantity cannot be negative" });
    }

    // ✅ NEW: Validate shipping_fee
    if (shipping_fee !== undefined && shipping_fee < 0) {
      return res.status(400).json({ error: "Shipping fee cannot be negative" });
    }

    // Create product data object
    const productData = {
      user_id,
      product_name,
      description: description || null,
      price: parseFloat(price),
      stock_quantity: parseInt(stock_quantity) || 0,
      category: category || null,
      brand: brand || null,
      product_image: product_image || null,
      images: images || null,
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured || false,
      discount_percentage: discount_percentage || 0,
      shipping_fee: parseFloat(shipping_fee) || 50.00, // ✅ NEW: Include shipping_fee (default 50.00)
      tags: tags || null,
      approval_status: user.role === 'admin' ? 'approved' : 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Creating product in database...');
    const { data, error } = await supabase
      .from("product")
      .insert([productData])
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Product created successfully:', data.product_name);
    res.status(201).json(data);
  } catch (error) {
    console.error('❌ Product creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      product_name,
      description,
      price,
      stock_quantity,
      category,
      brand,
      product_image,
      images,
      is_active,
      is_featured,
      discount_percentage,
      shipping_fee, // ✅ NEW: Accept shipping_fee in updates
      tags,
      user_id // To verify ownership
    } = req.body;

    // Verify product exists
    const { data: existingProduct } = await supabase
      .from("product")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Verify ownership
    if (user_id) {
      if (existingProduct.user_id !== user_id) {
        return res.status(403).json({ 
          error: "You don't have permission to update this product. Only the product owner can edit." 
        });
      }
    }

    const updateFields = {};
    if (product_name !== undefined) updateFields.product_name = product_name;
    if (description !== undefined) updateFields.description = description;
    if (price !== undefined) updateFields.price = parseFloat(price);
    if (stock_quantity !== undefined) updateFields.stock_quantity = parseInt(stock_quantity);
    if (category !== undefined) updateFields.category = category;
    if (brand !== undefined) updateFields.brand = brand;
    if (product_image !== undefined) updateFields.product_image = product_image;
    if (images !== undefined) updateFields.images = images;
    if (is_active !== undefined) updateFields.is_active = is_active;
    if (is_featured !== undefined) updateFields.is_featured = is_featured;
    if (discount_percentage !== undefined) updateFields.discount_percentage = discount_percentage;
    
    // ✅ NEW: Include shipping_fee in updates
    if (shipping_fee !== undefined) {
      if (parseFloat(shipping_fee) < 0) {
        return res.status(400).json({ error: "Shipping fee cannot be negative" });
      }
      updateFields.shipping_fee = parseFloat(shipping_fee);
    }
    
    if (tags !== undefined) updateFields.tags = tags;

    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("product")
      .update(updateFields)
      .eq("id", id)
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    
    console.log('✅ Product updated successfully');
    res.json(data);
  } catch (error) {
    console.error('❌ Product update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Get product details
    const { data: product } = await supabase
      .from("product")
      .select("user_id, product_image, images")
      .eq("id", id)
      .single();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Verify ownership
    if (user_id) {
      if (product.user_id !== user_id) {
        return res.status(403).json({ 
          error: "You don't have permission to delete this product. Only the product owner can delete." 
        });
      }
    }

    // Delete the product
    const { error } = await supabase
      .from("product")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Delete product images from storage
    try {
      const imagesToDelete = [];
      
      if (product.product_image) {
        const imagePath = product.product_image.split('/').pop();
        imagesToDelete.push(`products/${imagePath}`);
      }

      if (product.images && product.images.length > 0) {
        product.images.forEach(imageUrl => {
          const imagePath = imageUrl.split('/').pop();
          imagesToDelete.push(`products/${imagePath}`);
        });
      }

      if (imagesToDelete.length > 0) {
        await supabase.storage
          .from('product-images')
          .remove(imagesToDelete);
      }
    } catch (storageError) {
      console.error('Error deleting product images:', storageError);
    }

    console.log('✅ Product deleted successfully');
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error('❌ Product deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product stock (for order processing)
router.patch("/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (!quantity || !operation) {
      return res.status(400).json({ 
        error: "quantity and operation are required" 
      });
    }

    // Get current stock
    const { data: product } = await supabase
      .from("product")
      .select("stock_quantity, sold_count")
      .eq("id", id)
      .single();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let newStock = product.stock_quantity;
    let newSoldCount = product.sold_count || 0;

    if (operation === 'subtract') {
      newStock -= parseInt(quantity);
      newSoldCount += parseInt(quantity);
      
      if (newStock < 0) {
        return res.status(400).json({ error: "Insufficient stock" });
      }
    } else if (operation === 'add') {
      newStock += parseInt(quantity);
    } else {
      return res.status(400).json({ error: "Invalid operation" });
    }

    const { data, error } = await supabase
      .from("product")
      .update({ 
        stock_quantity: newStock,
        sold_count: newSoldCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('❌ Stock update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve product (Admin only)
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({ error: "admin_id is required" });
    }

    // Verify admin
    const { data: admin } = await supabase
      .from("users")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can approve products" });
    }

    // Update product status
    const { data, error } = await supabase
      .from("product")
      .update({ 
        approval_status: 'approved',
        approved_by: admin_id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Product approved:', id);
    res.json(data);
  } catch (error) {
    console.error('❌ Product approval error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject product (Admin only)
router.patch("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, rejection_reason } = req.body;

    if (!admin_id) {
      return res.status(400).json({ error: "admin_id is required" });
    }

    // Verify admin
    const { data: admin } = await supabase
      .from("users")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can reject products" });
    }

    // Update product status
    const { data, error } = await supabase
      .from("product")
      .update({ 
        approval_status: 'rejected',
        approved_by: admin_id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejection_reason || 'No reason provided',
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log('❌ Product rejected:', id);
    res.json(data);
  } catch (error) {
    console.error('❌ Product rejection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending products count (for admin dashboard)
router.get("/stats/pending", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("product")
      .select("*", { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    if (error) throw error;

    res.json({ pending_count: count || 0 });
  } catch (error) {
    console.error('❌ Error getting pending count:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;