"use server";

import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
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

// Generate password reset token
function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

// Request password reset - sends email with reset link
export async function requestPasswordReset(email: string, locale: string = "he") {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to not reveal if user exists
    if (!user) {
      return { success: true };
    }

    // User must have a password (not OAuth-only)
    if (!user.password) {
      return { success: true };
    }

    // Delete existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token (valid for 1 hour)
    const token = generatePasswordResetToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name || "",
      token,
      locale,
    });

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { error: "failed" };
  }
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string) {
  try {
    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return { error: "invalidToken" };
    }

    // Check if expired
    if (resetToken.expires < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return { error: "tokenExpired" };
    }

    // Validate new password (minimum 6 characters)
    if (!newPassword || newPassword.length < 6) {
      return { error: "passwordTooShort" };
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "failed" };
  }
}
