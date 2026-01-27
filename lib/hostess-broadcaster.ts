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
  if (!connections || connections.size === 0) {
    // No active connections for this event
    return;
  }

  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  connections.forEach((controller) => {
    try {
      controller.enqueue(message);
    } catch (error) {
      // Connection closed, remove it
      connections.delete(controller);
    }
  });

  // Clean up empty event connections
  if (connections.size === 0) {
    eventConnections.delete(eventId);
  }
}
