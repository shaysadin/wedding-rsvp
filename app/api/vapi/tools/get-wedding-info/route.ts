import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { VapiToolResponse } from "@/lib/vapi/types";

/**
 * VAPI Tool: get_wedding_info
 * Called by VAPI assistant to get wedding details during a call
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

    // Get eventId from call metadata (passed when initiating the call)
    // VAPI sends metadata in message.call.assistantOverrides.metadata
    const eventId =
      call?.assistantOverrides?.metadata?.eventId ||
      call?.metadata?.eventId ||
      assistant?.metadata?.eventId;

    if (!eventId) {
      const response: VapiToolResponse = {
        results: [
          {
            toolCallId,
            result: "מצטער, לא הצלחתי למצוא את פרטי החתונה.",
          },
        ],
      };
      return NextResponse.json(response);
    }

    // Get wedding details directly from database (faster than embedding lookup)
    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        notes: true,
      },
    });

    if (!event) {
      const response: VapiToolResponse = {
        results: [
          {
            toolCallId,
            result: "מצטער, לא הצלחתי למצוא את פרטי החתונה.",
          },
        ],
      };
      return NextResponse.json(response);
    }

    return NextResponse.json({
      results: [{
        toolCallId,
        result: formatWeddingDetails({
          title: event.title,
          date: event.dateTime.toISOString(),
          location: event.location,
          venue: event.venue || undefined,
        }),
      }],
    } as VapiToolResponse);
  } catch (error) {
    return NextResponse.json({
      results: [{ toolCallId: "error", result: "מצטער, לא הצלחתי לקבל את פרטי החתונה." }],
    } as VapiToolResponse);
  }
}

/**
 * Format wedding details for voice output
 */
function formatWeddingDetails(details: {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  venue?: string;
  address?: string;
}): string {
  const parts: string[] = [];

  if (details.title) {
    parts.push(`החתונה: ${details.title}`);
  }

  if (details.date) {
    const date = new Date(details.date);
    const hebrewDate = date.toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    parts.push(`תאריך: ${hebrewDate}`);
    parts.push(`שעה: ${time}`);
  }

  if (details.venue) {
    parts.push(`אולם: ${details.venue}`);
  }

  if (details.location || details.address) {
    parts.push(`כתובת: ${details.address || details.location}`);
  }

  return parts.join(". ");
}
