"use server";

import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { userRegisterSchema, userLoginSchema } from "@/lib/validations/auth";

// Helper: Create default workspace for a user (named after them)
export async function ensureDefaultWorkspace(userId: string, userName: string) {
  try {
    // Check if user already has a workspace
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
    });

    if (existingWorkspace) {
      return { success: true, workspace: existingWorkspace };
    }

    // Create default workspace named after the user
    const slug = `workspace-${userId.slice(-8)}`;
    const workspace = await prisma.workspace.create({
      data: {
        name: userName || "My Events",
        slug,
        ownerId: userId,
        isDefault: true,
      },
    });

    return { success: true, workspace };
  } catch (error) {
    console.error("Error creating default workspace:", error);
    return { error: "Failed to create default workspace" };
  }
}

// Generate a random password for magic link users
function generateTemporaryPassword(): string {
  return randomBytes(16).toString("hex");
}

// Generate email verification token
function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  locale?: string;
}) {
  try {
    // Validate input
    const validated = userRegisterSchema.parse(input);
    const locale = input.locale || "he";

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return { error: "emailExists" };
    }

    // Hash password
    const hashedPassword = await hash(validated.password, 12);

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email.toLowerCase(),
        password: hashedPassword,
        locale,
        // emailVerified is null - user needs to verify
      },
    });

    // Create default workspace for the user (named after them)
    await ensureDefaultWorkspace(user.id, validated.name);

    // Create verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail({
      email: user.email,
      name: user.name || "",
      token,
      locale,
    });

    return { success: true, message: "verificationEmailSent" };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "registrationFailed" };
  }
}

export async function verifyEmail(token: string) {
  try {
    // Find token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return { error: "invalidToken" };
    }

    // Check if expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });
      return { error: "tokenExpired" };
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    });

    // Delete token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "verificationFailed" };
  }
}

export async function resendVerificationEmail(email: string, locale: string = "he") {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }

    if (user.emailVerified) {
      return { error: "alreadyVerified" };
    }

    // Delete existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail({
      email: user.email,
      name: user.name || "",
      token,
      locale,
    });

    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "failed" };
  }
}

// Used by magic link flow - creates user with temporary password if doesn't exist
export async function ensureUserWithPassword(email: string, name?: string) {
  try {
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Create user with temporary password
      const tempPassword = generateTemporaryPassword();
      const hashedPassword = await hash(tempPassword, 12);
      const userName = name || email.split("@")[0];

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: userName,
          password: hashedPassword,
          // Magic link users are verified immediately
          emailVerified: new Date(),
        },
      });

      // Create default workspace for the user (named after them)
      await ensureDefaultWorkspace(user.id, userName);
    }

    return { success: true, user };
  } catch (error) {
    console.error("Ensure user error:", error);
    return { error: "failed" };
  }
}

// Validate credentials for login
export async function validateCredentials(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return { error: "invalidCredentials" };
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      return { error: "invalidCredentials" };
    }

    if (!user.emailVerified) {
      return { error: "emailNotVerified", userId: user.id };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Validate credentials error:", error);
    return { error: "failed" };
  }
}
