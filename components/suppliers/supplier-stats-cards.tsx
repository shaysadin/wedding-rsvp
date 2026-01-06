"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Users,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Calculator,
  Target
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
    // Guest statistics
    totalInvited?: number;
    approvedGuestCount?: number;
    acceptedInvitations?: number;
    declinedCount?: number;
    pendingCount?: number;
    // Cost per guest metrics
    costPerApprovedGuest?: number;
    costPerInvited?: number;
    budgetPerApprovedGuest?: number;
    budgetPerInvited?: number;
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

  // Main budget cards
  const budgetCards = [
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

  // Guest cost analytics cards
  const guestCostCards = [
    {
      key: "costPerApproved",
      label: isRTL ? "עלות לאורח מאושר" : "Cost per Approved",
      value: formatCurrency(stats.costPerApprovedGuest || 0),
      subLabel: stats.approvedGuestCount
        ? `${stats.approvedGuestCount} ${isRTL ? "אורחים מאושרים" : "approved guests"}`
        : isRTL ? "אין אישורים" : "No approvals yet",
      icon: UserCheck,
      iconBg: "bg-indigo-500",
      cardBg: "bg-indigo-50 dark:bg-indigo-950/40",
      borderColor: "border-indigo-200/50 dark:border-indigo-800/30",
    },
    {
      key: "costPerInvited",
      label: isRTL ? "עלות למוזמן" : "Cost per Invited",
      value: formatCurrency(stats.costPerInvited || 0),
      subLabel: stats.totalInvited
        ? `${stats.totalInvited} ${isRTL ? "מוזמנים" : "total invited"}`
        : isRTL ? "אין מוזמנים" : "No guests yet",
      icon: Calculator,
      iconBg: "bg-orange-500",
      cardBg: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-orange-200/50 dark:border-orange-800/30",
    },
    {
      key: "budgetPerApproved",
      label: isRTL ? "תקציב לאורח מאושר" : "Budget per Approved",
      value: stats.budgetPerApprovedGuest ? formatCurrency(stats.budgetPerApprovedGuest) : "-",
      subLabel: stats.totalBudget > 0 && stats.approvedGuestCount
        ? `${isRTL ? "מתוך תקציב" : "from budget"} ${formatCurrency(stats.totalBudget)}`
        : isRTL ? "הגדר תקציב" : "Set budget first",
      icon: Target,
      iconBg: "bg-teal-500",
      cardBg: "bg-teal-50 dark:bg-teal-950/40",
      borderColor: "border-teal-200/50 dark:border-teal-800/30",
    },
  ];

  const renderCard = (card: typeof budgetCards[0], index: number, baseDelay: number = 0) => (
    <motion.div
      key={card.key}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (baseDelay + index) * 0.03, duration: 0.15, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      style={{ willChange: "transform" }}
    >
      <Card
        className={cn(
          "relative overflow-hidden border transition-all duration-300 hover:shadow-md",
          card.cardBg,
          card.borderColor
        )}
      >
        <CardContent className="p-3 sm:p-5">
          <div className={cn(
            "flex items-center gap-2 sm:gap-4",
            isRTL && "flex-row-reverse"
          )}>
            {/* Icon */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-105 sm:h-11 sm:w-11",
                card.iconBg
              )}
            >
              <card.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>

            {/* Content */}
            <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
              <p className="text-[10px] font-medium text-muted-foreground truncate sm:text-sm">
                {card.label}
              </p>
              <p className="text-base font-bold tracking-tight sm:text-xl">
                {card.value}
              </p>
              <p className={cn(
                "text-[9px] text-muted-foreground/80 truncate sm:text-xs",
                card.alert && "text-amber-600 dark:text-amber-400 font-medium"
              )}>
                {card.subLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Budget Stats Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {budgetCards.map((card, index) => renderCard(card, index))}
      </div>

      {/* Guest Cost Analytics Row */}
      {(stats.totalInvited !== undefined && stats.totalInvited > 0) && (
        <div className="space-y-2">
          <h3 className={cn(
            "text-sm font-medium text-muted-foreground px-1",
            isRTL && "text-right"
          )}>
            {isRTL ? "ניתוח עלות לאורח" : "Guest Cost Analysis"}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
            {guestCostCards.map((card, index) => renderCard(card, index, budgetCards.length))}
          </div>
        </div>
      )}
    </div>
  );
}
