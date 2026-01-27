import { NextRequest } from "next/server";
import { eventConnections } from "@/lib/hostess-broadcaster";

export const dynamic = "force-dynamic";
export const runtime = "edge"; // Use Edge Runtime for better streaming support
// Note: Edge runtime doesn't support maxDuration

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  console.log(`[SSE] New connection request for event ${eventId}`);

  const encoder = new TextEncoder();

  // Create a custom readable stream for SSE
  const customReadable = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Stream started for event ${eventId}`);

      // Add this controller to the event's connection set
      if (!eventConnections.has(eventId)) {
        eventConnections.set(eventId, new Set());
      }
      eventConnections.get(eventId)!.add(controller);

      console.log(`[SSE] Connection added. Total connections for event ${eventId}: ${eventConnections.get(eventId)!.size}`);

      // Send initial connection message immediately
      try {
        const connectedMsg = `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(connectedMsg));
        console.log("[SSE] Sent initial connection message");
      } catch (error) {
        console.error("[SSE] Error sending initial message:", error);
      }

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          // Send a comment (: prefix) which won't trigger onmessage but keeps connection alive
          controller.enqueue(encoder.encode(`:heartbeat ${Date.now()}\n\n`));
          console.log(`[SSE] Heartbeat sent for event ${eventId}`);
        } catch (error) {
          console.error("[SSE] Error sending heartbeat:", error);
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Handle connection close
      const cleanup = () => {
        console.log(`[SSE] Cleaning up connection for event ${eventId}`);
        clearInterval(heartbeatInterval);

        const connections = eventConnections.get(eventId);
        if (connections) {
          connections.delete(controller);
          console.log(`[SSE] Removed connection. Remaining: ${connections.size}`);

          if (connections.size === 0) {
            eventConnections.delete(eventId);
            console.log(`[SSE] All connections closed for event ${eventId}`);
          }
        }

        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // Listen for abort signal
      request.signal.addEventListener("abort", cleanup);

      // Store cleanup function for manual cleanup if needed
      (controller as any).cleanup = cleanup;
    },

    cancel() {
      console.log(`[SSE] Stream cancelled for event ${eventId}`);
    },
  });

  // Return response with proper SSE headers
  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
