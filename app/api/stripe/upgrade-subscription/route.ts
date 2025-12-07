import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe, getPriceId, getPlanFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const upgradeSchema = z.object({
  plan: z.enum(["BASIC", "ADVANCED", "PREMIUM"]),
  interval: z.enum(["monthly", "yearly"]),
});

// Plan tier order for comparison
const planTierOrder: Record<string, number> = {
  FREE: 0,
  BASIC: 1,
  ADVANCED: 2,
  PREMIUM: 3,
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan: targetPlan, interval } = upgradeSchema.parse(body);

    const newPriceId = getPriceId(targetPlan, interval);

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Invalid plan or interval" },
        { status: 400 }
      );
    }

    // Get user's current subscription
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripePriceId: true,
        plan: true,
      },
    });

    if (!dbUser?.stripeSubscriptionId || !dbUser.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId);

    // Debug: log subscription structure
    console.log("Subscription retrieved:", {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      current_period_start: subscription.current_period_start,
    });

    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Determine current plan tier
    const currentPlan = dbUser.plan || "FREE";
    const currentTier = planTierOrder[currentPlan] || 0;
    const targetTier = planTierOrder[targetPlan] || 0;

    const isUpgrade = targetTier > currentTier;

    if (isUpgrade) {
      // UPGRADE: Immediate change with proration
      // Customer pays the prorated difference now, new plan is active immediately

      // Step 1: Update the subscription with proration
      const updatedSubscription = await stripe.subscriptions.update(
        dbUser.stripeSubscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "always_invoice",
          payment_behavior: "error_if_incomplete",
        }
      );

      // Step 2: Get the latest invoice (the proration invoice) and pay it immediately
      const invoices = await stripe.invoices.list({
        subscription: dbUser.stripeSubscriptionId,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const latestInvoice = invoices.data[0];

        // If the invoice is open (not yet paid), pay it now
        if (latestInvoice.status === "open") {
          await stripe.invoices.pay(latestInvoice.id);
        }
      }

      // Update user's plan in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: targetPlan,
          stripePriceId: newPriceId,
        },
      });

      return NextResponse.json({
        success: true,
        type: "upgrade",
        message: "Subscription upgraded successfully",
        newPlan: targetPlan,
        effectiveDate: "immediate",
      });
    } else {
      // DOWNGRADE: Schedule the price change for end of billing period
      // We store the pending change in our database
      // The change will be applied when invoice.payment_succeeded fires at next billing

      // Store the pending downgrade in user record
      // User keeps current plan until end of billing period

      // Get the period end - should always be present on an active subscription
      let periodEnd = subscription.current_period_end;

      // Debug logging
      console.log("Scheduling downgrade - subscription details:", {
        periodEnd,
        periodEndType: typeof periodEnd,
        subscriptionId: subscription.id,
        status: subscription.status,
        billingCycleAnchor: subscription.billing_cycle_anchor,
      });

      // If period_end is missing (shouldn't happen), try to get it from the latest invoice
      if (!periodEnd || typeof periodEnd !== 'number') {
        console.warn("current_period_end missing, trying to get from invoice...");

        // Try to get from latest invoice
        try {
          const invoices = await stripe.invoices.list({
            subscription: subscription.id,
            limit: 1,
          });

          if (invoices.data.length > 0 && invoices.data[0].period_end) {
            periodEnd = invoices.data[0].period_end;
            console.log("Got period_end from invoice:", periodEnd);
          }
        } catch (invoiceError) {
          console.error("Failed to get invoice:", invoiceError);
        }
      }

      // Final validation
      if (!periodEnd || typeof periodEnd !== 'number') {
        console.error("Invalid period end after fallback:", { periodEnd, subscriptionId: subscription.id });
        return NextResponse.json(
          { error: "Could not determine billing period end" },
          { status: 400 }
        );
      }

      const effectiveDate = new Date(periodEnd * 1000);

      // Validate the date is valid
      if (isNaN(effectiveDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid billing period date" },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingPlanChange: targetPlan,
          pendingPlanChangeDate: effectiveDate,
        },
      });

      return NextResponse.json({
        success: true,
        type: "downgrade",
        message: "Subscription downgrade scheduled",
        newPlan: targetPlan,
        effectiveDate: effectiveDate.toISOString(),
        effectiveDateFormatted: effectiveDate.toLocaleDateString(),
      });
    }
  } catch (error: any) {
    console.error("Error updating subscription:", error);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json(
        { error: "Payment failed. Please check your payment method.", code: "payment_failed" },
        { status: 402 }
      );
    }

    if (error.code === "resource_missing") {
      return NextResponse.json(
        { error: "Subscription not found", code: "subscription_not_found" },
        { status: 404 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}
