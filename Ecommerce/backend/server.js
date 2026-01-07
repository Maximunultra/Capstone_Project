import express from "express";
import nodemailer from 'nodemailer';
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcrypt';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export { supabase };

// Middleware
app.use(cors());
app.use(express.json());

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import promotionRoutes from "./routes/promotions.js";
// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/promotions", promotionRoutes);
// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email setup error:', error);
  } else {
    console.log('✅ Email server is ready');
  }
});

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to hash passwords
async function hashPassword(password) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

// Helper function to find user by email
async function findUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (error) {
      console.log('User not found:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

// Helper function to cleanup expired OTPs
async function cleanupExpiredOTPs() {
  try {
    const { error } = await supabase
      .from('password_reset_otps')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.log('Error cleaning expired OTPs:', error);
    }
  } catch (error) {
    console.error('Error in cleanup function:', error);
  }
}

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'ECommerce Email Service Running!',
    status: 'active'
  });
});

// Send OTP for forgot password
app.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Clean up any existing OTPs for this user
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('user_id', user.id);

    // Store OTP in database
    const { data: otpData, error: otpError } = await supabase
      .from('password_reset_otps')
      .insert([
        {
          user_id: user.id,
          email: email,
          otp: otp,
          expires_at: expiresAt.toISOString(),
          used: false
        }
      ])
      .select()
      .single();

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP'
      });
    }

    // Email template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
          .otp-box { background: #fff; padding: 20px; text-align: center; border: 2px dashed #007bff; margin: 20px 0; border-radius: 10px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 10px 0; }
          .warning { color: #dc3545; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset OTP</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>You requested to reset your password. Use the OTP below to continue:</p>
            
            <div class="otp-box">
              <p>Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
              <p><strong>Valid for 10 minutes</strong></p>
            </div>
            
            <p>If you didn't request this, please ignore this email.</p>
            
            <div class="warning">
              ⚠️ Never share this OTP with anyone!
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: `"ECommerce Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset OTP - ECommerce',
      html: htmlTemplate,
      text: `Your OTP for password reset is: ${otp}. Valid for 10 minutes. Never share this code!`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP sent to ${email}: ${otp} (ID: ${otpData.id})`);

    res.json({
      success: true,
      message: 'OTP sent successfully! Please check your email.',
      messageId: info.messageId,
    });

  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Clean up expired OTPs first
    await cleanupExpiredOTPs();

    // Find the OTP record
    const { data: otpData, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpData.id);

    if (updateError) {
      console.error('Error updating OTP status:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify OTP'
      });
    }

    console.log(`✅ OTP verified for ${email}`);
    
    res.json({
      success: true,
      message: 'OTP verified successfully!',
      user_id: otpData.user_id
    });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Reset password (after OTP verification)
app.post('/reset-password', async (req, res) => {
  try {
    console.log('🔐 Password reset request received');
    console.log('📧 Request body:', req.body);
    
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user
    console.log('🔍 Finding user by email:', email);
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user.id);

    // Check if there's a recent verified OTP (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    console.log('🔍 Checking for recent verified OTP...');
    
    const { data: recentOTP, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', true)
      .gt('expires_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !recentOTP) {
      console.log('❌ No recent verified OTP found');
      console.log('OTP Error:', otpError);
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first'
      });
    }

    console.log('✅ Recent verified OTP found');

    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);
    console.log('✅ Password hashed successfully');

    // Update the password in the database
    console.log('💾 Updating password in database...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    console.log('✅ Password updated successfully');

    // Clean up used OTPs for this user
    console.log('🧹 Cleaning up used OTPs...');
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('user_id', user.id);

    console.log(`✅ Password reset successful for ${email}`);
    
    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

// Check server health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'email',
    timestamp: new Date().toISOString()
  });
});

// Start the Server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});