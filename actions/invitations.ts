"use server";

import { revalidatePath } from "next/cache";
import { UserRole, CollaboratorRole } from "@prisma/client";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isEventOwner } from "@/lib/permissions";
import { sendEventInvitationEmail } from "@/lib/email";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Create a shareable invitation link for an event
 */
export async function createEventInvitationLink(
  eventId: string,
  role: CollaboratorRole = "EDITOR"
) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Only owner can invite
    const isOwner = await isEventOwner(eventId, user.id);
    if (!isOwner) {
      return { error: "Only the event owner can invite collaborators" };
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation
    const invitation = await prisma.eventInvitation.create({
      data: {
        eventId,
        token,
        role,
        invitedBy: user.id,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Include locale in the invite link - default to Hebrew for Israeli market
    const inviteLink = `${appUrl}/he/accept-invite/${token}`;

    return { success: true, inviteLink, token: invitation.token };
  } catch (error) {
    console.error("Error creating invitation link:", error);
    return { error: "Failed to create invitation link" };
  }
}

/**
 * Send email invitation for an event
 */
export async function sendEventInvitation(
  eventId: string,
  email: string,
  role: CollaboratorRole = "EDITOR"
) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Only owner can invite
    const isOwner = await isEventOwner(eventId, user.id);
    if (!isOwner) {
      return { error: "Only the event owner can invite collaborators" };
    }

    // Get event details
    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: { title: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if user is already a collaborator
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingCollab = await prisma.eventCollaborator.findFirst({
        where: {
          eventId,
          userId: existingUser.id,
        },
      });

      if (existingCollab) {
        return { error: "This user is already a collaborator" };
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.eventInvitation.findFirst({
      where: {
        eventId,
        email: email.toLowerCase(),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return { error: "An invitation is already pending for this email" };
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation
    await prisma.eventInvitation.create({
      data: {
        eventId,
        email: email.toLowerCase(),
        token,
        role,
        invitedBy: user.id,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Include locale in the invite link - default to Hebrew for Israeli market
    const inviteLink = `${appUrl}/he/accept-invite/${token}`;

    // Send email
    try {
      await sendEventInvitationEmail({
        to: email,
        inviterName: user.name || user.email || "Someone",
        eventTitle: event.title,
        inviteLink,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Still return success since invitation was created
      return {
        success: true,
        emailSent: false,
        message: "Invitation created but email failed to send",
      };
    }

    return { success: true, emailSent: true };
  } catch (error) {
    console.error("Error sending event invitation:", error);
    return { error: "Failed to send invitation" };
  }
}

/**
 * Get invitation details by token
 */
export async function getInvitationByToken(token: string) {
  try {
    const invitation = await prisma.eventInvitation.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    if (invitation.acceptedAt) {
      return { error: "This invitation has already been accepted" };
    }

    if (invitation.expiresAt < new Date()) {
      return { error: "This invitation has expired" };
    }

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        eventTitle: invitation.event.title,
        eventId: invitation.event.id,
        inviterName: invitation.inviter.name || invitation.inviter.email,
      },
    };
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return { error: "Failed to fetch invitation" };
  }
}

/**
 * Accept invitation (for logged-in users)
 */
export async function acceptInvitation(token: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Please login to accept this invitation" };
    }

    const invitation = await prisma.eventInvitation.findUnique({
      where: { token },
      include: {
        event: true,
      },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    if (invitation.acceptedAt) {
      return { error: "This invitation has already been accepted" };
    }

    if (invitation.expiresAt < new Date()) {
      return { error: "This invitation has expired" };
    }

    // Check if user is already the owner
    if (invitation.event.ownerId === user.id) {
      return { error: "You are the owner of this event" };
    }

    // Check if already a collaborator
    const existingCollab = await prisma.eventCollaborator.findFirst({
      where: {
        eventId: invitation.eventId,
        userId: user.id,
      },
    });

    if (existingCollab) {
      // Mark invitation as accepted
      await prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return { error: "You are already a collaborator on this event" };
    }

    // Create collaborator record and mark invitation as accepted
    await prisma.$transaction([
      prisma.eventCollaborator.create({
        data: {
          eventId: invitation.eventId,
          userId: user.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          acceptedAt: new Date(),
        },
      }),
      prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    revalidatePath("/dashboard/events");

    return { success: true, eventId: invitation.eventId };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return { error: "Failed to accept invitation" };
  }
}

/**
 * Accept invitation and create account (for new users)
 */
export async function acceptInvitationWithRegistration(
  token: string,
  userData: { name: string; email: string; password: string }
) {
  try {
    const invitation = await prisma.eventInvitation.findUnique({
      where: { token },
      include: {
        event: true,
      },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    if (invitation.acceptedAt) {
      return { error: "This invitation has already been accepted" };
    }

    if (invitation.expiresAt < new Date()) {
      return { error: "This invitation has expired" };
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() },
    });

    if (existingUser) {
      return { error: "An account with this email already exists. Please login instead." };
    }

    // Hash password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user and collaborator in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verify since they're accepting an invitation
          role: UserRole.ROLE_WEDDING_OWNER,
          roles: [UserRole.ROLE_WEDDING_OWNER],
        },
      });

      // Create collaborator
      await tx.eventCollaborator.create({
        data: {
          eventId: invitation.eventId,
          userId: newUser.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          acceptedAt: new Date(),
        },
      });

      // Mark invitation as accepted
      await tx.eventInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return newUser;
    });

    return {
      success: true,
      eventId: invitation.eventId,
      userId: result.id,
    };
  } catch (error) {
    console.error("Error accepting invitation with registration:", error);
    return { error: "Failed to create account" };
  }
}

/**
 * Get pending invitations for an event
 */
export async function getEventInvitations(eventId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Only owner can view invitations
    const isOwner = await isEventOwner(eventId, user.id);
    if (!isOwner) {
      return { error: "Only the event owner can view invitations" };
    }

    const invitations = await prisma.eventInvitation.findMany({
      where: {
        eventId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, invitations };
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return { error: "Failed to fetch invitations" };
  }
}

/**
 * Cancel/delete an invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const invitation = await prisma.eventInvitation.findUnique({
      where: { id: invitationId },
      include: { event: true },
    });

    if (!invitation) {
      return { error: "Invitation not found" };
    }

    // Only owner can cancel
    if (invitation.event.ownerId !== user.id) {
      return { error: "Only the event owner can cancel invitations" };
    }

    await prisma.eventInvitation.delete({
      where: { id: invitationId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error canceling invitation:", error);
    return { error: "Failed to cancel invitation" };
  }
}
