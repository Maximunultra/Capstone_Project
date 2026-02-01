// ECommerce/src/services/emailServices.js - Debug Version
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';
// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com';
// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    console.log('📤 Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error Details:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Response Data:', error.response?.data);
    console.error('- Error Message:', error.message);
    console.error('- Full Error:', error);
    return Promise.reject(error);
  }
);

export const EmailService = {
  // Send OTP to email
  async sendOTP(email) {
    try {
      console.log('📧 Sending OTP to:', email);
      const response = await apiClient.post('/send-otp', { email });
      console.log('✅ OTP sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ SendOTP Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Network error occurred'
      };
    }
  },

  // Verify OTP
  async verifyOTP(email, otp) {
    try {
      console.log('🔍 Verifying OTP for:', email, 'OTP:', otp);
      const response = await apiClient.post('/verify-otp', { email, otp });
      console.log('✅ OTP verified successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ VerifyOTP Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Network error occurred'
      };
    }
  },

  // Reset password after OTP verification
  async resetPassword(email, newPassword) {
    try {
      console.log('🔐 Resetting password for:', email);
      console.log('🔐 Password length:', newPassword?.length);
      console.log('🔐 Password starts with:', newPassword?.substring(0, 3) + '***');
      
      const response = await apiClient.post('/reset-password', { 
        email, 
        newPassword 
      });
      
      console.log('✅ Password reset successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ ResetPassword Error Details:');
      console.error('- URL:', error.config?.url);
      console.error('- Method:', error.config?.method);
      console.error('- Data sent:', error.config?.data);
      console.error('- Status:', error.response?.status);
      console.error('- Response:', error.response?.data);
      console.error('- Error message:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Network error occurred'
      };
    }
  },

  // Check server health
  async checkHealth() {
    try {
      console.log('🏥 Checking server health...');
      const response = await apiClient.get('/health');
      console.log('✅ Server health:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health Check Error:', error);
      return {
        status: 'unhealthy',
        error: error.response?.data?.message || error.message
      };
    }
  }
};