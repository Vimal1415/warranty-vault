const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const User = require('../models/User');
const Product = require('../models/Product');
const { isAuthenticated } = require('../config/passport');
const EmailParser = require('../utils/emailParser');

const router = express.Router();
const emailParser = new EmailParser();

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

// Configure Gmail API
const gmail = google.gmail('v1');

// Helper function to get Gmail client with token refresh
const getGmailClient = async (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
  
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken
  });

  // Check if token is expired and refresh if needed
  if (user.gmailTokenExpiry && new Date() > user.gmailTokenExpiry) {
    console.log('Token expired, refreshing...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await user.updateGmailTokens(
        credentials.access_token,
        credentials.refresh_token || user.gmailRefreshToken,
        new Date(credentials.expiry_date)
      );
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Gmail access expired. Please reconnect your account.');
    }
  }
  
  return oauth2Client;
};

// Helper function to decode Gmail message
const decodeGmailMessage = (message) => {
  let body = '';
  
  if (message.payload.parts) {
    // Multipart message
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain') {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      } else if (part.mimeType === 'text/html') {
        // Fallback to HTML if plain text not available
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Basic HTML to text conversion
        body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  } else if (message.payload.body.data) {
    // Simple message
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }
  
  return body;
};

// GET /api/emails/sync - Sync emails from Gmail
router.get('/sync', isAuthenticated, async (req, res) => {
  try {
    console.log('=== Email Sync Started ===');
    console.log('User ID:', req.user._id);
    console.log('Gmail Access Token exists:', !!req.user.gmailAccessToken);
    console.log('Gmail Refresh Token exists:', !!req.user.gmailRefreshToken);
    
    const { gmailAccessToken } = req.user;
    
    if (!gmailAccessToken) {
      console.log('No Gmail access token found');
      return res.status(400).json({ 
        message: 'Gmail access token not found. Please reconnect your Gmail account.' 
      });
    }

    const oauth2Client = await getGmailClient(req.user);
    console.log('OAuth2 client created');
    
    // Get recent emails (last 6 months instead of 30 days)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const query = `after:${sixMonthsAgo.toISOString().split('T')[0]}`;
    console.log('Query:', query);
    console.log('Searching emails from:', sixMonthsAgo.toLocaleDateString(), 'to now');

    console.log('Fetching emails from Gmail...');
    const response = await gmail.users.messages.list({
      auth: oauth2Client,
      userId: 'me',
      q: query,
      maxResults: 100
    });

    const messages = response.data.messages || [];
    console.log('Found', messages.length, 'emails in last 6 months');
    
    // If not enough emails found, try searching further back (1 year)
    if (messages.length < 50) {
      console.log('Not many emails found, searching back 1 year...');
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const extendedQuery = `after:${oneYearAgo.toISOString().split('T')[0]}`;
      
      const extendedResponse = await gmail.users.messages.list({
        auth: oauth2Client,
        userId: 'me',
        q: extendedQuery,
        maxResults: 200
      });
      
      const extendedMessages = extendedResponse.data.messages || [];
      console.log('Found', extendedMessages.length, 'emails in last 1 year');
      
      // Use the extended results if we found more emails
      if (extendedMessages.length > messages.length) {
        messages.length = 0; // Clear the array
        messages.push(...extendedMessages);
        console.log('Using extended search results (1 year)');
      }
    }

    const parsedEmails = [];
    const importedProducts = [];
    const skippedEmails = [];

    // Process each email
    for (const message of messages) {
      try {
        console.log('Processing email:', message.id);
        
        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          auth: oauth2Client,
          userId: 'me',
          id: message.id
        });

        const email = {
          id: message.id,
          subject: '',
          from: '',
          date: '',
          body: ''
        };

        // Extract headers
        if (messageDetails.data.payload.headers) {
          for (const header of messageDetails.data.payload.headers) {
            if (header.name === 'Subject') email.subject = header.value;
            if (header.name === 'From') email.from = header.value;
            if (header.name === 'Date') email.date = header.value;
          }
        }

        // Extract body
        email.body = decodeGmailMessage(messageDetails.data);
        console.log('Email subject:', email.subject);

        // Parse email
        const parsedProduct = emailParser.parseEmail(email);
        
        if (parsedProduct) {
          console.log('✅ Parsed product:', parsedProduct.name, 'from:', email.from);
          // Check if product already exists
          const existingProduct = await Product.findOne({
            user: req.user._id,
            emailId: email.id
          });

          if (!existingProduct) {
            parsedEmails.push({
              email: email,
              parsedProduct: parsedProduct
            });
          } else {
            skippedEmails.push({
              email: email,
              reason: 'Already imported'
            });
          }
        } else {
          console.log('❌ Not a purchase email:', email.subject, 'from:', email.from);
          skippedEmails.push({
            email: email,
            reason: 'Not a purchase email'
          });
        }

      } catch (error) {
        console.error(`Error processing email ${message.id}:`, error);
        skippedEmails.push({
          email: { id: message.id, subject: 'Error processing email' },
          reason: 'Processing error'
        });
      }
    }

    console.log('Sync completed. Parsed:', parsedEmails.length, 'Skipped:', skippedEmails.length);

    res.json({
      message: 'Email sync completed',
      stats: {
        totalEmails: messages.length,
        parsedEmails: parsedEmails.length,
        skippedEmails: skippedEmails.length
      },
      parsedEmails: parsedEmails,
      skippedEmails: skippedEmails
    });

  } catch (error) {
    console.error('=== Email Sync Error ===');
    console.error('Error details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        message: 'Gmail access expired. Please reconnect your account.' 
      });
    }
    
    res.status(500).json({ message: 'Failed to sync emails' });
  }
});

