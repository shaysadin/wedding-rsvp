/**
 * Twilio Voice TwiML Fallback Endpoint
 *
 * This endpoint is called by Twilio when the primary TwiML endpoint fails
 * Returns a simple error message to the caller
 *
 * GET/POST /api/twilio-voice/twiml-fallback
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    console.error("Twilio Voice Fallback triggered - Primary endpoint failed");

    // Create simple error TwiML response
    const twiml = new VoiceResponse();

    // Play a message to the caller
    twiml.say({
      voice: "alice",
      language: "en-US",
    }, "We're sorry, but we're experiencing technical difficulties. Please try your call again later, or contact support for assistance.");

    // Optionally, you could redirect to a status page or send an alert
    // Example: Send alert to admin
    // await sendAlertToAdmin("Twilio Voice primary endpoint failed");

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Twilio Voice fallback:", error);

    // Even the fallback failed - return basic TwiML
    const twiml = new VoiceResponse();
    twiml.say("System error. Please try again later.");

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  }
}

// Support GET requests as well
export async function GET(req: NextRequest) {
  return POST(req);
}
