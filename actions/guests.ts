"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
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
import { isRateLimited, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

const PLAN_GUEST_LIMITS: Record<PlanTier, number> = {
  FREE: 50,
  BASIC: Infinity,
  ADVANCED: Infinity,
  PREMIUM: Infinity,
  BUSINESS: Infinity,
};

// Custom nanoid with only alphanumeric characters (no special chars like _ or -)
const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);

function generateGuestSlug(): string {
  return generateSlug();
}

// Normalize phone number for comparison (remove spaces, dashes, etc.)
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, "");
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

    // Check for duplicate phone number
    if (validatedData.phoneNumber && validatedData.phoneNumber.trim() !== "") {
      const normalizedPhone = normalizePhoneNumber(validatedData.phoneNumber);
      const existingGuests = await prisma.guest.findMany({
        where: {
          weddingEventId: validatedData.weddingEventId,
          phoneNumber: { not: null },
        },
        select: { id: true, name: true, phoneNumber: true },
      });

      const duplicates = existingGuests.filter(
        (g) => g.phoneNumber && normalizePhoneNumber(g.phoneNumber) === normalizedPhone
      );

      if (duplicates.length > 0) {
        return {
          error: "DUPLICATE_PHONE",
          duplicateNames: duplicates.map((g) => g.name),
          duplicateGuestIds: duplicates.map((g) => g.id),
        };
      }
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
    const { id, rsvpStatus, rsvpGuestCount, ...updateData } = validatedData;

    // Verify ownership through event
    const existingGuest = await prisma.guest.findFirst({
      where: { id },
      include: { weddingEvent: true, rsvp: true },
    });

    if (!existingGuest || existingGuest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Check for duplicate phone number (exclude current guest)
    if (updateData.phoneNumber && updateData.phoneNumber.trim() !== "") {
      const normalizedPhone = normalizePhoneNumber(updateData.phoneNumber);
      const otherGuests = await prisma.guest.findMany({
        where: {
          weddingEventId: existingGuest.weddingEventId,
          phoneNumber: { not: null },
          id: { not: id }, // Exclude current guest
        },
        select: { id: true, name: true, phoneNumber: true },
      });

      const duplicates = otherGuests.filter(
        (g) => g.phoneNumber && normalizePhoneNumber(g.phoneNumber) === normalizedPhone
      );

      if (duplicates.length > 0) {
        return {
          error: "DUPLICATE_PHONE",
          duplicateNames: duplicates.map((g) => g.name),
          duplicateGuestIds: duplicates.map((g) => g.id),
        };
      }
    }

    // Update guest data
    const guest = await prisma.guest.update({
      where: { id },
      data: updateData,
    });

    // Handle RSVP status update if provided
    if (rsvpStatus !== undefined) {
      const rsvpData = {
        status: rsvpStatus,
        guestCount: rsvpStatus === "ACCEPTED" ? (rsvpGuestCount ?? 1) : 0,
        respondedAt: new Date(),
      };

      if (existingGuest.rsvp) {
        await prisma.guestRsvp.update({
          where: { id: existingGuest.rsvp.id },
          data: rsvpData,
        });
      } else {
        await prisma.guestRsvp.create({
          data: {
            guestId: id,
            ...rsvpData,
          },
        });
      }
    }

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

    // Rate limit bulk imports (5 per minute per user)
    if (isRateLimited("bulkImportGuests", user.id, RATE_LIMIT_PRESETS.bulk)) {
      return { error: "Too many import requests. Please try again later." };
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

    // Check for duplicate phone numbers
    // 1. Get all existing phone numbers in the event
    const existingGuests = await prisma.guest.findMany({
      where: {
        weddingEventId: validatedData.weddingEventId,
        phoneNumber: { not: null },
      },
      select: { id: true, name: true, phoneNumber: true },
    });

    const existingPhones = new Set(
      existingGuests
        .filter((g) => g.phoneNumber)
        .map((g) => normalizePhoneNumber(g.phoneNumber!))
    );

    // 2. Check for duplicates in incoming guests against existing
    const duplicatesWithExisting: { name: string; phone: string; existingName: string; existingGuestId?: string }[] = [];
    // 3. Check for duplicates within the incoming batch
    const duplicatesWithinBatch: { name: string; phone: string }[] = [];
    const seenPhonesInBatch = new Map<string, string>(); // normalized phone -> guest name

    for (const guest of validatedData.guests) {
      if (guest.phoneNumber && guest.phoneNumber.trim() !== "") {
        const normalizedPhone = normalizePhoneNumber(guest.phoneNumber);

        // Check against existing guests
        if (existingPhones.has(normalizedPhone)) {
          const existingGuest = existingGuests.find(
            (g) => g.phoneNumber && normalizePhoneNumber(g.phoneNumber) === normalizedPhone
          );
          duplicatesWithExisting.push({
            name: guest.name,
            phone: guest.phoneNumber,
            existingName: existingGuest?.name || "Unknown",
            existingGuestId: existingGuest?.id,
          });
        }

        // Check against other guests in the same batch
        if (seenPhonesInBatch.has(normalizedPhone)) {
          duplicatesWithinBatch.push({
            name: guest.name,
            phone: guest.phoneNumber,
          });
        } else {
          seenPhonesInBatch.set(normalizedPhone, guest.name);
        }
      }
    }

    // If duplicates found, return error with details
    if (duplicatesWithExisting.length > 0 || duplicatesWithinBatch.length > 0) {
      const errorMessages: string[] = [];

      if (duplicatesWithExisting.length > 0) {
        const names = duplicatesWithExisting
          .map((d) => `${d.name} (${d.phone}) - already exists as ${d.existingName}`)
          .join(", ");
        errorMessages.push(`Duplicate phone numbers with existing guests: ${names}`);
      }

      if (duplicatesWithinBatch.length > 0) {
        const names = duplicatesWithinBatch.map((d) => `${d.name} (${d.phone})`).join(", ");
        errorMessages.push(`Duplicate phone numbers within import: ${names}`);
      }

      return {
        error: "DUPLICATE_PHONES_IN_IMPORT",
        details: errorMessages.join(". "),
        duplicatesWithExisting,
        duplicatesWithinBatch,
      };
    }

    // Create guests in batches to prevent connection pool exhaustion
    // Process 10 guests at a time instead of all at once
    const BATCH_SIZE = 10;
    const createdGuests: Awaited<ReturnType<typeof prisma.guest.create>>[] = [];

    for (let i = 0; i < validatedData.guests.length; i += BATCH_SIZE) {
      const batch = validatedData.guests.slice(i, i + BATCH_SIZE);

      // Process each batch with a transaction for data consistency
      const batchResults = await prisma.$transaction(
        batch.map((guestData) =>
          prisma.guest.create({
            data: {
              ...guestData,
              weddingEventId: validatedData.weddingEventId,
              slug: generateGuestSlug(),
            },
          })
        )
      );

      // Create RSVP records for this batch
      await prisma.$transaction(
        batchResults.map((guest) =>
          prisma.guestRsvp.create({
            data: {
              guestId: guest.id,
              status: "PENDING",
            },
          })
        )
      );

      createdGuests.push(...batchResults);
    }

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
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, guests };
  } catch (error) {
    console.error("Error fetching guests:", error);
    return { error: "Failed to fetch guests" };
  }
}

