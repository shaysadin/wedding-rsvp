"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export interface UserSettingsInput {
  name?: string;
  locale?: string;
}

// Get current user settings
export async function getUserSettings() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        locale: true,
        role: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return { error: "User not found" };
    }

    return { success: true, user: userData };
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

// Update user settings
export async function updateUserSettings(input: UserSettingsInput) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const { name, locale } = input;

    // Validate locale
    const validLocales = ["he", "en"];
    if (locale && !validLocales.includes(locale)) {
      return { error: "Invalid locale" };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(locale !== undefined && { locale }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        locale: true,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user settings:", error);
    return { error: "Failed to update settings" };
  }
}
