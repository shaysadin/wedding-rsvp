import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook signature verification failed:", errorMessage);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) return;

  // Retrieve subscription with latest_invoice expanded
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  // Get period end from the latest invoice
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  const periodEnd = latestInvoice?.period_end
    ? new Date(latestInvoice.period_end * 1000)
    : null;

  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      plan,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });

  console.log(`Subscription created for customer ${customerId}, plan: ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    console.error("Unknown price ID:", priceId);
    return;
  }

  // Get period end from the latest invoice if available
  let periodEnd: Date | null = null;
  if (typeof subscription.latest_invoice === 'object' && subscription.latest_invoice) {
    periodEnd = new Date((subscription.latest_invoice as Stripe.Invoice).period_end * 1000);
  } else if (typeof subscription.latest_invoice === 'string') {
    // Need to fetch the invoice separately
    try {
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
      periodEnd = new Date(invoice.period_end * 1000);
    } catch {
      console.warn("Could not retrieve invoice for period end");
    }
  }

  // Find user by customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    // Try to find user by metadata
    const userId = subscription.metadata?.userId;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });
      return;
    }
    console.error("User not found for customer:", customerId);
    return;
  }

  // Check if this update matches a pending plan change
  // If so, clear the pending change fields
  const shouldClearPending = user.pendingPlanChange === plan;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      stripeCurrentPeriodEnd: periodEnd,
      // Clear pending plan change if this update fulfills it
      ...(shouldClearPending && {
        pendingPlanChange: null,
        pendingPlanChangeDate: null,
      }),
    },
  });

  console.log(`Subscription updated for customer ${customerId}, plan: ${plan}${shouldClearPending ? ' (pending change applied)' : ''}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: null,
      stripePriceId: null,
      plan: "FREE",
      stripeCurrentPeriodEnd: null,
    },
  });

  console.log(`Subscription deleted for customer ${customerId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
    ? invoice.parent.subscription_details.subscription
    : (invoice.parent?.subscription_details?.subscription as Stripe.Subscription | undefined)?.id;

  if (!subscriptionId) return;

  // Use the invoice's period_end directly
  const periodEnd = new Date(invoice.period_end * 1000);

  // Find user to check for pending plan change
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: {
      id: true,
      pendingPlanChange: true,
      pendingPlanChangeDate: true,
    },
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Check if there's a pending plan change that should be applied now
  // We apply it if:
  // 1. pendingPlanChangeDate has passed, OR
  // 2. pendingPlanChangeDate is null (legacy or missing date - apply at next billing)
  if (user.pendingPlanChange) {
    const shouldApply = !user.pendingPlanChangeDate || Date.now() >= user.pendingPlanChangeDate.getTime();

    if (shouldApply) {
      const newPlan = user.pendingPlanChange;

      // Get the new price ID for the pending plan
      const { getPriceId } = await import("@/lib/stripe");

      // Determine the interval from the current subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const currentInterval = subscription.items.data[0]?.price.recurring?.interval;
      const interval = currentInterval === "year" ? "yearly" : "monthly";

      const newPriceId = getPriceId(newPlan, interval as "monthly" | "yearly");

      if (newPriceId) {
        // Update the subscription in Stripe to the new plan
        await stripe.subscriptions.update(subscriptionId, {
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
            plan: newPlan,
            stripePriceId: newPriceId,
            stripeCurrentPeriodEnd: periodEnd,
            pendingPlanChange: null,
            pendingPlanChangeDate: null,
          },
        });

        console.log(`Pending plan change applied for customer ${customerId}: ${newPlan}`);
        return;
      }
    }
  }

  // No pending change or not yet time to apply it
  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeCurrentPeriodEnd: periodEnd,
    },
  });

  console.log(`Invoice payment succeeded for customer ${customerId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.error(`Invoice payment failed for customer ${customerId}`);
  // You could send an email notification here or mark the subscription as past_due
}
