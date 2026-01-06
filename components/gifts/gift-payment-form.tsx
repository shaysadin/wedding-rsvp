"use client";

import { useState } from "react";
import { toast } from "sonner";

import { initiateGiftPayment } from "@/actions/gift-payments";
import { calculateServiceFee, calculateTotalWithFee } from "@/lib/payments/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface GiftSettings {
  minAmount: number;
  maxAmount: number;
  suggestedAmounts: number[];
  currency: string;
}

interface GiftPaymentFormProps {
  guestSlug: string;
  guestName: string;
  eventTitle: string;
  coupleName: string;
  settings: GiftSettings;
  locale: string;
}

export function GiftPaymentForm({
  guestSlug,
  guestName,
  eventTitle,
  coupleName,
  settings,
  locale,
}: GiftPaymentFormProps) {
  const isRTL = locale === "he";

  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAmount = amount ?? (customAmount ? Number(customAmount) : 0);
  const serviceFee = calculateServiceFee(selectedAmount);
  const feeResult = calculateTotalWithFee(selectedAmount);
  const totalAmount = feeResult.total;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(null);
    setCustomAmount(e.target.value);
  };

  const handleSubmit = async () => {
    if (selectedAmount < settings.minAmount) {
      toast.error(
        isRTL
          ? `הסכום המינימלי הוא ${formatCurrency(settings.minAmount)}`
          : `Minimum amount is ${formatCurrency(settings.minAmount)}`
      );
      return;
    }

    if (selectedAmount > settings.maxAmount) {
      toast.error(
        isRTL
          ? `הסכום המקסימלי הוא ${formatCurrency(settings.maxAmount)}`
          : `Maximum amount is ${formatCurrency(settings.maxAmount)}`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await initiateGiftPayment({
        guestSlug,
        amount: selectedAmount,
        currency: settings.currency,
        message: message || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.paymentUrl) {
        // Redirect to payment page
        window.location.href = result.paymentUrl;
      }
    } catch {
      toast.error(
        isRTL
          ? "אירעה שגיאה. אנא נסו שוב."
          : "An error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidAmount =
    selectedAmount >= settings.minAmount && selectedAmount <= settings.maxAmount;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Icons.gift className="h-12 w-12 mx-auto text-primary mb-2" />
        <CardTitle className="text-2xl">
          {isRTL ? `מתנה ל${coupleName}` : `Gift for ${coupleName}`}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? `שלום ${guestName}, שלחו מתנה לרגל ${eventTitle}`
            : `Hello ${guestName}, send a gift for ${eventTitle}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Suggested Amounts */}
        <div className="space-y-3">
          <Label>{isRTL ? "בחרו סכום" : "Select Amount"}</Label>
          <div className="grid grid-cols-2 gap-3">
            {settings.suggestedAmounts.map((value) => (
              <Button
                key={value}
                type="button"
                variant={amount === value ? "default" : "outline"}
                className="h-14 text-lg"
                onClick={() => handleAmountSelect(value)}
              >
                {formatCurrency(value)}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="space-y-2">
          <Label htmlFor="customAmount">
            {isRTL ? "או הזינו סכום אחר" : "Or enter custom amount"}
          </Label>
          <div className="relative">
            <Input
              id="customAmount"
              type="number"
              min={settings.minAmount}
              max={settings.maxAmount}
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder={`${settings.minAmount} - ${settings.maxAmount}`}
              className={cn("pl-12", isRTL && "text-right pr-12 pl-4")}
            />
            <span
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                isRTL ? "right-3" : "left-3"
              )}
            >
              {settings.currency === "ILS" ? "₪" : "$"}
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">
            {isRTL ? "הוסיפו ברכה (אופציונלי)" : "Add a message (optional)"}
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isRTL ? "מזל טוב! שיהיה בשעה טובה..." : "Congratulations! Wishing you all the best..."}
            rows={3}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>

        {/* Summary */}
        {selectedAmount > 0 && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{isRTL ? "סכום מתנה" : "Gift Amount"}</span>
              <span>{formatCurrency(selectedAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{isRTL ? "עמלת שירות (8%)" : "Service Fee (8%)"}</span>
              <span>{formatCurrency(serviceFee)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>{isRTL ? "סה״כ לתשלום" : "Total"}</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!isValidAmount || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Icons.spinner className="me-2 h-5 w-5 animate-spin" />
              {isRTL ? "מעבד..." : "Processing..."}
            </>
          ) : (
            <>
              <Icons.creditCard className="me-2 h-5 w-5" />
              {isRTL ? "המשך לתשלום" : "Continue to Payment"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
