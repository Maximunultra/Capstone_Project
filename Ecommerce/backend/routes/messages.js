import express from "express";
import { supabase } from "../server.js";
import crypto from "crypto";
import multer from "multer";

// ── Multer — memory storage for message image attachments ─────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

async function uploadMessageImage(file) {
  const ext      = file.originalname.split('.').pop();
  const fileName = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `messages/${fileName}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file.buffer, { contentType: file.mimetype, cacheControl: '3600' });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

const router = express.Router();

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// ✅ FIX: Read the key lazily inside each function instead of at module load time.
// The top-level const ran before dotenv.config() populated process.env, so it
// always got undefined and fell back to crypto.randomBytes(32) — a random key
// that changed on every server restart, making all stored messages unreadable.
function getEncryptionKey() {
  const keyHex = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!keyHex) throw new Error('MESSAGE_ENCRYPTION_KEY is not set in environment variables');
  return Buffer.from(keyHex, 'hex');
}

function encryptMessage(text) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

function decryptMessage(encryptedText) {
  if (!encryptedText) return '';
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // not encrypted — return as-is
    if (!/^[0-9a-f]+$/i.test(parts[0])) return encryptedText; // not a valid IV hex
    const iv      = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return '[Encrypted Message]';
  }
}

/**
 * Fetch order + product context for a message
 * Returns { order, product } or null values if not linked
 */
async function fetchMessageContext(orderId, productId) {
  const context = { order: null, product: null };

  if (orderId) {
    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_status,
          total_amount,
          order_items (
            product_id,
            product_name,
            quantity,
            unit_price,
            product:product_id (
              id,
              product_name,
              product_image,
              brand
            )
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderData) {
        context.order = {
          id:           orderData.id,
          order_number: orderData.order_number,
          order_status: orderData.order_status,
          total_amount: orderData.total_amount,
          items:        orderData.order_items || []
        };

        // If no explicit productId, use the first item from the order
        if (!productId && orderData.order_items?.length > 0) {
          const firstItem = orderData.order_items[0];
          context.product = firstItem.product
            ? {
                id:            firstItem.product.id,
                product_name:  firstItem.product_name || firstItem.product.product_name,
                product_image: firstItem.product.product_image,
                brand:         firstItem.product.brand,
                quantity:      firstItem.quantity,
                unit_price:    firstItem.unit_price
              }
            : null;
        }
      }
    } catch (err) {
      console.error('⚠️ Could not fetch order context:', err.message);
    }
  }

  if (productId) {
    try {
      const { data: productData } = await supabase
        .from("product")
        .select("id, product_name, product_image, brand, price")
        .eq("id", productId)
        .single();

      if (productData) {
        context.product = {
          id:            productData.id,
          product_name:  productData.product_name,
          product_image: productData.product_image,
          brand:         productData.brand,
          price:         productData.price
        };
      }
    } catch (err) {
      console.error('⚠️ Could not fetch product context:', err.message);
    }
  }

  return context;
}

/**
 * POST /api/messages
 * Send a message from buyer to seller
 */
router.post("/", upload.single('image'), async (req, res) => {
  try {
    const { sender_id, receiver_id, message, order_id, product_id } = req.body;

    // Upload attached image if present
    let image_url = null;
    if (req.file) {
      try {
        image_url = await uploadMessageImage(req.file);
      } catch (uploadErr) {
        return res.status(500).json({ success: false, error: 'Image upload failed', details: uploadErr.message });
      }
    }

    if (!sender_id || !receiver_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sender_id and receiver_id are required'
      });
    }

    if (!message && !image_url) {
      return res.status(400).json({
        success: false,
        error: 'A message or image is required'
      });
    }

    if (message && message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot exceed 1000 characters'
      });
    }

    // Admins bypass order-party validation
    let adminIsInvolved = false;
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id, role")
        .in("id", [sender_id, receiver_id]);
      adminIsInvolved = users?.some(u => u.role === 'admin') ?? false;
    } catch (_) {}

    if (order_id && !adminIsInvolved) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_id,
            product:product_id (
              user_id
            )
          )
        `)
        .eq("id", order_id)
        .single();

      if (orderError || !orderData) {
        return res.status(404).json({ success: false, error: 'Order not found', details: orderError?.message });
      }

      const sellerIds = orderData.order_items.map(item => item.product?.user_id).filter(id => id !== null);
      const isBuyer   = orderData.user_id === sender_id;
      const isSeller  = sellerIds.includes(sender_id);

      if (!isBuyer && !isSeller) {
        return res.status(403).json({ success: false, error: 'You do not have permission to send messages about this order' });
      }

      const isReceiverBuyer  = orderData.user_id === receiver_id;
      const isReceiverSeller = sellerIds.includes(receiver_id);

      if (!isReceiverBuyer && !isReceiverSeller) {
        return res.status(403).json({ success: false, error: 'Invalid receiver for this order' });
      }

      const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!allowedStatuses.includes(orderData.order_status)) {
        return res.status(400).json({ success: false, error: 'Cannot send messages for orders with status: ' + orderData.order_status });
      }
    }

    const encryptedMessage = encryptMessage(message || '');

    const messageData = {
      sender_id:   sender_id.toString(),
      receiver_id: receiver_id.toString(),
      message:     encryptedMessage,
      image_url:   image_url || null,
      // ✅ FIX: order_id and product_id are UUIDs — do NOT parseInt() them
      order_id:    order_id   || null,
      product_id:  product_id || null,
      is_read:     false,
      created_at:  new Date().toISOString()
    };

    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .insert([messageData])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to insert message',
        details: insertError.message,
        hint:    insertError.hint,
        code:    insertError.code
      });
    }

    const context = await fetchMessageContext(newMessage.order_id, newMessage.product_id);

    const decryptedMessage = {
      ...newMessage,
      message:         decryptMessage(newMessage.message),
      image_url:       newMessage.image_url || null,
      order_context:   context.order,
      product_context: context.product
    };

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: decryptedMessage
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
});

