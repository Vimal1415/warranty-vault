# Quick Email Setup Guide

## 🚀 Get Email Notifications Working in 5 Minutes

### Step 1: Configure Email Settings

1. **Create/Update your `.env` file** in the `server` folder:

```env
# Email Configuration (for reminders)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 2: Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Copy the 16-character password

3. **Add to .env file**:
   ```env
   EMAIL_PASS=your-16-character-app-password
   ```

### Step 3: Test Email Configuration

Run the test script:

```bash
cd server
node test-email.js
```

You should see:
```
✅ Email server connection verified
✅ Test email sent successfully!
```

### Step 4: Test in the App

1. **Start your servers**:
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend  
   cd client && npm start
   ```

2. **Login to the app** and go to Settings page

3. **Click "Send Test Email"** button

4. **Check your email** for the test message

### Step 5: Add Some Test Products

1. Go to "Add Product" page
2. Add a product with warranty expiring in the next few days
3. Go to "Reminders" page to see it listed
4. Send a manual reminder to test

## 🎯 What You Can Do Now

### Automatic Reminders
- ✅ Daily scheduled reminders at 9 AM
- ✅ Configurable reminder timing (1-30 days before expiry)
- ✅ Smart filtering (only sends once per product)

### Manual Reminders  
- ✅ Send individual product reminders
- ✅ Bulk send reminders for multiple products
- ✅ Test email functionality

### User Settings
- ✅ Enable/disable email notifications
- ✅ Set reminder timing preferences
- ✅ Configure reminder frequency

## 🔧 Troubleshooting

### "Authentication Failed" Error
- Make sure you're using an App Password, not your regular password
- Verify 2FA is enabled on your Google account
- Check EMAIL_USER and EMAIL_PASS in .env file

### "Connection Timeout" Error  
- Check EMAIL_HOST and EMAIL_PORT
- Try port 465 for SSL or 587 for TLS
- Verify firewall settings

### Emails Not Sending
- Check server console for error messages
- Verify user has email notifications enabled in settings
- Ensure products have valid expiry dates

## 📧 Email Features

### Professional Email Template
- Modern, responsive design
- Color-coded urgency indicators
- Product details table
- Recommended actions
- Direct link to dashboard

### Smart Reminder Logic
- Only sends reminders for products that need them
- Respects user notification preferences
- Tracks which reminders have been sent
- Handles bulk operations efficiently

## 🎉 You're All Set!

Your WarrantyVault now has a complete email notification system that will:
- Automatically remind users about expiring warranties
- Allow manual sending of reminders
- Provide professional, informative email templates
- Respect user preferences and settings

The system is production-ready and includes error handling, logging, and security best practices. 