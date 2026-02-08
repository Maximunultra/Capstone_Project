import express from 'express';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

// PayMongo configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!PAYMONGO_SECRET_KEY) {
  throw new Error("PAYMONGO_SECRET_KEY is missing. Set it in .env or Render environment.");
}
const authToken = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

/**
 * POST - Create payment checkout session
 */
router.post('/create-payment', async (req, res) => {
  try {
    console.log('💳 Create payment request received');
    const {
      amount,
      payment_method,
      currency = 'PHP',
      description,
      billing
    } = req.body;

    // Validation
    if (!amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Amount and payment method are required'
      });
    }

    if (amount < 10000) {
      return res.status(400).json({
        success: false,
        error: 'Minimum amount is PHP 100.00'
      });
    }

    // Validate payment method
    const validPaymentMethods = ['gcash', 'card'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be one of: ' + validPaymentMethods.join(', ')
      });
    }

    let checkoutSession;

    if (payment_method === 'gcash') {
      console.log('💰 Processing GCash payment...');
      checkoutSession = await createGCashPayment(amount, description, billing);
    } else if (payment_method === 'card') {
      console.log('💳 Processing card payment...');
      checkoutSession = await createCardPayment(amount, description, billing);
    }

    console.log('✅ Payment session created successfully');

    res.json({
      success: true,
      checkout_url: checkoutSession.checkout_url,
      payment_intent_id: checkoutSession.payment_intent_id
    });

  } catch (error) {
    console.error('❌ PayMongo Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || 'Failed to create payment'
    });
  }
});

/**
 * Helper function - Create GCash payment using Payment Intent
 */
