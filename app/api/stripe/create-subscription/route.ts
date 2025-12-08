import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { stripe, getPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

const createSubscriptionSchema = z.object({
  plan: z.enum(["BASIC", "ADVANCED", "PREMIUM"]),
  interval: z.enum(["monthly", "yearly"]),
});

export async function POST(request: NextRequest) {
  // Rate limit subscription creation
  const rateLimitResult = withRateLimit(request, RATE_LIMIT_PRESETS.api);
  if (rateLimitResult) return rateLimitResult;

  try {
    const user = await getCurrentUser();

    if (!user || !user.email || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Store in local variables to help TypeScript's type narrowing
    const userEmail = user.email;
    const userName = user.name || undefined; // Convert null to undefined for Stripe
    const userId = user.id;

    const body = await request.json();
    const { plan, interval } = createSubscriptionSchema.parse(body);

    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan or interval" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId: userId,
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Check if user already has an active subscription
    const userStripeSubscriptionId = user.stripeSubscriptionId;
    if (userStripeSubscriptionId) {
      // Update existing subscription instead of creating new one
      const subscription = await stripe.subscriptions.retrieve(userStripeSubscriptionId);

      if (subscription.status === "active" || subscription.status === "trialing") {
        // Update the subscription to the new price
        const updatedSubscription = await stripe.subscriptions.update(
          userStripeSubscriptionId,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: priceId,
              },
            ],
            proration_behavior: "create_prorations",
          }
        );

        return NextResponse.json({
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
          upgraded: true,
        });
      }
    }

    // Create subscription with payment
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: userId,
        plan,
      },
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
