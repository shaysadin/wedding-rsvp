"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Users,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface SupplierStatsCardsProps {
  stats: {
    totalBudget: number;
    totalAgreed: number;
    totalPaid: number;
    remainingBudget: number;
    remainingPayments: number;
    supplierCount: number;
    overdueCount: number;
  };
  currency?: string;
}

export function SupplierStatsCards({ stats, currency = "ILS" }: SupplierStatsCardsProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const budgetUsedPercent = stats.totalBudget > 0
    ? Math.round((stats.totalAgreed / stats.totalBudget) * 100)
    : 0;

  const paidPercent = stats.totalAgreed > 0
    ? Math.round((stats.totalPaid / stats.totalAgreed) * 100)
    : 0;

  const cards = [
    {
      key: "budget",
      label: isRTL ? "תקציב כולל" : "Total Budget",
      value: formatCurrency(stats.totalBudget),
      subLabel: stats.totalBudget > 0
        ? `${isRTL ? "נותר" : "Remaining"}: ${formatCurrency(stats.remainingBudget)}`
        : isRTL ? "לא הוגדר" : "Not set",
      icon: Wallet,
      iconBg: "bg-violet-500",
      cardBg: "bg-violet-50 dark:bg-violet-950/40",
      borderColor: "border-violet-200/50 dark:border-violet-800/30",
    },
    {
      key: "committed",
      label: isRTL ? "התחייבויות" : "Committed",
      value: formatCurrency(stats.totalAgreed),
      subLabel: stats.totalBudget > 0
        ? `${budgetUsedPercent}% ${isRTL ? "מהתקציב" : "of budget"}`
        : `${stats.supplierCount} ${isRTL ? "ספקים" : "suppliers"}`,
      icon: Receipt,
      iconBg: "bg-blue-500",
      cardBg: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200/50 dark:border-blue-800/30",
    },
    {
      key: "paid",
      label: isRTL ? "שולם" : "Paid",
      value: formatCurrency(stats.totalPaid),
      subLabel: stats.totalAgreed > 0
        ? `${paidPercent}% ${isRTL ? "מההתחייבויות" : "of committed"}`
        : isRTL ? "אין תשלומים" : "No payments",
      icon: PiggyBank,
      iconBg: "bg-emerald-500",
      cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
    },
    {
      key: "remaining",
      label: isRTL ? "נותר לשלם" : "Remaining",
      value: formatCurrency(stats.remainingPayments),
      subLabel: stats.overdueCount > 0
        ? `${stats.overdueCount} ${isRTL ? "באיחור" : "overdue"}`
        : isRTL ? "הכל בזמן" : "All on time",
      icon: stats.overdueCount > 0 ? AlertTriangle : TrendingUp,
      iconBg: stats.overdueCount > 0 ? "bg-amber-500" : "bg-cyan-500",
      cardBg: stats.overdueCount > 0
        ? "bg-amber-50 dark:bg-amber-950/40"
        : "bg-cyan-50 dark:bg-cyan-950/40",
      borderColor: stats.overdueCount > 0
        ? "border-amber-200/50 dark:border-amber-800/30"
        : "border-cyan-200/50 dark:border-cyan-800/30",
      alert: stats.overdueCount > 0,
    },
    {
      key: "suppliers",
      label: isRTL ? "ספקים" : "Suppliers",
      value: stats.supplierCount.toString(),
      subLabel: isRTL ? "סה״כ ספקים" : "Total suppliers",
      icon: Users,
      iconBg: "bg-pink-500",
      cardBg: "bg-pink-50 dark:bg-pink-950/40",
      borderColor: "border-pink-200/50 dark:border-pink-800/30",
    },
  ];

  return (
    <div className="mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex gap-3 px-1 pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:pb-0 lg:grid-cols-5">
        {cards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.15, ease: "easeOut" }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            style={{ willChange: "transform" }}
            className="shrink-0 sm:shrink"
          >
            <Card
              className={cn(
                "relative w-[160px] overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
                card.cardBg,
                card.borderColor
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className={cn(
                  "flex items-center gap-3 sm:gap-4",
                  isRTL && "flex-row-reverse"
                )}>
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-105 sm:h-11 sm:w-11",
                      card.iconBg
                    )}
                  >
                    <card.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                    <p className="text-xs font-medium text-muted-foreground truncate sm:text-sm">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">
                      {card.value}
                    </p>
                    <p className={cn(
                      "text-[10px] text-muted-foreground/80 truncate sm:text-xs",
                      card.alert && "text-amber-600 dark:text-amber-400 font-medium"
                    )}>
                      {card.subLabel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
