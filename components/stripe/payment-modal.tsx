"use client";

import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { getStripe } from "@/lib/stripe-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentForm } from "./payment-form";
import { Icons } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "BASIC" | "ADVANCED" | "PREMIUM";
  interval: "monthly" | "yearly";
  price: number;
  onSuccess?: () => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  plan,
  interval,
  price,
  onSuccess,
}: PaymentModalProps) {
  const locale = useLocale();
  const t = useTranslations("billing");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHebrew = locale === "he";

  useEffect(() => {
    if (open) {
      createSubscription();
    } else {
      // Reset state when modal closes
      setClientSecret(null);
      setError(null);
    }
  }, [open, plan, interval]);

  const createSubscription = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, interval }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      if (data.upgraded) {
        // Subscription was upgraded directly (user already had payment method)
        toast.success(isHebrew ? "התוכנית שודרגה בהצלחה!" : "Plan upgraded successfully!");
        onSuccess?.();
        onOpenChange(false);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    toast.success(isHebrew ? "התשלום בוצע בהצלחה!" : "Payment successful!");
    onSuccess?.();
    onOpenChange(false);
  };

  const handleError = (error: string) => {
    setError(error);
    toast.error(error);
  };

  const planNames: Record<string, { en: string; he: string }> = {
    BASIC: { en: "Basic", he: "בסיסי" },
    ADVANCED: { en: "Advanced", he: "מתקדם" },
    PREMIUM: { en: "Premium", he: "פרימיום" },
  };

  const intervalNames: Record<string, { en: string; he: string }> = {
    monthly: { en: "Monthly", he: "חודשי" },
    yearly: { en: "Yearly", he: "שנתי" },
  };

  const stripePromise = getStripe();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isHebrew ? "השלמת תשלום" : "Complete Payment"}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? "הזינו את פרטי התשלום להפעלת התוכנית"
              : "Enter your payment details to activate your subscription"}
          </DialogDescription>
        </DialogHeader>

        {/* Plan Summary */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icons.creditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">
                {isHebrew ? planNames[plan].he : planNames[plan].en}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew ? intervalNames[interval].he : intervalNames[interval].en}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              ${price.toFixed(2)}
            </p>
            <Badge variant="secondary" className="text-xs">
              {interval === "yearly" && (isHebrew ? "חיסכון של 17%" : "Save 17%")}
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isHebrew ? "מכין את התשלום..." : "Preparing payment..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
            <Icons.warning className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-2 font-medium text-destructive">{error}</p>
            <button
              onClick={createSubscription}
              className="mt-2 text-sm text-primary underline"
            >
              {isHebrew ? "נסה שוב" : "Try again"}
            </button>
          </div>
        )}

        {/* Payment Form */}
        {clientSecret && !isLoading && !error && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#0f172a",
                  colorBackground: "#ffffff",
                  colorText: "#0f172a",
                  colorDanger: "#ef4444",
                  fontFamily: "system-ui, sans-serif",
                  borderRadius: "8px",
                },
              },
              locale: isHebrew ? "he" : "en",
            }}
          >
            <PaymentForm onSuccess={handleSuccess} onError={handleError} />
          </Elements>
        )}

        {/* Secure Payment Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Icons.lock className="h-3 w-3" />
          <span>{isHebrew ? "תשלום מאובטח עם Stripe" : "Secure payment with Stripe"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
