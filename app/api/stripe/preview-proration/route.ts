import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe, getPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const previewSchema = z.object({
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
    const { plan: targetPlan, interval } = previewSchema.parse(body);

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

    // Get current subscription with expanded items
    const subscription = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId, {
      expand: ["items.data.price"],
    });

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Check if subscription has items
    if (!subscription.items?.data?.length) {
      return NextResponse.json(
        { error: "Subscription has no items" },
        { status: 400 }
      );
    }

    // Determine if upgrade or downgrade
    const currentPlan = dbUser.plan || "FREE";
    const currentTier = planTierOrder[currentPlan] || 0;
    const targetTier = planTierOrder[targetPlan] || 0;
    const isUpgrade = targetTier > currentTier;

    // Get the current price from subscription item
    const currentSubscriptionItem = subscription.items.data[0];
    const currentPriceId = typeof currentSubscriptionItem.price === "string"
      ? currentSubscriptionItem.price
      : currentSubscriptionItem.price.id;

    // Get the new price details
    const newPrice = await stripe.prices.retrieve(newPriceId);
    const currentPrice = await stripe.prices.retrieve(currentPriceId);

    // Calculate proration preview for upgrades using Stripe's upcoming invoice API
    let prorationPreview: {
      amountDue: number;
      subtotal: number;
      total: number;
      prorationItems: { description: string; amount: number }[];
      currency: string;
      daysRemaining: number;
      totalDays: number;
    } | null = null;
    if (isUpgrade) {
      // Use Stripe's upcoming invoice API to get accurate proration
      const upcomingInvoice = await stripe.invoices.createPreview({
        customer: dbUser.stripeCustomerId,
        subscription: dbUser.stripeSubscriptionId,
        subscription_details: {
          items: [
            {
              id: currentSubscriptionItem.id,
              price: newPriceId,
            },
          ],
          proration_behavior: "always_invoice",
        },
      });

      // Filter proration line items - in Stripe SDK v20+, proration is nested in parent details
      const prorationLineItems = upcomingInvoice.lines.data.filter(
        (line) =>
          line.parent?.invoice_item_details?.proration === true ||
          line.parent?.subscription_item_details?.proration === true
      );

      // Calculate the proration amount from line items
      let prorationAmount = 0;
      const prorationItems: { description: string; amount: number }[] = [];

      for (const line of prorationLineItems) {
        prorationAmount += line.amount;
        prorationItems.push({
          description: line.description || "Proration adjustment",
          amount: line.amount,
        });
      }

      // Calculate days remaining - in Stripe SDK v20+, period times are on subscription items
      const periodStart = subscription.items.data[0]?.current_period_start;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      let daysRemaining = 0;
      let totalDays = 30;

      if (typeof periodStart === "number" && typeof periodEnd === "number") {
        const now = Math.floor(Date.now() / 1000);
        const totalPeriodSeconds = periodEnd - periodStart;
        const remainingSeconds = Math.max(0, periodEnd - now);
        daysRemaining = Math.ceil(remainingSeconds / (24 * 60 * 60));
        totalDays = Math.ceil(totalPeriodSeconds / (24 * 60 * 60));
      }

      // If no proration items found, calculate manually as fallback
      if (prorationItems.length === 0) {
        const priceDifference = (newPrice.unit_amount || 0) - (currentPrice.unit_amount || 0);
        const remainingRatio = totalDays > 0 ? daysRemaining / totalDays : 1;
        prorationAmount = Math.round(priceDifference * remainingRatio);
        prorationItems.push({
          description: `Upgrade from ${currentPlan} to ${targetPlan} (${daysRemaining} days remaining)`,
          amount: prorationAmount,
        });
      }

      prorationPreview = {
        amountDue: Math.max(0, prorationAmount),
        subtotal: prorationAmount,
        total: prorationAmount,
        prorationItems,
        currency: upcomingInvoice.currency || currentPrice.currency,
        daysRemaining,
        totalDays,
      };
    }

    // Calculate period end date - in Stripe SDK v20+, period times are on subscription items
    let periodEndISO = "";
    let periodEndFormatted = "";

    const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
    if (itemPeriodEnd) {
      const periodEnd = new Date(itemPeriodEnd * 1000);
      if (!isNaN(periodEnd.getTime())) {
        periodEndISO = periodEnd.toISOString();
        periodEndFormatted = periodEnd.toLocaleDateString();
      }
    }

    return NextResponse.json({
      isUpgrade,
      currentPlan: {
        name: currentPlan,
        price: (currentPrice.unit_amount || 0) / 100,
        interval: currentPrice.recurring?.interval || "month",
        currency: currentPrice.currency,
      },
      newPlan: {
        name: targetPlan,
        price: (newPrice.unit_amount || 0) / 100,
        interval: newPrice.recurring?.interval || "month",
        currency: newPrice.currency,
      },
      prorationPreview,
      periodEnd: periodEndISO,
      periodEndFormatted: periodEndFormatted,
    });
  } catch (error: any) {
    console.error("Error previewing proration:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to preview proration" },
      { status: 500 }
    );
  }
}
