import { NextRequest, NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/session";
import { scanInvitationTemplate } from "@/lib/gemini";

export const maxDuration = 60; // Allow up to 60 seconds for AI processing

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only platform owners can scan templates
    const user = await requirePlatformOwner();
    if (!user) {
      return NextResponse.json(
        { error: "Forbidden - Platform owner access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrl, imageBase64, mimeType } = body;

    let base64Data: string;
    let imageMimeType: string;

    if (imageBase64) {
      // Use provided base64 data
      base64Data = imageBase64;
      imageMimeType = mimeType || "image/png";
    } else if (imageUrl) {
      // Fetch image from URL and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch image" },
          { status: 400 }
        );
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      imageMimeType = imageResponse.headers.get("content-type") || "image/png";
    } else {
      return NextResponse.json(
        { error: "Either imageUrl or imageBase64 is required" },
        { status: 400 }
      );
    }

    // Scan the template with AI
    const result = await scanInvitationTemplate(base64Data, imageMimeType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to scan template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fields: result.fields,
    });
  } catch (error) {
    console.error("Error in scan-template API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
