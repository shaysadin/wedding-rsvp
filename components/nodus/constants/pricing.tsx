import { CheckIcon } from "@/components/nodus/icons/card-icons";
import { CloseIcon } from "@/components/nodus/icons/general";

export enum TierName {
  BASIC = "basic",
  ADVANCED = "advanced",
  PREMIUM = "premium",
  BUSINESS = "business",
}

// These will be used as translation keys
export const tiers = [
  {
    id: TierName.BASIC,
    monthly: 14.90,
    yearly: 149,
    ctaLink: "/register",
    ctaKey: "getStarted",
    features: [
      "features.events2",
      "features.whatsapp650",
      "features.voice10",
      "features.guestManagement",
      "features.digitalInvitations",
      "features.rsvpTracking",
      "features.basicSeating",
      "features.emailSupport",
    ],
  },
  {
    id: TierName.ADVANCED,
    monthly: 24.90,
    yearly: 249,
    ctaLink: "/register",
    ctaKey: "getStarted",
    features: [
      "features.events3",
      "features.whatsapp750",
      "features.sms30",
      "features.voice20",
      "features.advancedSeating",
      "features.supplierManagement",
      "features.taskManagement",
      "features.prioritySupport",
    ],
    featured: true,
  },
  {
    id: TierName.PREMIUM,
    monthly: 49.90,
    yearly: 499,
    ctaLink: "/register",
    ctaKey: "getStarted",
    features: [
      "features.events4",
      "features.whatsapp1000",
      "features.sms50",
      "features.voice40",
      "features.giftPayments",
      "features.customRsvp",
      "features.automations",
      "features.dedicatedSupport",
    ],
  },
];

export const businessPlan = {
  id: TierName.BUSINESS,
  ctaLink: "/contact",
  whatsappLink: "https://wa.me/972501234567", // Update with actual WhatsApp number
  priceFrom: 585,
  priceTo: 750,
  features: [
    "features.unlimitedEvents",
    "features.whatsapp3000",
    "features.sms1000",
    "features.voiceOptional",
    "features.multipleWorkspaces",
    "features.apiAccess",
    "features.whiteLabel",
    "features.dedicatedManager",
  ],
};

export const pricingTable = [
  {
    titleKey: "table.events",
    tiers: [
      { id: TierName.BASIC, value: "2" },
      { id: TierName.ADVANCED, value: "3" },
      { id: TierName.PREMIUM, value: "4" },
      { id: TierName.BUSINESS, valueKey: "unlimited" },
    ],
  },
  {
    titleKey: "table.whatsappMessages",
    tiers: [
      { id: TierName.BASIC, value: "650" },
      { id: TierName.ADVANCED, value: "750" },
      { id: TierName.PREMIUM, value: "1,000" },
      { id: TierName.BUSINESS, value: "3,000" },
    ],
  },
  {
    titleKey: "table.smsMessages",
    tiers: [
      { id: TierName.BASIC, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.ADVANCED, value: "30" },
      { id: TierName.PREMIUM, value: "50" },
      { id: TierName.BUSINESS, value: "1,000" },
    ],
  },
  {
    titleKey: "table.voiceCalls",
    tiers: [
      { id: TierName.BASIC, value: "10" },
      { id: TierName.ADVANCED, value: "20" },
      { id: TierName.PREMIUM, value: "40" },
      { id: TierName.BUSINESS, valueKey: "optional" },
    ],
  },
  {
    titleKey: "table.guestManagement",
    tiers: [
      { id: TierName.BASIC, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.ADVANCED, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.digitalInvitations",
    tiers: [
      { id: TierName.BASIC, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.ADVANCED, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.seatingPlanner",
    tiers: [
      { id: TierName.BASIC, valueKey: "basic" },
      { id: TierName.ADVANCED, valueKey: "advanced" },
      { id: TierName.PREMIUM, valueKey: "advanced" },
      { id: TierName.BUSINESS, valueKey: "advanced" },
    ],
  },
  {
    titleKey: "table.supplierManagement",
    tiers: [
      { id: TierName.BASIC, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.ADVANCED, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.taskManagement",
    tiers: [
      { id: TierName.BASIC, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.ADVANCED, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.giftPayments",
    tiers: [
      { id: TierName.BASIC, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.ADVANCED, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.automations",
    tiers: [
      { id: TierName.BASIC, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.ADVANCED, value: <CloseIcon className="mx-auto size-5 text-gray-400" /> },
      { id: TierName.PREMIUM, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
      { id: TierName.BUSINESS, value: <CheckIcon className="mx-auto size-5 text-emerald-500" /> },
    ],
  },
  {
    titleKey: "table.support",
    tiers: [
      { id: TierName.BASIC, valueKey: "emailSupport" },
      { id: TierName.ADVANCED, valueKey: "prioritySupport" },
      { id: TierName.PREMIUM, valueKey: "dedicatedSupport" },
      { id: TierName.BUSINESS, valueKey: "dedicatedManager" },
    ],
  },
];
