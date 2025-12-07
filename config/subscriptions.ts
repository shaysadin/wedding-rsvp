import { PlansRow, SubscriptionPlan } from "@/types";

// Plan columns for comparison table
export const plansColumns = ["basic", "advanced", "premium", "business"] as const;

// Subscription plans configuration
export const pricingData: SubscriptionPlan[] = [
  {
    title: "Basic",
    description: "Perfect for intimate celebrations",
    benefits: [
      "1 wedding event",
      "650 WhatsApp messages",
      "Basic RSVP tracking",
      "Email support",
    ],
    limitations: [
      "No SMS messages",
      "Limited template customization",
    ],
    prices: {
      monthly: 14.90,
      yearly: 149,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Advanced",
    description: "Ideal for medium-sized weddings",
    benefits: [
      "2 wedding events",
      "750 WhatsApp messages",
      "30 SMS messages",
      "Custom RSVP page design",
      "Automatic reminders",
      "Real-time analytics",
      "Priority support",
    ],
    limitations: [],
    prices: {
      monthly: 24.90,
      yearly: 249,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Premium",
    description: "For larger celebrations",
    benefits: [
      "3 wedding events",
      "1000 WhatsApp messages",
      "50 SMS messages",
      "Full template customization",
      "Advanced analytics & reports",
      "Priority support",
    ],
    limitations: [],
    prices: {
      monthly: 49.90,
      yearly: 499,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Business",
    description: "For wedding planners & venues",
    benefits: [
      "Unlimited events",
      "Unlimited WhatsApp messages",
      "Unlimited SMS messages",
      "Full template customization",
      "Advanced analytics & reports",
      "Team collaboration",
      "White-label branding",
      "24/7 priority support",
      "API access",
    ],
    limitations: [],
    prices: {
      monthly: -1, // Contact sales
      yearly: -1,
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
    basic: "1",
    advanced: "2",
    premium: "3",
    business: "Unlimited",
  },
  {
    feature: "WhatsApp Messages",
    basic: "650",
    advanced: "750",
    premium: "1000",
    business: "Unlimited",
  },
  {
    feature: "SMS Messages",
    basic: "–",
    advanced: "30",
    premium: "50",
    business: "Unlimited",
  },
  {
    feature: "Custom RSVP Pages",
    basic: false,
    advanced: true,
    premium: true,
    business: true,
  },
  {
    feature: "Automatic Reminders",
    basic: false,
    advanced: true,
    premium: true,
    business: true,
  },
  {
    feature: "Real-time Analytics",
    basic: false,
    advanced: true,
    premium: true,
    business: true,
  },
  {
    feature: "Team Collaboration",
    basic: false,
    advanced: false,
    premium: false,
    business: true,
  },
  {
    feature: "White-label Branding",
    basic: false,
    advanced: false,
    premium: false,
    business: true,
  },
  {
    feature: "API Access",
    basic: false,
    advanced: false,
    premium: false,
    business: true,
  },
  {
    feature: "Priority Support",
    basic: false,
    advanced: true,
    premium: true,
    business: "24/7",
  },
];
