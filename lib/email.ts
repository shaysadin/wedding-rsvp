import { MagicLinkEmail } from "@/emails/magic-link-email";
import { EmailConfig } from "next-auth/providers/email";
import { Resend } from "resend";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";

import { getUserByEmail } from "./user";

export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

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

    if (!resend) {
      console.log("⚠️  Resend not configured - use the link above to sign in");
      console.log("");
      // Don't throw - just return so the flow continues
      // The token is already stored in the database by NextAuth
      return;
    }

    const user = await getUserByEmail(identifier);

    // For new users, use a default name
    const userName = user?.name || identifier.split("@")[0];
    const userVerified = user?.emailVerified ? true : false;

    const authSubject = userVerified
      ? `Sign-in link for ${siteConfig.name}`
      : `Welcome to ${siteConfig.name} - Activate your account`;

    try {
      const { data, error } = await resend.emails.send({
        from: provider.from || env.EMAIL_FROM || "onboarding@resend.dev",
        to: identifier,
        subject: authSubject,
        react: MagicLinkEmail({
          firstName: userName,
          actionUrl: url,
          mailType: userVerified ? "login" : "register",
          siteName: siteConfig.name,
        }),
        headers: {
          "X-Entity-Ref-ID": new Date().getTime() + "",
        },
      });

      if (error || !data) {
        console.error("Resend error:", error);
        // Log error but don't throw - the magic link is still available in console
        console.log("⚠️  Email failed to send - use the console link above");
        return;
      }

      console.log("✅ Email sent successfully:", data);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Log error but don't throw - the magic link is still available in console
      console.log("⚠️  Email failed to send - use the console link above");
    }
  };
