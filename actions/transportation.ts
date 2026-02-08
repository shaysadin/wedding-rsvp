"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";

/**
 * Get event by ID for generic transportation registration
 */
export async function getEventForTransportation(eventId: string) {
  try {
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
        transportationEnabled: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if transportation is enabled
    if (!event.transportationEnabled) {
      return { error: "Transportation registration is currently disabled for this event" };
    }

    return { event };
  } catch (error) {
    console.error("[getEventForTransportation] Error:", error);
    return { error: "Failed to load event data" };
  }
}

/**
 * Get guest by transportation slug
 */
export async function getGuestByTransportationSlug(slug: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { transportationSlug: slug },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        transportationSlug: true,
        weddingEvent: {
          select: {
            id: true,
            title: true,
            dateTime: true,
            location: true,
            venue: true,
            transportationEnabled: true,
          },
        },
        transportationRegistration: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            pickupPlaceId: true,
            location: true,
            quantity: true,
            language: true,
            notes: true,
            registeredAt: true,
            pickupPlace: {
              select: {
                id: true,
                name: true,
                nameHe: true,
                nameEn: true,
                nameAr: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Check if transportation is enabled
    if (!guest.weddingEvent.transportationEnabled) {
      return { error: "Transportation registration is currently disabled for this event" };
    }

    return { guest };
  } catch (error) {
    console.error("[getGuestByTransportationSlug] Error:", error);
    return { error: "Failed to load guest data" };
  }
}

/**
 * Get active pickup places for an event
 */
export async function getPickupPlaces(eventId: string) {
  try {
    const places = await prisma.transportationPickupPlace.findMany({
      where: {
        weddingEventId: eventId,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        nameHe: true,
        nameEn: true,
        nameAr: true,
        address: true,
        sortOrder: true,
      },
    });

    return { places };
  } catch (error) {
    console.error("[getPickupPlaces] Error:", error);
    return { error: "Failed to load pickup places", places: [] };
  }
}

/**
 * Register for transportation (guest-specific)
 */
const transportationRegistrationSchema = z.object({
  guestId: z.string().cuid(),
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  pickupPlaceId: z.string().optional(),
  location: z.string().min(1, "Pickup location is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(20, "Quantity cannot exceed 20"),
  notes: z.string().optional(),
});

export async function registerForTransportation(
  input: z.infer<typeof transportationRegistrationSchema>
) {
  try {
    const validatedData = transportationRegistrationSchema.parse(input);

    // Check if guest exists
    const guest = await prisma.guest.findUnique({
      where: { id: validatedData.guestId },
      select: { id: true, weddingEventId: true },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Check if already registered
    const existing = await prisma.transportationRegistration.findUnique({
      where: { guestId: validatedData.guestId },
    });

    if (existing) {
      // Update existing registration
      const updated = await prisma.transportationRegistration.update({
        where: { guestId: validatedData.guestId },
        data: {
          fullName: validatedData.fullName,
          phoneNumber: validatedData.phoneNumber,
          pickupPlaceId: validatedData.pickupPlaceId || null,
          location: validatedData.location,
          quantity: validatedData.quantity,
          notes: validatedData.notes || null,
        },
      });

      return { success: true, registration: updated };
    }

    // Create new registration
    const registration = await prisma.transportationRegistration.create({
      data: {
        weddingEventId: guest.weddingEventId,
        guestId: validatedData.guestId,
        fullName: validatedData.fullName,
        phoneNumber: validatedData.phoneNumber,
        pickupPlaceId: validatedData.pickupPlaceId || null,
        location: validatedData.location,
        quantity: validatedData.quantity,
        notes: validatedData.notes || null,
      },
    });

    return { success: true, registration };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("[registerForTransportation] Error:", error);
    return { error: "Failed to register for transportation" };
  }
}

/**
 * Register for transportation (generic - no guest ID required)
 */
const genericTransportationRegistrationSchema = z.object({
  eventId: z.string().cuid(),
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  pickupPlaceId: z.string().optional(),
  location: z.string().min(1, "Pickup location is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(20, "Quantity cannot exceed 20"),
  language: z.string().optional().default("he"),
  notes: z.string().optional(),
});

export async function registerForTransportationGeneric(
  input: z.infer<typeof genericTransportationRegistrationSchema>
) {
  try {
    const validatedData = genericTransportationRegistrationSchema.parse(input);

    // Verify event exists and is not archived
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: validatedData.eventId,
        isArchived: false,
      },
      select: { id: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Create new registration (no guestId)
    const registration = await prisma.transportationRegistration.create({
      data: {
        weddingEventId: validatedData.eventId,
        guestId: null, // Generic registration - no guest association
        fullName: validatedData.fullName,
        phoneNumber: validatedData.phoneNumber,
        pickupPlaceId: validatedData.pickupPlaceId || null,
        location: validatedData.location,
        quantity: validatedData.quantity,
        language: validatedData.language || "he",
        notes: validatedData.notes || null,
      },
    });

    return { success: true, registration };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("[registerForTransportationGeneric] Error:", error);
    return { error: "Failed to register for transportation" };
  }
}

// ========================================
// Pickup Place Management (Event Owner)
// ========================================

/**
 * Get all pickup places for an event (including inactive)
 */
export async function getPickupPlacesForManagement(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    const places = await prisma.transportationPickupPlace.findMany({
      where: {
        weddingEventId: eventId,
      },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return { success: true, places };
  } catch (error) {
    console.error("[getPickupPlacesForManagement] Error:", error);
    return { error: "Failed to load pickup places" };
  }
}

/**
 * Create a new pickup place
 */
const createPickupPlaceSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(1, "Name is required"),
  nameHe: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export async function createPickupPlace(
  input: z.infer<typeof createPickupPlaceSchema>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = createPickupPlaceSchema.parse(input);

    const hasAccess = await canAccessEvent(validatedData.eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    const pickupPlace = await prisma.transportationPickupPlace.create({
      data: {
        weddingEventId: validatedData.eventId,
        name: validatedData.name,
        nameHe: validatedData.nameHe || null,
        nameEn: validatedData.nameEn || null,
        nameAr: validatedData.nameAr || null,
        address: validatedData.address || null,
        notes: validatedData.notes || null,
        sortOrder: validatedData.sortOrder,
      },
    });

    revalidatePath(`/events/${validatedData.eventId}/transportation`);
    return { success: true, pickupPlace };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("[createPickupPlace] Error:", error);
    return { error: "Failed to create pickup place" };
  }
}

/**
 * Update a pickup place
 */
const updatePickupPlaceSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, "Name is required"),
  nameHe: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

export async function updatePickupPlace(
  input: z.infer<typeof updatePickupPlaceSchema>
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = updatePickupPlaceSchema.parse(input);

    // Get existing pickup place to verify event access
    const existing = await prisma.transportationPickupPlace.findUnique({
      where: { id: validatedData.id },
      select: { weddingEventId: true },
    });

    if (!existing) {
      return { error: "Pickup place not found" };
    }

    const hasAccess = await canAccessEvent(existing.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    const pickupPlace = await prisma.transportationPickupPlace.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        nameHe: validatedData.nameHe || null,
        nameEn: validatedData.nameEn || null,
        nameAr: validatedData.nameAr || null,
        address: validatedData.address || null,
        notes: validatedData.notes || null,
        sortOrder: validatedData.sortOrder,
        isActive: validatedData.isActive,
      },
    });

    revalidatePath(`/events/${existing.weddingEventId}/transportation`);
    return { success: true, pickupPlace };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("[updatePickupPlace] Error:", error);
    return { error: "Failed to update pickup place" };
  }
}

/**
 * Delete a pickup place
 */
export async function deletePickupPlace(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get existing pickup place to verify event access
    const existing = await prisma.transportationPickupPlace.findUnique({
      where: { id },
      select: {
        weddingEventId: true,
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!existing) {
      return { error: "Pickup place not found" };
    }

    if (existing._count.registrations > 0) {
      return {
        error: `Cannot delete pickup place with ${existing._count.registrations} registration(s). Please reassign them first or mark as inactive.`,
      };
    }

    const hasAccess = await canAccessEvent(existing.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    await prisma.transportationPickupPlace.delete({
      where: { id },
    });

    revalidatePath(`/events/${existing.weddingEventId}/transportation`);
    return { success: true };
  } catch (error) {
    console.error("[deletePickupPlace] Error:", error);
    return { error: "Failed to delete pickup place" };
  }
}

/**
 * Toggle pickup place active status
 */
export async function togglePickupPlaceStatus(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const existing = await prisma.transportationPickupPlace.findUnique({
      where: { id },
      select: { weddingEventId: true, isActive: true },
    });

    if (!existing) {
      return { error: "Pickup place not found" };
    }

    const hasAccess = await canAccessEvent(existing.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    const pickupPlace = await prisma.transportationPickupPlace.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
    });

    revalidatePath(`/events/${existing.weddingEventId}/transportation`);
    return { success: true, pickupPlace };
  } catch (error) {
    console.error("[togglePickupPlaceStatus] Error:", error);
    return { error: "Failed to toggle pickup place status" };
  }
}

/**
 * Reorder pickup places
 */
export async function reorderPickupPlaces(eventId: string, orderedIds: string[]) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    // Update sort order for each pickup place
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.transportationPickupPlace.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath(`/events/${eventId}/transportation`);
    return { success: true };
  } catch (error) {
    console.error("[reorderPickupPlaces] Error:", error);
    return { error: "Failed to reorder pickup places" };
  }
}

/**
 * Toggle transportation enabled status
 */
export async function toggleTransportationEnabled(eventId: string, enabled: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "You don't have permission to access this event" };
    }

    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: { transportationEnabled: enabled },
    });

    revalidatePath(`/events/${eventId}/transportation`);
    return { success: true };
  } catch (error) {
    console.error("[toggleTransportationEnabled] Error:", error);
    return { error: "Failed to update transportation status" };
  }
}
