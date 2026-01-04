import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/lib/session";
import { pdfToPng, getPdfDimensions } from "@/lib/invitations/pdf-to-png";
import { uploadToR2, getPublicR2Url } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for processing

// Maximum file size (20MB for PDFs)
const MAX_PDF_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only platform owners can upload templates
    const user = await requirePlatformOwner();
    if (!user) {
      console.error("Upload PDF: User not authorized as platform owner");
      return NextResponse.json({
        error: "Unauthorized: Only platform owners can upload templates"
      }, { status: 403 });
    }

    console.log("Upload PDF: User authorized:", user.id);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid file type. Must be PDF" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_PDF_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Get PDF dimensions
    const dimensions = await getPdfDimensions(pdfBuffer);

    // Convert PDF to PNG
    const pngBuffer = await pdfToPng(pdfBuffer, { scale: 2 });

    // Upload PNG preview to R2
    const timestamp = Date.now();
    const pngKey = `invitation-templates/preview-${timestamp}.png`;
    await uploadToR2(pngKey, pngBuffer, "image/png");
    const previewUrl = await getPublicR2Url(pngKey);

    // Upload original PDF to R2
    const pdfKey = `invitation-templates/original-${timestamp}.pdf`;
    await uploadToR2(pdfKey, pdfBuffer, "application/pdf");
    const pdfUrl = await getPublicR2Url(pdfKey);

    return NextResponse.json({
      success: true,
      previewUrl,
      pdfUrl,
      dimensions,
    });
  } catch (error) {
    console.error("Error uploading PDF template:", error);
    return NextResponse.json(
      {
        error: `Failed to upload template: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
