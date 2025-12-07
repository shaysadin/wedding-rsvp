import authConfig from "@/auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { prisma } from "@/lib/db";
import { getUserById } from "@/lib/user";

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/he/login",
    error: "/he/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth sign-in and link to existing accounts with same email
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (existingUser) {
          // Check if this OAuth account is already linked
          const existingAccount = existingUser.accounts.find(
            (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          );

          if (!existingAccount) {
            // Link the OAuth account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }

          // Auto-verify email for Google users (Google already verified their email)
          // Also update user image from Google if not set
          const updateData: { emailVerified?: Date; image?: string } = {};

          if (!existingUser.emailVerified) {
            updateData.emailVerified = new Date();
          }
          if (!existingUser.image && user.image) {
            updateData.image = user.image;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updateData,
            });
          }
        }
      }

      // For new Google sign-ups (no existing user), NextAuth will create user with emailVerified = null
      // We need to update it after creation - this is handled in the events.createUser or we set it here
      if (account?.provider === "google" && user.id) {
        // Ensure the user is marked as verified
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        }).catch(() => {
          // User might not exist yet (first time OAuth), that's fine
        });
      }

      // For magic link (nodemailer) sign-in, auto-verify the email
      if (account?.provider === "nodemailer" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser && !existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }
      }

      return true;
    },

    async session({ token, session }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }

        if (token.email) {
          session.user.email = token.email;
        }

        if (token.role) {
          session.user.role = token.role;
        }

        if (token.roles) {
          session.user.roles = token.roles;
        }

        if (token.status) {
          session.user.status = token.status;
        }

        if (token.plan) {
          session.user.plan = token.plan;
        }

        session.user.name = token.name;
        session.user.image = token.picture;

        // Stripe fields
        session.user.stripeCustomerId = token.stripeCustomerId ?? null;
        session.user.stripeSubscriptionId = token.stripeSubscriptionId ?? null;
        session.user.stripePriceId = token.stripePriceId ?? null;
        session.user.stripeCurrentPeriodEnd = token.stripeCurrentPeriodEnd ?? null;
      }

      return session;
    },

    async jwt({ token, user, trigger }) {
      if (!token.sub) return token;

      // On initial sign-in or when critical fields are missing, fetch from database
      // The user object from NextAuth doesn't include our custom fields
      const needsRefresh = user || trigger === "update" || !token.role;

      if (needsRefresh) {
        const dbUser = await getUserById(token.sub);
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.role = dbUser.role;
          token.roles = dbUser.roles;
          token.status = dbUser.status;
          token.plan = dbUser.plan;
          token.stripeCustomerId = dbUser.stripeCustomerId;
          token.stripeSubscriptionId = dbUser.stripeSubscriptionId;
          token.stripePriceId = dbUser.stripePriceId;
          token.stripeCurrentPeriodEnd = dbUser.stripeCurrentPeriodEnd;
        }
      }

      return token;
    },
  },
  ...authConfig,
  // debug: process.env.NODE_ENV !== "production"
});
