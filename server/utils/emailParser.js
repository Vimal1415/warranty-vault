const cheerio = require('cheerio');
const nlp = require('compromise');
const moment = require('moment');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// Extract text content from Gmail message
const extractTextFromGmail = (emailData) => {
  let text = '';
  
  const extractFromPart = (part) => {
    if (part.body && part.body.data) {
      if (part.mimeType === 'text/html') {
        const html = Buffer.from(part.body.data, 'base64').toString();
        const $ = cheerio.load(html);
        text += $('body').text() + ' ';
      } else if (part.mimeType === 'text/plain') {
        text += Buffer.from(part.body.data, 'base64').toString() + ' ';
      }
    }
    
    if (part.parts) {
      part.parts.forEach(extractFromPart);
    }
  };
  
  if (emailData.payload) {
    extractFromPart(emailData.payload);
  }
  
  return text.trim();
};

// Parse date from various formats
const parseDate = (text) => {
  // Common date patterns
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, // YYYY/MM/DD or YYYY-MM-DD
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g, // Month DD, YYYY
    /(\d{1,2})\s+(\w+)\s+(\d{4})/g, // DD Month YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = moment(match[0], [
        'DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD', 'YYYY-MM-DD',
        'MMM DD, YYYY', 'DD MMM YYYY'
      ]);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }
  }
  
  // Try NLP date parsing
  const doc = nlp(text);
  const dates = doc.dates().out('array');
  if (dates.length > 0) {
    return new Date(dates[0]);
  }
  
  return null;
};

// Extract warranty duration
const extractWarrantyDuration = (text) => {
  const warrantyPatterns = [
    /(\d+)\s*(?:year|yr)s?\s*warranty/gi,
    /(\d+)\s*(?:month|mon)s?\s*warranty/gi,
    /warranty\s*for\s*(\d+)\s*(?:year|yr|month|mon)/gi,
    /(\d+)\s*(?:year|yr|month|mon)\s*guarantee/gi,
    /guarantee\s*for\s*(\d+)\s*(?:year|yr|month|mon)/gi,
  ];
  
  for (const pattern of warrantyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const duration = parseInt(match[1]);
      if (pattern.source.includes('month') || pattern.source.includes('mon')) {
        return duration;
      } else {
        return duration * 12; // Convert years to months
      }
    }
  }
  
  // Default warranty periods for common products
  const defaultWarranties = {
    'laptop': 12,
    'phone': 12,
    'tablet': 12,
    'tv': 12,
    'refrigerator': 24,
    'washing machine': 24,
    'air conditioner': 12,
    'microwave': 12,
    'blender': 12,
    'toaster': 12,
  };
  
  const lowerText = text.toLowerCase();
  for (const [product, months] of Object.entries(defaultWarranties)) {
    if (lowerText.includes(product)) {
      return months;
    }
  }
  
  return 12; // Default 1 year warranty
};

