"use server";

import { UserRole, NotificationType, NotificationStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// ============ HELPER FUNCTIONS ============

function getSeatsUsed(guest: {
  expectedGuests: number;
  rsvp?: { status: string; guestCount: number } | null;
}): number {
  if (guest.rsvp?.status === "DECLINED") return 0;
  if (guest.rsvp?.status === "ACCEPTED") return guest.rsvp.guestCount || 1;
  return guest.expectedGuests || 1;
}

// ============ SEATING SELECTOR ============

export interface SeatingEventData {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
  seatingStats: {
    totalTables: number;
    totalCapacity: number;
    seatedGuests: number;
    unseatedGuests: number;
    seatedSeats: number;
    totalGuests: number;
  };
}

export async function getEventsForSeatingSelector(): Promise<{
  success?: boolean;
  events?: SeatingEventData[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        tables: {
          select: {
            id: true,
            capacity: true,
            assignments: {
              select: {
                guest: {
                  select: {
                    expectedGuests: true,
                    rsvp: {
                      select: {
                        status: true,
                        guestCount: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        guests: {
          select: {
            id: true,
            tableAssignment: { select: { id: true } },
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    const eventsWithStats: SeatingEventData[] = events.map((event) => {
      const totalTables = event.tables.length;
      const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);
      const totalGuests = event.guests.length;
      const seatedGuests = event.guests.filter((g) => g.tableAssignment).length;
      const unseatedGuests = totalGuests - seatedGuests;

      // Calculate actual seats used by seated guests
      const seatedSeats = event.tables.reduce((sum, table) => {
        return sum + table.assignments.reduce((s, a) => s + getSeatsUsed(a.guest), 0);
      }, 0);

      return {
        id: event.id,
        title: event.title,
        dateTime: event.dateTime,
        location: event.location,
        venue: event.venue,
        seatingStats: {
          totalTables,
          totalCapacity,
          seatedGuests,
          unseatedGuests,
          seatedSeats,
          totalGuests,
        },
      };
    });

    return { success: true, events: eventsWithStats };
  } catch (error) {
    console.error("Error fetching events for seating selector:", error);
    return { error: "Failed to fetch events" };
  }
}

// ============ INVITATIONS SELECTOR ============

export interface InvitationsEventData {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
  invitationStats: {
    totalGuests: number;
    guestsWithPhone: number;
    invitationsSent: number;
    invitationsNotSent: number;
    hasInvitationImage: boolean;
  };
}

export async function getEventsForInvitationsSelector(): Promise<{
  success?: boolean;
  events?: InvitationsEventData[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        invitationImageUrl: true,
        guests: {
          select: {
            id: true,
            phoneNumber: true,
            notificationLogs: {
              where: { type: NotificationType.IMAGE_INVITE },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    const eventsWithStats: InvitationsEventData[] = events.map((event) => {
      const totalGuests = event.guests.length;
      const guestsWithPhone = event.guests.filter((g) => g.phoneNumber).length;
      const invitationsSent = event.guests.filter(
        (g) => g.notificationLogs[0]?.status === NotificationStatus.SENT
      ).length;
      const invitationsNotSent = guestsWithPhone - invitationsSent;

      return {
        id: event.id,
        title: event.title,
        dateTime: event.dateTime,
        location: event.location,
        venue: event.venue,
        invitationStats: {
          totalGuests,
          guestsWithPhone,
          invitationsSent,
          invitationsNotSent,
          hasInvitationImage: !!event.invitationImageUrl,
        },
      };
    });

    return { success: true, events: eventsWithStats };
  } catch (error) {
    console.error("Error fetching events for invitations selector:", error);
    return { error: "Failed to fetch events" };
  }
}

// ============ MESSAGES SELECTOR ============

export interface MessagesEventData {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
  messageStats: {
    totalGuests: number;
    invitesSent: number;
    remindersSent: number;
    totalMessagesSent: number;
  };
}

export async function getEventsForMessagesSelector(): Promise<{
  success?: boolean;
  events?: MessagesEventData[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Fetch events with guest counts
    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        _count: {
          select: { guests: true },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    // Get message counts grouped by event and type
    const eventIds = events.map((e) => e.id);
    const messageCounts = await prisma.notificationLog.groupBy({
      by: ["type"],
      where: {
        guest: { weddingEventId: { in: eventIds } },
        status: NotificationStatus.SENT,
        type: { in: [NotificationType.INVITE, NotificationType.REMINDER] },
      },
      _count: true,
    });

    // Get per-event message counts
    const inviteCountsByEvent = await prisma.notificationLog.groupBy({
      by: ["guestId"],
      where: {
        guest: { weddingEventId: { in: eventIds } },
        status: NotificationStatus.SENT,
        type: NotificationType.INVITE,
      },
      _count: true,
    });

    const reminderCountsByEvent = await prisma.notificationLog.groupBy({
      by: ["guestId"],
      where: {
        guest: { weddingEventId: { in: eventIds } },
        status: NotificationStatus.SENT,
        type: NotificationType.REMINDER,
      },
      _count: true,
    });

    // Get guests with their event IDs for mapping
    const guestEventMap = await prisma.guest.findMany({
      where: { weddingEventId: { in: eventIds } },
      select: { id: true, weddingEventId: true },
    });

    const guestToEventMap = new Map(guestEventMap.map((g) => [g.id, g.weddingEventId]));

    // Calculate invites and reminders per event
    const invitesByEvent = new Map<string, number>();
    const remindersByEvent = new Map<string, number>();

    inviteCountsByEvent.forEach((item) => {
      const eventId = guestToEventMap.get(item.guestId);
      if (eventId) {
        invitesByEvent.set(eventId, (invitesByEvent.get(eventId) || 0) + item._count);
      }
    });

    reminderCountsByEvent.forEach((item) => {
      const eventId = guestToEventMap.get(item.guestId);
      if (eventId) {
        remindersByEvent.set(eventId, (remindersByEvent.get(eventId) || 0) + item._count);
      }
    });

    const eventsWithStats: MessagesEventData[] = events.map((event) => {
      const totalGuests = event._count.guests;
      const invitesSent = invitesByEvent.get(event.id) || 0;
      const remindersSent = remindersByEvent.get(event.id) || 0;

      return {
        id: event.id,
        title: event.title,
        dateTime: event.dateTime,
        location: event.location,
        venue: event.venue,
        messageStats: {
          totalGuests,
          invitesSent,
          remindersSent,
          totalMessagesSent: invitesSent + remindersSent,
        },
      };
    });

    return { success: true, events: eventsWithStats };
  } catch (error) {
    console.error("Error fetching events for messages selector:", error);
    return { error: "Failed to fetch events" };
  }
}

// ============ CUSTOMIZE SELECTOR ============

export interface CustomizeEventData {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
  customizeStats: {
    totalGuests: number;
    rsvpResponses: number;
    pendingResponses: number;
    responseRate: number;
    hasCustomization: boolean;
  };
}

export async function getEventsForCustomizeSelector(): Promise<{
  success?: boolean;
  events?: CustomizeEventData[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Fetch events with aggregated counts instead of all guests
    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        rsvpPageSettings: {
          select: {
            id: true,
            primaryColor: true,
            backgroundImage: true,
          },
        },
        _count: {
          select: { guests: true },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    // Get response counts for all events in parallel
    const eventIds = events.map((e) => e.id);
    const responseCounts = await prisma.guestRsvp.groupBy({
      by: ["guestId"],
      where: {
        guest: { weddingEventId: { in: eventIds } },
        status: { not: "PENDING" },
      },
      _count: true,
    });

    // Get guest-to-event mapping for counting responses per event
    const guestsWithResponses = await prisma.guest.findMany({
      where: {
        weddingEventId: { in: eventIds },
        rsvp: { status: { not: "PENDING" } },
      },
      select: { weddingEventId: true },
    });

    // Count responses per event
    const responsesByEvent = new Map<string, number>();
    guestsWithResponses.forEach((g) => {
      responsesByEvent.set(g.weddingEventId, (responsesByEvent.get(g.weddingEventId) || 0) + 1);
    });

    const eventsWithStats: CustomizeEventData[] = events.map((event) => {
      const totalGuests = event._count.guests;
      const rsvpResponses = responsesByEvent.get(event.id) || 0;
      const pendingResponses = totalGuests - rsvpResponses;
      const responseRate = totalGuests > 0 ? Math.round((rsvpResponses / totalGuests) * 100) : 0;

      // Check if event has any customization
      const hasCustomization = !!(
        event.rsvpPageSettings?.primaryColor ||
        event.rsvpPageSettings?.backgroundImage
      );

      return {
        id: event.id,
        title: event.title,
        dateTime: event.dateTime,
        location: event.location,
        venue: event.venue,
        customizeStats: {
          totalGuests,
          rsvpResponses,
          pendingResponses,
          responseRate,
          hasCustomization,
        },
      };
    });

    return { success: true, events: eventsWithStats };
  } catch (error) {
    console.error("Error fetching events for customize selector:", error);
    return { error: "Failed to fetch events" };
  }
}
