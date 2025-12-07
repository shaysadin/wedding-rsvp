import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
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

    // Get user with subscription info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
      },
    });

    if (!dbUser?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel the subscription at the end of the billing period
    // User keeps access until the period ends
    const subscription = await stripe.subscriptions.update(dbUser.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user in database to mark as canceling (but keep the plan active)
    // The webhook will handle setting plan to FREE when the period actually ends
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Keep current plan until period end
        // stripeCurrentPeriodEnd already set from subscription creation
      },
    });

    return NextResponse.json({
      success: true,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
