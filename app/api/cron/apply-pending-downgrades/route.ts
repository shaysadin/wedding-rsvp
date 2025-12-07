import { NextResponse } from "next/server";
import { CronJobStatus, CronJobType, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getStripe, getPriceId, getPlanFromPriceId } from "@/lib/stripe";

// Helper to log cron job execution
async function logCronJob(params: {
  status: CronJobStatus;
  userId?: string;
  userEmail?: string;
  fromPlan?: PlanTier;
  toPlan?: PlanTier;
  scheduledFor?: Date;
  message?: string;
  errorDetails?: string;
}) {
  try {
    await prisma.cronJobLog.create({
      data: {
        jobType: CronJobType.PLAN_CHANGE,
        status: params.status,
        userId: params.userId,
        userEmail: params.userEmail,
        fromPlan: params.fromPlan,
        toPlan: params.toPlan,
        scheduledFor: params.scheduledFor,
        message: params.message,
        errorDetails: params.errorDetails,
      },
    });
  } catch (logError) {
    console.error("Failed to write cron job log:", logError);
  }
}

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
        email: true,
        plan: true,
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
          // In Stripe SDK v20+, current_period_end is on the subscription item, not the subscription
          const periodEnd = subscription.items.data[0].current_period_end * 1000; // Convert to ms
          const oneDayMs = 24 * 60 * 60 * 1000;
          const changeShouldHappen = now.getTime() >= periodEnd - oneDayMs;

          if (!changeShouldHappen) {
            // Not yet time to apply - skip this user (don't log, this is expected)
            continue;
          }
        }

        // Skip if pending change is FREE (shouldn't happen, but handle gracefully)
        if (user.pendingPlanChange === "FREE") {
          const errorMsg = "Cannot downgrade to FREE via this process - use subscription cancellation instead";
          results.push({
            userId: user.id,
            success: false,
            error: errorMsg,
          });

          await logCronJob({
            status: CronJobStatus.SKIPPED,
            userId: user.id,
            userEmail: user.email,
            fromPlan: user.plan,
            toPlan: user.pendingPlanChange,
            scheduledFor: user.pendingPlanChangeDate ?? undefined,
            message: errorMsg,
          });
          continue;
        }

        const newPriceId = getPriceId(
          user.pendingPlanChange as "BASIC" | "ADVANCED" | "PREMIUM",
          interval as "monthly" | "yearly"
        );

        if (!newPriceId) {
          const errorMsg = "Could not find price ID for new plan";
          results.push({
            userId: user.id,
            success: false,
            error: errorMsg,
          });

          await logCronJob({
            status: CronJobStatus.FAILED,
            userId: user.id,
            userEmail: user.email,
            fromPlan: user.plan,
            toPlan: user.pendingPlanChange,
            scheduledFor: user.pendingPlanChangeDate ?? undefined,
            errorDetails: errorMsg,
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

        const previousPlan = user.plan;

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
        console.log(`Applied pending downgrade for user ${user.id}: ${previousPlan} -> ${user.pendingPlanChange}`);

        // Log successful plan change
        await logCronJob({
          status: CronJobStatus.SUCCESS,
          userId: user.id,
          userEmail: user.email,
          fromPlan: previousPlan,
          toPlan: user.pendingPlanChange,
          scheduledFor: user.pendingPlanChangeDate ?? undefined,
          message: `Successfully changed plan from ${previousPlan} to ${user.pendingPlanChange}`,
        });
      } catch (error: any) {
        console.error(`Error applying downgrade for user ${user.id}:`, error);
        results.push({
          userId: user.id,
          success: false,
          error: error.message,
        });

        // Log failed plan change
        await logCronJob({
          status: CronJobStatus.FAILED,
          userId: user.id,
          userEmail: user.email,
          fromPlan: user.plan,
          toPlan: user.pendingPlanChange ?? undefined,
          scheduledFor: user.pendingPlanChangeDate ?? undefined,
          errorDetails: error.message || "Unknown error occurred",
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
