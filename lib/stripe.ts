import Stripe from "stripe";

// Server-side Stripe instance (lazy initialization to avoid build-time errors)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// For backwards compatibility - use getStripe() function instead
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get invoices() { return getStripe().invoices; },
  get webhooks() { return getStripe().webhooks; },
  get billingPortal() { return getStripe().billingPortal; },
};

// Price IDs from your Stripe dashboard
// You'll need to create these products/prices in Stripe and add the IDs here
export const STRIPE_PRICES = {
  BASIC: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || "",
  },
  ADVANCED: {
    monthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID || "",
  },
  PREMIUM: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "",
  },
} as const;

// Map price IDs back to plan tiers
export function getPlanFromPriceId(priceId: string): "BASIC" | "ADVANCED" | "PREMIUM" | null {
  for (const [plan, prices] of Object.entries(STRIPE_PRICES)) {
    if (prices.monthly === priceId || prices.yearly === priceId) {
      return plan as "BASIC" | "ADVANCED" | "PREMIUM";
    }
  }
  return null;
}

// Get price ID from plan and interval
export function getPriceId(plan: "BASIC" | "ADVANCED" | "PREMIUM", interval: "monthly" | "yearly"): string {
  return STRIPE_PRICES[plan][interval];
}

// Get all price IDs for portal configuration
export function getAllPriceIds(): string[] {
  const prices: string[] = [];
  for (const planPrices of Object.values(STRIPE_PRICES)) {
    if (planPrices.monthly) prices.push(planPrices.monthly);
    if (planPrices.yearly) prices.push(planPrices.yearly);
  }
  return prices;
}
