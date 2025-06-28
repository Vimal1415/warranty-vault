require('dotenv').config();
const nodemailer = require('nodemailer');

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Test email function
const sendTestEmail = async () => {
  try {
    console.log('Testing email configuration...');
    console.log('Email Host:', process.env.EMAIL_HOST);
    console.log('Email Port:', process.env.EMAIL_PORT);
    console.log('Email User:', process.env.EMAIL_USER);
    
    const transporter = createTransporter();
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection verified');
    
    // Send test email
    const testEmail = {
      from: `"WarrantyVault Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: '🧪 WarrantyVault Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Email Test Successful! 🎉</h2>
          <p>This is a test email from your WarrantyVault application.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
              <li><strong>User:</strong> ${process.env.EMAIL_USER}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 14px;">This email was sent automatically by the WarrantyVault test script.</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check your EMAIL_USER and EMAIL_PASS in .env file');
      console.log('2. Make sure you\'re using an App Password if 2FA is enabled');
      console.log('3. Verify your email provider settings');
    }
  }
};

// Run the test
sendTestEmail(); 