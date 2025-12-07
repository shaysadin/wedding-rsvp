import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe, getPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const createCheckoutSchema = z.object({
  plan: z.enum(["BASIC", "ADVANCED", "PREMIUM"]),
  interval: z.enum(["monthly", "yearly"]),
  locale: z.enum(["he", "en", "auto"]).optional().default("auto"),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.email || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = user.email;
    const userName = user.name || undefined;
    const userId = user.id;

    const body = await request.json();
    const { plan, interval, locale } = createCheckoutSchema.parse(body);

    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan or interval" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

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

    // Create Checkout Session - this requires payment before subscription is active
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      metadata: {
        userId: userId,
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: "auto",
      // Locale for Hebrew/English support
      locale: locale === "auto" ? "auto" : locale,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);

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
