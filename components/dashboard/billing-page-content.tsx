"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { UserSubscriptionPlan, SubscriptionPlan } from "@/types";

import { pricingData, comparePlans, plansColumns } from "@/config/subscriptions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";
import { PlanChangeModal } from "@/components/dashboard/plan-change-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BillingPageContentProps {
  userId: string;
  subscriptionPlan: UserSubscriptionPlan;
}

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 border-gray-200",
  basic: "bg-green-100 text-green-700 border-green-200",
  advanced: "bg-blue-100 text-blue-700 border-blue-200",
  premium: "bg-red-100 text-red-700 border-red-200",
  business: "bg-purple-100 text-purple-700 border-purple-200",
};

// Plan tier order for comparison
const planTierOrder: Record<string, number> = {
  free: 0,
  basic: 1,
  advanced: 2,
  premium: 3,
  business: 4,
};

export function BillingPageContent({ userId, subscriptionPlan }: BillingPageContentProps) {
  const t = useTranslations("billingPage");
  const tPricing = useTranslations("pricing");
  const tBilling = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const locale = useLocale();

  const searchParams = useSearchParams();
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<{
    plan: "BASIC" | "ADVANCED" | "PREMIUM";
    interval: "monthly" | "yearly";
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancellingScheduledChange, setIsCancellingScheduledChange] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null>(null);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(true);

  // Current user's plan (lowercase)
  const currentPlanKey = subscriptionPlan.title?.toLowerCase() || "free";
  const isOnFreePlan = currentPlanKey === "free" || !subscriptionPlan.isPaid;
  const currentTier = planTierOrder[currentPlanKey] || 0;
  const hasActiveSubscription = !!subscriptionPlan.stripeSubscriptionId;

  // Fetch payment method on mount
  useEffect(() => {
    const fetchPaymentMethod = async () => {
      if (!hasActiveSubscription) {
        setIsLoadingPaymentMethod(false);
        return;
      }

      try {
        const response = await fetch("/api/stripe/payment-method");
        const data = await response.json();

        if (response.ok && data.hasPaymentMethod && data.paymentMethod?.card) {
          setPaymentMethod({
            brand: data.paymentMethod.card.brand,
            last4: data.paymentMethod.card.last4,
            expMonth: data.paymentMethod.card.expMonth,
            expYear: data.paymentMethod.card.expYear,
          });
        }
      } catch (error) {
        console.error("Error fetching payment method:", error);
      } finally {
        setIsLoadingPaymentMethod(false);
      }
    };

    fetchPaymentMethod();
  }, [hasActiveSubscription]);

  // Handle success/cancel from Stripe Checkout and Portal
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const upgraded = searchParams.get("upgraded");
    const downgraded = searchParams.get("downgraded");

    if (success === "true") {
      toast.success(t("paymentSuccess"));
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (canceled === "true") {
      toast.info(t("paymentCanceled"));
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (upgraded === "true") {
      toast.success(t("upgradeSuccess"));
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (downgraded === "true") {
      toast.success(t("downgradeSuccess"));
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [searchParams, t]);

  const handlePlanClick = (offer: SubscriptionPlan) => {
    const planType = offer.title.toUpperCase() as "BASIC" | "ADVANCED" | "PREMIUM";
    const interval = isYearly ? "yearly" : "monthly";

    // For new subscriptions (free plan), go directly to checkout
    if (!hasActiveSubscription) {
      handleNewSubscription(planType, interval);
      return;
    }

    // For existing subscriptions, show the plan change modal
    setPendingPlanChange({
      plan: planType,
      interval,
    });
    setShowPlanChangeModal(true);
  };

  const handleNewSubscription = async (plan: "BASIC" | "ADVANCED" | "PREMIUM", interval: "monthly" | "yearly") => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval, locale: locale === "he" ? "he" : "en" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setIsProcessing(false);
    }
  };

  const handlePlanChangeSuccess = () => {
    // Refresh the page to show updated subscription
    router.refresh();
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success(t("subscriptionCancelled"));
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleCancelScheduledChange = async () => {
    setIsCancellingScheduledChange(true);
    try {
      const response = await fetch("/api/stripe/cancel-scheduled-change", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel scheduled change");
      }

      toast.success(t("scheduledChangeCancelled"));
      router.refresh();
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel scheduled change");
    } finally {
      setIsCancellingScheduledChange(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/billing`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open customer portal");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setIsLoadingPortal(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    // Return appropriate icon or text for card brand
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      diners: "Diners Club",
      jcb: "JCB",
      unionpay: "UnionPay",
    };
    return brandMap[brand.toLowerCase()] || brand;
  };

  const getPlanButton = (offer: SubscriptionPlan) => {
    const planKey = offer.title.toLowerCase();
    const isCurrentPlan = planKey === currentPlanKey && !isOnFreePlan;
    const targetTier = planTierOrder[planKey] || 0;

    // Business plan - contact sales
    if (offer.title === "Business") {
      return (
        <Button
          variant="outline"
          className="w-full"
          asChild
        >
          <a href="mailto:sales@otakuverse.com">
            {tBilling("contactSales")}
          </a>
        </Button>
      );
    }

    // Current plan
    if (isCurrentPlan) {
      return (
        <Button variant="outline" className="w-full" disabled>
          {t("currentPlan")}
        </Button>
      );
    }

    // Determine if upgrade or downgrade
    const isUpgrade = isOnFreePlan || targetTier > currentTier;

    return (
      <Button
        variant={planKey === "advanced" ? "default" : "default"}
        className="w-full"
        onClick={() => handlePlanClick(offer)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            {tBilling("loading")}
          </>
        ) : (
          isUpgrade ? tBilling("upgrade") : tBilling("downgrade")
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("youAreOn")} <span className="font-medium text-foreground">{isOnFreePlan ? tPlans("free") : subscriptionPlan.title}</span> {t("plan")}. {t("forStandardPlans")}
        </p>
      </div>

      {/* Payment Method & Billing Management */}
      {hasActiveSubscription && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.creditCard className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("paymentMethod")}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCustomerPortal}
                disabled={isLoadingPortal}
              >
                {isLoadingPortal ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    {tBilling("loading")}
                  </>
                ) : (
                  <>
                    <Icons.settings className="me-2 h-4 w-4" />
                    {t("manageBilling")}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPaymentMethod ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span>{tBilling("loading")}</span>
              </div>
            ) : paymentMethod ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-8 bg-muted rounded">
                  <Icons.creditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {getCardBrandIcon(paymentMethod.brand)} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("expires")} {paymentMethod.expMonth.toString().padStart(2, "0")}/{paymentMethod.expYear}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <p>{t("noPaymentMethod")}</p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary"
                  onClick={handleOpenCustomerPortal}
                  disabled={isLoadingPortal}
                >
                  {t("addPaymentMethod")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Plan Change Notice */}
      {subscriptionPlan.pendingPlanChange && (() => {
        // Use pendingPlanChangeDate (set when downgrade was scheduled)
        // Falls back to stripeCurrentPeriodEnd if not set
        const oneDayMs = 24 * 60 * 60 * 1000;
        const now = new Date();
        const changeDateTimestamp = subscriptionPlan.pendingPlanChangeDate || subscriptionPlan.stripeCurrentPeriodEnd;
        const changeDate = changeDateTimestamp ? new Date(changeDateTimestamp) : null;

        // Calculate days remaining
        let daysRemaining: number | null = null;
        if (changeDate) {
          const diffMs = changeDate.getTime() - now.getTime();
          if (diffMs > 0) {
            daysRemaining = Math.ceil(diffMs / oneDayMs);
          } else {
            daysRemaining = 0; // Already due
          }
        }

        return (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <Icons.alertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              {t("scheduledPlanChange")}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p>
                    {t("planWillChangeTo", {
                      plan: subscriptionPlan.pendingPlanChange,
                      date: changeDate ? changeDate.toLocaleDateString() : t("endOfBillingPeriod"),
                    })}
                  </p>
                  {daysRemaining !== null && daysRemaining > 0 && (
                    <p className="text-sm mt-1">
                      {t("daysRemaining", { days: daysRemaining })}
                    </p>
                  )}
                  {daysRemaining === 0 && (
                    <p className="text-sm mt-1 font-medium">
                      {t("changePending")}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelScheduledChange}
                  disabled={isCancellingScheduledChange}
                  className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
                >
                  {isCancellingScheduledChange ? (
                    <>
                      <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                      {t("cancelling")}
                    </>
                  ) : (
                    <>
                      <Icons.close className="me-2 h-4 w-4" />
                      {t("cancelScheduledChange")}
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Free Plan Card */}
        <Card className={cn(
          "relative",
          isOnFreePlan && "ring-2 ring-primary"
        )}>
          <CardHeader className="pb-4">
            <Badge className={cn("w-fit", planBadgeColors.free)} variant="outline">
              {isOnFreePlan && <Icons.check className="mr-1 h-3 w-3" />}
              {tPlans("free")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">{t("perUserMonth")}</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Icons.check className="h-4 w-4 text-muted-foreground" />
                <span>{t("features.noEvents")}</span>
              </li>
              <li className="flex items-center gap-2">
                <Icons.check className="h-4 w-4 text-muted-foreground" />
                <span>{t("features.trialAccess")}</span>
              </li>
            </ul>
            {isOnFreePlan ? (
              <Button variant="outline" className="w-full" disabled>
                {t("currentPlan")}
              </Button>
            ) : hasActiveSubscription ? (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleOpenCustomerPortal}
                disabled={isLoadingPortal}
              >
                {isLoadingPortal ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    {tBilling("loading")}
                  </>
                ) : (
                  tBilling("cancelSubscription")
                )}
              </Button>
            ) : (
              <Button variant="outline" className="w-full text-muted-foreground" disabled>
                {tPlans("free")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Paid Plan Cards */}
        {pricingData.slice(0, 3).map((offer) => {
          const planKey = offer.title.toLowerCase() as "basic" | "advanced" | "premium";
          const isCurrentPlan = planKey === currentPlanKey && !isOnFreePlan;
          const monthlyEquivalent = Math.round(offer.prices.yearly / 12);
          const displayPrice = isYearly ? monthlyEquivalent : offer.prices.monthly;

          return (
            <Card
              key={offer.title}
              className={cn(
                "relative",
                isCurrentPlan && "ring-2 ring-primary",
                planKey === "advanced" && !isCurrentPlan && "border-blue-200"
              )}
            >
            
              <CardHeader className="pb-4">
                <Badge className={cn("w-fit", planBadgeColors[planKey])} variant="outline">
                  {isCurrentPlan && <Icons.check className="mr-1 h-3 w-3" />}
                  {tPricing(`plans.${planKey}.title`)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">${displayPrice.toFixed(2)}</span>
                  <span className="text-muted-foreground ml-1">{t("perUserMonth")}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {offer.benefits.slice(0, 4).map((_, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Icons.check className="h-4 w-4 text-muted-foreground" />
                      <span>{tPricing(`plans.${planKey}.benefits.${index}`)}</span>
                    </li>
                  ))}
                </ul>
                {getPlanButton(offer)}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing Toggle & Comparison Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Annual/Monthly Toggle - Animated Tabs */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative flex rounded-full bg-muted p-1">
              <motion.div
                className="absolute inset-y-1 rounded-full bg-background shadow-sm"
                initial={false}
                animate={{
                  x: isYearly ? "-90%" : "0%",
                  width: "50%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  "relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors",
                  !isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tBilling("monthly")}
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  "relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2",
                  isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tBilling("yearly")}
             
              </button>
            </div>
          </div>

          {/* Price Row */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]"></TableHead>
                <TableHead className="text-center">
                  <Badge className={cn("my-2", planBadgeColors.free)} variant="outline">
                    {tPlans("free")}
                  </Badge>
                  
                </TableHead>
                {pricingData.slice(0, 3).map((offer) => {
                  const planKey = offer.title.toLowerCase() as "basic" | "advanced" | "premium";
                  const monthlyEquivalent = Math.round(offer.prices.yearly / 12);
                  const displayPrice = isYearly ? monthlyEquivalent : offer.prices.monthly;

                  return (
                    <TableHead key={offer.title} className="text-center">
                      <Badge className={cn("my-2", planBadgeColors[planKey])} variant="outline">
                        {tPricing(`plans.${planKey}.title`)}
                      </Badge>
                     
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparePlans.slice(0, 6).map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {tPricing(`compare.features.${index}`)}
                  </TableCell>
                  <TableCell className="text-center">
                    {typeof row.basic === "boolean" ? (
                      row.basic ? (
                        <Icons.check className="h-4 w-4 mx-auto text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {plansColumns.slice(0, 3).map((col) => (
                    <TableCell key={col} className="text-center">
                      {typeof row[col] === "boolean" ? (
                        row[col] ? (
                          <Icons.check className="h-4 w-4 mx-auto text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : row[col] === "Unlimited" ? (
                        tPricing("compare.unlimited")
                      ) : row[col] === "24/7" ? (
                        tPricing("compare.247")
                      ) : (
                        row[col]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelSubscriptionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelSubscriptionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {t("keepSubscription")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                  {t("cancelling")}
                </>
              ) : (
                t("confirmCancel")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plan Change Modal */}
      {pendingPlanChange && (
        <PlanChangeModal
          open={showPlanChangeModal}
          onOpenChange={setShowPlanChangeModal}
          targetPlan={pendingPlanChange.plan}
          targetInterval={pendingPlanChange.interval}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  );
}
