#!/usr/bin/env node

/**
 * Test script for password reset email functionality
 *
 * Usage: node scripts/test-password-reset.js <email>
 *
 * This script will:
 * 1. Check if SMTP is configured correctly
 * 2. Test email sending with your SMTP credentials
 * 3. Generate a test password reset token and email
 */

const nodemailer = require("nodemailer");
require("dotenv").config();

async function testSMTPConnection() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 TESTING SMTP CONFIGURATION");
  console.log("=".repeat(60) + "\n");

  // Check environment variables
  console.log("📋 Checking environment variables...");
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || "587";
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error("\n❌ SMTP configuration is incomplete!");
    console.error("\nMissing environment variables:");
    if (!smtpHost) console.error("  - SMTP_HOST");
    if (!smtpUser) console.error("  - SMTP_USER");
    if (!smtpPassword) console.error("  - SMTP_PASSWORD");
    console.error("\nPlease set these in your .env file.");
    return false;
  }

  console.log("✅ All SMTP environment variables are set");
  console.log("\nSMTP Configuration:");
  console.log(`  Host: ${smtpHost}`);
  console.log(`  Port: ${smtpPort}`);
  console.log(`  User: ${smtpUser}`);
  console.log(`  From: ${emailFrom || "Not set (will use SMTP_USER)"}`);
  console.log(`  Password: ${"*".repeat(smtpPassword.length)}`);

  // Create transporter
  console.log("\n📧 Creating SMTP transporter...");
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: smtpPort === "465",
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  // Verify connection
  console.log("\n🔌 Testing SMTP connection...");
  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful!");
    return transporter;
  } catch (error) {
    console.error("\n❌ SMTP connection failed!");
    console.error("\nError details:");
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);

    console.error("\n💡 Troubleshooting tips:");
    console.error("  1. Check if your SMTP credentials are correct");
    console.error("  2. Verify that your SMTP host and port are correct");
    console.error("  3. Check if your firewall is blocking the connection");
    console.error("  4. For Gmail, you may need to enable 'Less secure app access' or use an App Password");
    console.error("  5. Some providers require TLS/SSL - try port 465 instead of 587");

    return false;
  }
}

async function sendTestEmail(transporter, toEmail) {
  console.log("\n" + "=".repeat(60));
  console.log("📨 SENDING TEST PASSWORD RESET EMAIL");
  console.log("=".repeat(60) + "\n");

  const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const testToken = "test_token_" + Date.now();
  const resetUrl = `${appUrl}/he/reset-password?token=${testToken}`;

  console.log(`To: ${toEmail}`);
  console.log(`From: ${emailFrom}`);
  console.log(`Reset URL: ${resetUrl}\n`);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #fce7f3 0%, #fed7aa 100%); padding: 20px; text-align: center; border-radius: 8px; }
    .content { background: #f9fafb; padding: 30px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p><strong>This is a test email from Wedinex</strong></p>
      <p>A password reset was requested for your account. Click the button below to reset your password:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <div class="warning">
        <strong>⚠️ Important:</strong> This link is valid for 1 hour only.
      </div>
      <p style="font-size: 14px; color: #666;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <p style="font-size: 12px; color: #999; margin-top: 20px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #4F46E5;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Sent by Wedinex - Wedding RSVP Manager</p>
      <p>This is an automated test email</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: emailFrom,
    to: toEmail,
    subject: "🔐 Test: Password Reset Request - Wedinex",
    html: htmlContent,
    text: `Password Reset Request\n\nA password reset was requested for your account.\n\nReset your password by clicking this link:\n${resetUrl}\n\nThis link is valid for 1 hour only.\n\nIf you didn't request this, you can ignore this email.\n\nSent by Wedinex`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully!");
    console.log(`\nMessage ID: ${info.messageId}`);
    console.log("\n📬 Check your inbox (and spam folder) for the test email.");
    console.log("\n✨ If you received the email, your password reset system is working correctly!");
    return true;
  } catch (error) {
    console.error("\n❌ Failed to send test email!");
    console.error("\nError details:");
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n❌ Please provide an email address to test with");
    console.log("\nUsage: node scripts/test-password-reset.js <email>");
    console.log("Example: node scripts/test-password-reset.js admin@example.com\n");
    process.exit(1);
  }

  const testEmail = args[0];

  console.log("\n🚀 Starting Password Reset Email Test");
  console.log(`Testing with email: ${testEmail}\n`);

  // Test SMTP connection
  const transporter = await testSMTPConnection();

  if (!transporter) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ TEST FAILED - SMTP Configuration Issues");
    console.log("=".repeat(60) + "\n");
    process.exit(1);
  }

  // Send test email
  const emailSent = await sendTestEmail(transporter, testEmail);

  if (emailSent) {
    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS PASSED");
    console.log("=".repeat(60));
    console.log("\nYour password reset email system is configured correctly!");
    console.log("\nNext steps:");
    console.log("  1. Check if you received the test email");
    console.log("  2. Try the forgot password flow on your website");
    console.log("  3. If emails aren't arriving, check your spam folder");
    console.log("  4. Contact your SMTP provider if issues persist\n");
  } else {
    console.log("\n" + "=".repeat(60));
    console.log("❌ TEST FAILED - Email Sending Issues");
    console.log("=".repeat(60) + "\n");
    process.exit(1);
  }
}

main().catch(console.error);
