import { PlanTier } from "@prisma/client";

export interface PlanLimits {
  maxEvents: number;
  maxWorkspaces: number;
  maxWhatsappMessages: number;
  maxSmsMessages: number;
  maxVoiceCalls: number;
  maxInvitationGenerations: number;
  price: number;
  priceWithVoice?: number; // Only for BUSINESS plan
  priceNoGift?: number; // Price without gift system discount (100% more)
  priceNoGiftWithVoice?: number; // Price with voice but no gift discount
  voiceAddonPrice?: number; // Voice calls add-on price
  currency: string;
  giftDiscountEligible: boolean; // Whether this plan is eligible for gift system discount
  voiceCallsOptional: boolean; // Whether voice calls are an optional add-on
}

export interface OneTimePackage {
  id: string;
  name: string;
  whatsappMessages: number;
  smsMessages: number;
  price: number;
  currency: string;
}

// Monthly subscription plans
// Event limits: FREE=1, BASIC=2, ADVANCED=3, PREMIUM=4, BUSINESS=unlimited
// Voice call limits: FREE=0, BASIC=10, ADVANCED=20, PREMIUM=40, BUSINESS=2000 (optional)
// Workspace limits: All plans=1, BUSINESS=unlimited
// Gift discount: ADVANCED, PREMIUM, BUSINESS eligible (100% price increase if disabled)
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.FREE]: {
    maxEvents: 1,  // Free tier can create 1 event to try the platform
    maxWorkspaces: 1,
    maxWhatsappMessages: 0,  // No messaging until upgrade
    maxSmsMessages: 0,
    maxVoiceCalls: 0,  // No voice calls for free users
    maxInvitationGenerations: 3,
    price: 0,
    currency: "USD",
    giftDiscountEligible: false,
    voiceCallsOptional: false,
  },
  [PlanTier.BASIC]: {
    maxEvents: 2,
    maxWorkspaces: 1,
    maxWhatsappMessages: 650,
    maxSmsMessages: 0,
    maxVoiceCalls: 10,
    maxInvitationGenerations: 10,
    price: 14.90,
    currency: "USD",
    giftDiscountEligible: false, // BASIC not eligible for gift discount
    voiceCallsOptional: false,
  },
  [PlanTier.ADVANCED]: {
    maxEvents: 3,
    maxWorkspaces: 1,
    maxWhatsappMessages: 750,
    maxSmsMessages: 30,
    maxVoiceCalls: 20,
    maxInvitationGenerations: 20,
    price: 24.90,
    priceNoGift: 49.80, // 100% more when gift system disabled
    currency: "USD",
    giftDiscountEligible: true,
    voiceCallsOptional: false,
  },
  [PlanTier.PREMIUM]: {
    maxEvents: 4,
    maxWorkspaces: 1,
    maxWhatsappMessages: 1000,
    maxSmsMessages: 50,
    maxVoiceCalls: 40,
    maxInvitationGenerations: -1, // Unlimited
    price: 49.90,
    priceNoGift: 99.80, // 100% more when gift system disabled
    currency: "USD",
    giftDiscountEligible: true,
    voiceCallsOptional: false,
  },
  [PlanTier.BUSINESS]: {
    maxEvents: -1,  // Unlimited
    maxWorkspaces: -1, // Unlimited
    maxWhatsappMessages: 3000,
    maxSmsMessages: 1000,
    maxVoiceCalls: 0, // 0 by default, 2000 with voice add-on
    maxInvitationGenerations: -1, // Unlimited
    price: 585, // Base price with gift system enabled, no voice
    priceWithVoice: 750, // With voice calls add-on
    priceNoGift: 1170, // 100% more when gift system disabled (no voice)
    priceNoGiftWithVoice: 1500, // 100% more when gift system disabled (with voice)
    voiceAddonPrice: 165, // Voice calls add-on
    currency: "USD",
    giftDiscountEligible: true,
    voiceCallsOptional: true, // Voice is optional for BUSINESS
  },
};

// Voice calls limit when add-on is purchased (BUSINESS plan only)
export const BUSINESS_VOICE_ADDON_CALLS = 2000;

// One-time message packages (can be purchased in addition to plans)
export const ONE_TIME_PACKAGES: OneTimePackage[] = [
  {
    id: "whatsapp-100",
    name: "WhatsApp 100",
    whatsappMessages: 100,
    smsMessages: 0,
    price: 5.90,
    currency: "USD",
  },
  {
    id: "whatsapp-250",
    name: "WhatsApp 250",
    whatsappMessages: 250,
    smsMessages: 0,
    price: 12.90,
    currency: "USD",
  },
  {
    id: "sms-50",
    name: "SMS 50",
    whatsappMessages: 0,
    smsMessages: 50,
    price: 9.90,
    currency: "USD",
  },
  {
    id: "sms-100",
    name: "SMS 100",
    whatsappMessages: 0,
    smsMessages: 100,
    price: 17.90,
    currency: "USD",
  },
];

// Helper function to get plan limits
export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

// Helper function to check if user can create more events
export function canCreateEvent(plan: PlanTier, currentEventCount: number): boolean {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxEvents === -1) return true;
  return currentEventCount < limits.maxEvents;
}

// Helper function to check remaining messages
export function getRemainingMessages(
  plan: PlanTier,
  whatsappSent: number,
  smsSent: number,
  whatsappBonus: number = 0,
  smsBonus: number = 0
): { whatsapp: number; sms: number } {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  return {
    whatsapp: limits.maxWhatsappMessages === -1 ? Infinity : Math.max(0, limits.maxWhatsappMessages + whatsappBonus - whatsappSent),
    sms: limits.maxSmsMessages === -1 ? Infinity : Math.max(0, limits.maxSmsMessages + smsBonus - smsSent),
  };
}