// POST /api/emails/import - Import selected emails as products
router.post('/import', isAuthenticated, async (req, res) => {
  try {
    const { emailIds } = req.body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ message: 'Email IDs array is required' });
    }

    const { gmailAccessToken } = req.user;
    const oauth2Client = await getGmailClient(req.user);
    
    const importedProducts = [];
    const failedImports = [];

    for (const emailId of emailIds) {
      try {
        // Get email details
        const messageDetails = await gmail.users.messages.get({
          auth: oauth2Client,
          userId: 'me',
          id: emailId
        });

        const email = {
          id: emailId,
          subject: '',
          from: '',
          date: '',
          body: ''
        };

        // Extract headers
        if (messageDetails.data.payload.headers) {
          for (const header of messageDetails.data.payload.headers) {
            if (header.name === 'Subject') email.subject = header.value;
            if (header.name === 'From') email.from = header.value;
            if (header.name === 'Date') email.date = header.value;
          }
        }

        // Extract body
        email.body = decodeGmailMessage(messageDetails.data);

        // Parse email
        const parsedProduct = emailParser.parseEmail(email);
        
        if (parsedProduct) {
          // Check if already imported
          const existingProduct = await Product.findOne({
            user: req.user._id,
            emailId: emailId
          });

          if (!existingProduct) {
            // Create product
            const product = new Product({
              user: req.user._id,
              name: parsedProduct.name,
              category: parsedProduct.category,
              vendor: parsedProduct.vendor,
              purchaseDate: parsedProduct.purchaseDate,
              warrantyEndDate: parsedProduct.warrantyEndDate,
              price: parsedProduct.price,
              serialNumber: parsedProduct.serialNumber,
              description: parsedProduct.description,
              source: 'email',
              emailId: emailId,
              orderNumber: parsedProduct.orderNumber
            });

            await product.save();
            importedProducts.push(product);
          } else {
            failedImports.push({
              emailId: emailId,
              reason: 'Already imported'
            });
          }
        } else {
          failedImports.push({
            emailId: emailId,
            reason: 'Could not parse product information'
          });
        }

      } catch (error) {
        console.error(`Error importing email ${emailId}:`, error);
        failedImports.push({
          emailId: emailId,
          reason: 'Import error'
        });
      }
    }

    res.json({
      message: 'Import completed',
      stats: {
        total: emailIds.length,
        imported: importedProducts.length,
        failed: failedImports.length
      },
      importedProducts: importedProducts,
      failedImports: failedImports
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Failed to import products' });
  }
});

