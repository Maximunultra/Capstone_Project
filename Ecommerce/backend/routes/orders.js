import express from "express";
import { supabase } from "../server.js";
import crypto from "crypto";
import { logActivity } from "./activityLogger.js";
const router = express.Router();


const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// ✅ FIX: Read key lazily — top-level const runs before dotenv.config()
// so process.env.MESSAGE_ENCRYPTION_KEY was always undefined at startup.
function getEncryptionKey() {
  const keyHex = process.env.MESSAGE_ENCRYPTION_KEY;
  // console.log('🔑 Encryption key loaded for orders:', !!keyHex);
  if (!keyHex) throw new Error('MESSAGE_ENCRYPTION_KEY is not set in environment variables');
  return Buffer.from(keyHex, 'hex');
}

function encrypt(text) {
  if (!text) return null;
  try {
    const key = getEncryptionKey();          // ← read here, not at module load
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) { console.error('❌ Encryption error:', error); throw new Error('Failed to encrypt data'); }
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const key = getEncryptionKey();          // ← read here, not at module load
    const parts = encryptedText.split(':');
    if (parts.length !== 3) { console.warn('⚠️ Invalid encrypted format'); return encryptedText; }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) { console.error('❌ Decryption error:', error); return '[Encrypted Data]'; }
}

function encryptShippingInfo(s) {
  return {
    fullName: encrypt(s.fullName), email: encrypt(s.email), phone: encrypt(s.phone),
    address: encrypt(s.address), city: encrypt(s.city), province: encrypt(s.province),
    postalCode: s.postalCode ? encrypt(s.postalCode) : null
  };
}

function decryptShippingInfo(order) {
  if (!order) return null;
  return {
    ...order,
    shipping_full_name:   decrypt(order.shipping_full_name),
    shipping_email:       decrypt(order.shipping_email),
    shipping_phone:       decrypt(order.shipping_phone),
    shipping_address:     decrypt(order.shipping_address),
    shipping_city:        decrypt(order.shipping_city),
    shipping_province:    decrypt(order.shipping_province),
    shipping_postal_code: order.shipping_postal_code ? decrypt(order.shipping_postal_code) : null
  };
}

function decryptOrders(orders) {
  if (!orders || orders.length === 0) return orders;
  return orders.map(order => decryptShippingInfo(order));
}

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// ✅ All IDs are UUIDs — prefer product.id, fallback to product_id
const getProductId = (item) => item.product?.id || item.product_id;

// ================================================================
// FIX: Expire stale reservations — runs every 5 minutes as a safety
// net for users who abandon the payment gateway without the
// beforeunload event firing (mobile kills, browser crashes, etc.)
// ================================================================