/**
 * GET /api/messages/conversation/:userId1/:userId2
 */
router.get("/conversation/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { order_id } = req.query;

    let query = supabase
      .from("messages")
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order("created_at", { ascending: true });

    if (order_id) query = query.eq("order_id", order_id);

    const { data, error } = await query;
    if (error) throw error;

    // Batch-fetch context by unique (order_id, product_id) pairs
    const contextCache = new Map();
    const contextKeys  = [...new Set(data.map(m => `${m.order_id || 'null'}_${m.product_id || 'null'}`))]

    await Promise.all(
      contextKeys.map(async (key) => {
        const [oid, pid] = key.split('_').map(v => v === 'null' ? null : v); // ✅ no parseInt — UUIDs
        const ctx = await fetchMessageContext(oid, pid);
        contextCache.set(key, ctx);
      })
    );

    const decryptedMessages = data.map(msg => {
      const key = `${msg.order_id || 'null'}_${msg.product_id || 'null'}`;
      const ctx = contextCache.get(key) || { order: null, product: null };
      return {
        ...msg,
        message:         decryptMessage(msg.message),
        image_url:       msg.image_url || null,
        order_context:   ctx.order,
        product_context: ctx.product
      };
    });

    res.json({ success: true, messages: decryptedMessages, count: decryptedMessages.length });

  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation', details: error.message });
  }
});

