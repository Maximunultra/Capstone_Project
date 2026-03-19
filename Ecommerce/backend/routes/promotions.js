import express from 'express';
import { supabase } from "../server.js";
import { logActivity } from "./activityLogger.js";

const router = express.Router();

// ============================================
// 1. CREATE PROMOTION (Seller)
// POST /api/promotions
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      product_id,
      promotion_type,
      promotion_title,
      promotion_description,
      start_date,
      end_date,
      banner_image,
      target_audience
    } = req.body;

    if (!user_id || !product_id || !promotion_title || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Check: seller can only have 1 active promotion at a time
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from('promotions')
      .select('id, promotion_title, end_date')
      .eq('user_id', user_id)
      .eq('status', 'approved')
      .gte('end_date', now)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `You already have an active promotion "${existing.promotion_title}" running until ${new Date(existing.end_date).toLocaleDateString()}. Please wait for it to expire before creating a new one.`
      });
    }

    // Check product belongs to seller
    const { data: product, error: productError } = await supabase
      .from('product')
      .select('id, product_name, user_id')
      .eq('id', product_id)
      .eq('user_id', user_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ success: false, message: 'Product not found or you do not own this product' });
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert([{
        user_id,
        product_id,
        promotion_type:        promotion_type || 'banner',
        promotion_title,
        promotion_description: promotion_description || '',
        start_date,
        end_date,
        banner_image:          banner_image || null,
        target_audience:       target_audience || 'all',
        status:                'approved',
        approved_at:           new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // ── Log: promotion created ────────────────────────────────────────────────
    await logActivity({
      userId:   user_id,
      role:     'seller',
      action:   'promotion_created',
      category: 'promotion',
      description: `Seller created promotion "${promotion_title}" for product "${product.product_name}" (${new Date(start_date).toLocaleDateString()} → ${new Date(end_date).toLocaleDateString()})`,
      metadata: {
        promotion_id:    data.id,
        promotion_title,
        product_id,
        product_name:    product.product_name,
        start_date,
        end_date,
        promotion_type:  promotion_type || 'banner',
      },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Promotion submitted and activated successfully',
      promotion: data
    });

  } catch (error) {
    console.error('❌ Error creating promotion:', error);
    res.status(500).json({ success: false, message: 'Failed to create promotion', error: error.message });
  }
});

// ============================================
// 2. GET ALL PROMOTIONS (Admin/Seller)
// GET /api/promotions?status=approved&user_id=xxx
// ============================================
router.get('/', async (req, res) => {
  try {
    const { status, user_id } = req.query;

    let query = supabase
      .from('promotions')
      .select(`
        *,
        products:product_id (id, product_name, price, category, product_image),
        users:user_id (id, full_name, email)
      `);

    if (status && status !== 'all') query = query.eq('status', status);
    if (user_id) query = query.eq('user_id', user_id);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, promotions: data, total: data.length });
  } catch (error) {
    console.error('❌ Error fetching promotions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotions', error: error.message });
  }
});

// ============================================
// 3. GET ACTIVE PROMOTIONS (Public - For Buyers)
// GET /api/promotions/active
// ============================================
router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        products:product_id (
          id, product_name, price, category,
          product_image, stock_quantity, is_active
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const activePromotions = data.filter(p => {
      const start = new Date(p.start_date);
      const end   = new Date(p.end_date);
      return start <= now && end >= now && p.products?.is_active !== false;
    });

    console.log(`✅ Found ${activePromotions.length} active promotions`);
    res.json({ success: true, promotions: activePromotions });
  } catch (error) {
    console.error('❌ Error fetching active promotions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active promotions', error: error.message });
  }
});

// ============================================
// 4. DEBUG ROUTE — remove in production
// GET /api/promotions/debug
// ============================================
router.get('/debug', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data: all, error } = await supabase
      .from('promotions')
      .select('id, promotion_title, status, start_date, end_date')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const debug = all.map(p => ({
      id:                  p.id,
      title:               p.promotion_title,
      status:              p.status,
      start_date:          p.start_date,
      end_date:            p.end_date,
      now,
      status_is_approved:  p.status === 'approved',
      start_date_passed:   new Date(p.start_date) <= new Date(now),
      end_date_not_passed: new Date(p.end_date) >= new Date(now),
      would_show: p.status === 'approved'
        && new Date(p.start_date) <= new Date(now)
        && new Date(p.end_date) >= new Date(now),
    }));

    res.json({ now, total: all.length, debug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 5. DEACTIVATE PROMOTION (Admin Only)
// PATCH /api/promotions/:id/deactivate
// ============================================
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const { data: admin } = await supabase.from('users').select('role, full_name').eq('id', admin_id).single();
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only admins can deactivate promotions' });
    }

    const { data: promo } = await supabase
      .from('promotions')
      .select('promotion_title, user_id')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('promotions')
      .update({ status: 'expired' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Promotion not found' });

    // ── Log: admin deactivated promotion ─────────────────────────────────────
    await logActivity({
      userId:   admin_id,
      role:     'admin',
      action:   'promotion_deactivated',
      category: 'promotion',
      description: `Admin ${admin.full_name} deactivated promotion "${promo?.promotion_title}"`,
      metadata: {
        promotion_id:    id,
        promotion_title: promo?.promotion_title,
        seller_id:       promo?.user_id,
        deactivated_by:  admin_id,
      },
      req,
    });

    res.json({ success: true, message: 'Promotion deactivated', promotion: data });
  } catch (error) {
    console.error('❌ Error deactivating promotion:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate promotion', error: error.message });
  }
});

export default router;