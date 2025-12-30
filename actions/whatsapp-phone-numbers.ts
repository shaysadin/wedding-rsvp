"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/session";

// Get all WhatsApp phone numbers
export async function getWhatsAppPhoneNumbers() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const phoneNumbers = await prisma.whatsAppPhoneNumber.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    return { success: true, phoneNumbers };
  } catch (error) {
    console.error("Error fetching WhatsApp phone numbers:", error);
    return { error: "Failed to fetch phone numbers" };
  }
}

// Add a new WhatsApp phone number
export async function addWhatsAppPhoneNumber(
  phoneNumber: string,
  displayName?: string | null
) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Validate phone number format (basic validation)
    const cleanedNumber = phoneNumber.replace(/\s+/g, "").trim();
    if (!cleanedNumber.startsWith("+") || cleanedNumber.length < 10) {
      return {
        error: "Phone number must be in international format (e.g., +972501234567)",
      };
    }

    // Check if phone number already exists
    const existing = await prisma.whatsAppPhoneNumber.findUnique({
      where: { phoneNumber: cleanedNumber },
    });

    if (existing) {
      return { error: "This phone number is already registered" };
    }

    // Get the messaging provider settings ID
    let settings = await prisma.messagingProviderSettings.findFirst();
    if (!settings) {
      settings = await prisma.messagingProviderSettings.create({ data: {} });
    }

    // Create the phone number
    const newPhoneNumber = await prisma.whatsAppPhoneNumber.create({
      data: {
        phoneNumber: cleanedNumber,
        displayName: displayName || null,
        isActive: false,
        messagingProviderSettingsId: settings.id,
      },
    });

    revalidatePath("/admin/messaging");

    return { success: true, phoneNumber: newPhoneNumber };
  } catch (error) {
    console.error("Error adding WhatsApp phone number:", error);
    return { error: "Failed to add phone number" };
  }
}

// Remove a WhatsApp phone number
export async function removeWhatsAppPhoneNumber(id: string) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check if the phone number exists
    const phoneNumber = await prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return { error: "Phone number not found" };
    }

    // Delete the phone number
    await prisma.whatsAppPhoneNumber.delete({
      where: { id },
    });

    revalidatePath("/admin/messaging");

    return { success: true };
  } catch (error) {
    console.error("Error removing WhatsApp phone number:", error);
    return { error: "Failed to remove phone number" };
  }
}

// Set a phone number as active (deactivates others)
export async function setActiveWhatsAppPhoneNumber(id: string) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check if the phone number exists
    const phoneNumber = await prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return { error: "Phone number not found" };
    }

    // Use a transaction to deactivate all and activate the selected one
    await prisma.$transaction([
      // Deactivate all phone numbers
      prisma.whatsAppPhoneNumber.updateMany({
        data: { isActive: false },
      }),
      // Activate the selected one
      prisma.whatsAppPhoneNumber.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    // Also update the main whatsappPhoneNumber in MessagingProviderSettings
    const settings = await prisma.messagingProviderSettings.findFirst();
    if (settings) {
      await prisma.messagingProviderSettings.update({
        where: { id: settings.id },
        data: { whatsappPhoneNumber: phoneNumber.phoneNumber },
      });
    }

    revalidatePath("/admin/messaging");

    return { success: true };
  } catch (error) {
    console.error("Error setting active WhatsApp phone number:", error);
    return { error: "Failed to set active phone number" };
  }
}

// Get the currently active WhatsApp phone number
export async function getActiveWhatsAppPhoneNumber() {
  try {
    const activeNumber = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });

    return { success: true, phoneNumber: activeNumber };
  } catch (error) {
    console.error("Error fetching active WhatsApp phone number:", error);
    return { error: "Failed to fetch active phone number" };
  }
}

// Update display name for a phone number
export async function updateWhatsAppPhoneNumberDisplayName(
  id: string,
  displayName: string | null
) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const updated = await prisma.whatsAppPhoneNumber.update({
      where: { id },
      data: { displayName },
    });

    revalidatePath("/admin/messaging");

    return { success: true, phoneNumber: updated };
  } catch (error) {
    console.error("Error updating WhatsApp phone number display name:", error);
    return { error: "Failed to update display name" };
  }
}

// ============ DEFAULT PHONE NUMBER MANAGEMENT ============

// Set a phone number as default (used for users without assigned number)
export async function setDefaultWhatsAppPhoneNumber(id: string) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check if the phone number exists
    const phoneNumber = await prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return { error: "Phone number not found" };
    }

    // Use a transaction to unset all defaults and set the selected one
    await prisma.$transaction([
      prisma.whatsAppPhoneNumber.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.whatsAppPhoneNumber.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/admin/messaging");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error setting default WhatsApp phone number:", error);
    return { error: "Failed to set default phone number" };
  }
}

// Get the default WhatsApp phone number
export async function getDefaultWhatsAppPhoneNumber() {
  try {
    const defaultNumber = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    return { success: true, phoneNumber: defaultNumber };
  } catch (error) {
    console.error("Error fetching default WhatsApp phone number:", error);
    return { error: "Failed to fetch default phone number" };
  }
}

// ============ USER PHONE NUMBER ASSIGNMENT ============

// Assign a WhatsApp phone number to a specific user
export async function assignWhatsAppPhoneNumberToUser(userId: string, phoneNumberId: string | null) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify phone number exists if provided
    if (phoneNumberId) {
      const phoneNumber = await prisma.whatsAppPhoneNumber.findUnique({
        where: { id: phoneNumberId },
      });

      if (!phoneNumber) {
        return { error: "Phone number not found" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { whatsappPhoneNumberId: phoneNumberId },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/messaging");

    return { success: true };
  } catch (error) {
    console.error("Error assigning WhatsApp phone number to user:", error);
    return { error: "Failed to assign phone number" };
  }
}

// Get the effective WhatsApp phone number for a user (assigned or default)
export async function getEffectiveWhatsAppPhoneNumber(userId: string) {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { whatsappPhoneNumber: true },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    // If user has an active assigned phone number, use it
    if (targetUser.whatsappPhoneNumber && targetUser.whatsappPhoneNumber.isActive) {
      return {
        success: true,
        phoneNumber: targetUser.whatsappPhoneNumber.phoneNumber,
        source: "assigned" as const,
      };
    }

    // Otherwise, use the default
    const defaultPhoneNumber = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultPhoneNumber) {
      // Fallback: use the active phone number if no default is set
      const activeNumber = await prisma.whatsAppPhoneNumber.findFirst({
        where: { isActive: true },
      });

      if (!activeNumber) {
        return { error: "No WhatsApp phone number configured" };
      }

      return {
        success: true,
        phoneNumber: activeNumber.phoneNumber,
        source: "active" as const,
      };
    }

    return {
      success: true,
      phoneNumber: defaultPhoneNumber.phoneNumber,
      source: "default" as const,
    };
  } catch (error) {
    console.error("Error fetching effective WhatsApp phone number:", error);
    return { error: "Failed to fetch phone number" };
  }
}

// Get phone numbers with user count for admin display
export async function getWhatsAppPhoneNumbersWithUsers() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const phoneNumbers = await prisma.whatsAppPhoneNumber.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: [{ isDefault: "desc" }, { isActive: "desc" }, { createdAt: "asc" }],
    });

    // Serialize dates for client components
    const serializedPhoneNumbers = phoneNumbers.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return { success: true, phoneNumbers: serializedPhoneNumbers };
  } catch (error) {
    console.error("Error fetching WhatsApp phone numbers with users:", error);
    return { error: "Failed to fetch phone numbers" };
  }
}
