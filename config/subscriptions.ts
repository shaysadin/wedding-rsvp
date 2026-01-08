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
      "Unlimited workspaces",
      "3000 WhatsApp messages",
      "1000 SMS messages",
      "2000 voice calls (optional add-on)",
      "Unlimited invitation generations",
      "Full template customization",
      "Advanced analytics & reports",
      "Team collaboration (workspaces)",
      "24/7 priority support",
    ],
    limitations: [],
    prices: {
      monthly: 585, // Base price with gift system enabled
      yearly: 0, // No yearly option for Business plan
      monthlyWithVoice: 750, // With voice calls
    },
    stripeIds: {
      monthly: null,
      yearly: null, // Not used - Business is monthly only
      monthlyWithVoice: null,
      // No-gift pricing variants (monthly only)
      monthlyNoGift: null,
      monthlyNoGiftWithVoice: null,
    },
    monthlyOnly: true, // Business plan does not have yearly billing
    giftDiscountNote: "Prices shown include 50% gift system discount. Disable gift payments to see full pricing.",
  },
];

// Comparison table data
export const comparePlans: PlansRow[] = [
  {
    feature: "Wedding Events",
    basic: "2",
    advanced: "3",
    premium: "4",
    business: "Unlimited",
  },
  {
    feature: "Workspaces",
    basic: "1",
    advanced: "1",
    premium: "1",
    business: "Unlimited",
  },
  {
    feature: "WhatsApp Messages",
    basic: "650",
    advanced: "750",
    premium: "1000",
    business: "3000",
  },
  {
    feature: "SMS Messages",
    basic: "–",
    advanced: "30",
    premium: "50",
    business: "1000",
  },
  {
    feature: "Voice Calls",
    basic: "10",
    advanced: "20",
    premium: "40",
    business: "2000*",
  },
  {
    feature: "Invitation Generations",
    basic: "10",
    advanced: "20",
    premium: "Unlimited",
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
    feature: "Gift System Discount",
    basic: "–",
    advanced: "50% off",
    premium: "50% off",
    business: "50% off",
  },
  {
    feature: "Priority Support",
    basic: false,
    advanced: true,
    premium: true,
    business: "24/7",
  },
];

// Note: Business plan voice calls marked with * indicates optional add-on ($165/mo)