/**
 * GET /api/messages/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: messages, error } = await supabase
      .from("messages")
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const userIds = new Set();
    messages.forEach(msg => { userIds.add(msg.sender_id); userIds.add(msg.receiver_id); });

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select('id, full_name, email')
      .in('id', Array.from(userIds));

    if (usersError) console.error('Error fetching users:', usersError);

    const userMap = new Map();
    if (users) users.forEach(user => userMap.set(user.id, user));

    const conversationsMap = new Map();

    // Latest message per conversation (for context preview)
    const latestMsgPerConv = new Map();
    messages.forEach(msg => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!latestMsgPerConv.has(otherUserId)) latestMsgPerConv.set(otherUserId, msg);
    });

    // Pre-fetch context for latest messages
    const contextCache = new Map();
    await Promise.all(
      [...latestMsgPerConv.values()].map(async (msg) => {
        const key = `${msg.order_id || 'null'}_${msg.product_id || 'null'}`;
        if (!contextCache.has(key)) {
          const ctx = await fetchMessageContext(msg.order_id, msg.product_id);
          contextCache.set(key, ctx);
        }
      })
    );

    messages.forEach(msg => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUser   = userMap.get(otherUserId);
      const decryptedMsg = decryptMessage(msg.message);

      if (!conversationsMap.has(otherUserId)) {
        const latestMsg = latestMsgPerConv.get(otherUserId);
        const ctxKey    = `${latestMsg.order_id || 'null'}_${latestMsg.product_id || 'null'}`;
        const ctx       = contextCache.get(ctxKey) || { order: null, product: null };

        conversationsMap.set(otherUserId, {
          other_user_id:        otherUserId,
          other_user_name:      otherUser?.full_name || 'Unknown User',
          other_user_email:     otherUser?.email || '',
          last_message:         decryptedMsg,
          last_message_time:    msg.created_at,
          last_order_context:   ctx.order,
          last_product_context: ctx.product,
          unread_count:         0,
          messages:             []
        });
      }

      const conversation = conversationsMap.get(otherUserId);
      conversation.messages.push({ ...msg, message: decryptedMsg, image_url: msg.image_url || null });
      if (msg.receiver_id === userId && !msg.is_read) conversation.unread_count++;
    });

    const conversations = Array.from(conversationsMap.values());
    res.json({ success: true, conversations, count: conversations.length });

  } catch (error) {
    console.error('❌ Error fetching user messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user messages', details: error.message });
  }
});

/**
 * GET /api/messages/order/:orderId
 */
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { data, error } = await supabase
      .from("messages")
      .select('*')
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // All messages share the same order — fetch context once
    const ctx = data.length > 0
      ? await fetchMessageContext(orderId, data[0].product_id)
      : { order: null, product: null };

    const decryptedMessages = data.map(msg => ({
      ...msg,
      message:         decryptMessage(msg.message),
      image_url:       msg.image_url || null,
      order_context:   ctx.order,
      product_context: ctx.product
    }));

    res.json({ success: true, messages: decryptedMessages, count: decryptedMessages.length });

  } catch (error) {
    console.error('❌ Error fetching order messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order messages', details: error.message });
  }
});

/**
 * PATCH /api/messages/:messageId/read
 */
router.patch("/:messageId/read", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Message not found' });
      throw error;
    }

    const ctx = await fetchMessageContext(data.order_id, data.product_id);
    const decryptedData = {
      ...data,
      message:         decryptMessage(data.message),
      order_context:   ctx.order,
      product_context: ctx.product
    };

    res.json({ success: true, message: 'Message marked as read', data: decryptedData });

  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark message as read', details: error.message });
  }
});

/**
 * PATCH /api/messages/conversation/:userId1/:userId2/read
 */
router.patch("/conversation/:userId1/:userId2/read", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("sender_id", userId2)
      .eq("receiver_id", userId1)
      .eq("is_read", false)
      .select();

    if (error) throw error;

    res.json({ success: true, message: `${data.length} messages marked as read`, count: data.length });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read', details: error.message });
  }
});

/**
 * DELETE /api/messages/:messageId
 */
router.delete("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id } = req.body;

    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("sender_id", user_id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ success: false, error: 'Message not found or you do not have permission to delete it' });
    }

    const { error: deleteError } = await supabase.from("messages").delete().eq("id", messageId);
    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Message deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message', details: error.message });
  }
});

/**
 * GET /api/messages/unread/count/:userId
 */
router.get("/unread/count/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { error, count } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    res.json({ success: true, unread_count: count || 0 });

  } catch (error) {
    console.error('❌ Error counting unread messages:', error);
    res.status(500).json({ success: false, error: 'Failed to count unread messages', details: error.message });
  }
});

export default router;