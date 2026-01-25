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
import { uploadImage } from "@/lib/cloudinary";
import { archiveEvent } from "@/lib/archive/event-archive-service";
import { isR2Configured } from "@/lib/r2";

export async function createEvent(input: CreateEventInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
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

    // Handle invitation image upload if provided
    let invitationImageUrl: string | null = null;
    let invitationImagePublicId: string | null = null;

    if (validatedData.invitationImageBase64 && validatedData.invitationImageBase64.startsWith("data:image/")) {
      try {
        const uploadResult = await uploadImage(
          validatedData.invitationImageBase64,
          `invitation-images/${userId}`
        );
        invitationImageUrl = uploadResult.url;
        invitationImagePublicId = uploadResult.publicId;
      } catch (uploadError) {
        console.error("Error uploading invitation image:", uploadError);
        // Continue without the image if upload fails
      }
    }

    // Handle workspace assignment
    let workspaceId = validatedData.workspaceId;

    if (workspaceId) {
      // Verify workspace ownership
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          ownerId: userId,
        },
      });

      if (!workspace) {
        return { error: "Workspace not found or unauthorized" };
      }
    } else {
      // Get or create default workspace
      let defaultWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: userId,
          isDefault: true,
        },
      });

      if (!defaultWorkspace) {
        // Create default workspace if none exists
        const slug = `workspace-${userId.slice(-8)}`;
        defaultWorkspace = await prisma.workspace.create({
          data: {
            name: "My Events",
            slug,
            ownerId: userId,
            isDefault: true,
          },
        });
      }

      workspaceId = defaultWorkspace.id;
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
        workspaceId,
        invitationImageUrl,
        invitationImagePublicId,
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

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
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

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const existingEvent = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!existingEvent) {
      return { error: "Event not found" };
    }

    // Archive event to R2 before deletion (if R2 is configured)
    if (isR2Configured()) {
      try {
        await archiveEvent(eventId, user.id);
      } catch (archiveError) {
        console.error("Failed to archive event:", archiveError);
        return { error: "Failed to archive event before deletion. Please try again." };
      }
    }

    // Hard delete event (cascade handles related records)
    await prisma.weddingEvent.delete({
      where: { id: eventId },
    });

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/archives");

    return { success: true, archived: isR2Configured() };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { error: "Failed to delete event" };
  }
}

export async function getEventById(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Allow both owner and collaborator access
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        isArchived: false,
        OR: [
          { ownerId: user.id },
          {
            collaborators: {
              some: {
                userId: user.id,
                acceptedAt: { not: null },
              },
            },
          },
        ],
      },
      include: {
        rsvpPageSettings: true,
        guests: {
          include: {
            rsvp: true,
            notificationLogs: {
              where: {
                type: { in: ["INVITE", "REMINDER", "INTERACTIVE_INVITE", "INTERACTIVE_REMINDER"] },
              },
              orderBy: { createdAt: "desc" },
            },
            vapiCallLogs: {
              where: {
                status: { in: ["COMPLETED", "NO_ANSWER", "BUSY"] },
              },
              orderBy: { createdAt: "desc" },
            },
            tableAssignment: {
              include: { table: { select: { name: true } } },
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

    // Convert Decimal to number for client component serialization
    const serializedEvent = {
      ...event,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : null,
    };

    return { success: true, event: serializedEvent };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { error: "Failed to fetch event" };
  }
}

/**
 * Soft archive an event (without deleting)
 * Sets isArchived = true and archivedAt timestamp
 */
export async function softArchiveEvent(eventId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Only owner can archive
    const existingEvent = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!existingEvent) {
      return { error: "Event not found" };
    }

    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/archives");

    return { success: true };
  } catch (error) {
    console.error("Error archiving event:", error);
    return { error: "Failed to archive event" };
  }
}

/**
 * Unarchive an event
 */
export async function unarchiveEvent(eventId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const existingEvent = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!existingEvent) {
      return { error: "Event not found" };
    }

    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/archives");

    return { success: true };
  } catch (error) {
    console.error("Error unarchiving event:", error);
    return { error: "Failed to unarchive event" };
  }
}

export async function getUserEvents(workspaceId?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    const userPlan = dbUser?.plan || user.plan;

    // For BUSINESS users, filter by workspace
    // For other users, show all events (they only have one workspace)
    let currentWorkspaceId = workspaceId;

    if (!currentWorkspaceId && userPlan === "BUSINESS") {
      // Get the default workspace for BUSINESS users
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: user.id,
          isDefault: true,
        },
        select: { id: true },
      });
      currentWorkspaceId = defaultWorkspace?.id;
    }

    // Build where clause for owned events
    const ownedWhereClause: { ownerId: string; workspaceId?: string; isArchived: boolean } = {
      ownerId: user.id,
      isArchived: false,
    };

    // Only filter by workspace for BUSINESS users
    if (userPlan === "BUSINESS" && currentWorkspaceId) {
      ownedWhereClause.workspaceId = currentWorkspaceId;
    }

    // Fetch owned events
    const ownedEvents = await prisma.weddingEvent.findMany({
      where: ownedWhereClause,
      include: {
        _count: {
          select: { guests: true },
        },
        guests: {
          include: {
            rsvp: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    // Fetch collaborated events (events where user is a collaborator)
    const collaboratedEvents = await prisma.weddingEvent.findMany({
      where: {
        isArchived: false,
        collaborators: {
          some: {
            userId: user.id,
            acceptedAt: { not: null },
          },
        },
      },
      include: {
        _count: {
          select: { guests: true },
        },
        guests: {
          include: {
            rsvp: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        collaborators: {
          where: {
            userId: user.id,
            acceptedAt: { not: null },
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: { dateTime: "asc" },
    });

    // Helper function to calculate stats
    const calculateStats = (event: typeof ownedEvents[0]) => {
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

      return stats;
    };

    // Process owned events
    const ownedEventsWithStats = ownedEvents.map((event) => ({
      ...event,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : null,
      stats: calculateStats(event),
      isOwner: true,
      collaboratorRole: null as null,
    }));

    // Process collaborated events
    const collaboratedEventsWithStats = collaboratedEvents.map((event) => ({
      ...event,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : null,
      stats: calculateStats(event),
      isOwner: false,
      collaboratorRole: event.collaborators[0]?.role || null,
    }));

    return {
      success: true,
      events: ownedEventsWithStats,
      collaboratedEvents: collaboratedEventsWithStats,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    return { error: "Failed to fetch events" };
  }
}

// Version for event selector - includes stats for card display
export async function getEventsForSelector() {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
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
