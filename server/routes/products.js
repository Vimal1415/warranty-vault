const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const { isAuthenticated } = require('../config/passport');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'receiptImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for receipts'));
      }
    } else if (file.fieldname === 'warrantyDocument') {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF and Word documents are allowed for warranty documents'));
      }
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// GET /api/products - Get all products for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { 
      search, 
      category, 
      status, 
      sortBy = 'name', 
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = { user: req.user._id };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    // Status filter
    if (status) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      switch (status) {
        case 'active':
          query.warrantyEndDate = { $gt: thirtyDaysFromNow };
          break;
        case 'expiring':
          query.warrantyEndDate = { 
            $gte: now, 
            $lte: thirtyDaysFromNow 
          };
          break;
        case 'expired':
          query.warrantyEndDate = { $lt: now };
          break;
      }
    }

    // Build sort object
    let sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Add computed fields
    const productsWithComputedFields = products.map(product => {
      const now = new Date();
      const warrantyDate = new Date(product.warrantyEndDate);
      const diffTime = warrantyDate - now;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status = 'active';
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 30) status = 'expiring';

      return {
        ...product,
        id: product._id,
        daysLeft,
        status
      };
    });

    res.json({
      products: productsWithComputedFields,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// GET /api/products/stats - Get product statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [total, active, expiringSoon, expired] = await Promise.all([
      Product.countDocuments({ user: req.user._id }),
      Product.countDocuments({ 
        user: req.user._id, 
        warrantyEndDate: { $gt: thirtyDaysFromNow } 
      }),
      Product.countDocuments({ 
        user: req.user._id, 
        warrantyEndDate: { 
          $gte: now, 
          $lte: thirtyDaysFromNow 
        } 
      }),
      Product.countDocuments({ 
        user: req.user._id, 
        warrantyEndDate: { $lt: now } 
      })
    ]);

    res.json({
      total,
      active,
      expiringSoon,
      expired
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ message: 'Failed to fetch product statistics' });
  }
});

// POST /api/products - Create a new product
router.post('/', isAuthenticated, upload.fields([
  { name: 'receiptImage', maxCount: 1 },
  { name: 'warrantyDocument', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name,
      category,
      vendor,
      serialNumber,
      description,
      purchaseDate,
      warrantyEndDate,
      price,
      currency = 'USD'
    } = req.body;

    // Validate required fields
    if (!name || !category || !vendor || !purchaseDate || !warrantyEndDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, category, vendor, purchaseDate, warrantyEndDate' 
      });
    }

    // Validate dates
    const purchase = new Date(purchaseDate);
    const warranty = new Date(warrantyEndDate);
    
    if (warranty <= purchase) {
      return res.status(400).json({ 
        message: 'Warranty end date must be after purchase date' 
      });
    }

    // Handle file uploads
    let receiptImageUrl = null;
    let warrantyDocumentUrl = null;

    if (req.files?.receiptImage) {
      const file = req.files.receiptImage[0];
      receiptImageUrl = `/uploads/${file.filename}`;
    }

    if (req.files?.warrantyDocument) {
      const file = req.files.warrantyDocument[0];
      warrantyDocumentUrl = `/uploads/${file.filename}`;
    }

    // Create product
    const product = new Product({
      user: req.user._id,
      name: name.trim(),
      category,
      vendor: vendor.trim(),
      serialNumber: serialNumber?.trim(),
      description: description?.trim(),
      purchaseDate: purchase,
      warrantyEndDate: warranty,
      price: price ? parseFloat(price) : null,
      currency,
      receiptImage: receiptImageUrl,
      warrantyDocument: warrantyDocumentUrl
    });

    await product.save();

    // Return product with computed fields
    const productWithComputedFields = {
      ...product.toObject(),
      daysLeft: product.daysUntilExpiry,
      status: product.warrantyStatus
    };

    res.status(201).json({
      message: 'Product created successfully',
      product: productWithComputedFields
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Clean up uploaded files if product creation failed
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }

    res.status(500).json({ message: 'Failed to create product' });
  }
});

