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
      },
      orderBy: { dateTime: "asc" },
    });

    return { success: true, events };
  } catch (error) {
    console.error("Error fetching events for dropdown:", error);
    return { error: "Failed to fetch events" };
  }
}
