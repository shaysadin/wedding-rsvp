import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { EmailConfig } from "next-auth/providers/email";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";
import { MagicLinkEmail } from "@/emails/magic-link-email";
import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";
import { getUserByEmail } from "./user";

// Initialize SMTP transporter
const getTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT || "587"),
      secure: env.SMTP_PORT === "465",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }
  return null;
};

const transporter = getTransporter();

// Helper to send email via SMTP
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = env.EMAIL_FROM || "noreply@example.com";

  if (!transporter) {
    console.error("❌ SMTP not configured! Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    console.log("✅ Email sent via SMTP:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ SMTP error:", error);
    return { success: false, error };
  }
}

// Send verification email for new registrations
export async function sendVerificationEmail({
  email,
  name,
  token,
  locale = "he",
}: {
  email: string;
  name: string;
  token: string;
  locale?: string;
}) {
  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/verify-email?token=${token}`;

  console.log("");
  console.log("=".repeat(60));
  console.log("📧 VERIFICATION EMAIL");
  console.log("=".repeat(60));
  console.log(`To: ${email}`);
  console.log(`Name: ${name}`);
  console.log("");
  console.log(`🔗 Verify your email:`);
  console.log(verifyUrl);
  console.log("=".repeat(60));
  console.log("");

  const html = await render(
    VerificationEmail({
      firstName: name,
      verifyUrl,
      siteName: siteConfig.name,
      locale,
    })
  );

  const subject =
    locale === "he"
      ? `אימות כתובת האימייל שלך - ${siteConfig.name}`
      : `Verify your email - ${siteConfig.name}`;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

// Send password reset email
export async function sendPasswordResetEmail({
  email,
  name,
  token,
  locale = "he",
}: {
  email: string;
  name: string;
  token: string;
  locale?: string;
}) {
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password?token=${token}`;

  console.log("");
  console.log("=".repeat(60));
  console.log("🔐 PASSWORD RESET EMAIL");
  console.log("=".repeat(60));
  console.log(`To: ${email}`);
  console.log(`Name: ${name}`);
  console.log("");
  console.log(`🔗 Reset your password:`);
  console.log(resetUrl);
  console.log("=".repeat(60));
  console.log("");

  const html = await render(
    PasswordResetEmail({
      firstName: name,
      resetUrl,
      siteName: siteConfig.name,
      locale,
    })
  );

  const subject =
    locale === "he"
      ? `איפוס סיסמה - ${siteConfig.name}`
      : `Reset your password - ${siteConfig.name}`;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

// Magic link verification request (for NextAuth)
export const sendVerificationRequest: EmailConfig["sendVerificationRequest"] =
  async ({ identifier, url, provider }) => {
    // Always log the magic link for development convenience
    console.log("");
    console.log("=".repeat(60));
    console.log("📧 MAGIC LINK EMAIL");
    console.log("=".repeat(60));
    console.log(`To: ${identifier}`);
    console.log("");
    console.log(`🔗 Click this link to sign in:`);
    console.log(url);
    console.log("=".repeat(60));
    console.log("");

    const user = await getUserByEmail(identifier);

    // For new users, use a default name
    const userName = user?.name || identifier.split("@")[0];
    const userVerified = user?.emailVerified ? true : false;

    // Try to detect locale from the callback URL
    let locale = "he"; // Default to Hebrew
    try {
      const urlObj = new URL(url);
      const callbackUrl = urlObj.searchParams.get("callbackUrl");
      if (callbackUrl) {
        const decodedCallback = decodeURIComponent(callbackUrl);
        // Extract locale from path like /en/dashboard or /he/dashboard
        const localeMatch = decodedCallback.match(/^\/(en|he)\//);
        if (localeMatch) {
          locale = localeMatch[1];
        }
      }
    } catch {
      // Keep default locale if URL parsing fails
    }

    const isHebrew = locale === "he";
    const authSubject = userVerified
      ? isHebrew
        ? `קישור התחברות - ${siteConfig.name}`
        : `Sign-in link for ${siteConfig.name}`
      : isHebrew
        ? `ברוכים הבאים ל-${siteConfig.name} - הפעלת החשבון`
        : `Welcome to ${siteConfig.name} - Activate your account`;

    const html = await render(
      MagicLinkEmail({
        firstName: userName,
        actionUrl: url,
        mailType: userVerified ? "login" : "register",
        siteName: siteConfig.name,
        locale,
      })
    );

    const result = await sendEmail({
      to: identifier,
      subject: authSubject,
      html,
    });

    if (!result.success) {
      console.log("⚠️ Email failed to send - use the console link above");
    }
  };