async function expireStaleReservations() {
  try {
    const { data: expired, error } = await supabase
      .from('stock_reservations')
      .select('*, stock_reservation_items(*)')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (error) { console.error('❌ expireStaleReservations fetch error:', error); return; }
    if (!expired?.length) return;

    console.log(`⏰ Expiring ${expired.length} stale reservation(s)...`);

    for (const reservation of expired) {
      for (const item of reservation.stock_reservation_items) {
        const { data: cur } = await supabase
          .from('product')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (cur) {
          await supabase
            .from('product')
            .update({
              stock_quantity: cur.stock_quantity + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id);

          console.log(`↩️ Restored ${item.quantity}x product ${item.product_id} from expired reservation ${reservation.id}`);
        }
      }

      await supabase
        .from('stock_reservations')
        .update({ status: 'expired' })
        .eq('id', reservation.id);

      console.log(`✅ Reservation ${reservation.id} marked as expired`);
    }
  } catch (err) {
    console.error('❌ expireStaleReservations error:', err);
  }
}

// Run immediately on startup (clears any reservations that expired while
// the server was down), then every 5 minutes thereafter.
expireStaleReservations();
setInterval(expireStaleReservations, 5 * 60 * 1000);

// ================================================================
// Analytics
// ================================================================

async function updateAnalyticsOnDelivery(order) {
  try {
    const orderDate = new Date(order.order_date);
    const year = orderDate.getFullYear(), month = orderDate.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2,'0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (!orderItems?.length) return;
    const totalItems = orderItems.reduce((s, i) => s + i.quantity, 0);
    const orderRevenue = parseFloat(order.total_amount || 0);
    const { data: existing } = await supabase.from('analytics_monthly_summary').select('*').eq('year', year).eq('month', month).maybeSingle();
    if (existing) {
      await supabase.from('analytics_monthly_summary').update({ total_revenue: parseFloat(existing.total_revenue||0)+orderRevenue, total_orders:(existing.total_orders||0)+1, total_customers:(existing.total_customers||0)+1, total_items_sold:(existing.total_items_sold||0)+totalItems, updated_at:new Date().toISOString() }).eq('year',year).eq('month',month);
    } else {
      await supabase.from('analytics_monthly_summary').insert({ year,month,period_type:'monthly',period_start:periodStart,period_end:periodEnd,total_revenue:orderRevenue,total_orders:1,total_customers:1,total_items_sold:totalItems,revenue_growth_percentage:0,top_category:null });
    }
    const catMap = {};
    orderItems.forEach(item => {
      const cat = item.product_category||'Uncategorized';
      if (!catMap[cat]) catMap[cat]={revenue:0,items:0};
      catMap[cat].revenue += (item.quantity||0)*parseFloat(item.unit_price||0);
      catMap[cat].items   += item.quantity||0;
    });
    for (const [cat,stats] of Object.entries(catMap)) {
      const { data: ex } = await supabase.from('analytics_category').select('*').eq('category',cat).eq('period_type','monthly').eq('period_start',periodStart).maybeSingle();
      if (ex) await supabase.from('analytics_category').update({total_revenue:parseFloat(ex.total_revenue||0)+stats.revenue,total_orders:(ex.total_orders||0)+1,items_sold:(ex.items_sold||0)+stats.items,updated_at:new Date().toISOString()}).eq('category',cat).eq('period_type','monthly').eq('period_start',periodStart);
      else await supabase.from('analytics_category').insert({category:cat,period_type:'monthly',period_start:periodStart,period_end:periodEnd,total_revenue:stats.revenue,total_orders:1,items_sold:stats.items,revenue_percentage:0});
    }
    for (const item of orderItems) {
      const rev = (item.quantity||0)*parseFloat(item.unit_price||0);
      const { data: ex } = await supabase.from('analytics_product').select('*').eq('product_id',item.product_id).eq('period_type','monthly').eq('period_start',periodStart).maybeSingle();
      if (ex) await supabase.from('analytics_product').update({units_sold:(ex.units_sold||0)+item.quantity,total_revenue:parseFloat(ex.total_revenue||0)+rev,total_orders:(ex.total_orders||0)+1,updated_at:new Date().toISOString()}).eq('product_id',item.product_id).eq('period_type','monthly').eq('period_start',periodStart);
      else await supabase.from('analytics_product').insert({product_id:item.product_id,product_name:item.product_name,period_type:'monthly',period_start:periodStart,period_end:periodEnd,units_sold:item.quantity,total_revenue:rev,total_orders:1,average_price:parseFloat(item.unit_price||0)});
    }
    console.log('✅ Analytics updated');
  } catch (error) { console.error('❌ Analytics error:', error); }
}

async function reverseAnalyticsOnCancellation(order) {
  try {
    const orderDate = new Date(order.order_date);
    const year = orderDate.getFullYear(), month = orderDate.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2,'0')}-01`;
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (!orderItems?.length) return;
    const totalItems = orderItems.reduce((s,i)=>s+i.quantity,0);
    const orderRevenue = parseFloat(order.total_amount||0);
    const { data: ms } = await supabase.from('analytics_monthly_summary').select('*').eq('year',year).eq('month',month).maybeSingle();
    if (ms) await supabase.from('analytics_monthly_summary').update({total_revenue:Math.max(0,parseFloat(ms.total_revenue||0)-orderRevenue),total_orders:Math.max(0,(ms.total_orders||0)-1),total_customers:Math.max(0,(ms.total_customers||0)-1),total_items_sold:Math.max(0,(ms.total_items_sold||0)-totalItems),updated_at:new Date().toISOString()}).eq('year',year).eq('month',month);
    const catMap={};
    orderItems.forEach(item=>{const cat=item.product_category||'Uncategorized';if(!catMap[cat])catMap[cat]={revenue:0,items:0};catMap[cat].revenue+=(item.quantity||0)*parseFloat(item.unit_price||0);catMap[cat].items+=item.quantity||0;});
    for(const[cat,stats]of Object.entries(catMap)){const{data:ex}=await supabase.from('analytics_category').select('*').eq('category',cat).eq('period_type','monthly').eq('period_start',periodStart).maybeSingle();if(ex)await supabase.from('analytics_category').update({total_revenue:Math.max(0,parseFloat(ex.total_revenue||0)-stats.revenue),total_orders:Math.max(0,(ex.total_orders||0)-1),items_sold:Math.max(0,(ex.items_sold||0)-stats.items),updated_at:new Date().toISOString()}).eq('category',cat).eq('period_type','monthly').eq('period_start',periodStart);}
    for(const item of orderItems){const rev=(item.quantity||0)*parseFloat(item.unit_price||0);const{data:ex}=await supabase.from('analytics_product').select('*').eq('product_id',item.product_id).eq('period_type','monthly').eq('period_start',periodStart).maybeSingle();if(ex)await supabase.from('analytics_product').update({units_sold:Math.max(0,(ex.units_sold||0)-item.quantity),total_revenue:Math.max(0,parseFloat(ex.total_revenue||0)-rev),total_orders:Math.max(0,(ex.total_orders||0)-1),updated_at:new Date().toISOString()}).eq('product_id',item.product_id).eq('period_type','monthly').eq('period_start',periodStart);}
    console.log('✅ Analytics reversed');
  } catch (error) { console.error('❌ Reverse analytics error:', error); }
}

// ================================================================
// Suspension
// ================================================================

const CANCELLATION_LIMIT=2, CANCELLATION_WINDOW=2, SUSPENSION_DAYS=2;

async function trackCancellation(userId) {
  try {
    const { data: user } = await supabase.from('users').select('cancellation_count,cancellation_window_start,checkout_suspended_until').eq('id',userId).single();
    if (!user) return;
    const now=new Date(),windowStart=user.cancellation_window_start?new Date(user.cancellation_window_start):null;
    const windowExpired=!windowStart||(now-windowStart)>CANCELLATION_WINDOW*24*60*60*1000;
    let newCount=windowExpired?1:(user.cancellation_count||0)+1;
    let newWindowStart=windowExpired?now.toISOString():user.cancellation_window_start;
    const updates={cancellation_count:newCount,cancellation_window_start:newWindowStart};
    if(newCount>=CANCELLATION_LIMIT){const suspendUntil=new Date(now.getTime()+SUSPENSION_DAYS*24*60*60*1000);updates.checkout_suspended_until=suspendUntil.toISOString();updates.cancellation_count=0;updates.cancellation_window_start=null;console.log(`🚫 Buyer ${userId} suspended until ${suspendUntil.toISOString()}`);}
    await supabase.from('users').update(updates).eq('id',userId);
  } catch(err){console.error('⚠️ trackCancellation failed:',err.message);}
}

// ================================================================
// GET All Orders
// ================================================================

router.get("/", async (req, res) => {
  try {
    const { status, seller_id, limit=50, offset=0, sort='desc' } = req.query;
    let query = supabase.from("orders").select(`*, order_items (*, product:product_id (id, product_name, product_image, category, brand, user_id))`).order("order_date",{ascending:sort==='asc'});
    if (status && status !== 'all') query = query.eq("order_status", status);
    query = query.range(parseInt(offset), parseInt(offset)+parseInt(limit)-1);
    const { data, error } = await query;
    if (error) throw error;
    let filteredOrders = data;
    if (seller_id) filteredOrders = data.filter(o=>o.order_items&&o.order_items.some(i=>i.product&&i.product.user_id===seller_id));
    res.json({ success:true, orders:decryptOrders(filteredOrders), total:filteredOrders.length });
  } catch (error) { console.error("❌ Error fetching orders:", error); res.status(500).json({ success:false, error:error.message }); }
});

// ================================================================
// Dashboard Stats
// ================================================================

router.get("/stats/dashboard", async (req, res) => {
  try {
    const { data: allOrders, error } = await supabase.from("orders").select("order_status, total_amount, payment_status, order_date");
    if (error) throw error;
    const today=new Date(), thisMonth=new Date(today.getFullYear(),today.getMonth(),1), lastMonth=new Date(today.getFullYear(),today.getMonth()-1,1);
    res.json({ success:true, stats:{
      total_orders:allOrders.length,
      total_revenue:allOrders.reduce((s,o)=>s+parseFloat(o.total_amount),0).toFixed(2),
      this_month_orders:allOrders.filter(o=>new Date(o.order_date)>=thisMonth).length,
      this_month_revenue:allOrders.filter(o=>new Date(o.order_date)>=thisMonth).reduce((s,o)=>s+parseFloat(o.total_amount),0).toFixed(2),
      last_month_orders:allOrders.filter(o=>{const d=new Date(o.order_date);return d>=lastMonth&&d<thisMonth;}).length,
      pending:allOrders.filter(o=>o.order_status==='pending').length,
      processing:allOrders.filter(o=>o.order_status==='processing').length,
      shipped:allOrders.filter(o=>o.order_status==='shipped').length,
      delivered:allOrders.filter(o=>o.order_status==='delivered').length,
      cancelled:allOrders.filter(o=>o.order_status==='cancelled').length,
      paid:allOrders.filter(o=>o.payment_status==='paid').length,
      pending_payment:allOrders.filter(o=>o.payment_status==='pending').length
    }});
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

// ================================================================
// POST /reserve-stock  ← MUST be before /:orderId wildcard
// ✅ All IDs are UUIDs — no parseInt needed
// ================================================================

router.post("/reserve-stock", async (req, res) => {
  try {
    const { cart_items, user_id } = req.body;
    if (!cart_items?.length || !user_id)
      return res.status(400).json({ success:false, error:"cart_items and user_id are required" });

    const stockErrors=[], reservedItems=[];

    for (const item of cart_items) {
      const productId = getProductId(item);  // ✅ UUID string
      if (!productId) { stockErrors.push(`Missing product ID for "${item.product?.product_name||'unknown'}"`); continue; }

      const { data: product, error: fetchErr } = await supabase.from('product').select('id,product_name,stock_quantity,is_active').eq('id', productId).single();
      if (fetchErr || !product) { stockErrors.push(`Product not found: "${item.product?.product_name||productId}"`); continue; }
      if (!product.is_active) { stockErrors.push(`"${product.product_name}" is no longer available.`); continue; }

      const { data: reserved, error: reserveErr } = await supabase.from('product')
        .update({ stock_quantity: product.stock_quantity - item.quantity, updated_at: new Date().toISOString() })
        .eq('id', productId).gte('stock_quantity', item.quantity)
        .select('id,stock_quantity').single();

      if (reserveErr || !reserved) {
        const { data: cur } = await supabase.from('product').select('stock_quantity').eq('id', productId).single();
        stockErrors.push(!cur||cur.stock_quantity===0 ? `"${product.product_name}" just sold out.` : `"${product.product_name}" only has ${cur.stock_quantity} left (you need ${item.quantity}).`);
      } else {
        reservedItems.push({ product_id: productId, quantity: item.quantity });
        console.log(`🔒 Reserved ${item.quantity}x "${product.product_name}" → stock now ${reserved.stock_quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      for (const r of reservedItems) {
        const { data: cur } = await supabase.from('product').select('stock_quantity').eq('id', r.product_id).single();
        if (cur) await supabase.from('product').update({ stock_quantity: cur.stock_quantity+r.quantity, updated_at: new Date().toISOString() }).eq('id', r.product_id);
      }
      return res.status(409).json({ success:false, stock_errors:stockErrors });
    }

    const expiresAt = new Date(Date.now() + 1*60*1000).toISOString();
    const { data: reservation, error: resErr } = await supabase.from('stock_reservations')
      .insert({ user_id, expires_at: expiresAt, status: 'active' }).select().single();
    if (resErr) throw resErr;

    // ✅ product_id is UUID — matches stock_reservation_items.product_id UUID column
    const { error: itemsErr } = await supabase.from('stock_reservation_items').insert(
      reservedItems.map(r => ({ reservation_id: reservation.id, product_id: r.product_id, quantity: r.quantity }))
    );
    if (itemsErr) throw itemsErr;

    console.log(`✅ Reservation ${reservation.id} created, expires ${expiresAt}`);
    res.json({ success:true, reservation_id: reservation.id, expires_at: expiresAt });
  } catch (err) { console.error('❌ reserve-stock error:', err); res.status(500).json({ success:false, error:err.message }); }
});

