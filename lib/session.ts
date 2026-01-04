import "server-only";

import { cache } from "react";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    return undefined;
  }
  return session.user;
});

/**
 * Get the user's current role directly from the database.
 * Use this when you need the most up-to-date role (e.g., after role switching).
 */
export async function getCurrentUserRole(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? null;
}

/**
 * Check if the current user has platform owner role in their roles array.
 * Returns the user if they are a platform owner, otherwise null.
 */
export async function requirePlatformOwner() {
  const sessionUser = await getCurrentUser();
  console.log("[requirePlatformOwner] Session user:", sessionUser?.id, sessionUser?.email);

  if (!sessionUser?.id) {
    console.log("[requirePlatformOwner] No session user found");
    return null;
  }

  // Check if user has ROLE_PLATFORM_OWNER in their roles array
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { roles: true, email: true },
  });

  console.log("[requirePlatformOwner] DB user roles:", user?.email, user?.roles);

  if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
    console.log("[requirePlatformOwner] User does not have ROLE_PLATFORM_OWNER");
    return null;
  }

  console.log("[requirePlatformOwner] User authorized as platform owner");
  return sessionUser;
}