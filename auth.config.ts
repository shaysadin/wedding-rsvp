import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { env } from "@/env.mjs";
import { sendVerificationRequest } from "@/lib/email";

export default {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    // Always use Resend provider - it handles token storage via the adapter
    // Our custom sendVerificationRequest logs the link AND sends email if configured
    Resend({
      apiKey: env.RESEND_API_KEY || "re_dummy_key_for_development",
      from: env.EMAIL_FROM || "onboarding@resend.dev",
      sendVerificationRequest,
    }),
  ],
} satisfies NextAuthConfig;
