"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

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
      },
    });

    if (!event) {
      return { error: "Event not found" };
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
          },
        },
        transportationRegistration: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            location: true,
            notes: true,
            registeredAt: true,
          },
        },
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    return { guest };
  } catch (error) {
    console.error("[getGuestByTransportationSlug] Error:", error);
    return { error: "Failed to load guest data" };
  }
}

/**
 * Register for transportation (guest-specific)
 */
const transportationRegistrationSchema = z.object({
  guestId: z.string().cuid(),
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  location: z.string().min(1, "Pickup location is required"),
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
          location: validatedData.location,
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
        location: validatedData.location,
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
  location: z.string().min(1, "Pickup location is required"),
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
        location: validatedData.location,
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
