import { PlanTier } from "@prisma/client";

export interface PlanLimits {
  maxEvents: number;
  maxWhatsappMessages: number;
  maxSmsMessages: number;
  price: number;
  currency: string;
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
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.FREE]: {
    maxEvents: 1,  // Free tier can create 1 event to try the platform
    maxWhatsappMessages: 0,  // No messaging until upgrade
    maxSmsMessages: 0,
    price: 0,
    currency: "USD",
  },
  [PlanTier.BASIC]: {
    maxEvents: 1,
    maxWhatsappMessages: 650,
    maxSmsMessages: 0,
    price: 14.90,
    currency: "USD",
  },
  [PlanTier.ADVANCED]: {
    maxEvents: 1,
    maxWhatsappMessages: 750,
    maxSmsMessages: 30,
    price: 24.90,
    currency: "USD",
  },
  [PlanTier.PREMIUM]: {
    maxEvents: 2,
    maxWhatsappMessages: 1000,
    maxSmsMessages: 50,
    price: 49.90,
    currency: "USD",
  },
  [PlanTier.BUSINESS]: {
    maxEvents: -1,  // Unlimited (-1 indicates contact sales / unlimited)
    maxWhatsappMessages: -1,
    maxSmsMessages: -1,
    price: -1,  // Contact sales
    currency: "USD",
  },
};

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
