// Centralized broadcaster for hostess page real-time updates
// Uses in-memory connection storage (will be populated by SSE endpoint)

type BroadcastData = {
  type: "guest-arrived" | "guest-unmarked" | "table-changed" | "refresh";
  guestId?: string;
  guestName?: string;
  tableId?: string;
  tableName?: string;
};

// This map will be shared with the SSE route
export const eventConnections = new Map<string, Set<ReadableStreamDefaultController>>();

export function broadcastHostessUpdate(eventId: string, data: BroadcastData) {
  const connections = eventConnections.get(eventId);

  console.log(`[Broadcast] Attempting to broadcast to event ${eventId}:`, data);
  console.log(`[Broadcast] Active connections: ${connections?.size || 0}`);

  if (!connections || connections.size === 0) {
    // No active connections for this event
    console.log(`[Broadcast] No active connections for event ${eventId}`);
    return;
  }

  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  let successCount = 0;
  let failCount = 0;

  connections.forEach((controller) => {
    try {
      controller.enqueue(message);
      successCount++;
    } catch (error) {
      // Connection closed, remove it
      console.error("[Broadcast] Error sending to connection:", error);
      connections.delete(controller);
      failCount++;
    }
  });

  console.log(`[Broadcast] Sent to ${successCount} connections, ${failCount} failed`);

  // Clean up empty event connections
  if (connections.size === 0) {
    eventConnections.delete(eventId);
  }
}
