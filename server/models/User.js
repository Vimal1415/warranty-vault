const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if user doesn't have Google ID
      return !this.googleId;
    },
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String
  },
  gmailAccessToken: {
    type: String
  },
  gmailRefreshToken: {
    type: String
  },
  gmailTokenExpiry: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  preferences: {
    reminderDays: {
      type: Number,
      default: 7
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    whatsappNotifications: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  // Reminder settings
  emailReminders: {
    type: Boolean,
    default: true
  },
  reminderDays: {
    type: Number,
    default: 7
  },
  reminderFrequency: {
    type: String,
    enum: ['once', 'daily', 'weekly'],
    default: 'once'
  },
  lastReminderCheck: {
    type: Date
  },
  lastEmailSync: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for checking if Gmail is connected
userSchema.virtual('gmailConnected').get(function() {
  return !!(this.gmailAccessToken && this.gmailRefreshToken);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
  return token;
};

// Method to update Gmail tokens
userSchema.methods.updateGmailTokens = function(accessToken, refreshToken, expiry) {
  this.gmailAccessToken = accessToken;
  this.gmailRefreshToken = refreshToken;
  this.gmailTokenExpiry = expiry;
  return this.save();
};

// Method to check if Gmail token is expired
userSchema.methods.isGmailTokenExpired = function() {
  if (!this.gmailTokenExpiry) return true;
  return new Date() > this.gmailTokenExpiry;
};

module.exports = mongoose.model('User', userSchema); 