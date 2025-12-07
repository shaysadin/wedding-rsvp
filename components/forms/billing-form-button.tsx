"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SubscriptionPlan, UserSubscriptionPlan } from "@/types";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PaymentModal } from "@/components/stripe/payment-modal";

interface BillingFormButtonProps {
  offer: SubscriptionPlan;
  subscriptionPlan: UserSubscriptionPlan;
  year: boolean;
}

export function BillingFormButton({
  year,
  offer,
  subscriptionPlan,
}: BillingFormButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const t = useTranslations("billing");

  const userOffer =
    subscriptionPlan.stripePriceId ===
    offer.stripeIds[year ? "yearly" : "monthly"];

  // Map offer title to plan type for the PaymentModal
  const planType = offer.title.toUpperCase() as "BASIC" | "ADVANCED" | "PREMIUM";
  const price = year ? offer.prices.yearly : offer.prices.monthly;
  const interval = year ? "yearly" : "monthly";

  const handleManageSubscription = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/customer-portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            returnUrl: window.location.href,
          }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error("Error opening customer portal:", error);
      }
    });
  };

  const handleSuccess = () => {
    // Refresh the page to show updated subscription
    window.location.reload();
  };

  // Business plan - contact sales
  if (offer.title === "Business") {
    return (
      <Button
        variant="outline"
        rounded="full"
        className="w-full"
        asChild
      >
        <a href="mailto:sales@goapproval.com">
          {t?.("contactSales") || "Contact Sales"}
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={userOffer ? "default" : "outline"}
        rounded="full"
        className="w-full"
        disabled={isPending}
        onClick={userOffer ? handleManageSubscription : () => setShowPaymentModal(true)}
      >
        {isPending ? (
          <>
            <Icons.spinner className="mr-2 size-4 animate-spin" />
            {t?.("loading") || "Loading..."}
          </>
        ) : (
          <>
            {userOffer
              ? (t?.("manageSubscription") || "Manage Subscription")
              : (t?.("upgrade") || "Upgrade")
            }
          </>
        )}
      </Button>

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        plan={planType}
        interval={interval}
        price={price}
        onSuccess={handleSuccess}
      />
    </>
  );
}
