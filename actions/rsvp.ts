"use server";

import { RsvpStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { submitRsvpSchema, type SubmitRsvpInput } from "@/lib/validations/rsvp";
import { notificationService } from "@/lib/notifications/mock-service";
import { isRateLimited, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

export async function getGuestBySlug(slug: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { slug },
      include: {
        weddingEvent: {
          include: {
            rsvpPageSettings: true,
          },
        },
        rsvp: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    if (!guest.weddingEvent.isActive) {
      return { error: "This event is no longer accepting RSVPs" };
    }

    return { success: true, guest };
  } catch (error) {
    console.error("Error fetching guest:", error);
    return { error: "Failed to fetch guest information" };
  }
}

export async function submitRsvp(input: SubmitRsvpInput) {
  try {
    const validatedData = submitRsvpSchema.parse(input);

    // Rate limit by guest slug (30 requests per minute per guest)
    if (isRateLimited("submitRsvp", validatedData.slug, RATE_LIMIT_PRESETS.rsvp)) {
      return { error: "Too many requests. Please try again later." };
    }

    // Get guest
    const guest = await prisma.guest.findUnique({
      where: { slug: validatedData.slug },
      include: {
        weddingEvent: true,
        rsvp: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    if (!guest.weddingEvent.isActive) {
      return { error: "This event is no longer accepting RSVPs" };
    }

    // Update or create RSVP
    const rsvpData = {
      status: validatedData.status,
      guestCount: validatedData.status === RsvpStatus.ACCEPTED ? validatedData.guestCount : 0,
      note: validatedData.note,
      respondedAt: new Date(),
    };

    let rsvp;
    if (guest.rsvp) {
      rsvp = await prisma.guestRsvp.update({
        where: { id: guest.rsvp.id },
        data: rsvpData,
      });
    } else {
      rsvp = await prisma.guestRsvp.create({
        data: {
          guestId: guest.id,
          ...rsvpData,
        },
      });
    }

    // Send confirmation notification
    try {
      await notificationService.sendConfirmation(
        guest,
        guest.weddingEvent,
        validatedData.status as "ACCEPTED" | "DECLINED"
      );

      // Log the confirmation notification
      await prisma.notificationLog.create({
        data: {
          guestId: guest.id,
          type: "CONFIRMATION",
          channel: guest.phoneNumber ? "WHATSAPP" : "EMAIL",
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (notificationError) {
      console.error("Error sending confirmation:", notificationError);
      // Don't fail the RSVP submission if notification fails
    }

    return { success: true, rsvp };
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    return { error: "Failed to submit RSVP" };
  }
}
