/**
 * Twilio Voice Token Generator
 *
 * Generates capability tokens for Twilio Voice SDK (browser-based calling)
 * Uses Twilio Access Token with Voice Grant for secure authentication
 *
 * Reference: https://www.twilio.com/docs/voice/sdks/javascript/twilio-client-quickstart
 */

import AccessToken from "twilio/lib/jwt/AccessToken";

import { prisma } from "@/lib/db";

const VoiceGrant = AccessToken.VoiceGrant;

interface TokenConfig {
  identity: string; // Unique identifier for the caller (userId + eventId)
  ttl?: number; // Token time-to-live in seconds (default 3600 = 1 hour)
}

/**
 * Generate a Twilio Access Token with Voice Grant for browser-based calling
 */
export async function generateVoiceToken(config: TokenConfig): Promise<string> {
  // Get Twilio Voice settings from database
  const settings = await prisma.messagingProviderSettings.findFirst();

  console.log("[Token Generator] Settings found:", {
    hasAccountSid: !!(settings as any)?.twilioVoiceAccountSid,
    hasAuthToken: !!(settings as any)?.twilioVoiceAuthToken,
    hasApiKey: !!(settings as any)?.twilioVoiceApiKey,
    hasApiSecret: !!(settings as any)?.twilioVoiceApiSecret,
    hasTwimlAppSid: !!(settings as any)?.twilioVoiceTwimlAppSid,
    isEnabled: !!(settings as any)?.twilioVoiceEnabled,
  });

  if (!settings || !(settings as any).twilioVoiceAccountSid || !(settings as any).twilioVoiceAuthToken || !(settings as any).twilioVoiceApiKey || !(settings as any).twilioVoiceApiSecret || !(settings as any).twilioVoiceTwimlAppSid) {
    throw new Error("Twilio Voice not configured. Please configure Account SID, Auth Token, API Key, API Secret, and TwiML App SID in admin panel.");
  }

  if (!(settings as any).twilioVoiceEnabled) {
    throw new Error("Twilio Voice is disabled. Please enable in admin panel.");
  }

  const accountSid = (settings as any).twilioVoiceAccountSid;
  const apiKey = (settings as any).twilioVoiceApiKey;
  const apiSecret = (settings as any).twilioVoiceApiSecret;
  const outgoingApplicationSid = (settings as any).twilioVoiceTwimlAppSid;
  // Note: authToken is stored but not needed for token generation (uses API Key + Secret instead)

  console.log("[Token Generator] Using credentials:", {
    accountSid: accountSid?.substring(0, 6) + "...",
    apiKey: apiKey?.substring(0, 6) + "...",
    twimlAppSid: outgoingApplicationSid?.substring(0, 6) + "...",
    identity: config.identity,
  });

  // Create Access Token
  const token = new AccessToken(
    accountSid,
    apiKey,
    apiSecret,
    {
      identity: config.identity,
      ttl: config.ttl || 3600, // Default 1 hour
    }
  );

  // Create Voice Grant
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: outgoingApplicationSid,
    incomingAllow: false, // We only need outbound calls
  });

  // Add grant to token
  token.addGrant(voiceGrant);

  // Return JWT token
  return token.toJwt();
}

/**
 * Generate identity string for a user in a specific event
 */
export function generateCallCenterIdentity(userId: string, eventId: string): string {
  return `callcenter_${userId}_${eventId}`;
}

/**
 * Parse identity string back to userId and eventId
 */
export function parseCallCenterIdentity(identity: string): { userId: string; eventId: string } | null {
  const parts = identity.split("_");
  if (parts.length !== 3 || parts[0] !== "callcenter") {
    return null;
  }
  return {
    userId: parts[1],
    eventId: parts[2],
  };
}
