"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface ProrationPreview {
  amountDue: number;
  subtotal: number;
  total: number;
  prorationItems: Array<{
    description: string;
    amount: number;
  }>;
  currency: string;
}

interface PlanInfo {
  name: string;
  price: number;
  interval: string;
  currency: string;
}

interface PlanChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: "BASIC" | "ADVANCED" | "PREMIUM";
  targetInterval: "monthly" | "yearly";
  onSuccess: () => void;
}

export function PlanChangeModal({
  open,
  onOpenChange,
  targetPlan,
  targetInterval,
  onSuccess,
}: PlanChangeModalProps) {
  const t = useTranslations("billingPage");
  const tPlans = useTranslations("plans");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUpgrade, setIsUpgrade] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null);
  const [newPlan, setNewPlan] = useState<PlanInfo | null>(null);
  const [prorationPreview, setProrationPreview] = useState<ProrationPreview | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [periodEndFormatted, setPeriodEndFormatted] = useState<string>("");

  // Fetch proration preview when modal opens
  useEffect(() => {
    if (open) {
      fetchProrationPreview();
    }
  }, [open, targetPlan, targetInterval]);

  const fetchProrationPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/preview-proration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: targetPlan,
          interval: targetInterval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch proration preview");
      }

      setIsUpgrade(data.isUpgrade);
      setCurrentPlan(data.currentPlan);
      setNewPlan(data.newPlan);
      setProrationPreview(data.prorationPreview);
      setPeriodEnd(data.periodEnd);
      setPeriodEndFormatted(data.periodEndFormatted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: targetPlan,
          interval: targetInterval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update subscription");
      }

      if (data.type === "upgrade") {
        toast.success(t("upgradeSuccessImmediate"));
      } else {
        toast.success(t("downgradeScheduled", { date: data.effectiveDateFormatted }));
      }

      onOpenChange(false);
      onSuccess();

      // Force a full page reload to get updated subscription data
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const planDisplayName = (plan: string) => {
    return tPlans(plan.toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <Icons.arrowUp className="h-5 w-5 text-green-500" />
                {t("upgradeTitle")}
              </>
            ) : (
              <>
                <Icons.arrowDown className="h-5 w-5 text-orange-500" />
                {t("downgradeTitle")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? t("upgradeDescription")
              : t("downgradeDescription")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <Icons.alertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchProrationPreview}
            >
              {t("tryAgain")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Plan Comparison */}
            <div className="flex items-center justify-between gap-4">
              {/* Current Plan */}
              <div className="flex-1 rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("currentPlanLabel")}</p>
                <Badge variant="outline" className="mb-2">
                  {currentPlan && planDisplayName(currentPlan.name)}
                </Badge>
                <p className="text-lg font-semibold">
                  {currentPlan && formatPrice(currentPlan.price, currentPlan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{currentPlan?.interval === "year" ? t("year") : t("month")}
                  </span>
                </p>
              </div>

              {/* Arrow */}
              <Icons.arrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* New Plan */}
              <div className={cn(
                "flex-1 rounded-lg border p-4 text-center",
                isUpgrade ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
              )}>
                <p className="text-xs text-muted-foreground mb-1">{t("newPlanLabel")}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mb-2",
                    isUpgrade ? "border-green-500 text-green-700" : "border-orange-500 text-orange-700"
                  )}
                >
                  {newPlan && planDisplayName(newPlan.name)}
                </Badge>
                <p className="text-lg font-semibold">
                  {newPlan && formatPrice(newPlan.price, newPlan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{newPlan?.interval === "year" ? t("year") : t("month")}
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Proration Details (for upgrades) */}
            {isUpgrade && prorationPreview && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">{t("paymentSummary")}</h4>

                {prorationPreview.prorationItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.description}</span>
                    <span className={item.amount < 0 ? "text-green-600" : ""}>
                      {formatCurrency(item.amount, prorationPreview.currency)}
                    </span>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>{t("amountDueNow")}</span>
                  <span className="text-lg">
                    {formatCurrency(prorationPreview.amountDue, prorationPreview.currency)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("upgradeEffectiveImmediately")}
                </p>
              </div>
            )}

            {/* Downgrade Details */}
            {!isUpgrade && (
              <div className="space-y-3">
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                  <div className="flex items-start gap-3">
                    <Icons.calendar className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        {t("downgradeScheduledTitle")}
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        {t("downgradeScheduledMessage", { date: periodEndFormatted })}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("noRefundNotice")}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || isProcessing || !!error}
            className={isUpgrade ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
          >
            {isProcessing ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : isUpgrade ? (
              t("confirmUpgradeAndPay")
            ) : (
              t("confirmDowngrade")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
