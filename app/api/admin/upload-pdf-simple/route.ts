import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple test endpoint to verify the route works
export async function POST(request: NextRequest) {
  console.log("[upload-pdf-simple] POST request received");
  console.log("[upload-pdf-simple] URL:", request.url);
  console.log("[upload-pdf-simple] Method:", request.method);

  try {
    const user = await requirePlatformOwner();
    console.log("[upload-pdf-simple] User:", user ? user.id : "null");

    if (!user) {
      console.log("[upload-pdf-simple] No platform owner user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("[upload-pdf-simple] Success!");
    return NextResponse.json({ success: true, message: "Route works!", userId: user.id });
  } catch (error) {
    console.error("[upload-pdf-simple] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("[upload-pdf-simple] GET request received");
  return NextResponse.json({ message: "Upload PDF Simple - GET works" });
}
