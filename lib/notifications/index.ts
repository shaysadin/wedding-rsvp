/**
 * Notification Service Factory
 *
 * This module provides a factory function to get the appropriate notification service
 * based on the current configuration.
 *
 * - If WhatsApp or SMS is configured in admin settings, use the real Twilio service
 * - Otherwise, fall back to the mock service for development/testing
 */

import { prisma } from "@/lib/db";
import { NotificationService } from "./types";
import { MockNotificationService } from "./mock-service";
import { TwilioNotificationService } from "./real-service";

// Cache the service instance
let cachedService: NotificationService | null = null;
let lastCheck: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Check if any real messaging provider is configured
 */
async function isRealServiceConfigured(): Promise<boolean> {
  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings) {
    console.log("No messaging settings found in database");
    return false;
  }

  // Check if WhatsApp is properly configured (provider can be "twilio" or just truthy)
  const whatsappConfigured =
    settings.whatsappEnabled &&
    !!settings.whatsappProvider &&
    !!settings.whatsappApiKey &&
    !!settings.whatsappApiSecret &&
    !!settings.whatsappPhoneNumber;

  // Check if SMS is properly configured (provider can be "twilio" or just truthy)
  const smsConfigured =
    settings.smsEnabled &&
    !!settings.smsProvider &&
    !!settings.smsApiKey &&
    !!settings.smsApiSecret &&
    !!settings.smsPhoneNumber;

  console.log("Messaging settings check:", {
    whatsappEnabled: settings.whatsappEnabled,
    whatsappProvider: settings.whatsappProvider,
    whatsappHasApiKey: !!settings.whatsappApiKey,
    whatsappHasSecret: !!settings.whatsappApiSecret,
    whatsappHasPhone: !!settings.whatsappPhoneNumber,
    whatsappConfigured,
    smsEnabled: settings.smsEnabled,
    smsProvider: settings.smsProvider,
    smsHasApiKey: !!settings.smsApiKey,
    smsHasSecret: !!settings.smsApiSecret,
    smsHasPhone: !!settings.smsPhoneNumber,
    smsConfigured,
  });

  return whatsappConfigured || smsConfigured;
}

/**
 * Get the appropriate notification service
 *
 * This function returns either the real Twilio service or the mock service
 * based on the current configuration.
 */
export async function getNotificationService(): Promise<NotificationService> {
  const now = Date.now();

  // Use cached service if available and not expired
  if (cachedService && now - lastCheck < CACHE_TTL) {
    console.log(`[NotificationService] Using cached ${cachedService instanceof TwilioNotificationService ? 'REAL Twilio' : 'MOCK'} service`);
    return cachedService;
  }

  // Check configuration and create appropriate service
  const useRealService = await isRealServiceConfigured();

  if (useRealService) {
    console.log("=".repeat(60));
    console.log("🚀 [NotificationService] Using REAL Twilio notification service");
    console.log("=".repeat(60));
    cachedService = new TwilioNotificationService();
  } else {
    console.log("=".repeat(60));
    console.log("⚠️ [NotificationService] Using MOCK notification service");
    console.log("   Real service not configured - check admin messaging settings");
    console.log("=".repeat(60));
    cachedService = new MockNotificationService();
  }

  lastCheck = now;
  return cachedService;
}

/**
 * Clear the cached service (useful when settings change)
 */
export function clearNotificationServiceCache(): void {
  cachedService = null;
  lastCheck = 0;
}

// Re-export types and services
export type { NotificationService, NotificationResult } from "./types";
export { MockNotificationService } from "./mock-service";
export { TwilioNotificationService } from "./real-service";
