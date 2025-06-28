const express = require('express');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Product = require('../models/Product');
const router = express.Router();
const { isAuthenticated } = require('../config/passport');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
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

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send reminder email
const sendReminderEmail = async (user, products) => {
  try {
    const transporter = createTransporter();
    
    const productList = products.map(product => {
      const daysLeft = Math.ceil((new Date(product.warrantyEndDate) - new Date()) / (1000 * 60 * 60 * 24));
      const urgencyClass = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'warning' : 'normal';
      
      return `
        <tr class="${urgencyClass}">
          <td style="padding: 12px; border: 1px solid #ddd;">${product.name}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${product.vendor || 'N/A'}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${new Date(product.warrantyEndDate).toLocaleDateString()}</td>
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: ${daysLeft <= 3 ? '#d32f2f' : daysLeft <= 7 ? '#f57c00' : '#388e3c'};">${daysLeft} days</td>
        </tr>
      `;
    }).join('');

    const urgentCount = products.filter(p => {
      const daysLeft = Math.ceil((new Date(p.warrantyEndDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 3;
    }).length;

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Warranty Expiry Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; text-align: center; font-size: 28px;">🔔 WarrantyVault Alert</h1>
            <p style="color: white; text-align: center; margin: 10px 0 0 0; font-size: 16px;">Warranty Expiry Reminder</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${user.name},</h2>
            <p>We've detected that you have <strong>${products.length} product${products.length > 1 ? 's' : ''}</strong> with warranty${products.length > 1 ? 'ies' : ''} expiring soon.</p>
            ${urgentCount > 0 ? `<p style="color: #d32f2f; font-weight: bold;">⚠️ ${urgentCount} product${urgentCount > 1 ? 's' : ''} ${urgentCount > 1 ? 'are' : 'is'} expiring within 3 days!</p>` : ''}
          </div>

          <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 15px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Product</th>
                  <th style="padding: 15px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Vendor</th>
                  <th style="padding: 15px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Expiry Date</th>
                  <th style="padding: 15px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Days Left</th>
                </tr>
              </thead>
              <tbody>
                ${productList}
              </tbody>
            </table>
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1976d2; margin-top: 0;">Recommended Actions:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Contact the vendor to extend your warranty</li>
              <li>Check if you're eligible for warranty claims</li>
              <li>Consider purchasing extended warranty coverage</li>
              <li>Document any issues before warranty expires</li>
            </ul>
          </div>

          <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <a href="${process.env.CLIENT_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Dashboard</a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            <p>This is an automated reminder from WarrantyVault</p>
            <p>You can manage your notification preferences in your account settings</p>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"WarrantyVault" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🔔 Warranty Alert: ${products.length} product${products.length > 1 ? 's' : ''} expiring soon`,
      html: emailContent
    });

    console.log(`Email reminder sent to ${user.email} for ${products.length} products`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// GET /api/reminders/upcoming - Get products with upcoming warranty expiry
router.get('/upcoming', isAuthenticated, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));

    const upcomingProducts = await Product.find({
      user: req.user._id,
      warrantyEndDate: {
        $gte: new Date(),
        $lte: daysFromNow
      },
      isActive: true
    }).sort({ warrantyEndDate: 1 });

    // Add calculated fields
    const productsWithStatus = upcomingProducts.map(product => ({
      ...product.toObject(),
      id: product._id,
      daysUntilExpiry: product.daysUntilExpiry,
      warrantyStatus: product.warrantyStatus
    }));

    res.json({
      products: productsWithStatus,
      count: productsWithStatus.length
    });

  } catch (error) {
    console.error('Error fetching upcoming expiries:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming expiries' });
  }
});

// GET /api/reminders/expired - Get expired products
router.get('/expired', isAuthenticated, async (req, res) => {
  try {
    const expiredProducts = await Product.find({
      user: req.user._id,
      warrantyEndDate: { $lt: new Date() },
      isActive: true
    }).sort({ warrantyEndDate: -1 });

    const productsWithStatus = expiredProducts.map(product => ({
      ...product.toObject(),
      id: product._id,
      daysUntilExpiry: product.daysUntilExpiry,
      warrantyStatus: product.warrantyStatus
    }));

    res.json({
      products: productsWithStatus,
      count: productsWithStatus.length
    });

  } catch (error) {
    console.error('Error fetching expired products:', error);
    res.status(500).json({ message: 'Failed to fetch expired products' });
  }
});

// POST /api/reminders/send - Send reminder for specific product
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { productId, reminderType = 'email' } = req.body;

    const product = await Product.findOne({ _id: productId, user: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if reminder should be sent
    if (!product.shouldSendReminder()) {
      return res.status(400).json({ 
        message: 'Reminder not needed or already sent',
        daysUntilExpiry: product.daysUntilExpiry
      });
    }

    // Send email reminder
    if (reminderType === 'email' && req.user.emailReminders !== false) {
      const success = await sendReminderEmail(req.user, [product]);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to send email reminder' });
      }
    }

    // Mark as sent
    product.reminderSent = true;
    product.lastReminderDate = new Date();
    await product.save();

    res.json({
      message: 'Reminder sent successfully',
      product: {
        id: product._id,
        name: product.name,
        warrantyEndDate: product.warrantyEndDate,
        daysUntilExpiry: product.daysUntilExpiry,
        reminderSent: product.reminderSent,
        lastReminderDate: product.lastReminderDate
      }
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ message: 'Failed to send reminder' });
  }
});

// POST /api/reminders/send-bulk - Send reminders for multiple products
router.post('/send-bulk', isAuthenticated, async (req, res) => {
  try {
    const { productIds, reminderType = 'email' } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'Product IDs array is required' });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      user: req.user._id,
      isActive: true
    });

    const results = [];
    const now = new Date();
    const productsToSend = [];

    for (const product of products) {
      if (product.shouldSendReminder()) {
        productsToSend.push(product);
        results.push({
          id: product._id,
          name: product.name,
          status: 'pending',
          daysUntilExpiry: product.daysUntilExpiry
        });
      } else {
        results.push({
          id: product._id,
          name: product.name,
          status: 'skipped',
          reason: product.reminderSent ? 'Already sent' : 'Not expiring soon',
          daysUntilExpiry: product.daysUntilExpiry
        });
      }
    }

    // Send bulk email if there are products to send
    if (productsToSend.length > 0 && reminderType === 'email' && req.user.emailReminders !== false) {
      const success = await sendReminderEmail(req.user, productsToSend);
      
      if (success) {
        // Mark reminders as sent
        await Product.updateMany(
          { _id: { $in: productsToSend.map(p => p._id) } },
          { 
            reminderSent: true,
            lastReminderDate: now
          }
        );

        // Update results
        results.forEach(result => {
          if (result.status === 'pending') {
            result.status = 'sent';
          }
        });
      } else {
        // Update results to show failure
        results.forEach(result => {
          if (result.status === 'pending') {
            result.status = 'failed';
            result.reason = 'Email sending failed';
          }
        });
      }
    }

    res.json({
      message: 'Bulk reminder operation completed',
      results,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length
    });

  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    res.status(500).json({ message: 'Failed to send bulk reminders' });
  }
});

// GET /api/reminders/settings - Get user reminder settings
router.get('/settings', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      settings: {
        emailReminders: user.emailReminders !== false, // Default to true
        reminderDays: user.reminderDays || 7, // Default 7 days
        reminderFrequency: user.reminderFrequency || 'once', // once, daily, weekly
        lastReminderCheck: user.lastReminderCheck
      }
    });

  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    res.status(500).json({ message: 'Failed to fetch reminder settings' });
  }
});

// PUT /api/reminders/settings - Update user reminder settings
router.put('/settings', isAuthenticated, async (req, res) => {
  try {
    const { emailReminders, reminderDays, reminderFrequency } = req.body;

    const updateData = {};
    if (typeof emailReminders === 'boolean') updateData.emailReminders = emailReminders;
    if (reminderDays) updateData.reminderDays = parseInt(reminderDays);
    if (reminderFrequency) updateData.reminderFrequency = reminderFrequency;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );

    res.json({
      message: 'Reminder settings updated successfully',
      settings: {
        emailReminders: user.emailReminders,
        reminderDays: user.reminderDays,
        reminderFrequency: user.reminderFrequency
      }
    });

  } catch (error) {
    console.error('Error updating reminder settings:', error);
    res.status(500).json({ message: 'Failed to update reminder settings' });
  }
});

// GET /api/reminders/stats - Get reminder statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const stats = await Product.aggregate([
      {
        $match: {
          user: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeWarranties: {
            $sum: {
              $cond: [{ $gt: ['$warrantyEndDate', now] }, 1, 0]
            }
          },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$warrantyEndDate', now] },
                    { $lte: ['$warrantyEndDate', thirtyDaysFromNow] }
                  ]
                },
                1,
                0
              ]
            }
          },
          expiredWarranties: {
            $sum: {
              $cond: [{ $lte: ['$warrantyEndDate', now] }, 1, 0]
            }
          },
          remindersSent: {
            $sum: {
              $cond: [{ $eq: ['$reminderSent', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalProducts: 0,
      activeWarranties: 0,
      expiringSoon: 0,
      expiredWarranties: 0,
      remindersSent: 0
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    res.status(500).json({ message: 'Failed to fetch reminder statistics' });
  }
});

// POST /api/reminders/reset - Reset reminder status for a product
router.post('/reset', isAuthenticated, async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findOne({ _id: productId, user: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.reminderSent = false;
    product.lastReminderDate = null;
    await product.save();

    res.json({
      message: 'Reminder status reset successfully',
      product: {
        id: product._id,
        name: product.name,
        reminderSent: product.reminderSent,
        lastReminderDate: product.lastReminderDate
      }
    });

  } catch (error) {
    console.error('Error resetting reminder:', error);
    res.status(500).json({ message: 'Failed to reset reminder status' });
  }
});

// POST /api/reminders/test-email - Send test email
router.post('/test-email', isAuthenticated, async (req, res) => {
  try {
    // Check if email configuration is set up
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        message: 'Email configuration not set up',
        error: 'Please configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your .env file',
        missing: {
          EMAIL_HOST: !process.env.EMAIL_HOST,
          EMAIL_USER: !process.env.EMAIL_USER,
          EMAIL_PASS: !process.env.EMAIL_PASS
        }
      });
    }

    // Create a mock product for testing
    const mockProduct = {
      name: 'Test Product',
      vendor: 'Test Vendor',
      warrantyEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      serialNumber: 'TEST-123456'
    };

    const success = await sendReminderEmail(req.user, [mockProduct]);
    
    if (success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send test email - check email configuration' });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    
    // Provide specific error messages based on the error type
    if (error.code === 'EAUTH') {
      res.status(400).json({ 
        message: 'Email authentication failed',
        error: 'Please check your EMAIL_USER and EMAIL_PASS. For Gmail, use an App Password if 2FA is enabled.'
      });
    } else if (error.code === 'ECONNECTION') {
      res.status(400).json({ 
        message: 'Email connection failed',
        error: 'Please check your EMAIL_HOST and EMAIL_PORT settings.'
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to send test email',
        error: error.message 
      });
    }
  }
});

// Scheduled job to send reminders (runs daily at 9 AM)
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running daily reminder check...');
    
    const now = new Date();
    const users = await User.find({ isActive: true });
    
    for (const user of users) {
      if (!user.preferences.emailNotifications) continue;
      
      const reminderDays = user.preferences.reminderDays || 7;
      const reminderDate = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);
      
      const products = await Product.find({
        user: user._id,
        isActive: true,
        warrantyEndDate: { $lte: reminderDate, $gt: now },
        reminderSent: false
      });
      
      if (products.length > 0) {
        const success = await sendReminderEmail(user, products);
        
        if (success) {
          // Mark reminders as sent
          await Product.updateMany(
            { _id: { $in: products.map(p => p._id) } },
            { 
              reminderSent: true,
              lastReminderDate: now
            }
          );
          
          console.log(`Sent reminders to ${user.email} for ${products.length} products`);
        }
      }
    }
  } catch (error) {
    console.error('Scheduled reminder error:', error);
  }
});

module.exports = router; 