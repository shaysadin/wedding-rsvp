"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createEventSchema,
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/lib/validations/event";
import { PLAN_LIMITS } from "@/config/plans";

export async function createEvent(input: CreateEventInput) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const userId = user.id;
    const validatedData = createEventSchema.parse(input);

    // Check plan limits
    const eventCount = await prisma.weddingEvent.count({
      where: { ownerId: userId },
    });

    const planLimits = PLAN_LIMITS[user.plan];
    // -1 means unlimited (BUSINESS tier)
    if (planLimits.maxEvents !== -1 && eventCount >= planLimits.maxEvents) {
      return {
        error: `You have reached the limit of ${planLimits.maxEvents} event(s) for your plan. Please upgrade to create more events.`,
        limitReached: true,
      };
    }

    const event = await prisma.weddingEvent.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        venue: validatedData.venue,
        notes: validatedData.notes,
        imageUrl: validatedData.imageUrl || null,
        dateTime: new Date(validatedData.dateTime),
        ownerId: userId,
      },
    });

    // Create default RSVP page settings
    await prisma.rsvpPageSettings.create({
      data: {
        weddingEventId: event.id,
      },
    });

    revalidatePath("/dashboard/events");

    return { success: true, event };
  } catch (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }
}

export async function updateEvent(input: UpdateEventInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateEventSchema.parse(input);
    const { id, ...updateData } = validatedData;

    // Verify ownership
    const existingEvent = await prisma.weddingEvent.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!existingEvent) {
      return { error: "Event not found" };
    }

    const event = await prisma.weddingEvent.update({
      where: { id },
      data: {
        ...updateData,
        dateTime: updateData.dateTime
          ? new Date(updateData.dateTime)
          : undefined,
      },
    });

    revalidatePath("/dashboard/events");
    revalidatePath(`/dashboard/events/${id}`);

    return { success: true, event };
  } catch (error) {
    console.error("Error updating event:", error);
    return { error: "Failed to update event" };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const existingEvent = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!existingEvent) {
      return { error: "Event not found" };
    }

    await prisma.weddingEvent.delete({
      where: { id: eventId },
    });

    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { error: "Failed to delete event" };
  }
}

export async function getEventById(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: {
        rsvpPageSettings: true,
        guests: {
          include: {
            rsvp: true,
            notificationLogs: {
              where: {
                type: { in: ["INVITE", "REMINDER"] },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        _count: {
          select: { guests: true },
        },
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    return { success: true, event };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { error: "Failed to fetch event" };
  }
}

export async function getUserEvents() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const events = await prisma.weddingEvent.findMany({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: { guests: true },
        },
        guests: {
          include: {
            rsvp: true,
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    // Calculate RSVP stats for each event
    const eventsWithStats = events.map((event) => {
      const stats = {
        total: event.guests.length,
        pending: 0,
        accepted: 0,
        declined: 0,
        totalGuestCount: 0,
      };

      event.guests.forEach((guest) => {
        if (!guest.rsvp || guest.rsvp.status === "PENDING") {
          stats.pending++;
        } else if (guest.rsvp.status === "ACCEPTED") {
          stats.accepted++;
          stats.totalGuestCount += guest.rsvp.guestCount;
        } else {
          stats.declined++;
        }
      });

      return {
        ...event,
        stats,
      };
    });

    return { success: true, events: eventsWithStats };
  } catch (error) {
    console.error("Error fetching events:", error);
    return { error: "Failed to fetch events" };
  }
}

// Version for event selector - includes stats for card display
export async function getEventsForSelector() {
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
        isActive: true,
        guests: {
          select: {
            id: true,
            rsvp: {
              select: {
                status: true,
                guestCount: true,
              },
            },
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    const eventsForSelector = events.map((event) => {
      // Calculate RSVP stats
      const stats = {
        total: event.guests.length,
        pending: 0,
        accepted: 0,
        declined: 0,
        totalGuestCount: 0,
      };

      event.guests.forEach((guest) => {
        if (!guest.rsvp || guest.rsvp.status === "PENDING") {
          stats.pending++;
        } else if (guest.rsvp.status === "ACCEPTED") {
          stats.accepted++;
          stats.totalGuestCount += guest.rsvp.guestCount;
        } else {
          stats.declined++;
        }
      });

      return {
        id: event.id,
        title: event.title,
        dateTime: event.dateTime,
        location: event.location,
        isActive: event.isActive,
        stats,
      };
    });

    return { success: true, events: eventsForSelector };
  } catch (error) {
    console.error("Error fetching events for selector:", error);
    return { error: "Failed to fetch events" };
  }
}
