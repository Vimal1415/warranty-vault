# 🛡️ WarrantyVault

A comprehensive MERN stack warranty tracker that automatically syncs with Gmail to extract purchase information and manage warranty periods with smart reminders.

## ✨ Features

### 🔐 Authentication
- **Hybrid Authentication**: Google OAuth + Email/Password registration
- **Secure JWT Tokens**: Stateless authentication with refresh capabilities
- **User Management**: Individual user accounts with data isolation

### 📧 Gmail Integration
- **Automatic Email Scanning**: Scans Gmail for purchase receipts and warranty documents
- **Smart Parsing**: Extracts product details, purchase dates, and warranty periods
- **Manual Import**: Select which products to import from parsed emails
- **6-Month Search**: Comprehensive email scanning for warranty information

### 📦 Product Management
- **Warranty Tracking**: Monitor warranty status with visual indicators
- **Category Organization**: Organize products by categories
- **Document Storage**: Upload and store receipts and warranty documents
- **Serial Number Tracking**: Track products with serial numbers
- **Price Monitoring**: Track purchase prices and values

### 🔔 Smart Reminders
- **Automated Alerts**: Daily cron job checks for expiring warranties
- **Email Notifications**: Configurable email reminders before expiry
- **Customizable Timing**: Set reminder preferences (7, 30, 60 days before expiry)
- **Reminder History**: Track sent reminders and their status

### 📊 Dashboard & Analytics
- **Real-time Stats**: Active warranties, expiring soon, expired products
- **Visual Status**: Color-coded warranty status indicators
- **Quick Actions**: Fast access to common tasks
- **Search & Filter**: Advanced filtering and sorting capabilities

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: User preference support
- **Intuitive Interface**: Clean, modern design with Tailwind CSS
- **Loading States**: Smooth user experience with proper feedback

## 🚀 Tech Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **React Hot Toast**: User notifications
- **Lucide React**: Beautiful icons

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Passport.js**: Authentication middleware
- **Nodemailer**: Email sending capabilities
- **Cron**: Scheduled task management
- **Multer**: File upload handling

### External Services
- **Google OAuth 2.0**: Authentication and Gmail API access
- **Gmail API**: Email scanning and parsing
- **SMTP**: Email delivery service

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or MongoDB Atlas)
- **Google Cloud Console** account for OAuth setup
- **Gmail account** for email integration

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/warranty-vault.git
cd warranty-vault
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Setup

#### Backend Environment (.env in server folder)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/warranty-vault
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/warranty-vault

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
```

#### Frontend Environment (.env in client folder)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
6. Copy Client ID and Client Secret to your .env file

### 5. Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "WarrantyVault"
3. Use this password in your EMAIL_PASS environment variable

## 🚀 Running the Application

### Development Mode

#### Option 1: Run Both Servers (Recommended)
```bash
# From root directory
npm run dev
```

#### Option 2: Run Servers Separately
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

### Production Mode
```bash
# Build the frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

## 📱 Usage

### 1. Registration & Login
- Visit the application and click "Get Started"
- Choose between Google OAuth or email/password registration
- Complete the authentication process

### 2. Gmail Integration
- Go to Settings → Email Sync
- Click "Connect Gmail" to authorize access
- The system will scan your emails for warranty information
- Select which products to import

### 3. Manual Product Addition
- Navigate to Products → Add Product
- Fill in product details manually
- Upload receipts or warranty documents
- Set warranty period and end date

### 4. Managing Products
- View all products in the Products page
- Filter and search through your products
- Edit warranty information using the warranty editor
- Delete products as needed

### 5. Setting Up Reminders
- Go to Settings → Reminders
- Configure email notification preferences
- Set reminder timing (7, 30, 60 days before expiry)
- Test email notifications

## 🔧 Configuration

### Email Reminder Settings
- **Default Timing**: 30 days before warranty expiry
- **Customizable**: Set multiple reminder periods
- **Email Templates**: Professional HTML email templates
- **Frequency**: Daily cron job checks for expiring warranties

### Gmail Scanning
- **Search Period**: 6 months (configurable)
- **Fallback**: 1 year if no recent emails found
- **Keywords**: Searches for purchase, receipt, warranty keywords
- **Attachments**: Processes email attachments for documents

## 🚀 Deployment

### Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `cd client && npm install && npm run build`
3. Set output directory: `client/build`
4. Add environment variables in Vercel dashboard

### Backend Deployment (Railway/Render)
1. Connect your GitHub repository
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && npm start`
4. Add environment variables in deployment dashboard

### Database (MongoDB Atlas)
1. Create a MongoDB Atlas cluster
2. Set up database access and network access
3. Update MONGODB_URI in your environment variables

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get user's products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `DELETE /api/products/bulk` - Bulk delete products

### Email Integration
- `POST /api/emails/sync` - Sync Gmail for products
- `GET /api/emails/parsed` - Get parsed email products
- `POST /api/emails/import` - Import selected products

### Reminders
- `GET /api/reminders` - Get user's reminders
- `POST /api/reminders/send-test` - Send test email
- `PUT /api/reminders/settings` - Update reminder settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/warranty-vault/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🎯 Roadmap

- [ ] Offline-first mode with local storage
- [ ] Cloud sync for multiple devices
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with more email providers
- [ ] Barcode scanning for products
- [ ] Warranty claim tracking
- [ ] Social sharing of warranty status
- [ ] API for third-party integrations

## 🙏 Acknowledgments

- [React](https://reactjs.org/) for the amazing frontend framework
- [Express.js](https://expressjs.com/) for the robust backend
- [MongoDB](https://www.mongodb.com/) for the flexible database
- [Tailwind CSS](https://tailwindcss.com/) for the beautiful styling
- [Google APIs](https://developers.google.com/) for Gmail integration

---

**Built with ❤️ for better warranty management** 