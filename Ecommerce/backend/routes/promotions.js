// ============================================
// FILE: routes/promotions.js
// Complete Backend API for Promotion System
// ============================================

import express from 'express';
import { supabase } from "../server.js";

const router = express.Router();

// ============================================
// 1. CREATE PROMOTION REQUEST (Seller)
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
      discount_percentage,
      commission_increase,
      start_date,
      end_date,
      banner_image,
      target_audience
    } = req.body;

    console.log('📥 Received promotion request:', req.body);

    // Validation
    if (!user_id || !product_id || !promotion_title || !commission_increase || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if product exists and belongs to user
    const { data: product, error: productError } = await supabase
      .from('product')
      .select('*')
      .eq('id', product_id)
      .eq('user_id', user_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not own this product'
      });
    }

    // Insert promotion
    const { data, error } = await supabase
      .from('promotions')
      .insert([{
        user_id,
        product_id,
        promotion_type: promotion_type || 'discount',
        promotion_title,
        promotion_description: promotion_description || '',
        discount_percentage: discount_percentage || 0,
        commission_increase,
        start_date,
        end_date,
        banner_image: banner_image || null,
        target_audience: target_audience || 'all',
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating promotion:', error);
      throw error;
    }

    console.log('✅ Promotion created:', data);

    res.status(201).json({
      success: true,
      message: 'Promotion request submitted successfully',
      promotion: data
    });

  } catch (error) {
    console.error('❌ Error creating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promotion',
      error: error.message
    });
  }
});

// ============================================
// 2. GET ALL PROMOTIONS (Admin/Seller)
// GET /api/promotions?status=pending&user_id=xxx
// ============================================
router.get('/', async (req, res) => {
  try {
    const { status, user_id } = req.query;
    
    console.log('📥 Fetching promotions with filters:', { status, user_id });

    let query = supabase
      .from('promotions')
      .select(`
        *,
        products:product_id (
          id,
          product_name,
          price,
          category,
          product_image
        ),
        users:user_id (
          id,
          full_name,
          email
        )
      `);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    console.log(`✅ Found ${data.length} promotions`);

    res.json({
      success: true,
      promotions: data,
      total: data.length
    });

  } catch (error) {
    console.error('❌ Error fetching promotions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions',
      error: error.message
    });
  }
});

// ============================================
// 3. GET ACTIVE PROMOTIONS (Public - For Buyers)
// GET /api/promotions/active
// ============================================
router.get('/active', async (req, res) => {
  try {
    console.log('📥 Fetching active promotions');
    console.log('🕐 Current time:', new Date().toISOString());

    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        products:product_id (
          id,
          product_name,
          price,
          category,
          product_image,
          stock_quantity,
          is_active
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`📊 Total approved promotions: ${data.length}`);

    // Filter by date in JavaScript (more reliable)
    const now = new Date();
    const activePromotions = data.filter(promo => {
      const startDate = new Date(promo.start_date);
      const endDate = new Date(promo.end_date);
      const isActive = startDate <= now && endDate >= now;
      
      console.log(`Promo "${promo.promotion_title}":`, {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        now: now.toISOString(),
        isActive
      });
      
      return isActive && promo.products?.is_active !== false;
    });

    console.log(`✅ Found ${activePromotions.length} active promotions`);

    res.json({
      success: true,
      promotions: activePromotions
    });

  } catch (error) {
    console.error('❌ Error fetching active promotions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active promotions',
      error: error.message
    });
  }
});

// ============================================
// 4. APPROVE PROMOTION (Admin Only)
// PATCH /api/promotions/:id/approve
// ============================================
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    console.log(`📥 Approving promotion ${id} by admin ${admin_id}`);

    // Verify admin role
    const { data: admin } = await supabase
      .from('users')
      .select('role')
      .eq('id', admin_id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only admins can approve promotions'
      });
    }

    // Check if promotion exists
    const { data: promotion } = await supabase
      .from('promotions')
      .select('start_date, end_date')
      .eq('id', id)
      .single();

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    // Determine if promotion should be active or just approved
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);
    
    const newStatus = (now >= startDate && now <= endDate) ? 'active' : 'approved';

    // Update promotion
    const { data, error } = await supabase
      .from('promotions')
      .update({ 
        status: newStatus,
        approved_by: admin_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Promotion ${id} approved with status: ${newStatus}`);

    res.json({
      success: true,
      message: `Promotion ${newStatus === 'active' ? 'approved and activated' : 'approved'} successfully`,
      promotion: data
    });

  } catch (error) {
    console.error('❌ Error approving promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve promotion',
      error: error.message
    });
  }
});

// ============================================
// 5. REJECT PROMOTION (Admin Only)
// PATCH /api/promotions/:id/reject
// ============================================
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, rejection_reason } = req.body;

    console.log(`📥 Rejecting promotion ${id} by admin ${admin_id}`);

    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Verify admin role
    const { data: admin } = await supabase
      .from('users')
      .select('role')
      .eq('id', admin_id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only admins can reject promotions'
      });
    }

    const { data, error } = await supabase
      .from('promotions')
      .update({ 
        status: 'rejected',
        rejection_reason,
        approved_by: admin_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    console.log(`✅ Promotion ${id} rejected`);

    res.json({
      success: true,
      message: 'Promotion rejected',
      promotion: data
    });

  } catch (error) {
    console.error('❌ Error rejecting promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject promotion',
      error: error.message
    });
  }
});

// ============================================
// 6. DEACTIVATE PROMOTION (Admin Only)
// PATCH /api/promotions/:id/deactivate
// ============================================
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    console.log(`📥 Deactivating promotion ${id} by admin ${admin_id}`);

    // Verify admin role
    const { data: admin } = await supabase
      .from('users')
      .select('role')
      .eq('id', admin_id)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only admins can deactivate promotions'
      });
    }

    const { data, error } = await supabase
      .from('promotions')
      .update({ status: 'expired' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    console.log(`✅ Promotion ${id} deactivated`);

    res.json({
      success: true,
      message: 'Promotion deactivated',
      promotion: data
    });

  } catch (error) {
    console.error('❌ Error deactivating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate promotion',
      error: error.message
    });
  }
});

export default router;