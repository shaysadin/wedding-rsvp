"use server";

import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

export async function uploadBackgroundImage(base64Data: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const result = await uploadImage(base64Data, `rsvp-backgrounds/${user.id}`);

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return { error: "Failed to upload image" };
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
