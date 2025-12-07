"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function switchRole(newRole: UserRole) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    // Get user with roles
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Check if user has the role they're trying to switch to
    if (!dbUser.roles.includes(newRole)) {
      return { error: "You don't have access to this role" };
    }

    // Update the active role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: newRole },
    });

    revalidatePath("/");

    return { success: true, role: newRole };
  } catch (error) {
    console.error("Error switching role:", error);
    return { error: "Failed to switch role" };
  }
}

export async function getUserRoles() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, roles: true },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    return {
      success: true,
      currentRole: dbUser.role,
      availableRoles: dbUser.roles,
      canSwitch: dbUser.roles.length > 1,
    };
  } catch (error) {
    console.error("Error getting user roles:", error);
    return { error: "Failed to get user roles" };
  }
}
