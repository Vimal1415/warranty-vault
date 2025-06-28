const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const User = require('../models/User');
const router = express.Router();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Google OAuth login
router.get('/google', (req, res, next) => {
  // Store redirect parameter in session or pass it through
  const redirect = req.query.redirect;
  const state = redirect ? Buffer.from(JSON.stringify({ redirect })).toString('base64') : undefined;
  
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly'
    ],
    accessType: 'offline',
    prompt: 'consent',
    state: state
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      console.log('=== OAuth Callback Debug ===');
      console.log('CLIENT_URL:', process.env.CLIENT_URL);
      console.log('User data:', req.user);
      console.log('Query params:', req.query);
      
      const { user, accessToken, refreshToken } = req.user;
      
      // Update user's Gmail tokens
      await user.updateGmailTokens(accessToken, refreshToken, new Date(Date.now() + 3600000));
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Get redirect parameter from state
      let redirectParam = '';
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          if (stateData.redirect) {
            redirectParam = `&redirect=${stateData.redirect}`;
          }
        } catch (error) {
          console.error('Error parsing state:', error);
        }
      }
      
      const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}${redirectParam}`;
      console.log('Redirecting to:', redirectUrl);
      
      // Redirect to frontend with token
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      console.error('Error stack:', error.stack);
      res.redirect(`${process.env.CLIENT_URL}/auth/error`);
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-gmailAccessToken -gmailRefreshToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh Gmail token
router.post('/refresh-gmail-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.gmailRefreshToken) {
      return res.status(400).json({ error: 'No Gmail refresh token found' });
    }

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: user.gmailRefreshToken
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user tokens
    await user.updateGmailTokens(
      credentials.access_token,
      credentials.refresh_token || user.gmailRefreshToken,
      new Date(credentials.expiry_date)
    );

    res.json({ message: 'Gmail token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Disconnect Gmail
router.post('/disconnect-gmail', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear Gmail tokens
    user.gmailAccessToken = null;
    user.gmailRefreshToken = null;
    user.gmailTokenExpiry = null;
    await user.save();

    res.json({ message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { preferences } = req.body;
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json(user.preferences);
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Test OAuth configuration
router.get('/test-oauth', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'Missing',
    clientUrl: process.env.CLIENT_URL || 'Missing'
  });
});

// Email/Password Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      emailVerified: false // Will be verified via email
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // TODO: Send verification email
    // For now, we'll auto-verify the email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Email/Password Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if user has password (not just Google OAuth)
    if (!user.password) {
      return res.status(401).json({ 
        error: 'Please use Google OAuth to login with this account' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in' 
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        gmailConnected: user.gmailConnected
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account exists, a password reset email has been sent' });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email
    // For now, just return success
    res.json({ 
      message: 'If an account exists, a password reset email has been sent' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        error: 'Token and new password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token' 
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router; 