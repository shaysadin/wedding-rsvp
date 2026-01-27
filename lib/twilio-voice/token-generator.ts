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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;

  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID not set in environment variables");
  }

  // Get Twilio Voice settings from database
  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings || !settings.twilioVoiceApiKey || !settings.twilioVoiceApiSecret || !settings.twilioVoiceTwimlAppSid) {
    throw new Error("Twilio Voice not configured. Please configure in admin panel.");
  }

  if (!settings.twilioVoiceEnabled) {
    throw new Error("Twilio Voice is disabled. Please enable in admin panel.");
  }

  const apiKey = settings.twilioVoiceApiKey;
  const apiSecret = settings.twilioVoiceApiSecret;
  const outgoingApplicationSid = settings.twilioVoiceTwimlAppSid;

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
