import express from "express";
import { supabase } from "../server.js";
import crypto from "crypto";

const router = express.Router();

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// ✅ FIXED: Convert hex string to Buffer
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY 
  ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// 🧪 Verify key is loaded correctly
console.log('🔐 Encryption enabled:', !!process.env.MESSAGE_ENCRYPTION_KEY);
console.log('🔑 Key buffer length:', ENCRYPTION_KEY.length, 'bytes (should be 32)');

/**
 * Encrypt a message
 */
function encryptMessage(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted text
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message
 */
function decryptMessage(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted message format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return '[Encrypted Message]'; // Fallback for corrupted data
  }
}

/**
 * POST /api/messages
 * Send a message from buyer to seller
 */
router.post("/", async (req, res) => {
  try {
    const { sender_id, receiver_id, message, order_id, product_id } = req.body;

    console.log('📨 Original message:', message);
    console.log('📨 Sending message:', { 
      sender_id, 
      receiver_id, 
      order_id, 
      product_id
    });

    // Validation
    if (!sender_id || !receiver_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sender_id, receiver_id, and message are required'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot exceed 500 characters'
      });
    }

    // If order_id is provided, verify the order exists and belongs to the sender
    if (order_id) {
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
        .eq("user_id", sender_id)
        .single();
      
      if (orderError) {
        console.error('❌ Order fetch error:', orderError);
        return res.status(404).json({
          success: false,
          error: 'Order not found or does not belong to you',
          details: orderError.message
        });
      }

      if (!orderData) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      // Verify the receiver is actually the seller (product owner)
      const sellerIds = orderData.order_items
        .map(item => item.product?.user_id)
        .filter(id => id !== null);
      
      console.log('Seller IDs from products:', sellerIds);
      console.log('Receiver ID:', receiver_id);
      
      if (!sellerIds.includes(receiver_id)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid receiver for this order',
          details: `Receiver ${receiver_id} is not the seller of any products in this order`
        });
      }

      // Check if order status allows messaging (includes delivered now)
      const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered'];
      if (!allowedStatuses.includes(orderData.order_status)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot send messages for orders with status: ' + orderData.order_status
        });
      }
    }

    // 🔐 ENCRYPT THE MESSAGE
    const encryptedMessage = encryptMessage(message);
    console.log('🔒 Encrypted message:', encryptedMessage);

    const messageData = {
      sender_id: sender_id.toString(),
      receiver_id: receiver_id.toString(),
      message: encryptedMessage, // ← Should be encrypted
      order_id: order_id ? parseInt(order_id) : null,
      product_id: product_id ? parseInt(product_id) : null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    console.log('💾 Storing in DB:', messageData.message.substring(0, 50) + '...');

    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .insert([messageData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting message:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to insert message',
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code
      });
    }

    console.log('✅ Message sent successfully');

     // 🔓 DECRYPT BEFORE SENDING TO CLIENT
    const decryptedMessage = {
      ...newMessage,
      message: decryptMessage(newMessage.message)
    };

    console.log('📤 Sending to client (decrypted):', decryptedMessage.message);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: decryptedMessage
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

/**
 * GET /api/messages/conversation/:userId1/:userId2
 * Get conversation between two users
 */
router.get("/conversation/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { order_id } = req.query;

    console.log(`📖 Fetching conversation between users ${userId1} and ${userId2}`);

    let query = supabase
      .from("messages")
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order("created_at", { ascending: true });

    // Filter by order if specified
    if (order_id) {
      query = query.eq("order_id", order_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log(`✅ Found ${data.length} messages`);

    // 🔓 DECRYPT ALL MESSAGES
    const decryptedMessages = data.map(msg => ({
      ...msg,
      message: decryptMessage(msg.message)
    }));

    res.json({
      success: true,
      messages: decryptedMessages,
      count: decryptedMessages.length
    });

  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      details: error.message
    });
  }
});

