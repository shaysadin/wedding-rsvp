import { PlansRow, SubscriptionPlan } from "@/types";

// Plan columns for comparison table
export const plansColumns = ["free", "basic", "premium"] as const;

// Subscription plans configuration
export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "Basic features for getting started",
    benefits: [
      "1 wedding event",
      "Up to 50 guests",
      "Basic RSVP tracking",
    ],
    limitations: [
      "Limited customization",
      "No priority support",
    ],
    prices: {
      monthly: 0,
      yearly: 0,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Basic",
    description: "Perfect for small weddings",
    benefits: [
      "3 wedding events",
      "Up to 200 guests",
      "Full customization",
      "Priority support",
    ],
    limitations: [
      "No advanced analytics",
    ],
    prices: {
      monthly: 9,
      yearly: 90,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Premium",
    description: "For professional event planners",
    benefits: [
      "Unlimited events",
      "Unlimited guests",
      "Advanced analytics",
      "24/7 priority support",
      "Custom branding",
    ],
    limitations: [],
    prices: {
      monthly: 29,
      yearly: 290,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
];

// Comparison table data
export const comparePlans: PlansRow[] = [
  {
    feature: "Wedding Events",
    free: "1",
    basic: "3",
    premium: "Unlimited",
  },
  {
    feature: "Guest Limit",
    free: "50",
    basic: "200",
    premium: "Unlimited",
  },
  {
    feature: "RSVP Tracking",
    free: true,
    basic: true,
    premium: true,
  },
  {
    feature: "Custom Branding",
    free: false,
    basic: true,
    premium: true,
  },
  {
    feature: "Priority Support",
    free: false,
    basic: true,
    premium: true,
  },
  {
    feature: "Advanced Analytics",
    free: false,
    basic: false,
    premium: true,
  },
];
