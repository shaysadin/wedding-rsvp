"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface PaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("billing");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/settings?payment=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          onError(error.message || "Payment failed");
        } else {
          onError("An unexpected error occurred");
        }
      } else {
        onSuccess();
      }
    } catch (err) {
      onError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            {t?.("processing") || "Processing..."}
          </>
        ) : (
          t?.("payNow") || "Pay Now"
        )}
      </Button>
    </form>
  );
}
