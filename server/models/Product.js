const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Electronics',
      'Appliances', 
      'Furniture',
      'Clothing',
      'Books',
      'Sports Equipment',
      'Tools',
      'Automotive',
      'Home & Garden',
      'Other'
    ],
    default: 'Other'
  },
  vendor: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  warrantyEndDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  receiptImage: {
    type: String // URL to stored image
  },
  warrantyDocument: {
    type: String // URL to stored document
  },
  source: {
    type: String,
    enum: ['email', 'manual'],
    default: 'manual'
  },
  emailId: {
    type: String // Gmail message ID if parsed from email
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ user: 1, warrantyEndDate: 1 });
productSchema.index({ user: 1, category: 1 });
productSchema.index({ user: 1, vendor: 1 });
productSchema.index({ warrantyEndDate: 1 }); // for reminder queries

// Virtual for days until warranty expires
productSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.warrantyEndDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for warranty status
productSchema.virtual('warrantyStatus').get(function() {
  const daysLeft = this.daysUntilExpiry;
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring';
  return 'active';
});

// Method to check if reminder should be sent
productSchema.methods.shouldSendReminder = function(reminderDays = 7) {
  const daysLeft = this.daysUntilExpiry;
  return daysLeft <= reminderDays && daysLeft > 0 && !this.reminderSent;
};

// Pre-save middleware to validate dates
productSchema.pre('save', function(next) {
  if (this.purchaseDate && this.warrantyEndDate) {
    if (this.warrantyEndDate <= this.purchaseDate) {
      return next(new Error('Warranty end date must be after purchase date'));
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema); 