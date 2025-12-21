"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Store, Wallet, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SuppliersEventData } from "@/actions/event-selector";

interface SuppliersEventCardProps {
  event: SuppliersEventData;
  locale: string;
}

export function SuppliersEventCard({ event, locale }: SuppliersEventCardProps) {
  const t = useTranslations("suppliers");
  const router = useRouter();
  const isRTL = locale === "he";

  const { supplierStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? "he-IL" : "en-US", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate payment progress
  const paymentProgress = supplierStats.totalAgreed > 0
    ? Math.round((supplierStats.totalPaid / supplierStats.totalAgreed) * 100)
    : 0;

  // Calculate budget usage
  const budgetUsage = supplierStats.totalBudget > 0
    ? Math.round((supplierStats.totalAgreed / supplierStats.totalBudget) * 100)
    : 0;

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/suppliers`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Purple/Violet for suppliers */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

      <CardContent className="p-5">
        {/* Header */}
        <div className={cn(
          "flex items-start justify-between gap-3",
          isRTL && "flex-row-reverse"
        )}>
          <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="rounded-full bg-gradient-to-br from-violet-100 to-purple-100 p-2 dark:from-violet-900/30 dark:to-purple-900/30 transition-transform duration-150 group-hover:scale-110">
              <Store className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Budget Status Banner */}
        <div className={cn(
          "mt-4 flex items-center gap-2 p-3 rounded-lg",
          supplierStats.totalBudget > 0
            ? budgetUsage > 100
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-emerald-50 dark:bg-emerald-900/20"
            : "bg-amber-50 dark:bg-amber-900/20"
        )}>
          <div className={cn(
            "p-1.5 rounded-full",
            supplierStats.totalBudget > 0
              ? budgetUsage > 100
                ? "bg-red-100 dark:bg-red-800/30"
                : "bg-emerald-100 dark:bg-emerald-800/30"
              : "bg-amber-100 dark:bg-amber-800/30"
          )}>
            <Wallet className={cn(
              "h-4 w-4",
              supplierStats.totalBudget > 0
                ? budgetUsage > 100
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div className={cn("flex-1", isRTL && "text-right")}>
            <p className={cn(
              "text-sm font-medium",
              supplierStats.totalBudget > 0
                ? budgetUsage > 100
                  ? "text-red-700 dark:text-red-300"
                  : "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {supplierStats.totalBudget > 0
                ? (isRTL ? `תקציב: ${formatCurrency(supplierStats.totalBudget)}` : `Budget: ${formatCurrency(supplierStats.totalBudget)}`)
                : (isRTL ? "לא הוגדר תקציב" : "No budget set")}
            </p>
          </div>
          {supplierStats.totalBudget > 0 && budgetUsage <= 100 && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-lg font-semibold">{supplierStats.supplierCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? "ספקים" : "Suppliers"}
            </p>
          </div>
          <div className="rounded-md bg-violet-50 p-2 dark:bg-violet-900/20">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 truncate">
              {formatCurrency(supplierStats.totalAgreed)}
            </p>
            <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70">
              {isRTL ? "מחיר סגור" : "Agreed"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(supplierStats.totalPaid)}
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "שולם" : "Paid"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {supplierStats.totalAgreed > 0 && (
          <div className="mt-4">
            <div className={cn(
              "mb-1 flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "התקדמות תשלום" : "Payment progress"}
              </span>
              <span className="font-medium">{paymentProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Overdue badge */}
        {supplierStats.overdueCount > 0 && (
          <div className={cn("mt-3 flex", isRTL ? "justify-start" : "justify-end")}>
            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="me-1 h-3 w-3" />
              {isRTL
                ? `${supplierStats.overdueCount} תשלומים באיחור`
                : `${supplierStats.overdueCount} overdue payments`}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
