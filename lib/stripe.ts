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

// ============================================
// STRIPE PRICE IDS CONFIGURATION
// ============================================

// Price IDs from your Stripe dashboard
// You'll need to create these products/prices in Stripe and add the IDs here
export const STRIPE_PRICES = {
  BASIC: {
    monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || "",
    // BASIC is not eligible for gift discount
  },
  ADVANCED: {
    monthly: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID || "",
    // No-gift variants (100% higher price)
    monthlyNoGift: process.env.STRIPE_ADVANCED_NO_GIFT_MONTHLY_PRICE_ID || "",
    yearlyNoGift: process.env.STRIPE_ADVANCED_NO_GIFT_YEARLY_PRICE_ID || "",
  },
  PREMIUM: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "",
    // No-gift variants (100% higher price)
    monthlyNoGift: process.env.STRIPE_PREMIUM_NO_GIFT_MONTHLY_PRICE_ID || "",
    yearlyNoGift: process.env.STRIPE_PREMIUM_NO_GIFT_YEARLY_PRICE_ID || "",
  },
  BUSINESS: {
    // BUSINESS plan is monthly only (no yearly option)
    // Base pricing (with gift, no voice) - $585/mo
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || "",
    // With voice - $750/mo
    monthlyWithVoice: process.env.STRIPE_BUSINESS_VOICE_MONTHLY_PRICE_ID || "",
    // No-gift variants (100% higher price) - $1170/mo
    monthlyNoGift: process.env.STRIPE_BUSINESS_NO_GIFT_MONTHLY_PRICE_ID || "",
    // No-gift with voice - $1500/mo
    monthlyNoGiftWithVoice: process.env.STRIPE_BUSINESS_NO_GIFT_VOICE_MONTHLY_PRICE_ID || "",
  },
} as const;

// Type for all plan tiers
export type PlanTier = "BASIC" | "ADVANCED" | "PREMIUM" | "BUSINESS";
export type BillingInterval = "monthly" | "yearly";

// ============================================
// PRICE ID LOOKUP FUNCTIONS
// ============================================

// Map price IDs back to plan tiers
export function getPlanFromPriceId(priceId: string): PlanTier | null {
  // Check BASIC
  if (STRIPE_PRICES.BASIC.monthly === priceId || STRIPE_PRICES.BASIC.yearly === priceId) {
    return "BASIC";
  }

  // Check ADVANCED (including no-gift variants)
  const advancedPrices = Object.values(STRIPE_PRICES.ADVANCED);
  if (advancedPrices.includes(priceId)) {
    return "ADVANCED";
  }

  // Check PREMIUM (including no-gift variants)
  const premiumPrices = Object.values(STRIPE_PRICES.PREMIUM);
  if (premiumPrices.includes(priceId)) {
    return "PREMIUM";
  }

  // Check BUSINESS (all variants except standalone voice addon)
  const businessPrices = Object.entries(STRIPE_PRICES.BUSINESS)
    .filter(([key]) => key !== "voiceAddon")
    .map(([, value]) => value);
  if (businessPrices.includes(priceId)) {
    return "BUSINESS";
  }

  return null;
}

// Get price ID for a plan with optional configurations
export function getPriceId(
  plan: PlanTier,
  interval: BillingInterval,
  options?: {
    giftSystemEnabled?: boolean;
    includeVoice?: boolean;
  }
): string {
  const { giftSystemEnabled = true, includeVoice = false } = options || {};

  switch (plan) {
    case "BASIC":
      // BASIC has no gift discount or voice option
      return STRIPE_PRICES.BASIC[interval];

    case "ADVANCED":
      return giftSystemEnabled
        ? STRIPE_PRICES.ADVANCED[interval]
        : STRIPE_PRICES.ADVANCED[interval === "monthly" ? "monthlyNoGift" : "yearlyNoGift"] || STRIPE_PRICES.ADVANCED[interval];

    case "PREMIUM":
      return giftSystemEnabled
        ? STRIPE_PRICES.PREMIUM[interval]
        : STRIPE_PRICES.PREMIUM[interval === "monthly" ? "monthlyNoGift" : "yearlyNoGift"] || STRIPE_PRICES.PREMIUM[interval];

    case "BUSINESS":
      // BUSINESS plan is monthly only - ignore interval parameter
      if (giftSystemEnabled) {
        return includeVoice
          ? STRIPE_PRICES.BUSINESS.monthlyWithVoice
          : STRIPE_PRICES.BUSINESS.monthly;
      } else {
        return includeVoice
          ? STRIPE_PRICES.BUSINESS.monthlyNoGiftWithVoice
          : STRIPE_PRICES.BUSINESS.monthlyNoGift;
      }

    default:
      throw new Error(`Unknown plan: ${plan}`);
  }
}

