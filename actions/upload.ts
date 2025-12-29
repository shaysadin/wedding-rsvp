"use server";

import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Base64 encoding adds ~33% overhead, so we need to account for that
const MAX_BASE64_SIZE = Math.floor(MAX_FILE_SIZE * 1.4);

export async function uploadBackgroundImage(base64Data: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Validate base64 data
    if (!base64Data || typeof base64Data !== "string") {
      return { error: "Invalid image data" };
    }

    // Check if it's a valid base64 image
    if (!base64Data.startsWith("data:image/")) {
      return { error: "Invalid image format. Please upload a valid image file." };
    }

    // Check file size (approximate, base64 is ~33% larger than original)
    const base64Size = base64Data.length;
    if (base64Size > MAX_BASE64_SIZE) {
      const estimatedOriginalSize = Math.round((base64Size * 0.75) / (1024 * 1024));
      return {
        error: `Image is too large (~${estimatedOriginalSize}MB). Maximum size is 5MB.`,
        code: "FILE_TOO_LARGE"
      };
    }

    const result = await uploadImage(base64Data, `rsvp-backgrounds/${user.id}`);

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  } catch (error: any) {
    console.error("Error uploading image:", error);

    // Handle specific Cloudinary errors
    if (error.message?.includes("File size too large")) {
      return { error: "Image is too large. Maximum size is 5MB.", code: "FILE_TOO_LARGE" };
    }

    if (error.message?.includes("Invalid image")) {
      return { error: "Invalid image file. Please try a different image.", code: "INVALID_IMAGE" };
    }

    return { error: "Failed to upload image. Please try again." };
  }
}

export async function deleteBackgroundImage(publicId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify the publicId belongs to this user's folder
    if (!publicId.includes(`rsvp-backgrounds/${user.id}`)) {
      return { error: "Unauthorized" };
    }

    await deleteImage(publicId);

    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { error: "Failed to delete image" };
  }
}

/**
 * Upload invitation image for WhatsApp messages
 */
export async function uploadInvitationImage(eventId: string, base64Data: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify the event belongs to this user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Validate base64 data
    if (!base64Data || typeof base64Data !== "string") {
      return { error: "Invalid image data" };
    }

    if (!base64Data.startsWith("data:image/")) {
      return { error: "Invalid image format. Please upload a valid image file." };
    }

    // Check file size
    const base64Size = base64Data.length;
    if (base64Size > MAX_BASE64_SIZE) {
      const estimatedOriginalSize = Math.round((base64Size * 0.75) / (1024 * 1024));
      return {
        error: `Image is too large (~${estimatedOriginalSize}MB). Maximum size is 5MB.`,
        code: "FILE_TOO_LARGE"
      };
    }

    // Delete old image if exists
    if (event.invitationImagePublicId) {
      try {
        await deleteImage(event.invitationImagePublicId);
      } catch (e) {
        console.error("Error deleting old invitation image:", e);
      }
    }

    // Upload new image
    const result = await uploadImage(base64Data, `invitation-images/${user.id}`);

    // Update event with new image
    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        invitationImageUrl: result.url,
        invitationImagePublicId: result.publicId,
      },
    });

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  } catch (error: any) {
    console.error("Error uploading invitation image:", error);

    if (error.message?.includes("File size too large")) {
      return { error: "Image is too large. Maximum size is 5MB.", code: "FILE_TOO_LARGE" };
    }

    if (error.message?.includes("Invalid image")) {
      return { error: "Invalid image file. Please try a different image.", code: "INVALID_IMAGE" };
    }

    return { error: "Failed to upload image. Please try again." };
  }
}

/**
 * Delete invitation image from event
 */
export async function deleteInvitationImage(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify the event belongs to this user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Delete from Cloudinary if exists
    if (event.invitationImagePublicId) {
      await deleteImage(event.invitationImagePublicId);
    }

    // Clear from database
    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        invitationImageUrl: null,
        invitationImagePublicId: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting invitation image:", error);
    return { error: "Failed to delete image" };
  }
}
