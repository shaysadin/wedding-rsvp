import { NextRequest } from "next/server";
import { eventConnections } from "@/lib/hostess-broadcaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  // Create a new readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this controller to the event's connection set
      if (!eventConnections.has(eventId)) {
        eventConnections.set(eventId, new Set());
      }
      eventConnections.get(eventId)!.add(controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        eventConnections.get(eventId)?.delete(controller);
        if (eventConnections.get(eventId)?.size === 0) {
          eventConnections.delete(eventId);
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in nginx
    },
  });
}
