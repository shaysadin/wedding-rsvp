"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getArchivedEvent,
  getUserArchives,
  type EventArchiveSnapshot,
} from "@/lib/archive/event-archive-service";
import { getSignedR2Url, deleteFromR2, isR2Configured } from "@/lib/r2";

/**
 * Get all archives for the current user
 */
export async function getMyArchives() {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (!isR2Configured()) {
      return { success: true, archives: [], r2Configured: false };
    }

    const archives = await getUserArchives(user.id);

    // Serialize dates for client components
    const serializedArchives = archives.map((archive) => ({
      id: archive.id,
      originalEventId: archive.originalEventId,
      eventTitle: archive.eventTitle,
      eventDate: archive.eventDate.toISOString(),
      guestCount: archive.guestCount,
      archiveSize: archive.archiveSize,
      archivedAt: archive.archivedAt.toISOString(),
      createdAt: archive.createdAt.toISOString(),
    }));

    return { success: true, archives: serializedArchives, r2Configured: true };
  } catch (error) {
    console.error("Error fetching archives:", error);
    return { error: "Failed to fetch archives" };
  }
}

/**
 * Get detailed archive data (full snapshot from R2)
 */
export async function getArchiveDetails(archiveId: string): Promise<{
  success?: boolean;
  error?: string;
  snapshot?: EventArchiveSnapshot;
}> {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (!isR2Configured()) {
      return { error: "Archive storage is not configured" };
    }

    const snapshot = await getArchivedEvent(archiveId, user.id);

    if (!snapshot) {
      return { error: "Archive not found" };
    }

    return { success: true, snapshot };
  } catch (error) {
    console.error("Error fetching archive details:", error);
    return { error: "Failed to fetch archive details" };
  }
}

/**
 * Generate a signed download URL for an archive
 */
export async function getArchiveDownloadUrl(archiveId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (!isR2Configured()) {
      return { error: "Archive storage is not configured" };
    }

    const archive = await prisma.eventArchive.findFirst({
      where: { id: archiveId, userId: user.id },
    });

    if (!archive) {
      return { error: "Archive not found" };
    }

    const url = await getSignedR2Url(archive.r2Key, 3600); // 1 hour expiry

    return { success: true, url };
  } catch (error) {
    console.error("Error generating download URL:", error);
    return { error: "Failed to generate download URL" };
  }
}

/**
 * Permanently delete an archive (from both R2 and database)
 */
export async function deleteArchive(archiveId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (!isR2Configured()) {
      return { error: "Archive storage is not configured" };
    }

    const archive = await prisma.eventArchive.findFirst({
      where: { id: archiveId, userId: user.id },
    });

    if (!archive) {
      return { error: "Archive not found" };
    }

    // Delete from R2
    try {
      await deleteFromR2(archive.r2Key);
    } catch (r2Error) {
      console.error("Error deleting from R2:", r2Error);
      // Continue with DB deletion even if R2 fails
    }

    // Delete metadata from DB
    await prisma.eventArchive.delete({
      where: { id: archiveId },
    });

    revalidatePath("/dashboard/archives");

    return { success: true };
  } catch (error) {
    console.error("Error deleting archive:", error);
    return { error: "Failed to delete archive" };
  }
}

/**
 * Check if archive storage is configured
 */
export async function checkArchiveStorageStatus() {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    return { success: true, configured: isR2Configured() };
  } catch (error) {
    console.error("Error checking archive storage status:", error);
    return { error: "Failed to check storage status" };
  }
}
