import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Short navigation redirect
 * /n/[eventId] -> Redirects to Waze navigation
 * Accepts short navigationCode (e.g., abc123) or full event ID for backwards compatibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    let event;

    // Try to find by navigationCode first (short code, 6-8 chars)
    if (eventId.length <= 8) {
      event = await prisma.weddingEvent.findUnique({
        where: { navigationCode: eventId },
        select: { location: true, venue: true },
      });
    }

    // Fall back to full event ID for backwards compatibility
    if (!event) {
      event = await prisma.weddingEvent.findUnique({
        where: { id: eventId },
        select: { location: true, venue: true },
      });
    }

    if (!event) {
      return new Response("Event not found", { status: 404 });
    }

    // Use venue name + location for better Waze search
    const destination = event.venue
      ? `${event.venue}, ${event.location}`
      : event.location;

    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(destination)}`;

    return NextResponse.redirect(wazeUrl);
  } catch (error) {
    console.error("Navigation redirect error:", error);
    return new Response("Error redirecting to navigation", { status: 500 });
  }
}