// ================================================================
// POST /release-stock/:reservationId
// ================================================================

router.post("/release-stock/:reservationId", async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { data: reservation, error: fetchErr } = await supabase.from('stock_reservations')
      .select('*, stock_reservation_items(*)').eq('id', reservationId).eq('status','active').single();
    if (fetchErr || !reservation) return res.status(404).json({ success:false, error:'Reservation not found or already used/released' });

    for (const item of reservation.stock_reservation_items) {
      const { data: cur } = await supabase.from('product').select('stock_quantity').eq('id', item.product_id).single();
      if (cur) {
        await supabase.from('product').update({ stock_quantity: cur.stock_quantity+item.quantity, updated_at: new Date().toISOString() }).eq('id', item.product_id);
        console.log(`↩️ Released ${item.quantity}x product ${item.product_id}`);
      }
    }
    await supabase.from('stock_reservations').update({ status:'released' }).eq('id', reservationId);
    console.log(`✅ Reservation ${reservationId} released`);
    res.json({ success:true, message:'Stock released successfully' });
  } catch (err) { console.error('❌ release-stock error:', err); res.status(500).json({ success:false, error:err.message }); }
});

// ================================================================
// POST / — Create Order
// ✅ reservation_id supported — stock already held before GCash/PayPal
// ================================================================