// GET /api/emails/status - Get email sync status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const { gmailAccessToken } = req.user;
    
    if (!gmailAccessToken) {
      return res.json({
        connected: false,
        message: 'Gmail not connected'
      });
    }

    // Test Gmail connection
    const oauth2Client = await getGmailClient(req.user);
    
    try {
      await gmail.users.getProfile({
        auth: oauth2Client,
        userId: 'me'
      });

      // Get email count
      const response = await gmail.users.messages.list({
        auth: oauth2Client,
        userId: 'me',
        maxResults: 1
      });

      const totalEmails = response.data.resultSizeEstimate || 0;

      res.json({
        connected: true,
        message: 'Gmail connected',
        totalEmails: totalEmails
      });

    } catch (error) {
      res.json({
        connected: false,
        message: 'Gmail access expired'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// GET /api/emails/preview/:emailId - Preview email parsing
router.get('/preview/:emailId', isAuthenticated, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { gmailAccessToken } = req.user;
    
    if (!gmailAccessToken) {
      return res.status(400).json({ 
        message: 'Gmail access token not found' 
      });
    }

    const oauth2Client = await getGmailClient(req.user);
    
    // Get email details
    const messageDetails = await gmail.users.messages.get({
      auth: oauth2Client,
      userId: 'me',
      id: emailId
    });

    const email = {
      id: emailId,
      subject: '',
      from: '',
      date: '',
      body: ''
    };

    // Extract headers
    if (messageDetails.data.payload.headers) {
      for (const header of messageDetails.data.payload.headers) {
        if (header.name === 'Subject') email.subject = header.value;
        if (header.name === 'From') email.from = header.value;
        if (header.name === 'Date') email.date = header.value;
      }
    }

    // Extract body
    email.body = decodeGmailMessage(messageDetails.data);

    // Parse email
    const parsedProduct = emailParser.parseEmail(email);

    res.json({
      email: email,
      parsedProduct: parsedProduct,
      isPurchaseEmail: emailParser.isPurchaseEmail(email)
    });

  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({ message: 'Failed to preview email' });
  }
});

// DELETE /api/emails/disconnect - Disconnect Gmail
router.delete('/disconnect', isAuthenticated, async (req, res) => {
  try {
    // Remove Gmail tokens from user
    req.user.gmailAccessToken = null;
    req.user.gmailRefreshToken = null;
    await req.user.save();

    res.json({ message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Failed to disconnect Gmail' });
  }
});

// Get sync history
router.get('/sync-history', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({
      user: req.user._id,
      source: 'email'
    })
    .select('name vendor purchaseDate warrantyEndDate createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

    // Add id field for frontend consistency
    const productsWithId = products.map(product => ({
      ...product.toObject(),
      id: product._id
    }));

    res.json(productsWithId);
  } catch (error) {
    console.error('Sync history error:', error);
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

// Manual email parsing (for testing)
router.post('/parse-test', authenticateToken, async (req, res) => {
  try {
    const { emailContent, subject, from } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    const email = {
      id: 'test',
      subject: subject || '',
      from: from || '',
      date: new Date().toISOString(),
      body: emailContent
    };

    const parsedData = emailParser.parseEmail(email);
    
    res.json({
      success: true,
      parsedData,
      isPurchaseEmail: emailParser.isPurchaseEmail(email)
    });
  } catch (error) {
    console.error('Test parsing error:', error);
    res.status(500).json({ error: 'Failed to parse email content' });
  }
});

// Get email providers list
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = [
      { name: 'Amazon', domain: 'amazon.com', supported: true },
      { name: 'Flipkart', domain: 'flipkart.com', supported: true },
      { name: 'Croma', domain: 'croma.com', supported: true },
      { name: 'Best Buy', domain: 'bestbuy.com', supported: true },
      { name: 'Walmart', domain: 'walmart.com', supported: true },
      { name: 'Target', domain: 'target.com', supported: false },
      { name: 'Home Depot', domain: 'homedepot.com', supported: false }
    ];

    res.json(providers);
  } catch (error) {
    console.error('Providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/emails/test - Test Gmail API connection
router.get('/test', isAuthenticated, async (req, res) => {
  try {
    console.log('=== Gmail API Test ===');
    const { gmailAccessToken } = req.user;
    
    if (!gmailAccessToken) {
      return res.status(400).json({ 
        message: 'Gmail access token not found' 
      });
    }

    const oauth2Client = await getGmailClient(req.user);
    
    // Test basic Gmail API call
    const profile = await gmail.users.getProfile({
      auth: oauth2Client,
      userId: 'me'
    });

    res.json({
      success: true,
      message: 'Gmail API connection successful',
      profile: profile.data
    });

  } catch (error) {
    console.error('Gmail API test error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gmail API test failed',
      error: error.message 
    });
  }
});

module.exports = router; 