async function createGCashPayment(amount, description, billing) {
  try {
    console.log('💾 Creating Payment Intent for GCash...');
    
    // Step 1: Create Payment Intent
    const paymentIntentResponse = await axios.post(
      `${PAYMONGO_API_URL}/payment_intents`,
      {
        data: {
          attributes: {
            amount: amount,
            payment_method_allowed: ['gcash'],
            payment_method_options: {
              card: {
                request_three_d_secure: 'any'
              }
            },
            currency: 'PHP',
            capture_type: 'automatic',
            description: description || 'Order Payment',
            statement_descriptor: 'Your Store'
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentIntent = paymentIntentResponse.data.data;
    console.log('✅ Payment Intent created:', paymentIntent.id);

    // Step 2: Create GCash Payment Method
    console.log('💾 Creating GCash payment method...');
    const paymentMethodResponse = await axios.post(
      `${PAYMONGO_API_URL}/payment_methods`,
      {
        data: {
          attributes: {
            type: 'gcash',
            billing: billing || {}
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentMethod = paymentMethodResponse.data.data;
    console.log('✅ Payment Method created:', paymentMethod.id);

    // Step 3: Attach Payment Method to Payment Intent
    console.log('💾 Attaching payment method to intent...');
    const attachResponse = await axios.post(
      `${PAYMONGO_API_URL}/payment_intents/${paymentIntent.id}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethod.id,
            client_key: paymentIntent.attributes.client_key,
            return_url: `${FRONTEND_URL}/buyer/checkout?payment_success=true&payment_intent_id=${paymentIntent.id}`
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const attachedIntent = attachResponse.data.data;
    console.log('✅ Payment method attached');

    // Get the redirect URL
    const redirectUrl = attachedIntent.attributes.next_action?.redirect?.url;
    
    if (!redirectUrl) {
      throw new Error('No redirect URL returned from PayMongo');
    }

    console.log('✅ Redirect URL obtained');

    return {
      checkout_url: redirectUrl,
      payment_intent_id: paymentIntent.id,
      client_key: paymentIntent.attributes.client_key
    };

  } catch (error) {
    console.error('❌ GCash Payment Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Helper function - Create card payment
 */
async function createCardPayment(amount, description, billing) {
  try {
    console.log('💾 Creating checkout session...');
    
    const checkoutResponse = await axios.post(
      `${PAYMONGO_API_URL}/checkout_sessions`,
      {
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: description || 'Order Payment',
            line_items: [
              {
                currency: 'PHP',
                amount: amount,
                description: description || 'Order Payment',
                name: 'Order Total',
                quantity: 1
              }
            ],
            payment_method_types: ['card', 'gcash'],
            success_url: `${FRONTEND_URL}/buyer/checkout?payment_success=true&payment_intent_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/buyer/checkout?payment_success=false`,
            billing: billing || {}
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const checkout = checkoutResponse.data.data;
    console.log('✅ Checkout session created:', checkout.id);

    return {
      checkout_url: checkout.attributes.checkout_url,
      payment_intent_id: checkout.id
    };

  } catch (error) {
    console.error('❌ Card Payment Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * GET - Verify payment status
 */
router.get('/verify-payment/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    console.log('🔍 Verifying payment:', paymentIntentId);

    // Determine endpoint based on ID prefix
    let endpoint = '';
    if (paymentIntentId.startsWith('cs_')) {
      // Checkout session
      endpoint = `${PAYMONGO_API_URL}/checkout_sessions/${paymentIntentId}`;
    } else if (paymentIntentId.startsWith('pi_')) {
      // Payment intent
      endpoint = `${PAYMONGO_API_URL}/payment_intents/${paymentIntentId}`;
    } else if (paymentIntentId.startsWith('pay_')) {
      // Payment
      endpoint = `${PAYMONGO_API_URL}/payments/${paymentIntentId}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID format'
      });
    }

    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data.data;
    const status = data.attributes.status;
    const isPaid = status === 'succeeded' || status === 'paid' || status === 'awaiting_payment_method';

    console.log(`✅ Payment verification complete. Status: ${status}`);

    res.json({
      success: true,
      status: status,
      paid: isPaid,
      payment_data: data
    });

  } catch (error) {
    console.error('❌ Verification Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

/**
 * POST - Webhook handler for PayMongo events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    const eventType = event.data.attributes.type;

    console.log('🔔 PayMongo Webhook Event:', eventType);

    switch (eventType) {
      case 'source.chargeable':
        const sourceId = event.data.attributes.data.id;
        console.log('💳 Source is chargeable:', sourceId);
        await createPaymentFromSource(sourceId);
        break;

      case 'payment.paid':
        console.log('✅ Payment successful:', event.data.attributes.data.id);
        break;

      case 'payment.failed':
        console.log('❌ Payment failed:', event.data.attributes.data.id);
        break;

      default:
        console.log('⚠️ Unhandled event type:', eventType);
    }

    res.status(200).json({ 
      success: true,
      received: true 
    });

  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Webhook processing failed' 
    });
  }
});

/**
 * POST - Create payment from source (for GCash)
 */
router.post('/create-payment-from-source', async (req, res) => {
  try {
    const { source_id } = req.body;

    if (!source_id) {
      return res.status(400).json({
        success: false,
        error: 'source_id is required'
      });
    }

    console.log('💳 Creating payment from source:', source_id);

    const payment = await createPaymentFromSource(source_id);

    res.json({
      success: true,
      payment_id: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount
    });

  } catch (error) {
    console.error('❌ Create payment from source error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || 'Failed to create payment from source'
    });
  }
});

/**
 * Helper function - Create payment from source
 */
async function createPaymentFromSource(sourceId, amount) {
  try {
    console.log('💾 Creating payment from source:', sourceId);
    
    // Get the source details to get the amount
    const sourceResponse = await axios.get(
      `${PAYMONGO_API_URL}/sources/${sourceId}`,
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const sourceAmount = sourceResponse.data.data.attributes.amount;
    
    const response = await axios.post(
      `${PAYMONGO_API_URL}/payments`,
      {
        data: {
          attributes: {
            amount: sourceAmount,
            source: {
              id: sourceId,
              type: 'source'
            },
            currency: 'PHP',
            description: 'Order Payment'
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Payment created from source:', response.data.data.id);
    return response.data.data;

  } catch (error) {
    console.error('❌ Create Payment Error:', error.response?.data || error.message);
    throw error;
  }
}

export default router;