// Extract product information
const extractProductInfo = (text, subject, from) => {
  // Remove common email noise
  const cleanText = text
    .replace(/unsubscribe|click here|view in browser/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract product name from subject or text
  let productName = '';
  
  // Common product patterns
  const productPatterns = [
    /ordered:\s*(.+?)(?:\n|$)/i,
    /item:\s*(.+?)(?:\n|$)/i,
    /product:\s*(.+?)(?:\n|$)/i,
    /purchased:\s*(.+?)(?:\n|$)/i,
  ];
  
  for (const pattern of productPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      productName = match[1].trim();
      break;
    }
  }
  
  // If no pattern match, try to extract from subject
  if (!productName && subject) {
    const subjectClean = subject
      .replace(/order confirmation|invoice|receipt|purchase/gi, '')
      .replace(/amazon|flipkart|croma|bestbuy|walmart/gi, '')
      .trim();
    
    if (subjectClean.length > 3) {
      productName = subjectClean;
    }
  }
  
  // Extract brand and model
  let brand = '';
  let model = '';
  
  // Common brand patterns
  const brands = [
    'Samsung', 'Apple', 'LG', 'Sony', 'Panasonic', 'Whirlpool', 'Bosch',
    'Philips', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Canon', 'Nikon',
    'JBL', 'Bose', 'Sennheiser', 'Nike', 'Adidas', 'Puma', 'Reebok'
  ];
  
  for (const brandName of brands) {
    if (cleanText.toLowerCase().includes(brandName.toLowerCase())) {
      brand = brandName;
      break;
    }
  }
  
  // Extract vendor from email
  let vendor = '';
  if (from.includes('amazon')) vendor = 'Amazon';
  else if (from.includes('flipkart')) vendor = 'Flipkart';
  else if (from.includes('croma')) vendor = 'Croma';
  else if (from.includes('bestbuy')) vendor = 'Best Buy';
  else if (from.includes('walmart')) vendor = 'Walmart';
  
  // Extract price
  const pricePattern = /(?:price|total|amount|cost):\s*[\$₹€£]?\s*([\d,]+\.?\d*)/gi;
  const priceMatch = cleanText.match(pricePattern);
  let price = null;
  let currency = 'USD';
  
  if (priceMatch) {
    price = parseFloat(priceMatch[0].replace(/[^\d.]/g, ''));
    if (cleanText.includes('₹')) currency = 'INR';
    else if (cleanText.includes('€')) currency = 'EUR';
    else if (cleanText.includes('£')) currency = 'GBP';
  }
  
  // Extract invoice number
  const invoicePattern = /(?:invoice|order|receipt)\s*(?:number|#|no):\s*([A-Z0-9\-]+)/gi;
  const invoiceMatch = cleanText.match(invoicePattern);
  const invoiceNumber = invoiceMatch ? invoiceMatch[1] : '';
  
  // Determine category
  const categories = {
    'Electronics': ['laptop', 'phone', 'tablet', 'tv', 'camera', 'headphone', 'speaker'],
    'Appliances': ['refrigerator', 'washing', 'air conditioner', 'microwave', 'blender'],
    'Furniture': ['chair', 'table', 'bed', 'sofa', 'cabinet', 'desk'],
    'Clothing': ['shirt', 'pant', 'dress', 'shoe', 'jacket', 'sweater'],
    'Sports': ['gym', 'fitness', 'sport', 'exercise', 'yoga'],
    'Books': ['book', 'novel', 'textbook', 'magazine']
  };
  
  let category = 'Other';
  const lowerText = cleanText.toLowerCase();
  
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  return {
    name: productName,
    brand,
    model,
    vendor,
    price,
    currency,
    invoiceNumber,
    category
  };
};

class EmailParser {
  constructor() {
    // Common e-commerce domains
    this.ecommerceDomains = [
      'amazon.com', 'amazon.in', 'flipkart.com', 'myntra.com', 'snapdeal.com',
      'paytmmall.com', 'jiomart.com', 'bigbasket.com', 'grofers.com',
      'apple.com', 'samsung.com', 'dell.com', 'hp.com', 'lenovo.com',
      'bestbuy.com', 'walmart.com', 'target.com', 'costco.com',
      'verizon.com', 'att.com', 'tmobile.com', 'sprint.com'
    ];

    // Product keywords to identify purchase emails
    this.purchaseKeywords = [
      'order', 'purchase', 'receipt', 'invoice', 'confirmation',
      'shipped', 'delivered', 'payment', 'transaction', 'billing',
      'order confirmation', 'purchase receipt', 'order details',
      'shipping confirmation', 'delivery confirmation'
    ];

    // Warranty keywords
    this.warrantyKeywords = [
      'warranty', 'guarantee', 'coverage', 'protection', 'assurance',
      'extended warranty', 'manufacturer warranty', 'limited warranty',
      'warranty period', 'warranty coverage', 'warranty terms'
    ];

    // Common product categories
    this.productCategories = {
      'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'tv', 'television', 'camera', 'headphone', 'speaker', 'printer', 'monitor', 'keyboard', 'mouse'],
      'Appliances': ['refrigerator', 'washing machine', 'microwave', 'oven', 'dishwasher', 'air conditioner', 'fan', 'heater', 'vacuum', 'blender'],
      'Furniture': ['chair', 'table', 'bed', 'sofa', 'desk', 'cabinet', 'shelf', 'mattress', 'dresser', 'bookshelf'],
      'Clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'sweater', 'jeans', 't-shirt', 'hoodie', 'coat'],
      'Books': ['book', 'novel', 'textbook', 'magazine', 'journal', 'manual', 'guide', 'dictionary'],
      'Sports Equipment': ['bicycle', 'treadmill', 'dumbbell', 'yoga mat', 'tennis racket', 'football', 'basketball', 'gym equipment'],
      'Tools': ['drill', 'hammer', 'saw', 'wrench', 'screwdriver', 'pliers', 'toolbox', 'power tool'],
      'Automotive': ['car', 'bike', 'motorcycle', 'tire', 'battery', 'oil', 'filter', 'brake', 'engine'],
      'Home & Garden': ['plant', 'garden', 'lawn mower', 'shovel', 'rake', 'fertilizer', 'seed', 'pot', 'soil']
    };
  }

  // Check if email is a purchase email
  isPurchaseEmail(email) {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || '').toLowerCase();
    const from = (email.from || '').toLowerCase();

    // Check if from e-commerce domain
    const isFromEcommerce = this.ecommerceDomains.some(domain => 
      from.includes(domain)
    );

    // Check for purchase keywords in subject or body
    const hasPurchaseKeywords = this.purchaseKeywords.some(keyword =>
      subject.includes(keyword) || body.includes(keyword)
    );

    // Check for order numbers or transaction IDs
    const hasOrderNumber = /\b(order|ord|inv|txn|trans|receipt)[\s#:]*[a-z0-9-]{6,}\b/i.test(subject + ' ' + body);

    return isFromEcommerce || hasPurchaseKeywords || hasOrderNumber;
  }

  // Extract vendor from email
  extractVendor(email) {
    const from = email.from || '';
    const subject = email.subject || '';
    const body = email.body || '';

    // Try to extract from email domain
    const domainMatch = from.match(/@([^>]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      
      // Map common domains to vendor names
      const domainMap = {
        'amazon.com': 'Amazon',
        'amazon.in': 'Amazon India',
        'flipkart.com': 'Flipkart',
        'myntra.com': 'Myntra',
        'snapdeal.com': 'Snapdeal',
        'apple.com': 'Apple',
        'samsung.com': 'Samsung',
        'dell.com': 'Dell',
        'hp.com': 'HP',
        'lenovo.com': 'Lenovo',
        'bestbuy.com': 'Best Buy',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'verizon.com': 'Verizon',
        'att.com': 'AT&T',
        'tmobile.com': 'T-Mobile'
      };

      if (domainMap[domain]) {
        return domainMap[domain];
      }

      // Extract vendor name from domain
      const domainParts = domain.split('.');
      if (domainParts.length >= 2) {
        return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
      }
    }

    // Try to extract from subject or body
    const vendorPatterns = [
      /from\s+([a-zA-Z\s&]+)/i,
      /ordered\s+from\s+([a-zA-Z\s&]+)/i,
      /purchased\s+from\s+([a-zA-Z\s&]+)/i,
      /([a-zA-Z\s&]+)\s+order/i,
      /([a-zA-Z\s&]+)\s+receipt/i
    ];

    for (const pattern of vendorPatterns) {
      const match = (subject + ' ' + body).match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (vendor.length > 2 && vendor.length < 50) {
          return vendor;
        }
      }
    }

    return 'Unknown Vendor';
  }

  // Extract product name
  extractProductName(email) {
    const subject = email.subject || '';
    const body = email.body || '';

    // Common patterns for product names
    const patterns = [
      /ordered\s+([^.!?]+)/i,
      /purchased\s+([^.!?]+)/i,
      /bought\s+([^.!?]+)/i,
      /item:\s*([^.!?\n]+)/i,
      /product:\s*([^.!?\n]+)/i,
      /description:\s*([^.!?\n]+)/i,
      /([a-zA-Z0-9\s&]+)\s+has\s+been\s+ordered/i,
      /([a-zA-Z0-9\s&]+)\s+order\s+confirmation/i
    ];

    for (const pattern of patterns) {
      const match = (subject + ' ' + body).match(pattern);
      if (match && match[1]) {
        const product = match[1].trim();
        if (product.length > 3 && product.length < 100) {
          return this.cleanProductName(product);
        }
      }
    }

    // Try to extract from subject
    const subjectWords = subject.split(/\s+/);
    const relevantWords = subjectWords.filter(word => 
      word.length > 2 && 
      !this.purchaseKeywords.includes(word.toLowerCase()) &&
      !word.match(/^(order|ord|inv|txn|trans|receipt|confirmation)$/i)
    );

    if (relevantWords.length > 0) {
      return relevantWords.slice(0, 5).join(' '); // Take first 5 words
    }

    return 'Unknown Product';
  }

  // Clean product name
  cleanProductName(name) {
    return name
      .replace(/\b(order|ord|inv|txn|trans|receipt|confirmation|number|id|#)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract price
  extractPrice(email) {
    const text = (email.subject + ' ' + email.body).toLowerCase();
    
    // Price patterns
    const pricePatterns = [
      /total:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /amount:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /price:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /cost:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /paid:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /charged:\s*\$?([0-9,]+\.?[0-9]*)/i,
      /\$([0-9,]+\.?[0-9]*)/g,
      /₹([0-9,]+\.?[0-9]*)/g,
      /rs\.?\s*([0-9,]+\.?[0-9]*)/gi
    ];

    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const price = parseFloat(matches[1].replace(/,/g, ''));
        if (price > 0 && price < 100000) {
          return price;
        }
      }
    }

    return null;
  }

  // Extract purchase date
  extractPurchaseDate(email) {
    // First try email date
    if (email.date) {
      return new Date(email.date);
    }

    // Try to extract from email content
    const text = email.subject + ' ' + email.body;
    
    // Date patterns
    const datePatterns = [
      /ordered\s+on\s+([a-zA-Z0-9\s,]+)/i,
      /purchased\s+on\s+([a-zA-Z0-9\s,]+)/i,
      /order\s+date:\s*([a-zA-Z0-9\s,]+)/i,
      /purchase\s+date:\s*([a-zA-Z0-9\s,]+)/i,
      /date:\s*([a-zA-Z0-9\s,]+)/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }

    // If no date found, use email received date
    return new Date();
  }

  // Extract warranty information
  extractWarrantyInfo(email) {
    const text = email.body || '';
    
    // Warranty patterns
    const warrantyPatterns = [
      /warranty:\s*([^.!?\n]+)/i,
      /guarantee:\s*([^.!?\n]+)/i,
      /coverage:\s*([^.!?\n]+)/i,
      /([0-9]+)\s*(year|month|day)s?\s*warranty/i,
      /warranty\s*period:\s*([^.!?\n]+)/i,
      /warranty\s*terms:\s*([^.!?\n]+)/i
    ];

    for (const pattern of warrantyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Determine product category
  determineCategory(productName) {
    const name = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.productCategories)) {
      for (const keyword of keywords) {
        if (name.includes(keyword)) {
          return category;
        }
      }
    }

    return 'Other';
  }

  // Extract order number
  extractOrderNumber(email) {
    const text = email.subject + ' ' + email.body;
    
    const orderPatterns = [
      /order\s*(?:number|#|id)?:?\s*([a-zA-Z0-9-]+)/i,
      /order\s+([a-zA-Z0-9-]+)/i,
      /ord\s*#?\s*([a-zA-Z0-9-]+)/i,
      /inv\s*#?\s*([a-zA-Z0-9-]+)/i,
      /txn\s*#?\s*([a-zA-Z0-9-]+)/i,
      /trans\s*#?\s*([a-zA-Z0-9-]+)/i
    ];

    for (const pattern of orderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Main parsing function
  parseEmail(email) {
    if (!this.isPurchaseEmail(email)) {
      return null;
    }

    const productName = this.extractProductName(email);
    const vendor = this.extractVendor(email);
    const price = this.extractPrice(email);
    const purchaseDate = this.extractPurchaseDate(email);
    const category = this.determineCategory(productName);
    const orderNumber = this.extractOrderNumber(email);
    const warrantyInfo = this.extractWarrantyInfo(email);

    // Calculate estimated warranty end date (default 1 year)
    const warrantyEndDate = new Date(purchaseDate);
    warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);

    return {
      name: productName,
      category: category,
      vendor: vendor,
      purchaseDate: purchaseDate,
      warrantyEndDate: warrantyEndDate,
      price: price,
      serialNumber: null, // Usually not in emails
      description: `Imported from ${vendor} email. ${warrantyInfo ? `Warranty: ${warrantyInfo}` : ''}`,
      source: 'email',
      emailId: email.id,
      orderNumber: orderNumber,
      warrantyInfo: warrantyInfo,
      confidence: this.calculateConfidence(email, productName, vendor, price)
    };
  }

  // Calculate confidence score for the parsed data
  calculateConfidence(email, productName, vendor, price) {
    let confidence = 0;

    // Base confidence
    if (productName && productName !== 'Unknown Product') confidence += 30;
    if (vendor && vendor !== 'Unknown Vendor') confidence += 25;
    if (price && price > 0) confidence += 20;
    if (email.date) confidence += 15;
    if (this.extractOrderNumber(email)) confidence += 10;

    return Math.min(confidence, 100);
  }
}

module.exports = EmailParser; 