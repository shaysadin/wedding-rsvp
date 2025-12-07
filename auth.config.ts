import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { compare } from "bcryptjs";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import { sendVerificationRequest } from "@/lib/email";

// Build providers list dynamically
const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  }),
  // Credentials provider for email/password login
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email as string;
      const password = credentials.password as string;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || !user.password) {
        return null;
      }

      const isValid = await compare(password, user.password);
      if (!isValid) {
        return null;
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error("EmailNotVerified");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

// Only add Nodemailer if SMTP is configured
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
  providers.push(
    Nodemailer({
      server: {
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || "587"),
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      },
      from: env.EMAIL_FROM || "noreply@example.com",
      sendVerificationRequest,
    })
  );
}

export default {
  providers,
} satisfies NextAuthConfig;
