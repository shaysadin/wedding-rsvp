import { User } from "@prisma/client";
import type { Icon } from "lucide-react";

import { Icons } from "@/components/shared/icons";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  mailSupport: string;
  links: {
    twitter: string;
    github: string;
  };
};

export type NavItem = {
  title: string;
  titleKey?: string; // Translation key for i18n
  href: string;
  badge?: number;
  disabled?: boolean;
  external?: boolean;
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type MainNavItem = NavItem;

export type MarketingConfig = {
  mainNav: MainNavItem[];
};

export type SidebarNavItem = {
  title: string;
  titleKey?: string; // Translation key for i18n
  items: NavItem[];
  authorizeOnly?: UserRole;
  icon?: keyof typeof Icons;
};

export type DocsConfig = {
  mainNav: MainNavItem[];
  sidebarNav: SidebarNavItem[];
};

// subscriptions
export type SubscriptionPlan = {
  title: string;
  description: string;
  benefits: string[];
  limitations: string[];
  prices: {
    monthly: number;
    yearly: number;
    // Business plan only - with voice pricing (monthly only)
    monthlyWithVoice?: number;
  };
  stripeIds: {
    monthly: string | null;
    yearly: string | null;
    // Business plan extended stripe IDs (monthly only)
    monthlyWithVoice?: string | null;
    // No-gift pricing variants (100% higher, monthly only for Business)
    monthlyNoGift?: string | null;
    yearlyNoGift?: string | null;
    monthlyNoGiftWithVoice?: string | null;
  };
  monthlyOnly?: boolean; // If true, yearly billing is not available (e.g., Business plan)
  giftDiscountNote?: string; // Note about gift system discount
};

export type UserSubscriptionPlan = SubscriptionPlan & {
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: number;
    isPaid: boolean;
    interval: "month" | "year" | null;
    isCanceled?: boolean;
    isAdminAssigned?: boolean; // True if plan was assigned by admin without Stripe subscription
    pendingPlanChange?: string | null; // Scheduled plan change (e.g., downgrade)
    pendingPlanChangeDate?: number | null; // When the scheduled change will take effect
  };

// compare plans
export type ColumnType = string | boolean | null;
export type PlansRow = { feature: string; tooltip?: string } & {
  [key in "basic" | "advanced" | "premium" | "business"]: ColumnType;
};

// landing sections
export type InfoList = {
  icon: keyof typeof Icons;
  title: string;
  description: string;
};

export type InfoLdg = {
  title: string;
  image: string;
  description: string;
  list: InfoList[];
};

export type FeatureLdg = {
  title: string;
  description: string;
  link: string;
  icon: keyof typeof Icons;
};

export type TestimonialType = {
  name: string;
  job: string;
  image: string;
  review: string;
};
