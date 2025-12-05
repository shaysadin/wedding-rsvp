"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { testWhatsAppConnection as twilioTestWhatsApp } from "@/lib/notifications/twilio-service";
import { clearNotificationServiceCache } from "@/lib/notifications";
import { createSmsProvider } from "@/lib/notifications/sms-providers";

export interface MessagingSettingsInput {
  // WhatsApp Config
  whatsappProvider?: string | null;
  whatsappApiKey?: string | null;
  whatsappApiSecret?: string | null;
  whatsappPhoneNumber?: string | null;
  whatsappEnabled?: boolean;

  // SMS Config
  smsProvider?: string | null;
  smsApiKey?: string | null;
  smsApiSecret?: string | null;
  smsPhoneNumber?: string | null;
  smsMessagingServiceSid?: string | null; // Twilio Messaging Service SID (optional)
  smsEnabled?: boolean;
}

// Get messaging provider settings (admin only)
export async function getMessagingSettings() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get or create settings (singleton)
    let settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      settings = await prisma.messagingProviderSettings.create({
        data: {},
      });
    }

    // Mask sensitive data for display
    const maskedSettings = {
      ...settings,
      whatsappApiKey: settings.whatsappApiKey ? maskApiKey(settings.whatsappApiKey) : null,
      whatsappApiSecret: settings.whatsappApiSecret ? maskApiKey(settings.whatsappApiSecret) : null,
      smsApiKey: settings.smsApiKey ? maskApiKey(settings.smsApiKey) : null,
      smsApiSecret: settings.smsApiSecret ? maskApiKey(settings.smsApiSecret) : null,
    };

    return { success: true, settings: maskedSettings };
  } catch (error) {
    console.error("Error fetching messaging settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

// Update messaging provider settings (admin only)
export async function updateMessagingSettings(input: MessagingSettingsInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get existing settings
    let existingSettings = await prisma.messagingProviderSettings.findFirst();

    // Prepare update data - don't update masked values
    const updateData: any = {};

    // WhatsApp fields
    if (input.whatsappProvider !== undefined) {
      updateData.whatsappProvider = input.whatsappProvider;
    }
    if (input.whatsappApiKey !== undefined && !input.whatsappApiKey?.includes("•")) {
      updateData.whatsappApiKey = input.whatsappApiKey;
    }
    if (input.whatsappApiSecret !== undefined && !input.whatsappApiSecret?.includes("•")) {
      updateData.whatsappApiSecret = input.whatsappApiSecret;
    }
    if (input.whatsappPhoneNumber !== undefined) {
      updateData.whatsappPhoneNumber = input.whatsappPhoneNumber;
    }
    if (input.whatsappEnabled !== undefined) {
      updateData.whatsappEnabled = input.whatsappEnabled;
    }

    // SMS fields
    if (input.smsProvider !== undefined) {
      updateData.smsProvider = input.smsProvider;
    }
    if (input.smsApiKey !== undefined && !input.smsApiKey?.includes("•")) {
      updateData.smsApiKey = input.smsApiKey;
    }
    if (input.smsApiSecret !== undefined && !input.smsApiSecret?.includes("•")) {
      updateData.smsApiSecret = input.smsApiSecret;
    }
    if (input.smsPhoneNumber !== undefined) {
      updateData.smsPhoneNumber = input.smsPhoneNumber;
    }
    if (input.smsMessagingServiceSid !== undefined) {
      updateData.smsMessagingServiceSid = input.smsMessagingServiceSid;
    }
    if (input.smsEnabled !== undefined) {
      updateData.smsEnabled = input.smsEnabled;
    }

    let settings;
    if (existingSettings) {
      settings = await prisma.messagingProviderSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.messagingProviderSettings.create({
        data: updateData,
      });
    }

    revalidatePath("/admin/messaging");

    // Clear the notification service cache so it picks up the new settings
    clearNotificationServiceCache();

    // Return masked settings
    const maskedSettings = {
      ...settings,
      whatsappApiKey: settings.whatsappApiKey ? maskApiKey(settings.whatsappApiKey) : null,
      whatsappApiSecret: settings.whatsappApiSecret ? maskApiKey(settings.whatsappApiSecret) : null,
      smsApiKey: settings.smsApiKey ? maskApiKey(settings.smsApiKey) : null,
      smsApiSecret: settings.smsApiSecret ? maskApiKey(settings.smsApiSecret) : null,
    };

    return { success: true, settings: maskedSettings };
  } catch (error) {
    console.error("Error updating messaging settings:", error);
    return { error: "Failed to update settings" };
  }
}

// Test WhatsApp connection (admin only)
export async function testWhatsAppConnection() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings || !settings.whatsappApiKey || !settings.whatsappApiSecret) {
      return { error: "WhatsApp credentials not configured" };
    }

    // Test Twilio WhatsApp connection using the official API
    if (settings.whatsappProvider === "twilio") {
      const result = await twilioTestWhatsApp({
        accountSid: settings.whatsappApiKey,
        authToken: settings.whatsappApiSecret,
        whatsappPhoneNumber: settings.whatsappPhoneNumber || undefined,
      });

      if (result.success) {
        return {
          success: true,
          message: result.message,
          accountInfo: result.accountInfo,
        };
      } else {
        return { error: result.message };
      }
    }

    return { error: "Unsupported provider. Only Twilio is currently supported." };
  } catch (error: any) {
    console.error("Error testing WhatsApp connection:", error);
    return { error: error.message || "Connection test failed" };
  }
}