// Helper function to check if user can send messages
export function canSendWhatsapp(
  plan: PlanTier,
  whatsappSent: number,
  whatsappBonus: number = 0,
  count: number = 1
): boolean {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxWhatsappMessages === -1) return true;
  const totalAllowed = limits.maxWhatsappMessages + whatsappBonus;
  return whatsappSent + count <= totalAllowed;
}

export function canSendSms(
  plan: PlanTier,
  smsSent: number,
  smsBonus: number = 0,
  count: number = 1
): boolean {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxSmsMessages === -1) return true;
  const totalAllowed = limits.maxSmsMessages + smsBonus;
  return smsSent + count <= totalAllowed;
}

// Voice call helper functions
export function canMakeVoiceCalls(
  plan: PlanTier,
  callsMade: number,
  callsBonus: number = 0,
  count: number = 1
): boolean {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxVoiceCalls === -1) return true;
  // 0 means voice calls disabled (FREE tier)
  if (limits.maxVoiceCalls === 0) return false;
  const totalAllowed = limits.maxVoiceCalls + callsBonus;
  return callsMade + count <= totalAllowed;
}

export function getRemainingVoiceCalls(
  plan: PlanTier,
  callsMade: number,
  callsBonus: number = 0
): number {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxVoiceCalls === -1) return Infinity;
  // 0 means voice calls disabled (FREE tier)
  if (limits.maxVoiceCalls === 0) return 0;
  return Math.max(0, limits.maxVoiceCalls + callsBonus - callsMade);
}

export function isVoiceCallsEnabled(plan: PlanTier): boolean {
  const limits = getPlanLimits(plan);
  return limits.maxVoiceCalls !== 0;
}

// ============================================
// WORKSPACE HELPER FUNCTIONS
// ============================================

// Get max workspaces for a plan
export function getMaxWorkspaces(plan: PlanTier): number {
  const limits = getPlanLimits(plan);
  return limits.maxWorkspaces;
}

// Check if user can create more workspaces
export function canCreateWorkspace(plan: PlanTier, currentWorkspaceCount: number): boolean {
  const limits = getPlanLimits(plan);
  // -1 means unlimited (BUSINESS tier)
  if (limits.maxWorkspaces === -1) return true;
  return currentWorkspaceCount < limits.maxWorkspaces;
}

// Check if plan supports multiple workspaces
export function supportsMultipleWorkspaces(plan: PlanTier): boolean {
  const limits = getPlanLimits(plan);
  return limits.maxWorkspaces === -1 || limits.maxWorkspaces > 1;
}

// ============================================
// VOICE CALLS ADD-ON HELPER FUNCTIONS
// ============================================

// Get voice call limit considering add-on status
export function getVoiceCallLimit(plan: PlanTier, hasVoiceAddon: boolean): number {
  const limits = getPlanLimits(plan);

  // For BUSINESS plan, voice calls are optional
  if (plan === PlanTier.BUSINESS) {
    return hasVoiceAddon ? BUSINESS_VOICE_ADDON_CALLS : 0;
  }

  return limits.maxVoiceCalls;
}

// Check if plan has optional voice calls
export function hasOptionalVoiceCalls(plan: PlanTier): boolean {
  const limits = getPlanLimits(plan);
  return limits.voiceCallsOptional;
}

// ============================================
// GIFT DISCOUNT HELPER FUNCTIONS
// ============================================

// Check if plan is eligible for gift system discount
export function isGiftDiscountEligible(plan: PlanTier): boolean {
  const limits = getPlanLimits(plan);
  return limits.giftDiscountEligible;
}

// Get the effective price for a plan based on gift system status
export function getEffectivePrice(
  plan: PlanTier,
  giftSystemEnabled: boolean,
  hasVoiceAddon: boolean = false
): number {
  const limits = getPlanLimits(plan);

  // For BUSINESS plan, handle voice add-on and gift system combinations
  if (plan === PlanTier.BUSINESS) {
    if (giftSystemEnabled) {
      return hasVoiceAddon ? (limits.priceWithVoice ?? limits.price) : limits.price;
    } else {
      return hasVoiceAddon
        ? (limits.priceNoGiftWithVoice ?? limits.price * 2)
        : (limits.priceNoGift ?? limits.price * 2);
    }
  }

  // For other plans eligible for gift discount
  if (limits.giftDiscountEligible && !giftSystemEnabled) {
    return limits.priceNoGift ?? limits.price * 2;
  }

  return limits.price;
}

// Get the discount amount when using gift system
export function getGiftDiscountAmount(plan: PlanTier, hasVoiceAddon: boolean = false): number {
  const limits = getPlanLimits(plan);

  if (!limits.giftDiscountEligible) return 0;

  const priceWithGift = plan === PlanTier.BUSINESS && hasVoiceAddon
    ? (limits.priceWithVoice ?? limits.price)
    : limits.price;

  const priceWithoutGift = plan === PlanTier.BUSINESS && hasVoiceAddon
    ? (limits.priceNoGiftWithVoice ?? limits.price * 2)
    : (limits.priceNoGift ?? limits.price * 2);

  return priceWithoutGift - priceWithGift;
}

// Get the discount percentage when using gift system (always 50%)
export function getGiftDiscountPercentage(): number {
  return 50;
}