router.post("/", async (req, res) => {
  try {
    console.log('📝 Create order request received');
    const { user_id, shipping_info, payment_method, cart_items, subtotal, tax, shipping_fee, total, payment_intent_id, payment_capture_id, payment_status, reservation_id } = req.body;
    if (!user_id||!shipping_info||!payment_method||!cart_items||cart_items.length===0)
      return res.status(400).json({ success:false, error:"Missing required fields" });

    const orderNumber = generateOrderNumber();
    let finalPaymentStatus = payment_status||'pending';
    if ((payment_method==='gcash'||payment_method==='card')&&payment_intent_id) finalPaymentStatus='paid';
    if (payment_method==='cod') finalPaymentStatus='pending';

    // ✅ Normalize all cart items — use product.id (UUID)
    const normalizedItems = cart_items.map(item => ({ ...item, product_id: getProductId(item) }));
    const productIds = normalizedItems.map(i=>i.product_id).filter(Boolean);
    const { data: products } = await supabase.from('product').select('id,category').in('id', productIds);
    const productCategoryMap = {};
    (products||[]).forEach(p=>{ productCategoryMap[p.id]=p.category; });

    // ── RESERVATION PATH ──────────────────────────────────────────
    if (reservation_id) {
      console.log(`🔑 Reservation path — reservation ${reservation_id}`);
      const { data: reservation, error: resErr } = await supabase.from('stock_reservations')
        .select('*, stock_reservation_items(*)').eq('id', reservation_id).eq('status','active').single();
      if (resErr || !reservation) {
        return res.status(409).json({ success:false, error:'Your payment reservation expired (30-minute limit). Your GCash/PayPal payment will be refunded automatically. Please try ordering again.', reservation_expired:true });
      }
      await supabase.from('stock_reservations').update({ status:'used' }).eq('id', reservation_id);
      // Update sold_count (stock_quantity was already decremented at reserve time)
      for (const item of normalizedItems) {
        if (!item.product_id) continue;
        const { data: cur } = await supabase.from('product').select('sold_count').eq('id', item.product_id).single();
        if (cur) await supabase.from('product').update({ sold_count:(cur.sold_count||0)+item.quantity, updated_at:new Date().toISOString() }).eq('id', item.product_id);
      }
      console.log(`✅ Reservation ${reservation_id} marked as used`);

    } else {
      // ── NORMAL PATH (COD) ─────────────────────────────────────────
      console.log('🔒 Reserving stock (normal path)...');
      const stockErrors=[], reservedItems=[];
      for (const item of normalizedItems) {
        const { data: product, error: fetchError } = await supabase.from('product').select('id,product_name,stock_quantity,sold_count,is_active').eq('id', item.product_id).single();
        if (fetchError||!product) { stockErrors.push(`Product not found: "${item.product?.product_name||item.product_id}"`); continue; }
        if (!product.is_active) { stockErrors.push(`"${product.product_name}" is no longer available.`); continue; }
        const { data: reserved, error: reserveError } = await supabase.from('product')
          .update({ stock_quantity:product.stock_quantity-item.quantity, sold_count:(product.sold_count||0)+item.quantity, updated_at:new Date().toISOString() })
          .eq('id', item.product_id).gte('stock_quantity', item.quantity).select('id,stock_quantity').single();
        if (reserveError||!reserved) {
          const { data: cur } = await supabase.from('product').select('stock_quantity,product_name').eq('id', item.product_id).single();
          stockErrors.push(cur?.stock_quantity===0 ? `"${product.product_name}" just sold out.` : `"${product.product_name}" only has ${cur?.stock_quantity??0} left (you ordered ${item.quantity}).`);
        } else {
          reservedItems.push({ product_id:item.product_id, quantity:item.quantity });
          console.log(`✅ Reserved ${item.quantity}x "${product.product_name}" → ${reserved.stock_quantity}`);
        }
      }
      if (stockErrors.length > 0) {
        for (const r of reservedItems) {
          const { data: cur } = await supabase.from('product').select('stock_quantity,sold_count').eq('id', r.product_id).single();
          if (cur) await supabase.from('product').update({ stock_quantity:cur.stock_quantity+r.quantity, sold_count:Math.max(0,(cur.sold_count||0)-r.quantity), updated_at:new Date().toISOString() }).eq('id', r.product_id);
        }
        return res.status(409).json({ success:false, error:'Some items are no longer available.', stock_errors:stockErrors, refresh_cart:true });
      }
      console.log(`✅ All stock reserved (${reservedItems.length} items)`);
    }

    const encryptedShipping = encryptShippingInfo(shipping_info);
    const orderData = {
      order_number:orderNumber, user_id, shipping_full_name:encryptedShipping.fullName, shipping_email:encryptedShipping.email, shipping_phone:encryptedShipping.phone, shipping_address:encryptedShipping.address, shipping_city:encryptedShipping.city, shipping_province:encryptedShipping.province, shipping_postal_code:encryptedShipping.postalCode,
      subtotal:parseFloat(subtotal), tax:parseFloat(tax), shipping_fee:parseFloat(shipping_fee)||0, total_amount:parseFloat(total),
      payment_method, payment_status:finalPaymentStatus, payment_intent_id:payment_intent_id||null, payment_capture_id:payment_capture_id||null,
      order_status:'pending', tracking_number:null, order_date:new Date().toISOString(), created_at:new Date().toISOString(), updated_at:new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase.from("orders").insert([orderData]).select().single();
    if (orderError) {
      console.error('❌ Order creation failed');
      if (reservation_id) {
        for (const item of normalizedItems) {
          if (!item.product_id) continue;
          const { data: cur } = await supabase.from('product').select('stock_quantity,sold_count').eq('id', item.product_id).single();
          if (cur) await supabase.from('product').update({ stock_quantity:cur.stock_quantity+item.quantity, sold_count:Math.max(0,(cur.sold_count||0)-item.quantity), updated_at:new Date().toISOString() }).eq('id', item.product_id);
        }
        await supabase.from('stock_reservations').update({ status:'active' }).eq('id', reservation_id);
      }
      throw orderError;
    }
    console.log('✅ Order created:', order.order_number);

    const orderItems = normalizedItems.map(item => ({
      order_id:order.id, product_id:item.product_id, product_name:item.product?.product_name||'Unknown Product',
      product_image:item.product?.product_image||null, product_category:productCategoryMap[item.product_id]||'Uncategorized',
      product_brand:item.product?.brand||null, unit_price:parseFloat(item.price||item.product?.price||0),
      quantity:parseInt(item.quantity), subtotal:parseFloat(item.price||item.product?.price||0)*parseInt(item.quantity), created_at:new Date().toISOString()
    }));

    const { data: items, error: itemsError } = await supabase.from("order_items").insert(orderItems).select();
    if (itemsError) { console.error('❌ Order items error:', itemsError); throw itemsError; }

    const cartItemIds = cart_items.map(i=>i.id).filter(Boolean);
    await supabase.from("cart").delete().in("id", cartItemIds);

    await logActivity({ userId:user_id, role:"buyer", action:"order_created", category:"order",
      description:`Buyer placed Order #${order.order_number} — ₱${parseFloat(total).toFixed(2)} via ${payment_method?.toUpperCase()}`,
      metadata:{ order_id:order.id, order_number:order.order_number, total, payment_method, item_count:cart_items.length, reservation_id:reservation_id||null }, req });

    res.status(201).json({ success:true, message:"Order created successfully", order:{ ...decryptShippingInfo(order), items } });
  } catch (error) { console.error('❌ Create order error:', error); res.status(500).json({ success:false, error:error.message }); }
});

// ================================================================
// GET User Orders
// ================================================================

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit=50, offset=0 } = req.query;
    let query = supabase.from("orders").select(`*, order_items (*, product:product_id (id, product_name, product_image, user_id))`).eq("user_id", userId).order("order_date",{ascending:false});
    if (status) query = query.eq("order_status", status);
    query = query.range(offset, offset+limit-1);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success:true, orders:decryptOrders(data), total:data.length });
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.get("/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase.from("orders").select("order_status, total_amount").eq("user_id", userId);
    if (error) throw error;
    res.json({ success:true, stats:{ total_orders:data.length, total_spent:data.reduce((s,o)=>s+parseFloat(o.total_amount),0).toFixed(2), pending:data.filter(o=>o.order_status==='pending').length, processing:data.filter(o=>o.order_status==='processing').length, shipped:data.filter(o=>o.order_status==='shipped').length, delivered:data.filter(o=>o.order_status==='delivered').length, cancelled:data.filter(o=>o.order_status==='cancelled').length }});
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

// check-suspension MUST be before /:orderId
router.get('/check-suspension/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: user, error } = await supabase.from('users').select('checkout_suspended_until,cancellation_count,cancellation_window_start').eq('id', userId).single();
    if (error||!user) return res.status(404).json({ success:false, error:'User not found' });
    const now=new Date(), suspendedUntil=user.checkout_suspended_until?new Date(user.checkout_suspended_until):null;
    const isSuspended=suspendedUntil&&suspendedUntil>now;
    if (isSuspended) {
      const msLeft=suspendedUntil-now, hoursLeft=Math.ceil(msLeft/(1000*60*60)), daysLeft=Math.ceil(msLeft/(1000*60*60*24));
      return res.json({ success:true, suspended:true, suspended_until:suspendedUntil.toISOString(), hours_left:hoursLeft, days_left:daysLeft, message:`Your checkout is suspended for ${daysLeft} more day${daysLeft!==1?'s':''} due to ${CANCELLATION_LIMIT} cancellations within ${CANCELLATION_WINDOW} days. You can checkout again on ${suspendedUntil.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}. You can still browse products, add to cart, message sellers, and view your orders normally.` });
    }
    const windowStart=user.cancellation_window_start?new Date(user.cancellation_window_start):null;
    const windowExpired=!windowStart||(now-windowStart)>CANCELLATION_WINDOW*24*60*60*1000;
    const currentCount=windowExpired?0:(user.cancellation_count||0);
    res.json({ success:true, suspended:false, current_count:currentCount, limit:CANCELLATION_LIMIT, warning:currentCount===CANCELLATION_LIMIT-1 });
  } catch (err) { res.status(500).json({ success:false, error:err.message }); }
});

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { data, error } = await supabase.from("orders").select(`*, order_items (*, product:product_id (id, product_name, product_image, category, brand, user_id))`).eq("id", orderId).single();
    if (error||!data) return res.status(404).json({ success:false, error:"Order not found" });
    const decryptedOrder=decryptShippingInfo(data), orderStatus=decryptedOrder.order_status.toLowerCase();
    res.json({ success:true, order:decryptedOrder, permissions:{ can_cancel:['pending','processing'].includes(orderStatus), can_message_seller:['pending','processing','shipped'].includes(orderStatus) }});
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.get("/number/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { data, error } = await supabase.from("orders").select(`*, order_items (*, product:product_id (id, product_name, product_image, user_id))`).eq("order_number", orderNumber).single();
    if (error||!data) return res.status(404).json({ success:false, error:"Order not found" });
    const decryptedOrder=decryptShippingInfo(data), orderStatus=decryptedOrder.order_status.toLowerCase();
    res.json({ success:true, order:decryptedOrder, permissions:{ can_cancel:['pending','processing'].includes(orderStatus), can_message_seller:['pending','processing','shipped'].includes(orderStatus) }});
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, tracking_number } = req.body;
    const validStatuses=['pending','processing','shipped','delivered','cancelled','canceled'];
    if (!validStatuses.includes(order_status)) return res.status(400).json({ success:false, error:"Invalid order status." });
    const { data: currentOrder, error: fetchError } = await supabase.from("orders").select(`*, order_items (*, product:product_id (id, product_name, product_image, category, brand, user_id))`).eq("id", orderId).single();
    if (fetchError||!currentOrder) return res.status(404).json({ success:false, error:"Order not found" });
    if (currentOrder.order_status==='delivered') return res.status(403).json({ success:false, error:"Cannot change status of delivered orders" });
    const statusFlow={'pending':['processing','cancelled'],'processing':['shipped','cancelled'],'shipped':['delivered'],'delivered':[],'cancelled':[],'canceled':[]};
    const allowedTransitions=statusFlow[currentOrder.order_status];
    if (!allowedTransitions.includes(order_status)) return res.status(400).json({ success:false, error:`Invalid status transition from ${currentOrder.order_status} to ${order_status}`, allowed_transitions:allowedTransitions });
    const updateData={ order_status, updated_at:new Date().toISOString() };
    if (order_status==='shipped'&&tracking_number) updateData.tracking_number=tracking_number;
    const { data, error } = await supabase.from("orders").update(updateData).eq("id", orderId).select().single();
    if (error) throw error;
    let actorId=req.body.admin_id||req.body.seller_id||null, actorRole=req.body.admin_id?"admin":"seller";
    if (!actorId) { const fi=currentOrder.order_items?.[0]; if(fi?.product?.user_id) actorId=fi.product.user_id; }
    let actorName=null;
    if (actorId) { const { data: au } = await supabase.from("users").select("full_name,store_name,role").eq("id", actorId).single(); if(au){actorName=au.store_name||au.full_name||null;actorRole=au.role||actorRole;} }
    await logActivity({ userId:actorId, role:actorRole, action:`order_status_${order_status}`, category:"order", description:`Order #${currentOrder.order_number} updated: ${currentOrder.order_status} → ${order_status}${actorName?` by ${actorName}`:""}${tracking_number?` (tracking: ${tracking_number})`:""}`, metadata:{ order_id:orderId, order_number:currentOrder.order_number, old_status:currentOrder.order_status, new_status:order_status, tracking_number:tracking_number||null, actor_id:actorId, actor_name:actorName, actor_role:actorRole }, req });
    if (order_status==='delivered'&&currentOrder.order_status!=='delivered') await updateAnalyticsOnDelivery({...data,order_items:currentOrder.order_items});
    if (order_status==='cancelled'&&currentOrder.order_status==='delivered') await reverseAnalyticsOnCancellation({...data,order_items:currentOrder.order_items});
    res.json({ success:true, message:"Order status updated", order:decryptShippingInfo(data) });
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.patch("/:orderId/payment", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status } = req.body;
    if (!payment_status) return res.status(400).json({ success:false, error:"payment_status is required" });
    if (!['pending','paid','failed'].includes(payment_status)) return res.status(400).json({ success:false, error:"Invalid payment status." });
    const { data: cur, error: fe } = await supabase.from("orders").select("payment_method,payment_status,payment_intent_id").eq("id", orderId).single();
    if (fe||!cur) return res.status(404).json({ success:false, error:"Order not found" });
    if (cur.payment_method!=='cod'&&cur.payment_intent_id) return res.status(403).json({ success:false, error:"Payment status for online payments is managed by PayMongo" });
    const { data, error } = await supabase.from("orders").update({ payment_status, updated_at:new Date().toISOString() }).eq("id", orderId).select().single();
    if (error) throw error;
    res.json({ success:true, message:"Payment status updated", order:decryptShippingInfo(data) });
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.patch("/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tracking_number } = req.body;
    if (!tracking_number) return res.status(400).json({ success:false, error:"tracking_number is required" });
    const { data, error } = await supabase.from("orders").update({ tracking_number, updated_at:new Date().toISOString() }).eq("id", orderId).select().single();
    if (error) throw error;
    res.json({ success:true, message:"Tracking number updated", order:decryptShippingInfo(data) });
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { data: order, error: fetchError } = await supabase.from("orders").select(`*, order_items (product_id, quantity, unit_price, product_category)`).eq("id", orderId).single();
    if (fetchError||!order) return res.status(404).json({ success:false, error:"Order not found" });
    const norm=order.order_status?.toLowerCase()==='canceled'?'cancelled':order.order_status;
    if (!['pending','processing'].includes(norm)) return res.status(400).json({ success:false, error:`Cannot cancel order with status: ${order.order_status}`, current_status:order.order_status });
    if ((order.payment_method==='gcash'||order.payment_method==='card')&&order.payment_status==='paid') console.log('⚠️ Paid online — consider refund via PayMongo.');
    for (const item of order.order_items) {
      const { data: product } = await supabase.from("product").select("stock_quantity,sold_count").eq("id", item.product_id).single();
      if (product) await supabase.from("product").update({ stock_quantity:product.stock_quantity+item.quantity, sold_count:Math.max(0,(product.sold_count||0)-item.quantity), updated_at:new Date().toISOString() }).eq("id", item.product_id);
    }
    const { data, error } = await supabase.from("orders").update({ order_status:'cancelled', cancelled_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id", orderId).select().single();
    if (error) throw error;
    if (order.order_status==='delivered') await reverseAnalyticsOnCancellation(order);
    await logActivity({ userId:req.body.user_id||null, role:"buyer", action:"order_cancelled", category:"order", description:`Order #${order.order_number} cancelled — ₱${parseFloat(order.total_amount).toFixed(2)} via ${order.payment_method?.toUpperCase()}${order.payment_status==="paid"?" (refund may be needed)":""}`, metadata:{ order_id:orderId, order_number:order.order_number, total:order.total_amount, payment_method:order.payment_method, payment_status:order.payment_status }, req });
    if (req.body.user_id) await trackCancellation(req.body.user_id);
    res.json({ success:true, message:"Order cancelled successfully", order:decryptShippingInfo(data), refund_status:order.payment_status==='paid'?'Refund may be required':'No refund needed' });
  } catch (error) { res.status(500).json({ success:false, error:error.message }); }
});

export default router;