// Test SMS connection (admin only)
export async function testSmsConnection() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings || !settings.smsApiKey || !settings.smsApiSecret) {
      return { error: "SMS credentials not configured" };
    }

    // SMS uses Twilio only
    const provider = createSmsProvider({
      provider: "twilio",
      authId: settings.smsApiKey,
      authToken: settings.smsApiSecret,
      phoneNumber: settings.smsPhoneNumber || "",
      messagingServiceSid: settings.smsMessagingServiceSid || undefined,
    });

    const result = await provider.testConnection();

    if (result.success) {
      return {
        success: true,
        message: result.message,
        accountInfo: result.accountInfo ? {
          friendlyName: result.accountInfo.name || "Unknown",
          status: result.accountInfo.status || "active",
          messagingService: result.accountInfo.messagingService,
        } : undefined,
      };
    } else {
      return { error: result.message };
    }
  } catch (error: any) {
    console.error("Error testing SMS connection:", error);
    return { error: error.message || "Connection test failed" };
  }
}

// Get raw settings for internal use (not masked)
export async function getRawMessagingSettings() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();
    return { success: true, settings };
  } catch (error) {
    console.error("Error fetching raw messaging settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

// Helper function to mask API keys
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "••••••••";
  }
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

// Get available messaging channels for wedding owners (public endpoint)
// This returns which channels are enabled by admin without exposing credentials
export async function getAvailableChannels() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      return {
        success: true,
        channels: {
          whatsapp: { enabled: false, configured: false },
          sms: { enabled: false, configured: false },
        },
      };
    }

    // Check if WhatsApp is properly configured
    const whatsappConfigured =
      !!settings.whatsappProvider &&
      !!settings.whatsappApiKey &&
      !!settings.whatsappApiSecret &&
      !!settings.whatsappPhoneNumber;

    // Check if SMS is properly configured (either phone number or messaging service SID)
    const smsConfigured =
      !!settings.smsProvider &&
      !!settings.smsApiKey &&
      !!settings.smsApiSecret &&
      (!!settings.smsPhoneNumber || !!settings.smsMessagingServiceSid);

    return {
      success: true,
      channels: {
        whatsapp: {
          enabled: settings.whatsappEnabled && whatsappConfigured,
          configured: whatsappConfigured,
        },
        sms: {
          enabled: settings.smsEnabled && smsConfigured,
          configured: smsConfigured,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching available channels:", error);
    return { error: "Failed to fetch channels" };
  }
}
