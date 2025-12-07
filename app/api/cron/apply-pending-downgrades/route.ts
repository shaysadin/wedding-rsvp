import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getStripe, getPriceId } from "@/lib/stripe";

// This endpoint should be called by a cron job daily
// It checks for pending plan changes that are due and applies them

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all users with pending plan changes that are due
    // Include users where:
    // 1. pendingPlanChangeDate is set and has passed, OR
    // 2. pendingPlanChangeDate is null (legacy/missing date - check Stripe for period end)
    const usersWithPendingChanges = await prisma.user.findMany({
      where: {
        pendingPlanChange: { not: null },
        stripeSubscriptionId: { not: null },
        OR: [
          { pendingPlanChangeDate: { lte: now } },
          { pendingPlanChangeDate: null },
        ],
      },
      select: {
        id: true,
        pendingPlanChange: true,
        pendingPlanChangeDate: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (usersWithPendingChanges.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending plan changes to apply",
        processed: 0,
      });
    }

    const stripe = getStripe();
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    for (const user of usersWithPendingChanges) {
      try {
        if (!user.stripeSubscriptionId || !user.pendingPlanChange) {
          continue;
        }

        // Get the subscription to determine interval and check timing
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const currentInterval = subscription.items.data[0]?.price.recurring?.interval;
        const interval = currentInterval === "year" ? "yearly" : "monthly";

        // If pendingPlanChangeDate is null, check if we're within 1 day of period end
        if (!user.pendingPlanChangeDate) {
          const periodEnd = subscription.current_period_end * 1000; // Convert to ms
          const oneDayMs = 24 * 60 * 60 * 1000;
          const changeShouldHappen = now.getTime() >= periodEnd - oneDayMs;

          if (!changeShouldHappen) {
            // Not yet time to apply - skip this user
            continue;
          }
        }

        const newPriceId = getPriceId(user.pendingPlanChange, interval as "monthly" | "yearly");

        if (!newPriceId) {
          results.push({
            userId: user.id,
            success: false,
            error: "Could not find price ID for new plan",
          });
          continue;
        }

        // Update the subscription in Stripe
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "none",
        });

        // Update user in database
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: user.pendingPlanChange,
            stripePriceId: newPriceId,
            pendingPlanChange: null,
            pendingPlanChangeDate: null,
          },
        });

        results.push({ userId: user.id, success: true });
        console.log(`Applied pending downgrade for user ${user.id}: ${user.pendingPlanChange}`);
      } catch (error: any) {
        console.error(`Error applying downgrade for user ${user.id}:`, error);
        results.push({
          userId: user.id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} pending changes`,
      processed: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });
  } catch (error: any) {
    console.error("Error in apply-pending-downgrades cron:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process pending downgrades" },
      { status: 500 }
    );
  }
}
