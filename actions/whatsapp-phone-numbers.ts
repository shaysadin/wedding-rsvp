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
