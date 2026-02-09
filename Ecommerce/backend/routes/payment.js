import express from 'express';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// PayMongo configuration (for GCash)
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const FRONTEND_URL = process.env.FRONTEND_URL;

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

if (!PAYMONGO_SECRET_KEY) {
  throw new Error("PAYMONGO_SECRET_KEY is missing. Set it in .env");
}

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
  console.warn("⚠️ PayPal credentials missing. PayPal payments will not work.");
}

const payMongoAuthToken = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

/**
 * Helper - Get PayPal Access Token
 */
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    
    const response = await axios.post(
      `${PAYPAL_API_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('❌ PayPal Auth Error:', error.response?.data || error.message);
    throw error;
  }
}

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
    const validPaymentMethods = ['gcash', 'paypal'];
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
    } else if (payment_method === 'paypal') {
      console.log('💙 Processing PayPal payment...');
      checkoutSession = await createPayPalPayment(amount, description);
    }

    console.log('✅ Payment session created successfully');

    res.json({
      success: true,
      checkout_url: checkoutSession.checkout_url,
      payment_intent_id: checkoutSession.payment_intent_id,
      order_id: checkoutSession.order_id // For PayPal
    });

  } catch (error) {
    console.error('❌ Payment Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || error.response?.data?.message || 'Failed to create payment'
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
          'Authorization': `Basic ${payMongoAuthToken}`,
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
          'Authorization': `Basic ${payMongoAuthToken}`,
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
          'Authorization': `Basic ${payMongoAuthToken}`,
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
 * Helper function - Create PayPal payment
 */
async function createPayPalPayment(amount, description) {
  try {
    console.log('💾 Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();
    console.log('✅ PayPal access token obtained');

    // Convert centavos to PHP (PayPal uses decimal format)
    const phpAmount = (amount / 100).toFixed(2);

    console.log('💾 Creating PayPal order...');
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'PHP',
            value: phpAmount
          },
          description: description || 'Order Payment'
        }],
        application_context: {
          brand_name: 'Your Store',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${FRONTEND_URL}/buyer/checkout?payment_success=true&payment_method=paypal`,
          cancel_url: `${FRONTEND_URL}/buyer/checkout?payment_success=false`
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const order = response.data;
    console.log('✅ PayPal order created:', order.id);

    // Find the approval URL
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL returned from PayPal');
    }

    return {
      checkout_url: approvalUrl,
      payment_intent_id: order.id,
      order_id: order.id
    };

  } catch (error) {
    console.error('❌ PayPal Payment Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * POST - Capture PayPal payment after approval
 */
router.post('/capture-paypal/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('💳 Capturing PayPal payment:', orderId);

    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const captureData = response.data;
    console.log('✅ PayPal payment captured:', captureData.id);

    res.json({
      success: true,
      status: captureData.status,
      order_id: orderId,
      capture_id: captureData.purchase_units[0]?.payments?.captures[0]?.id
    });

  } catch (error) {
    console.error('❌ PayPal Capture Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to capture PayPal payment'
    });
  }
});

/**
 * GET - Verify payment status
 */
router.get('/verify-payment/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    console.log('🔍 Verifying payment:', paymentIntentId);

    // Check if it's a PayPal order (starts with specific pattern)
    if (paymentIntentId.includes('-') && paymentIntentId.length > 15) {
      // This is likely a PayPal order ID
      const accessToken = await getPayPalAccessToken();
      
      const response = await axios.get(
        `${PAYPAL_API_URL}/v2/checkout/orders/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const order = response.data;
      const isPaid = order.status === 'APPROVED' || order.status === 'COMPLETED';

      console.log(`✅ PayPal payment verification complete. Status: ${order.status}`);

      return res.json({
        success: true,
        status: order.status,
        paid: isPaid,
        payment_data: order
      });
    }

    // Otherwise, check PayMongo (GCash)
    let endpoint = '';
    if (paymentIntentId.startsWith('cs_')) {
      endpoint = `${PAYMONGO_API_URL}/checkout_sessions/${paymentIntentId}`;
    } else if (paymentIntentId.startsWith('pi_')) {
      endpoint = `${PAYMONGO_API_URL}/payment_intents/${paymentIntentId}`;
    } else if (paymentIntentId.startsWith('pay_')) {
      endpoint = `${PAYMONGO_API_URL}/payments/${paymentIntentId}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID format'
      });
    }

    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Basic ${payMongoAuthToken}`,
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

export default router;