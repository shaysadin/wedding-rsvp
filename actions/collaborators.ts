"use server";

import { revalidatePath } from "next/cache";
import { UserRole, CollaboratorRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isEventOwner } from "@/lib/permissions";

/**
 * Get all collaborators for an event
 */
export async function getEventCollaborators(eventId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Check if user has access to the event
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
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
      select: {
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!event) {
      return { error: "Event not found or access denied" };
    }

    const collaborators = await prisma.eventCollaborator.findMany({
      where: {
        eventId,
        acceptedAt: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      owner: event.owner,
      collaborators: collaborators.map((c) => ({
        id: c.id,
        role: c.role,
        user: c.user,
        acceptedAt: c.acceptedAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return { error: "Failed to fetch collaborators" };
  }
}

/**
 * Update collaborator role
 */
export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole
) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const collaborator = await prisma.eventCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { event: true },
    });

    if (!collaborator) {
      return { error: "Collaborator not found" };
    }

    // Only owner can update roles
    if (collaborator.event.ownerId !== user.id) {
      return { error: "Only the event owner can update collaborator roles" };
    }

    await prisma.eventCollaborator.update({
      where: { id: collaboratorId },
      data: { role },
    });

    revalidatePath(`/dashboard/events/${collaborator.eventId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating collaborator role:", error);
    return { error: "Failed to update role" };
  }
}

/**
 * Remove a collaborator from an event
 */
export async function removeCollaborator(collaboratorId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const collaborator = await prisma.eventCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { event: true },
    });

    if (!collaborator) {
      return { error: "Collaborator not found" };
    }

    // Owner can remove anyone, collaborators can only remove themselves
    if (collaborator.event.ownerId !== user.id && collaborator.userId !== user.id) {
      return { error: "You can only remove yourself from this event" };
    }

    await prisma.eventCollaborator.delete({
      where: { id: collaboratorId },
    });

    revalidatePath(`/dashboard/events/${collaborator.eventId}`);
    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return { error: "Failed to remove collaborator" };
  }
}

/**
 * Leave an event (for collaborators)
 */
export async function leaveEvent(eventId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Check if owner (owners can't leave their own events)
    const isOwner = await isEventOwner(eventId, user.id);
    if (isOwner) {
      return { error: "Owners cannot leave their own events" };
    }

    const collaborator = await prisma.eventCollaborator.findFirst({
      where: {
        eventId,
        userId: user.id,
      },
    });

    if (!collaborator) {
      return { error: "You are not a collaborator on this event" };
    }

    await prisma.eventCollaborator.delete({
      where: { id: collaborator.id },
    });

    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    console.error("Error leaving event:", error);
    return { error: "Failed to leave event" };
  }
}
