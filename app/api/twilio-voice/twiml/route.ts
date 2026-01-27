/**
 * Twilio Voice TwiML Endpoint
 *
 * Returns TwiML instructions for routing outbound calls from browser to guest
 * This endpoint is called by Twilio when a call is initiated from the browser
 *
 * GET/POST /api/twilio-voice/twiml?To={guestPhone}&From={identity}
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("To");
    const from = searchParams.get("From"); // This is the identity, not phone number

    if (!to) {
      return new NextResponse("Missing 'To' parameter", { status: 400 });
    }

    // Create TwiML response
    const twiml = new VoiceResponse();

    // Get Twilio phone number for caller ID
    const twilioPhoneNumber = process.env.TWILIO_VOICE_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioPhoneNumber) {
      // If no phone number configured, use fallback TwiML
      twiml.say("Error: No outbound caller ID configured. Please contact support.");
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Dial the guest's phone number
    const dial = twiml.dial({
      callerId: twilioPhoneNumber,
      // Status callback for call events
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio-voice/status`,
      timeout: 30, // Ring for 30 seconds
    });

    dial.number(to);

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error generating TwiML:", error);

    // Return error TwiML
    const twiml = new VoiceResponse();
    twiml.say("An error occurred. Please try again later.");

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 500,
    });
  }
}

// Support GET requests as well (Twilio can use either)
export async function GET(req: NextRequest) {
  return POST(req);
}
