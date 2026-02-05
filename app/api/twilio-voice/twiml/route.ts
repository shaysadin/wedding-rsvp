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
import { prisma } from "@/lib/db";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    // Twilio sends parameters in the request body (form data), not query string
    const formData = await req.formData();
    const to = formData.get("To") as string;
    const from = formData.get("From") as string; // This is the identity, not phone number
    const callSid = formData.get("CallSid") as string;

    console.log("[TwiML] Incoming request - To:", to, "From:", from, "CallSid:", callSid);

    if (!to) {
      console.error("[TwiML] Missing 'To' parameter");
      const twiml = new VoiceResponse();
      twiml.say({
        voice: "alice",
        language: "en-US",
      }, "Error: No destination number provided.");
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
        status: 400,
      });
    }

    // Create TwiML response
    const twiml = new VoiceResponse();

    // Get Twilio phone number for caller ID from database
    const settings = await prisma.messagingProviderSettings.findFirst();
    const twilioPhoneNumber = (settings as any)?.twilioVoicePhoneNumber || (settings as any)?.whatsappPhoneNumber;

    console.log("[TwiML] Using caller ID:", twilioPhoneNumber);

    if (!twilioPhoneNumber) {
      // If no phone number configured, use fallback TwiML
      console.error("[TwiML] No caller ID configured");
      twiml.say({
        voice: "alice",
        language: "en-US",
      }, "Error: No outbound caller ID configured. Please configure a phone number in the admin panel.");
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Format phone number to E.164 format
    let formattedNumber = to;

    // If number starts with 0 (Israeli local format), convert to international format
    if (to.startsWith('0') && !to.startsWith('+')) {
      // Remove leading 0 and add +972 for Israel
      formattedNumber = '+972' + to.substring(1);
      console.log("[TwiML] Converted Israeli number from", to, "to", formattedNumber);
    } else if (!to.startsWith('+')) {
      // If no country code and doesn't start with 0, assume it's already without leading 0
      formattedNumber = '+972' + to;
      console.log("[TwiML] Added Israel country code to", to, "->", formattedNumber);
    }

    // Dial the guest's phone number
    // Note: action URL is optional - only include if we have a publicly accessible URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const isPublicUrl = appUrl && !appUrl.includes('localhost');

    const dial = twiml.dial({
      callerId: twilioPhoneNumber,
      // Only include action callback if using a public URL (not localhost)
      ...(isPublicUrl && { action: `${appUrl}/api/twilio-voice/status` }),
      timeout: 30, // Ring for 30 seconds
    });

    dial.number(formattedNumber);

    console.log("[TwiML] Dialing number:", formattedNumber, "with caller ID:", twilioPhoneNumber, "using public URL:", isPublicUrl);

    const twimlString = twiml.toString();
    console.log("[TwiML] Generated TwiML:", twimlString);

    return new NextResponse(twimlString, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[TwiML] Error generating TwiML:", error);

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
  try {
    // For GET requests, parameters come from query string
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("To");
    const from = searchParams.get("From");

    console.log("[TwiML GET] Incoming request - To:", to, "From:", from);

    if (!to) {
      const twiml = new VoiceResponse();
      twiml.say({
        voice: "alice",
        language: "en-US",
      }, "Error: No destination number provided.");
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const twiml = new VoiceResponse();

    // Get Twilio phone number from database
    const settings = await prisma.messagingProviderSettings.findFirst();
    const twilioPhoneNumber = (settings as any)?.twilioVoicePhoneNumber || (settings as any)?.whatsappPhoneNumber;

    if (!twilioPhoneNumber) {
      twiml.say({
        voice: "alice",
        language: "en-US",
      }, "Error: No outbound caller ID configured.");
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Format phone number to E.164 format
    let formattedNumber = to;
    if (to.startsWith('0') && !to.startsWith('+')) {
      formattedNumber = '+972' + to.substring(1);
      console.log("[TwiML GET] Converted Israeli number from", to, "to", formattedNumber);
    } else if (!to.startsWith('+')) {
      formattedNumber = '+972' + to;
      console.log("[TwiML GET] Added Israel country code to", to, "->", formattedNumber);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const isPublicUrl = appUrl && !appUrl.includes('localhost');

    const dial = twiml.dial({
      callerId: twilioPhoneNumber,
      ...(isPublicUrl && { action: `${appUrl}/api/twilio-voice/status` }),
      timeout: 30,
    });

    dial.number(formattedNumber);

    console.log("[TwiML GET] Dialing number:", formattedNumber, "with caller ID:", twilioPhoneNumber, "using public URL:", isPublicUrl);

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[TwiML GET] Error:", error);
    const twiml = new VoiceResponse();
    twiml.say("An error occurred. Please try again later.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
