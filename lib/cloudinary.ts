import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function uploadImage(
  file: string, // base64 string
  folder: string = "rsvp-backgrounds"
): Promise<{ url: string; publicId: string }> {
  console.log("[Cloudinary] Starting upload to folder:", folder);
  console.log("[Cloudinary] File length:", file?.length);

  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "image",
      transformation: [
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    console.log("[Cloudinary] Upload success:", result.secure_url);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error("[Cloudinary] Upload error:", error);
    console.error("[Cloudinary] Error message:", error?.message);
    console.error("[Cloudinary] Error details:", error?.error);
    const errorMsg = error?.message || error?.error?.message || String(error);
    throw new Error(`Cloudinary error: ${errorMsg}`);
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image");
  }
}
