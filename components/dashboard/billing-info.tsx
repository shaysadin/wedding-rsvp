"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CustomerPortalButton } from "@/components/forms/customer-portal-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { UserSubscriptionPlan } from "@/types";
import { Icons } from "@/components/shared/icons";

interface BillingInfoProps {
  subscriptionPlan: UserSubscriptionPlan;
}

export function BillingInfo({ subscriptionPlan }: BillingInfoProps) {
  const t = useTranslations("billingPage");
  const {
    title,
    description,
    stripeCustomerId,
    isPaid,
    isCanceled,
    stripeCurrentPeriodEnd,
    interval,
    benefits,
    isAdminAssigned,
  } = subscriptionPlan;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("currentPlan")}</CardTitle>
            <CardDescription>
              {t("youAreOn")} <strong>{title}</strong> {t("plan")}
            </CardDescription>
          </div>
          <Badge variant={isPaid ? "default" : "secondary"}>
            {isPaid ? t("active") : t("free")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Plan features */}
        {benefits && benefits.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("includedFeatures")}</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {benefits.slice(0, 4).map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Icons.check className="size-4 text-green-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {isPaid ? (
          isAdminAssigned ? (
            <p className="text-sm text-muted-foreground">
              {t("adminAssignedPlan")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isCanceled ? t("canceledOn") : t("renewsOn")}{" "}
              <span className="font-medium text-foreground">
                {formatDate(stripeCurrentPeriodEnd)}
              </span>
              {interval && (
                <span className="ml-2">
                  ({interval === "year" ? t("yearly") : t("monthly")})
                </span>
              )}
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("noActiveSubscription")}
          </p>
        )}

        {isPaid && stripeCustomerId && !isAdminAssigned ? (
          <CustomerPortalButton userStripeId={stripeCustomerId} />
        ) : !isAdminAssigned ? (
          <Link href="/pricing" className={cn(buttonVariants())}>
            {t("choosePlan")}
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  );
}
