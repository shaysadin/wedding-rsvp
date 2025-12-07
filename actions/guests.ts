"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { UserRole, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createGuestSchema,
  updateGuestSchema,
  bulkImportGuestSchema,
  type CreateGuestInput,
  type UpdateGuestInput,
  type BulkImportGuestInput,
} from "@/lib/validations/guest";

const PLAN_GUEST_LIMITS: Record<PlanTier, number> = {
  FREE: 50,
  BASIC: Infinity,
  ADVANCED: Infinity,
  PREMIUM: Infinity,
  BUSINESS: Infinity,
};

function generateGuestSlug(): string {
  return nanoid(10);
}

export async function createGuest(input: CreateGuestInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const validatedData = createGuestSchema.parse(input);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.weddingEventId, ownerId: user.id },
      include: { _count: { select: { guests: true } } },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check guest limit
    const limit = PLAN_GUEST_LIMITS[user.plan];
    if (event._count.guests >= limit) {
      return {
        error: `You have reached the limit of ${limit} guests for your plan. Please upgrade to add more guests.`,
      };
    }

    const guest = await prisma.guest.create({
      data: {
        ...validatedData,
        slug: generateGuestSlug(),
      },
    });

    // Create initial RSVP record with PENDING status
    await prisma.guestRsvp.create({
      data: {
        guestId: guest.id,
        status: "PENDING",
      },
    });

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}`);

    return { success: true, guest };
  } catch (error) {
    console.error("Error creating guest:", error);
    return { error: "Failed to create guest" };
  }
}

export async function updateGuest(input: UpdateGuestInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateGuestSchema.parse(input);
    const { id, ...updateData } = validatedData;

    // Verify ownership through event
    const existingGuest = await prisma.guest.findFirst({
      where: { id },
      include: { weddingEvent: true },
    });

    if (!existingGuest || existingGuest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    const guest = await prisma.guest.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/dashboard/events/${existingGuest.weddingEventId}`);

    return { success: true, guest };
  } catch (error) {
    console.error("Error updating guest:", error);
    return { error: "Failed to update guest" };
  }
}

export async function deleteGuest(guestId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const existingGuest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!existingGuest || existingGuest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    await prisma.guest.delete({
      where: { id: guestId },
    });

    revalidatePath(`/dashboard/events/${existingGuest.weddingEventId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting guest:", error);
    return { error: "Failed to delete guest" };
  }
}

export async function deleteGuests(guestIds: string[]) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    if (guestIds.length === 0) {
      return { error: "No guests selected" };
    }

    // Verify ownership of all guests
    const guests = await prisma.guest.findMany({
      where: { id: { in: guestIds } },
      include: { weddingEvent: true },
    });

    const unauthorizedGuests = guests.filter(
      (g) => g.weddingEvent.ownerId !== user.id
    );

    if (unauthorizedGuests.length > 0) {
      return { error: "Unauthorized to delete some guests" };
    }

    // Get event ID for revalidation
    const eventId = guests[0]?.weddingEventId;

    await prisma.guest.deleteMany({
      where: { id: { in: guestIds } },
    });

    if (eventId) {
      revalidatePath(`/dashboard/events/${eventId}`);
    }

    return { success: true, deleted: guestIds.length };
  } catch (error) {
    console.error("Error deleting guests:", error);
    return { error: "Failed to delete guests" };
  }
}

export async function bulkImportGuests(input: BulkImportGuestInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const validatedData = bulkImportGuestSchema.parse(input);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.weddingEventId, ownerId: user.id },
      include: { _count: { select: { guests: true } } },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check guest limit
    const limit = PLAN_GUEST_LIMITS[user.plan];
    const newTotal = event._count.guests + validatedData.guests.length;
    if (newTotal > limit) {
      return {
        error: `Adding ${validatedData.guests.length} guests would exceed your limit of ${limit} guests. Current count: ${event._count.guests}.`,
      };
    }

    // Create guests in bulk
    const createdGuests = await Promise.all(
      validatedData.guests.map(async (guestData) => {
        const guest = await prisma.guest.create({
          data: {
            ...guestData,
            weddingEventId: validatedData.weddingEventId,
            slug: generateGuestSlug(),
          },
        });

        // Create initial RSVP record
        await prisma.guestRsvp.create({
          data: {
            guestId: guest.id,
            status: "PENDING",
          },
        });

        return guest;
      })
    );

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}`);

    return {
      success: true,
      imported: createdGuests.length,
      guests: createdGuests,
    };
  } catch (error) {
    console.error("Error importing guests:", error);
    return { error: "Failed to import guests" };
  }
}

export async function getEventGuests(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const guests = await prisma.guest.findMany({
      where: { weddingEventId: eventId },
      include: {
        rsvp: true,
        notificationLogs: {
          where: {
            type: { in: ["INVITE", "REMINDER"] },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, guests };
  } catch (error) {
    console.error("Error fetching guests:", error);
    return { error: "Failed to fetch guests" };
  }
}