export async function checkDuplicatePhone(
  eventId: string,
  phoneNumber: string,
  excludeGuestId?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      return { success: true, isDuplicate: false };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Find guests with the same phone number
    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        phoneNumber: { not: null },
        ...(excludeGuestId ? { id: { not: excludeGuestId } } : {}),
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
    });

    // Check for duplicates with normalized comparison
    const duplicates = guests.filter(
      (g) => g.phoneNumber && normalizePhoneNumber(g.phoneNumber) === normalizedPhone
    );

    return {
      success: true,
      isDuplicate: duplicates.length > 0,
      duplicates: duplicates.map((g) => ({ id: g.id, name: g.name, phoneNumber: g.phoneNumber })),
    };
  } catch (error) {
    console.error("Error checking duplicate phone:", error);
    return { error: "Failed to check duplicate phone" };
  }
}

export async function getDuplicatePhoneGuests(eventId: string) {
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

    // Get all guests with phone numbers
    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        phoneNumber: { not: null },
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        side: true,
        groupName: true,
      },
      orderBy: { name: "asc" },
    });

    // Group by normalized phone number
    const phoneGroups = new Map<string, typeof guests>();

    for (const guest of guests) {
      if (!guest.phoneNumber) continue;
      const normalized = normalizePhoneNumber(guest.phoneNumber);
      if (!phoneGroups.has(normalized)) {
        phoneGroups.set(normalized, []);
      }
      phoneGroups.get(normalized)!.push(guest);
    }

    // Filter to only groups with duplicates
    const duplicateGroups: { phoneNumber: string; guests: typeof guests }[] = [];
    for (const [normalizedPhone, groupGuests] of phoneGroups) {
      if (groupGuests.length > 1) {
        duplicateGroups.push({
          phoneNumber: groupGuests[0].phoneNumber!, // Use original format from first guest
          guests: groupGuests,
        });
      }
    }

    return {
      success: true,
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.guests.length, 0),
    };
  } catch (error) {
    console.error("Error fetching duplicate phone guests:", error);
    return { error: "Failed to fetch duplicate phone guests" };
  }
}