// Check if a price ID includes voice calls
export function priceIncludesVoice(priceId: string): boolean {
  return (
    priceId === STRIPE_PRICES.BUSINESS.monthlyWithVoice ||
    priceId === STRIPE_PRICES.BUSINESS.monthlyNoGiftWithVoice
  );
}

// Check if a price ID has gift discount (lower price)
export function priceHasGiftDiscount(priceId: string): boolean {
  // Gift discount means using the base price (not the "NoGift" variant)
  const noGiftPrices = [
    STRIPE_PRICES.ADVANCED.monthlyNoGift,
    STRIPE_PRICES.ADVANCED.yearlyNoGift,
    STRIPE_PRICES.PREMIUM.monthlyNoGift,
    STRIPE_PRICES.PREMIUM.yearlyNoGift,
    STRIPE_PRICES.BUSINESS.monthlyNoGift,
    STRIPE_PRICES.BUSINESS.monthlyNoGiftWithVoice,
  ];

  return !noGiftPrices.includes(priceId);
}

// Get all price IDs for portal configuration
export function getAllPriceIds(): string[] {
  const prices: string[] = [];

  // BASIC prices
  if (STRIPE_PRICES.BASIC.monthly) prices.push(STRIPE_PRICES.BASIC.monthly);
  if (STRIPE_PRICES.BASIC.yearly) prices.push(STRIPE_PRICES.BASIC.yearly);

  // ADVANCED prices (including no-gift)
  Object.values(STRIPE_PRICES.ADVANCED).forEach((price) => {
    if (price) prices.push(price);
  });

  // PREMIUM prices (including no-gift)
  Object.values(STRIPE_PRICES.PREMIUM).forEach((price) => {
    if (price) prices.push(price);
  });

  // BUSINESS prices (all variants)
  Object.values(STRIPE_PRICES.BUSINESS).forEach((price) => {
    if (price) prices.push(price);
  });

  return prices.filter((price, index, self) => price && self.indexOf(price) === index);
}

// Get the billing interval from a price ID
export function getIntervalFromPriceId(priceId: string): BillingInterval | null {
  // Check yearly prices (Business plan is monthly only)
  const yearlyPrices = [
    STRIPE_PRICES.BASIC.yearly,
    STRIPE_PRICES.ADVANCED.yearly,
    STRIPE_PRICES.ADVANCED.yearlyNoGift,
    STRIPE_PRICES.PREMIUM.yearly,
    STRIPE_PRICES.PREMIUM.yearlyNoGift,
  ];

  if (yearlyPrices.includes(priceId)) {
    return "yearly";
  }

  // Check monthly prices (includes all Business plan prices)
  const monthlyPrices = [
    STRIPE_PRICES.BASIC.monthly,
    STRIPE_PRICES.ADVANCED.monthly,
    STRIPE_PRICES.ADVANCED.monthlyNoGift,
    STRIPE_PRICES.PREMIUM.monthly,
    STRIPE_PRICES.PREMIUM.monthlyNoGift,
    STRIPE_PRICES.BUSINESS.monthly,
    STRIPE_PRICES.BUSINESS.monthlyWithVoice,
    STRIPE_PRICES.BUSINESS.monthlyNoGift,
    STRIPE_PRICES.BUSINESS.monthlyNoGiftWithVoice,
  ];

  if (monthlyPrices.includes(priceId)) {
    return "monthly";
  }

  return null;
}
