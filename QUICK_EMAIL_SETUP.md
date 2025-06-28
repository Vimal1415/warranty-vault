# Quick Email Setup - Fix the 500 Error

## 🚨 The Problem
You're getting a 500 error when trying to send test emails because the email configuration is missing.

## ✅ Quick Fix

### Step 1: Create/Update your `.env` file

In your `server` folder, create or update the `.env` file:

```env
# Email Configuration (for reminders)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 2: Gmail App Password Setup

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Factor Authentication** (if not already enabled)
3. **Generate App Password**:
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate
   - Copy the 16-character password
4. **Add to .env file**:
   ```env
   EMAIL_PASS=your-16-character-app-password
   ```

### Step 3: Test the Configuration

1. **Restart your server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Test with the script**:
   ```bash
   node test-email.js
   ```

3. **Test in the app**:
   - Go to Settings page
   - Click "Send Test Email"
   - You should see a success message

## 🔧 Alternative Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## 🎯 What This Fixes

- ✅ Removes the 500 error
- ✅ Allows test emails to work
- ✅ Enables automatic reminder emails
- ✅ Provides helpful error messages

## 🚀 After Setup

Once configured, you can:
- Send test emails from Settings page
- Receive automatic warranty reminders
- Use the Reminders page to send manual reminders

The email system will work perfectly once you add these environment variables! 