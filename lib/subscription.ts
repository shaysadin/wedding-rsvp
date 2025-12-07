import { prisma } from "@/lib/db";
import { pricingData } from "@/config/subscriptions";
import { UserSubscriptionPlan } from "@/types";

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      pendingPlanChange: true,
      pendingPlanChangeDate: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Find the plan details from config
  const planData = pricingData.find(
    (plan) => plan.title.toUpperCase() === user.plan
  ) || {
    title: "Free",
    description: "Free plan",
    benefits: [],
    limitations: [],
    prices: { monthly: 0, yearly: 0 },
    stripeIds: { monthly: null, yearly: null },
  };

  // Determine if it's monthly or yearly based on price ID
  const isYearly = user.stripePriceId
    ? Object.entries(pricingData).some(
        ([_, plan]) => plan.stripeIds.yearly === user.stripePriceId
      )
    : false;

  // User is considered "paid" if they have an active Stripe subscription
  // OR if they have a non-FREE plan (admin assigned or legacy plans)
  const hasStripeSubscription = user.stripeSubscriptionId !== null;
  const hasNonFreePlan = user.plan !== "FREE";
  const isPaid = hasStripeSubscription || hasNonFreePlan;

  // Determine interval: from Stripe if available, otherwise null for admin-assigned plans
  let interval: "year" | "month" | null = null;
  if (hasStripeSubscription) {
    interval = isYearly ? "year" : "month";
  }

  return {
    ...planData,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    stripePriceId: user.stripePriceId,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime() || 0,
    isPaid,
    interval,
    isCanceled: false, // TODO: Check actual subscription status from Stripe
    isAdminAssigned: hasNonFreePlan && !hasStripeSubscription, // New field to indicate admin-assigned plan
    pendingPlanChange: user.pendingPlanChange,
    pendingPlanChangeDate: user.pendingPlanChangeDate?.getTime() || null,
  };
}
