import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { VapiToolResponse } from "@/lib/vapi/types";

/**
 * VAPI Tool: update_rsvp
 * Called by VAPI assistant to update guest RSVP during a call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract from body - VAPI puts call inside message for tool calls
    const { message } = body;
    const call = message?.call;
    const assistant = message?.assistant;
    const toolCall = message?.toolCallList?.[0];

    if (!toolCall) {
      return NextResponse.json(
        { error: "Invalid tool call request" },
        { status: 400 }
      );
    }

    const toolCallId = toolCall.id;
    const args = toolCall.function?.arguments || {};

    // Get guestId from call metadata (passed when initiating the call)
    // VAPI sends metadata in message.call.assistantOverrides.metadata
    const guestId =
      call?.assistantOverrides?.metadata?.guestId ||
      call?.metadata?.guestId ||
      assistant?.metadata?.guestId;
    const eventId =
      call?.assistantOverrides?.metadata?.eventId ||
      call?.metadata?.eventId ||
      assistant?.metadata?.eventId;
    const vapiCallId = call?.id;

    if (!guestId) {
      const response: VapiToolResponse = {
        results: [
          {
            toolCallId,
            result: "מצטער, לא הצלחתי לזהות את האורח. נא לפנות ישירות לבעלי השמחה.",
          },
        ],
      };
      return NextResponse.json(response);
    }

    // Parse arguments - handle boolean, string, and various formats
    let attending: boolean;
    if (typeof args.attending === "boolean") {
      attending = args.attending;
    } else if (typeof args.attending === "string") {
      attending = args.attending.toLowerCase() === "true" || args.attending === "1" || args.attending.toLowerCase() === "yes";
    } else {
      attending = Boolean(args.attending);
    }

    const guestCount = typeof args.guest_count === "number"
      ? args.guest_count
      : parseInt(args.guest_count || "1", 10) || 1;

    // Update or create RSVP - skip verification for speed (FK constraint will catch invalid guestId)
    const rsvpStatus = attending ? "ACCEPTED" : "DECLINED";
    const finalGuestCount = attending ? guestCount : 0;
    const now = new Date();

    // Run RSVP update - this is the critical path
    await prisma.guestRsvp.upsert({
      where: { guestId },
      create: {
        guestId,
        status: rsvpStatus,
        guestCount: finalGuestCount,
        respondedAt: now,
      },
      update: {
        status: rsvpStatus,
        guestCount: finalGuestCount,
        respondedAt: now,
      },
    });

    // Fire-and-forget: Update call log in background (non-blocking)
    if (vapiCallId) {
      prisma.vapiCallLog.updateMany({
        where: { vapiCallId },
        data: {
          rsvpUpdated: true,
          rsvpStatus,
          guestCount: finalGuestCount,
        },
      }).catch(() => {}); // Silently ignore errors - this is just logging
    }

    // Prepare response message
    let responseMessage: string;
    if (attending) {
      if (guestCount === 1) {
        responseMessage = `מעולה! רשמתי שאתה מגיע לחתונה. תודה רבה!`;
      } else {
        responseMessage = `מעולה! רשמתי ש-${guestCount} אורחים מגיעים לחתונה. תודה רבה!`;
      }
    } else {
      responseMessage = `הבנתי, רשמתי שלא תוכלו להגיע. תודה על העדכון ומקווים לראותכם באירוע אחר!`;
    }

    return NextResponse.json({
      results: [{ toolCallId, result: responseMessage }],
    } as VapiToolResponse);
  } catch (error) {
    // Fast error response - don't re-parse the request body
    return NextResponse.json({
      results: [{ toolCallId: "error", result: "מצטער, הייתה בעיה. נא לפנות לבעלי השמחה." }],
    } as VapiToolResponse);
  }
}
