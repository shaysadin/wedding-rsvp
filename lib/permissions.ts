import { prisma } from "@/lib/db";
import { CollaboratorRole, UserRole } from "@prisma/client";

/**
 * Check if a user can access an event (as owner, collaborator, or platform owner)
 */
export async function canAccessEvent(
  eventId: string,
  userId: string,
  requiredRole?: CollaboratorRole
): Promise<boolean> {
  // Check if user is platform owner - platform owners have access to ALL events
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });

  if (user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
    return true;
  }

  // Check owner first
  const isOwner = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: userId, isArchived: false },
  });
  if (isOwner) return true;

  // Check collaborator
  const collab = await prisma.eventCollaborator.findFirst({
    where: {
      eventId,
      userId,
      acceptedAt: { not: null },
    },
  });
  if (!collab) return false;

  // If editor role is required, viewer cannot access
  if (requiredRole === "EDITOR" && collab.role === "VIEWER") {
    return false;
  }
  return true;
}

/**
 * Check if user is the owner of an event (or platform owner)
 */
export async function isEventOwner(
  eventId: string,
  userId: string
): Promise<boolean> {
  // Platform owners are treated as owners of all events
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });

  if (user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
    return true;
  }

  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: userId },
  });
  return !!event;
}

/**
 * Get user's role for an event
 * Returns 'platform_owner', 'owner', 'editor', 'viewer', or null if no access
 */
export async function getUserEventRole(
  eventId: string,
  userId: string
): Promise<"platform_owner" | "owner" | "editor" | "viewer" | null> {
  // Check if platform owner - they have full access to all events
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });

  if (user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
    // Check if they're also the actual owner
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: userId },
    });
    if (event) return "owner";

    return "platform_owner";
  }

  // Check owner
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: userId },
  });
  if (event) return "owner";

  // Check collaborator
  const collab = await prisma.eventCollaborator.findFirst({
    where: {
      eventId,
      userId,
      acceptedAt: { not: null },
    },
  });
  if (!collab) return null;

  return collab.role === "EDITOR" ? "editor" : "viewer";
}

/**
 * Get event with access check
 * Returns the event if user has access, null otherwise
 */
export async function getEventWithAccess(
  eventId: string,
  userId: string,
  requiredRole?: CollaboratorRole
) {
  const hasAccess = await canAccessEvent(eventId, userId, requiredRole);
  if (!hasAccess) return null;

  return prisma.weddingEvent.findUnique({
    where: { id: eventId },
    include: {
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
}
