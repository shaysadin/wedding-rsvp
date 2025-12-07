import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's pending plan change
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        pendingPlanChange: true,
      },
    });

    if (!dbUser?.pendingPlanChange) {
      return NextResponse.json(
        { error: "No pending plan change to cancel" },
        { status: 400 }
      );
    }

    // Clear the pending plan change in the database
    // The Stripe subscription is not modified - it stays as is
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingPlanChange: null,
        pendingPlanChangeDate: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled plan change has been cancelled",
    });
  } catch (error: any) {
    console.error("Error cancelling scheduled change:", error);

    return NextResponse.json(
      { error: error.message || "Failed to cancel scheduled change" },
      { status: 500 }
    );
  }
}