// GET /api/products/:id - Get a specific product
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productWithComputedFields = {
      ...product.toObject(),
      daysLeft: product.daysUntilExpiry,
      status: product.warrantyStatus
    };

    res.json(productWithComputedFields);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', isAuthenticated, upload.fields([
  { name: 'receiptImage', maxCount: 1 },
  { name: 'warrantyDocument', maxCount: 1 }
]), async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      name,
      category,
      vendor,
      serialNumber,
      description,
      purchaseDate,
      warrantyEndDate,
      price,
      currency
    } = req.body;

    // Update fields
    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (vendor) product.vendor = vendor.trim();
    if (serialNumber !== undefined) product.serialNumber = serialNumber?.trim();
    if (description !== undefined) product.description = description?.trim();
    if (purchaseDate) product.purchaseDate = new Date(purchaseDate);
    if (warrantyEndDate) product.warrantyEndDate = new Date(warrantyEndDate);
    if (price !== undefined) product.price = price ? parseFloat(price) : null;
    if (currency) product.currency = currency;

    // Handle file uploads
    if (req.files?.receiptImage) {
      // Delete old file if exists
      if (product.receiptImage) {
        const oldPath = path.join(__dirname, '..', product.receiptImage);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') console.error('Error deleting old receipt:', err);
        });
      }
      
      const file = req.files.receiptImage[0];
      product.receiptImage = `/uploads/${file.filename}`;
    }

    if (req.files?.warrantyDocument) {
      // Delete old file if exists
      if (product.warrantyDocument) {
        const oldPath = path.join(__dirname, '..', product.warrantyDocument);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') console.error('Error deleting old document:', err);
        });
      }
      
      const file = req.files.warrantyDocument[0];
      product.warrantyDocument = `/uploads/${file.filename}`;
    }

    await product.save();

    const productWithComputedFields = {
      ...product.toObject(),
      daysLeft: product.daysUntilExpiry,
      status: product.warrantyStatus
    };

    res.json({
      message: 'Product updated successfully',
      product: productWithComputedFields
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Clean up uploaded files if update failed
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }

    res.status(500).json({ message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated files
    if (product.receiptImage) {
      const receiptPath = path.join(__dirname, '..', product.receiptImage);
      fs.unlink(receiptPath, (err) => {
        if (err && err.code !== 'ENOENT') console.error('Error deleting receipt:', err);
      });
    }

    if (product.warrantyDocument) {
      const docPath = path.join(__dirname, '..', product.warrantyDocument);
      fs.unlink(docPath, (err) => {
        if (err && err.code !== 'ENOENT') console.error('Error deleting document:', err);
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// DELETE /api/products/bulk - Delete multiple products
router.delete('/bulk', isAuthenticated, async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Product IDs array is required' });
    }

    // Get products to delete (for file cleanup)
    const products = await Product.find({ 
      _id: { $in: productIds }, 
      user: req.user._id 
    });

    // Delete associated files
    products.forEach(product => {
      if (product.receiptImage) {
        const receiptPath = path.join(__dirname, '..', product.receiptImage);
        fs.unlink(receiptPath, (err) => {
          if (err && err.code !== 'ENOENT') console.error('Error deleting receipt:', err);
        });
      }

      if (product.warrantyDocument) {
        const docPath = path.join(__dirname, '..', product.warrantyDocument);
        fs.unlink(docPath, (err) => {
          if (err && err.code !== 'ENOENT') console.error('Error deleting document:', err);
        });
      }
    });

    // Delete products
    const result = await Product.deleteMany({ 
      _id: { $in: productIds }, 
      user: req.user._id 
    });

    res.json({ 
      message: `${result.deletedCount} product(s) deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting products:', error);
    res.status(500).json({ message: 'Failed to delete products' });
  }
});

// PUT /api/products/:id/warranty - Update product warranty
router.put('/:id/warranty', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { warrantyPeriod, warrantyEndDate, warrantyStartDate } = req.body;

    const product = await Product.findOne({ _id: id, user: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update warranty information
    if (warrantyPeriod) {
      // Calculate warranty end date based on period (in months)
      const startDate = warrantyStartDate ? new Date(warrantyStartDate) : new Date(product.purchaseDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(warrantyPeriod));
      product.warrantyEndDate = endDate;
    } else if (warrantyEndDate) {
      // Direct warranty end date provided
      product.warrantyEndDate = new Date(warrantyEndDate);
    }

    // Reset reminder status when warranty is updated
    product.reminderSent = false;
    product.lastReminderDate = null;

    await product.save();

    res.json({
      message: 'Warranty updated successfully',
      product: {
        id: product._id,
        name: product.name,
        warrantyEndDate: product.warrantyEndDate,
        daysUntilExpiry: product.daysUntilExpiry,
        warrantyStatus: product.warrantyStatus
      }
    });

  } catch (error) {
    console.error('Warranty update error:', error);
    res.status(500).json({ message: 'Failed to update warranty' });
  }
});

// GET /api/products/:id/warranty-info - Get warranty information
router.get('/:id/warranty-info', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, user: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Calculate warranty period in months
    const purchaseDate = new Date(product.purchaseDate);
    const warrantyEndDate = new Date(product.warrantyEndDate);
    const warrantyPeriod = Math.round((warrantyEndDate - purchaseDate) / (1000 * 60 * 60 * 24 * 30.44));

    res.json({
      product: {
        id: product._id,
        name: product.name,
        purchaseDate: product.purchaseDate,
        warrantyEndDate: product.warrantyEndDate,
        warrantyPeriod: warrantyPeriod,
        daysUntilExpiry: product.daysUntilExpiry,
        warrantyStatus: product.warrantyStatus,
        reminderSent: product.reminderSent,
        lastReminderDate: product.lastReminderDate
      }
    });

  } catch (error) {
    console.error('Warranty info error:', error);
    res.status(500).json({ message: 'Failed to get warranty information' });
  }
});

// POST /api/products/:id/extend-warranty - Extend warranty period
router.post('/:id/extend-warranty', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalMonths } = req.body;

    if (!additionalMonths || additionalMonths <= 0) {
      return res.status(400).json({ message: 'Additional months must be greater than 0' });
    }

    const product = await Product.findOne({ _id: id, user: req.user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Extend warranty by adding months to current end date
    const newEndDate = new Date(product.warrantyEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(additionalMonths));
    
    product.warrantyEndDate = newEndDate;
    product.reminderSent = false;
    product.lastReminderDate = null;

    await product.save();

    res.json({
      message: 'Warranty extended successfully',
      product: {
        id: product._id,
        name: product.name,
        warrantyEndDate: product.warrantyEndDate,
        daysUntilExpiry: product.daysUntilExpiry,
        warrantyStatus: product.warrantyStatus
      }
    });

  } catch (error) {
    console.error('Warranty extension error:', error);
    res.status(500).json({ message: 'Failed to extend warranty' });
  }
});

module.exports = router; 