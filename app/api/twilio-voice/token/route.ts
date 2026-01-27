/**
 * Twilio Voice Token API
 *
 * Generates capability tokens for authenticated users to make browser-based calls
 * POST /api/twilio-voice/token
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { generateVoiceToken, generateCallCenterIdentity } from "@/lib/twilio-voice/token-generator";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if user has access to this event (owner or editor collaborator)
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this event" },
        { status: 403 }
      );
    }

    // Generate unique identity for this user + event combination
    const identity = generateCallCenterIdentity(user.id, eventId);

    // Generate token (async now - reads from database)
    const token = await generateVoiceToken({
      identity,
      ttl: 3600, // 1 hour
    });

    return NextResponse.json({
      token,
      identity,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error generating Twilio Voice token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
