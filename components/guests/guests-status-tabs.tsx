"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/template/ui/badge";

export type RsvpStatusFilter = "all" | "pending" | "accepted" | "declined";

interface GuestsStatusTabsProps {
  selectedStatus: RsvpStatusFilter;
  onStatusChange: (status: RsvpStatusFilter) => void;
  counts: {
    all: number;
    pending: number;
    accepted: number;
    declined: number;
  };
}

export function GuestsStatusTabs({
  selectedStatus,
  onStatusChange,
  counts,
}: GuestsStatusTabsProps) {
  const t = useTranslations("guests");
  const tStatus = useTranslations("status");

  const tabs: { value: RsvpStatusFilter; label: string; count: number; badgeColor?: "warning" | "success" | "error" }[] = [
    { value: "all", label: t("allGuests"), count: counts.all },
    { value: "pending", label: tStatus("pending"), count: counts.pending, badgeColor: "warning" },
    { value: "accepted", label: tStatus("accepted"), count: counts.accepted, badgeColor: "success" },
    { value: "declined", label: tStatus("declined"), count: counts.declined, badgeColor: "error" },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onStatusChange(tab.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 font-medium rounded-md text-theme-sm transition-all whitespace-nowrap",
            "hover:text-gray-900 dark:hover:text-white",
            selectedStatus === tab.value
              ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <span className="text-sm">{tab.label}</span>
          <Badge
            size="xs"
            color={tab.badgeColor || "light"}
            variant={selectedStatus === tab.value ? "solid" : "light"}
          >
            {tab.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
