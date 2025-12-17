"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/session";
import { VapiClient, clearVapiClientCache } from "@/lib/vapi";
import type { VapiSettingsInput } from "@/lib/vapi/types";

// ============ Admin VAPI Settings ============

/**
 * Get VAPI provider settings (admin only)
 * Returns masked API keys for security
 */
export async function getVapiProviderSettings() {
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

    // Return VAPI-specific fields with masked sensitive data
    return {
      success: true,
      settings: {
        // VAPI Config
        vapiApiKey: settings.vapiApiKey ? maskApiKey(settings.vapiApiKey) : null,
        vapiPhoneNumberId: settings.vapiPhoneNumberId,
        vapiPhoneNumber: settings.vapiPhoneNumber,
        vapiAssistantId: settings.vapiAssistantId,
        vapiWebhookSecret: settings.vapiWebhookSecret
          ? maskApiKey(settings.vapiWebhookSecret)
          : null,
        vapiEnabled: settings.vapiEnabled,

        // Azure Speech
        azureSpeechKey: settings.azureSpeechKey
          ? maskApiKey(settings.azureSpeechKey)
          : null,
        azureSpeechRegion: settings.azureSpeechRegion,

        // Status flags
        isConfigured: !!(
          settings.vapiApiKey &&
          settings.vapiPhoneNumberId &&
          settings.vapiAssistantId
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching VAPI settings:", error);
    return { error: "Failed to fetch VAPI settings" };
  }
}

/**
 * Update VAPI provider settings (admin only)
 */
export async function updateVapiProviderSettings(input: VapiSettingsInput) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get existing settings
    let existingSettings = await prisma.messagingProviderSettings.findFirst();

    // Prepare update data - don't update masked values
    const updateData: Record<string, unknown> = {};

    // VAPI API Config
    if (input.vapiApiKey !== undefined && !input.vapiApiKey?.includes("•")) {
      updateData.vapiApiKey = input.vapiApiKey || null;
    }
    if (input.vapiPhoneNumberId !== undefined) {
      updateData.vapiPhoneNumberId = input.vapiPhoneNumberId || null;
    }
    if (input.vapiPhoneNumber !== undefined) {
      updateData.vapiPhoneNumber = input.vapiPhoneNumber || null;
    }
    if (input.vapiAssistantId !== undefined) {
      updateData.vapiAssistantId = input.vapiAssistantId || null;
    }
    if (
      input.vapiWebhookSecret !== undefined &&
      !input.vapiWebhookSecret?.includes("•")
    ) {
      updateData.vapiWebhookSecret = input.vapiWebhookSecret || null;
    }
    if (input.vapiEnabled !== undefined) {
      updateData.vapiEnabled = input.vapiEnabled;
    }

    // Azure Speech Config
    if (
      input.azureSpeechKey !== undefined &&
      !input.azureSpeechKey?.includes("•")
    ) {
      updateData.azureSpeechKey = input.azureSpeechKey || null;
    }
    if (input.azureSpeechRegion !== undefined) {
      updateData.azureSpeechRegion = input.azureSpeechRegion || null;
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

    // Clear cached VAPI client
    clearVapiClientCache();

    revalidatePath("/admin/vapi");

    return { success: true };
  } catch (error) {
    console.error("Error updating VAPI settings:", error);
    return { error: "Failed to update VAPI settings" };
  }
}

/**
 * Test VAPI connection (admin only)
 */
export async function testVapiConnection() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.vapiApiKey) {
      return { error: "VAPI API key not configured" };
    }

    const client = new VapiClient(settings.vapiApiKey);
    const isConnected = await client.testConnection();

    if (isConnected) {
      // Try to get additional info
      let phoneNumbers: { id: string; number: string }[] = [];
      let assistants: { id: string; name: string }[] = [];

      try {
        const phones = await client.getPhoneNumbers();
        phoneNumbers = phones.map((p) => ({ id: p.id, number: p.number }));
      } catch {
        // Ignore errors fetching phone numbers
      }

      try {
        const assts = await client.getAssistants();
        assistants = assts.map((a) => ({ id: a.id, name: a.name }));
      } catch {
        // Ignore errors fetching assistants
      }

      return {
        success: true,
        message: "Successfully connected to VAPI",
        data: {
          phoneNumbers,
          assistants,
        },
      };
    } else {
      return { error: "Failed to connect to VAPI. Please check your API key." };
    }
  } catch (error: unknown) {
    console.error("Error testing VAPI connection:", error);
    const message = error instanceof Error ? error.message : "Connection test failed";
    return { error: message };
  }
}

/**
 * Check if VAPI is available for wedding owners
 */
export async function getVapiAvailability() {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      return {
        success: true,
        available: false,
        reason: "VAPI not configured by admin",
      };
    }

    const isConfigured = !!(
      settings.vapiApiKey &&
      settings.vapiPhoneNumberId &&
      settings.vapiAssistantId
    );

    return {
      success: true,
      available: isConfigured && settings.vapiEnabled,
      isEnabled: settings.vapiEnabled,
      isConfigured,
    };
  } catch (error) {
    console.error("Error checking VAPI availability:", error);
    return { error: "Failed to check VAPI availability" };
  }
}

// ============ Helper Functions ============

function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "••••••••";
  }
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}
