import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({
        hasPaymentMethod: false,
        paymentMethod: null,
      });
    }

    const stripe = getStripe();

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);

    if (customer.deleted) {
      return NextResponse.json({
        hasPaymentMethod: false,
        paymentMethod: null,
      });
    }

    // Get the default payment method
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethodId) {
      // Try to get from subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const subPaymentMethod = subscription.default_payment_method;

        if (subPaymentMethod && typeof subPaymentMethod === "string") {
          const paymentMethod = await stripe.paymentMethods.retrieve(subPaymentMethod);

          return NextResponse.json({
            hasPaymentMethod: true,
            paymentMethod: {
              id: paymentMethod.id,
              type: paymentMethod.type,
              card: paymentMethod.card ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
              } : null,
            },
          });
        }
      }

      return NextResponse.json({
        hasPaymentMethod: false,
        paymentMethod: null,
      });
    }

    // Retrieve the payment method details
    const paymentMethodId = typeof defaultPaymentMethodId === "string"
      ? defaultPaymentMethodId
      : defaultPaymentMethodId.id;

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return NextResponse.json({
      hasPaymentMethod: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching payment method:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}
