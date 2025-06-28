const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: [
    'profile',
    'email'
  ],
  accessType: 'offline',
  prompt: 'consent'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Update existing user with Google ID
        user.googleId = profile.id;
        user.name = profile.displayName;
        user.avatar = profile.photos[0]?.value;
        user.gmailAccessToken = accessToken;
        user.gmailRefreshToken = refreshToken;
        user.gmailTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
      } else {
        // Create new user
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
          gmailAccessToken: accessToken,
          gmailRefreshToken: refreshToken,
          gmailTokenExpiry: new Date(Date.now() + 3600000) // 1 hour
        });
        await user.save();
      }
    } else {
      // Update existing user's tokens
      user.gmailAccessToken = accessToken;
      user.gmailRefreshToken = refreshToken;
      user.gmailTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();
    }
    
    return done(null, {
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Passport strategy error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// JWT Authentication middleware
const isAuthenticated = async (req, res, next) => {
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

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { passport, isAuthenticated }; 