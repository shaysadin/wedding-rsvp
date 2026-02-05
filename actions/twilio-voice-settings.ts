"use server";

/**
 * Twilio Voice Settings Actions (Admin Only)
 *
 * Manages Twilio Voice configuration for the call center feature
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/session";

export interface TwilioVoiceSettingsInput {
  twilioVoiceAccountSid?: string | null;
  twilioVoiceAuthToken?: string | null;
  twilioVoiceApiKey?: string | null;
  twilioVoiceApiSecret?: string | null;
  twilioVoiceTwimlAppSid?: string | null;
  twilioVoicePhoneNumber?: string | null;
  twilioVoiceEnabled?: boolean;
}

/**
 * Mask API keys for display (show first/last 4 chars)
 */
function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return `${key.substring(0, 4)}${"•".repeat(key.length - 8)}${key.substring(key.length - 4)}`;
}

/**
 * Get Twilio Voice settings (admin only)
 */
export async function getTwilioVoiceSettings() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get or create settings (singleton)
    let settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      settings = await prisma.messagingProviderSettings.create({
        data: {},
      });
    }

    // Return Twilio Voice fields with masked sensitive data
    return {
      success: true,
      settings: {
        twilioVoiceAccountSid: settings.twilioVoiceAccountSid
          ? maskApiKey(settings.twilioVoiceAccountSid)
          : null,
        twilioVoiceAuthToken: settings.twilioVoiceAuthToken
          ? maskApiKey(settings.twilioVoiceAuthToken)
          : null,
        twilioVoiceApiKey: settings.twilioVoiceApiKey
          ? maskApiKey(settings.twilioVoiceApiKey)
          : null,
        twilioVoiceApiSecret: settings.twilioVoiceApiSecret
          ? maskApiKey(settings.twilioVoiceApiSecret)
          : null,
        twilioVoiceTwimlAppSid: settings.twilioVoiceTwimlAppSid,
        twilioVoicePhoneNumber: settings.twilioVoicePhoneNumber,
        twilioVoiceEnabled: settings.twilioVoiceEnabled,
        isConfigured: !!(
          settings.twilioVoiceAccountSid &&
          settings.twilioVoiceAuthToken &&
          settings.twilioVoiceApiKey &&
          settings.twilioVoiceApiSecret &&
          settings.twilioVoiceTwimlAppSid
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching Twilio Voice settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to fetch Twilio Voice settings: ${errorMessage}` };
  }
}

/**
 * Update Twilio Voice settings (admin only)
 */
export async function updateTwilioVoiceSettings(input: TwilioVoiceSettingsInput) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get existing settings
    let existingSettings = await prisma.messagingProviderSettings.findFirst();

    // Prepare update data - don't update masked values
    const updateData: Record<string, unknown> = {};

    // Account SID (don't update if masked)
    if (input.twilioVoiceAccountSid !== undefined && !input.twilioVoiceAccountSid?.includes("•")) {
      updateData.twilioVoiceAccountSid = input.twilioVoiceAccountSid || null;
    }

    // Auth Token (don't update if masked)
    if (input.twilioVoiceAuthToken !== undefined && !input.twilioVoiceAuthToken?.includes("•")) {
      updateData.twilioVoiceAuthToken = input.twilioVoiceAuthToken || null;
    }

    // API Key (don't update if masked)
    if (input.twilioVoiceApiKey !== undefined && !input.twilioVoiceApiKey?.includes("•")) {
      updateData.twilioVoiceApiKey = input.twilioVoiceApiKey || null;
    }

    // API Secret (don't update if masked)
    if (input.twilioVoiceApiSecret !== undefined && !input.twilioVoiceApiSecret?.includes("•")) {
      updateData.twilioVoiceApiSecret = input.twilioVoiceApiSecret || null;
    }

    // TwiML App SID
    if (input.twilioVoiceTwimlAppSid !== undefined) {
      updateData.twilioVoiceTwimlAppSid = input.twilioVoiceTwimlAppSid || null;
    }

    // Phone Number
    if (input.twilioVoicePhoneNumber !== undefined) {
      updateData.twilioVoicePhoneNumber = input.twilioVoicePhoneNumber || null;
    }

    // Enabled flag
    if (input.twilioVoiceEnabled !== undefined) {
      updateData.twilioVoiceEnabled = input.twilioVoiceEnabled;
    }

    // Update or create settings
    if (existingSettings) {
      await prisma.messagingProviderSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      await prisma.messagingProviderSettings.create({
        data: updateData as any,
      });
    }

    revalidatePath("/admin/twilio-voice");

    return { success: true };
  } catch (error) {
    console.error("Error updating Twilio Voice settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to update Twilio Voice settings: ${errorMessage}` };
  }
}

/**
 * Test Twilio Voice connection (admin only)
 */
export async function testTwilioVoiceConnection() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings || !settings.twilioVoiceAccountSid || !settings.twilioVoiceAuthToken || !settings.twilioVoiceApiKey || !settings.twilioVoiceApiSecret) {
      return { error: "Twilio Voice not configured. Please configure Account SID, Auth Token, API Key, and API Secret." };
    }

    // If we get here, basic configuration looks valid
    return {
      success: true,
      message: "Twilio Voice configuration appears valid. Test by making a call from the call center.",
    };
  } catch (error) {
    console.error("Error testing Twilio Voice connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Connection test failed: ${errorMessage}` };
  }
}
