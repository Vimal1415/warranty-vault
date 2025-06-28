module.exports = {
  // Database
  mongoURI: process.env.MONGODB_URI,
  
  // Google OAuth
  googleClientID: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  
  // Email
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
  
  // Rate Limiting
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // requests per window
  
  // Security
  sessionSecret: process.env.SESSION_SECRET,
  
  // Port
  port: process.env.PORT || 5000,
  
  // Environment
  nodeEnv: 'production'
}; 