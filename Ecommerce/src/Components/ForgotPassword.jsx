// ECommerce/src/components/ForgotPassword.js
import React, { useState } from 'react';
import { EmailService } from '../services/emailServices';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await EmailService.sendOTP(email);
      
      if (result.success) {
        setMessage('✅ OTP sent successfully! Check your email.');
        setStep(2);
      } else {
        setMessage('❌ ' + result.message);
      }
    } catch (error) {
      setMessage('❌ Failed to send OTP. Please try again.');
      console.error('Send OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await EmailService.verifyOTP(email, otp);
      
      if (result.success) {
        setMessage('✅ OTP verified! Enter your new password.');
        setStep(3);
      } else {
        setMessage('❌ ' + result.message);
      }
    } catch (error) {
      setMessage('❌ Invalid OTP. Please try again.');
      console.error('Verify OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Client-side validation
    if (newPassword.length < 6) {
      setMessage('❌ Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('❌ Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const result = await EmailService.resetPassword(email, newPassword);
      
      if (result.success) {
        setMessage('✅ Password reset successful! You can now login with your new password.');
        // Optional: Redirect to login page after success
        setTimeout(() => {
          // window.location.href = '/login'; // Uncomment if you want to redirect
        }, 2000);
      } else {
        setMessage('❌ ' + result.message);
      }
    } catch (error) {
      setMessage('❌ Failed to reset password. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await EmailService.sendOTP(email);
      
      if (result.success) {
        setMessage('✅ New OTP sent successfully! Check your email.');
      } else {
        setMessage('❌ ' + result.message);
      }
    } catch (error) {
      setMessage('❌ Failed to resend OTP. Please try again.');
      console.error('Resend OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
  };

  const styles = {
    container: {
      maxWidth: '400px',
      margin: '50px auto',
      padding: '30px',
      border: '1px solid #ddd',
      borderRadius: '10px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    title: {
      textAlign: 'center',
      marginBottom: '30px',
      color: '#333'
    },
    form: {
      display: 'flex',
      flexDirection: 'column'
    },
    input: {
      padding: '12px',
      margin: '10px 0',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '16px'
    },
    button: {
      padding: '12px',
      margin: '10px 0',
      backgroundColor: loading ? '#ccc' : '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.3s'
    },
    secondaryButton: {
      padding: '8px',
      margin: '5px 0',
      backgroundColor: 'transparent',
      color: '#007bff',
      border: '1px solid #007bff',
      borderRadius: '5px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    message: {
      padding: '10px',
      margin: '10px 0',
      borderRadius: '5px',
      textAlign: 'center',
      backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
      color: message.includes('✅') ? '#155724' : '#721c24',
      border: message.includes('✅') ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: '#007bff',
      cursor: 'pointer',
      textDecoration: 'underline',
      marginBottom: '20px',
      fontSize: '14px'
    },
    stepIndicator: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    },
    step: {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 10px',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    activeStep: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    completedStep: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    inactiveStep: {
      backgroundColor: '#e9ecef',
      color: '#6c757d'
    },
    passwordStrength: {
      fontSize: '12px',
      margin: '5px 0',
      padding: '5px',
      borderRadius: '3px'
    }
  };

  const getPasswordStrength = (password) => {
    if (password.length < 6) return { text: 'Too short', color: '#dc3545' };
    if (password.length < 8) return { text: 'Weak', color: '#ffc107' };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { text: 'Strong', color: '#28a745' };
    }
    return { text: 'Medium', color: '#17a2b8' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔐 Forgot Password</h2>
      
      {/* Step Indicator */}
      <div style={styles.stepIndicator}>
        <div style={{
          ...styles.step,
          ...(step >= 1 ? styles.completedStep : styles.inactiveStep)
        }}>1</div>
        <div style={{
          ...styles.step,
          ...(step === 2 ? styles.activeStep : step > 2 ? styles.completedStep : styles.inactiveStep)
        }}>2</div>
        <div style={{
          ...styles.step,
          ...(step === 3 ? styles.activeStep : styles.inactiveStep)
        }}>3</div>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {step === 1 && (
        <form onSubmit={handleSendOTP} style={styles.form}>
          <h3>Enter your email address</h3>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTP} style={styles.form}>
          <button 
            type="button" 
            onClick={() => setStep(1)} 
            style={styles.backButton}
          >
            ← Back to email
          </button>
          <h3>Enter OTP sent to {email}</h3>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            maxLength="6"
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button 
            type="button" 
            onClick={handleResendOTP}
            disabled={loading}
            style={styles.secondaryButton}
          >
            Resend OTP
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} style={styles.form}>
          <button 
            type="button" 
            onClick={() => setStep(2)} 
            style={styles.backButton}
          >
            ← Back to OTP
          </button>
          <h3>Set New Password</h3>
          <input
            type="password"
            placeholder="Enter new password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="6"
            style={styles.input}
          />
          {newPassword && (
            <div style={{
              ...styles.passwordStrength,
              color: passwordStrength.color
            }}>
              Password strength: {passwordStrength.text}
            </div>
          )}
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={styles.input}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <div style={{
              ...styles.passwordStrength,
              color: '#dc3545'
            }}>
              Passwords do not match
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
            style={styles.button}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
          
          {message.includes('✅ Password reset successful') && (
            <button 
              type="button" 
              onClick={resetForm}
              style={{...styles.secondaryButton, marginTop: '10px'}}
            >
              Reset Another Password
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default ForgotPassword;