/**
 * GET /api/messages/user/:userId
 * Get all conversations for a user
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📬 Fetching all conversations for user ${userId}`);

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from("messages")
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get unique user IDs to fetch their details
    const userIds = new Set();
    messages.forEach(msg => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch user details
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select('id, full_name, email')
      .in('id', Array.from(userIds));

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Create a map of user details
    const userMap = new Map();
    if (users) {
      users.forEach(user => {
        userMap.set(user.id, user);
      });
    }

    // Group messages by conversation partner
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUser = userMap.get(otherUserId);

      // 🔓 DECRYPT MESSAGE FOR PREVIEW
      const decryptedMessage = decryptMessage(msg.message);

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUser?.full_name || 'Unknown User',
          other_user_email: otherUser?.email || '',
          last_message: decryptedMessage,
          last_message_time: msg.created_at,
          unread_count: 0,
          messages: []
        });
      }

      const conversation = conversationsMap.get(otherUserId);
      
      // Store decrypted message
      conversation.messages.push({
        ...msg,
        message: decryptedMessage
      });
      
      // Count unread messages received by this user
      if (msg.receiver_id === userId && !msg.is_read) {
        conversation.unread_count++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    console.log(`✅ Found ${conversations.length} conversations`);

    res.json({
      success: true,
      conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error('❌ Error fetching user messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user messages',
      details: error.message
    });
  }
});

/**
 * GET /api/messages/order/:orderId
 * Get all messages related to a specific order
 */
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`📦 Fetching messages for order ${orderId}`);

    const { data, error } = await supabase
      .from("messages")
      .select('*')
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`✅ Found ${data.length} messages for order`);

    // 🔓 DECRYPT ALL MESSAGES
    const decryptedMessages = data.map(msg => ({
      ...msg,
      message: decryptMessage(msg.message)
    }));

    res.json({
      success: true,
      messages: decryptedMessages,
      count: decryptedMessages.length
    });

  } catch (error) {
    console.error('❌ Error fetching order messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order messages',
      details: error.message
    });
  }
});

/**
 * PATCH /api/messages/:messageId/read
 * Mark a message as read
 */
router.patch("/:messageId/read", async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log(`📖 Marking message ${messageId} as read`);

    const { data, error } = await supabase
      .from("messages")
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Message not found' 
        });
      }
      throw error;
    }

    console.log('✅ Message marked as read');

    // 🔓 DECRYPT BEFORE SENDING TO CLIENT
    const decryptedData = {
      ...data,
      message: decryptMessage(data.message)
    };

    res.json({ 
      success: true,
      message: 'Message marked as read',
      data: decryptedData
    });

  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      details: error.message
    });
  }
});

/**
 * PATCH /api/messages/conversation/:userId1/:userId2/read
 * Mark all messages in a conversation as read
 */
router.patch("/conversation/:userId1/:userId2/read", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    console.log(`📖 Marking all messages as read between ${userId1} and ${userId2}`);

    const { data, error } = await supabase
      .from("messages")
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq("sender_id", userId2)
      .eq("receiver_id", userId1)
      .eq("is_read", false)
      .select();

    if (error) throw error;

    console.log(`✅ Marked ${data.length} messages as read`);

    res.json({ 
      success: true,
      message: `${data.length} messages marked as read`,
      count: data.length
    });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
      details: error.message
    });
  }
});

/**
 * DELETE /api/messages/:messageId
 * Delete a message (sender only)
 */
router.delete("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id } = req.body;

    console.log(`🗑️ Deleting message ${messageId}`);

    // Verify the message belongs to the user
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("sender_id", user_id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or you do not have permission to delete it'
      });
    }

    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) throw deleteError;

    console.log('✅ Message deleted');

    res.json({ 
      success: true,
      message: 'Message deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      details: error.message
    });
  }
});

/**
 * GET /api/messages/unread/count/:userId
 * Get unread message count for a user
 */
router.get("/unread/count/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🔢 Counting unread messages for user ${userId}`);

    const { data, error, count } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    console.log(`✅ User has ${count} unread messages`);

    res.json({
      success: true,
      unread_count: count || 0
    });

  } catch (error) {
    console.error('❌ Error counting unread messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count unread messages',
      details: error.message
    });
  }
});

export default router;