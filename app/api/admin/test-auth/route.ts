import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { requirePlatformOwner } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  console.log("[test-auth] Testing authentication...");

  try {
    // Test 1: getCurrentUser
    const sessionUser = await getCurrentUser();
    console.log("[test-auth] getCurrentUser result:", sessionUser ? {
      id: sessionUser.id,
      email: sessionUser.email,
      role: sessionUser.role,
      roles: sessionUser.roles,
    } : null);

    if (!sessionUser) {
      return NextResponse.json({
        error: "No session found",
        step: "getCurrentUser",
        sessionUser: null,
      }, { status: 401 });
    }

    // Test 2: Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        roles: true
      },
    });
    console.log("[test-auth] Database user:", dbUser);

    // Test 3: requirePlatformOwner
    const platformOwnerUser = await requirePlatformOwner();
    console.log("[test-auth] requirePlatformOwner result:", platformOwnerUser ? {
      id: platformOwnerUser.id,
      email: platformOwnerUser.email,
    } : null);

    return NextResponse.json({
      success: true,
      sessionUser: {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role,
        roles: sessionUser.roles,
      },
      dbUser,
      isPlatformOwner: !!platformOwnerUser,
    });
  } catch (error) {
    console.error("[test-auth] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
