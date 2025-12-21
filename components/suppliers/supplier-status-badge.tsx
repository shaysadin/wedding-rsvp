"use client";

import { SupplierStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  SupplierStatus,
  { label: string; labelHe: string; color: string }
> = {
  INQUIRY: {
    label: "Inquiry",
    labelHe: "פנייה",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
  },
  QUOTE_RECEIVED: {
    label: "Quote Received",
    labelHe: "קיבלנו הצעה",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
  NEGOTIATING: {
    label: "Negotiating",
    labelHe: "במשא ומתן",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  },
  BOOKED: {
    label: "Booked",
    labelHe: "הוזמן",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
  },
  DEPOSIT_PAID: {
    label: "Deposit Paid",
    labelHe: "שולמה מקדמה",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    labelHe: "מאושר",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  COMPLETED: {
    label: "Completed",
    labelHe: "הושלם",
    color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelled",
    labelHe: "בוטל",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  },
};

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
  locale?: string;
}

export function SupplierStatusBadge({
  status,
  locale = "he",
}: SupplierStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={`${config.color} border-0`}>
      {locale === "he" ? config.labelHe : config.label}
    </Badge>
  );
}

export function getStatusLabel(status: SupplierStatus, locale: string = "he") {
  return locale === "he" ? statusConfig[status].labelHe : statusConfig[status].label;
}

export function getStatusOptions(locale: string = "he") {
  return Object.entries(statusConfig).map(([value, config]) => ({
    value: value as SupplierStatus,
    label: locale === "he" ? config.labelHe : config.label,
  }));
}

export { statusConfig };
