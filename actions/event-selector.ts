"use server";

import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// ============ BASIC EVENTS FOR DROPDOWN ============

export interface BasicEventData {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
}

export async function getEventsForDropdown(): Promise<{
  success?: boolean;
  events?: BasicEventData[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const events = await prisma.weddingEvent.findMany({
      where: {
        ownerId: user.id,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
      },
      orderBy: { dateTime: "asc" },
    });

    return { success: true, events };
  } catch (error) {
    console.error("Error fetching events for dropdown:", error);
    return { error: "Failed to fetch events" };
  }
}
