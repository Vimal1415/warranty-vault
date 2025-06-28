# Email Notifications System

## Overview

WarrantyVault includes a comprehensive email notification system that automatically sends reminders for warranty expiries. The system supports both automatic scheduled reminders and manual reminder sending.

## Features

### 🔔 Automatic Reminders
- **Daily Scheduled Job**: Runs every day at 9 AM to check for expiring warranties
- **Configurable Timing**: Users can set how many days before expiry to send reminders (1, 3, 7, 14, or 30 days)
- **Smart Filtering**: Only sends reminders for products that haven't been reminded yet
- **Bulk Processing**: Efficiently processes multiple users and products

### 📧 Manual Reminders
- **Individual Reminders**: Send reminders for specific products
- **Bulk Reminders**: Select multiple products and send reminders at once
- **Test Emails**: Send test emails to verify configuration

### ⚙️ User Settings
- **Enable/Disable**: Users can turn email notifications on/off
- **Reminder Frequency**: Choose between once, daily, or weekly reminders
- **Customizable Timing**: Set preferred reminder days before expiry
- **Timezone Support**: Configure timezone for accurate timing

## Email Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (for reminders)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Use App Password**: Use the generated password as `EMAIL_PASS`

### Other Email Providers

The system works with any SMTP provider. Common configurations:

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

**Yahoo:**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

**Custom SMTP:**
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
```

## Testing Email Configuration

### Quick Test

Run the test script to verify your email setup:

```bash
cd server
node test-email.js
```

### Frontend Test

1. Go to Settings page in the app
2. Click "Send Test Email" button
3. Check your email for the test message

## API Endpoints

### Reminder Management

- `GET /api/reminders/upcoming` - Get products expiring soon
- `GET /api/reminders/expired` - Get expired products
- `POST /api/reminders/send` - Send reminder for specific product
- `POST /api/reminders/send-bulk` - Send reminders for multiple products
- `POST /api/reminders/test-email` - Send test email
- `GET /api/reminders/stats` - Get reminder statistics

### Settings Management

- `GET /api/reminders/settings` - Get user reminder settings
- `PUT /api/reminders/settings` - Update reminder settings

## Email Templates

### Reminder Email Features

- **Professional Design**: Modern, responsive HTML email template
- **Product Details**: Shows product name, vendor, expiry date, and days left
- **Urgency Indicators**: Color-coded days remaining (red for critical, orange for warning, green for active)
- **Action Items**: Provides recommended actions for users
- **Dashboard Link**: Direct link back to the application

### Email Content

The reminder emails include:
- Personalized greeting with user's name
- Product table with expiry information
- Urgency warnings for products expiring within 3 days
- Recommended actions (contact vendor, check eligibility, etc.)
- Link to dashboard for easy access

## Scheduled Jobs

### Daily Reminder Check

The system runs a daily cron job at 9 AM:

```javascript
cron.schedule('0 9 * * *', async () => {
  // Check all users for expiring warranties
  // Send reminders based on user preferences
  // Mark reminders as sent
});
```

### Job Features

- **User Filtering**: Only processes active users with email notifications enabled
- **Product Filtering**: Only sends reminders for products that need them
- **Error Handling**: Graceful error handling with logging
- **Bulk Updates**: Efficiently marks multiple reminders as sent

## Frontend Integration

### Settings Page

The Settings page (`/settings`) provides:

- **Email Toggle**: Enable/disable email reminders
- **Timing Controls**: Set reminder days and frequency
- **Test Button**: Send test email to verify setup
- **Account Info**: Display user email and name

### Reminders Page

The Reminders page (`/reminders`) provides:

- **Statistics Dashboard**: Overview of warranty status
- **Upcoming Expiries**: Table of products expiring soon
- **Bulk Actions**: Select and send reminders for multiple products
- **Status Tracking**: See which reminders have been sent

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check EMAIL_USER and EMAIL_PASS
   - Ensure you're using an App Password for Gmail
   - Verify 2FA is enabled

2. **Connection Timeout**
   - Check EMAIL_HOST and EMAIL_PORT
   - Verify firewall settings
   - Try different port (465 for SSL, 587 for TLS)

3. **Emails Not Sending**
   - Check server logs for errors
   - Verify user has email notifications enabled
   - Ensure products exist and have valid expiry dates

### Debug Steps

1. Run the test script: `node test-email.js`
2. Check server logs for error messages
3. Verify environment variables are loaded
4. Test SMTP connection manually

## Security Considerations

- **App Passwords**: Use app-specific passwords instead of account passwords
- **Environment Variables**: Never commit email credentials to version control
- **Rate Limiting**: Implement rate limiting for reminder endpoints
- **User Consent**: Respect user notification preferences

## Future Enhancements

- **WhatsApp Integration**: Send reminders via WhatsApp
- **SMS Notifications**: Text message reminders
- **Push Notifications**: Browser and mobile push notifications
- **Custom Templates**: User-customizable email templates
- **Advanced Scheduling**: More granular reminder timing options 