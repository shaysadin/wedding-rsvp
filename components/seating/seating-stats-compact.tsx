"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface SeatingStatsCompactProps {
  stats: {
    totalTables: number;
    totalCapacity: number;
    seatedGuestsCount: number;
    unseatedGuestsCount: number;
    seatedByPartySize: number;
    unseatedByPartySize: number;
    capacityUsed: number;
    capacityRemaining: number;
  };
}

export function SeatingStatsCompact({ stats }: SeatingStatsCompactProps) {
  const t = useTranslations("seating");

  const items = [
    {
      label: t("stats.totalTables"),
      value: stats.totalTables,
      icon: Icons.layoutGrid,
      color: "text-primary",
    },
    {
      label: t("stats.totalSeats"),
      value: `${stats.capacityUsed}/${stats.totalCapacity}`,
      icon: Icons.users,
      color: "text-blue-500",
    },
    {
      label: t("stats.seatedGuests"),
      value: `${stats.seatedGuestsCount} (${stats.seatedByPartySize})`,
      icon: Icons.check,
      color: "text-green-500",
    },
    {
      label: t("stats.unseatedGuests"),
      value: `${stats.unseatedGuestsCount} (${stats.unseatedByPartySize})`,
      icon: Icons.alertTriangle,
      color: stats.unseatedGuestsCount > 0 ? "text-amber-500" : "text-green-500",
    },
  ];

  // Calculate capacity percentage for progress bar
  const capacityPercentage = stats.totalCapacity > 0
    ? Math.round((stats.capacityUsed / stats.totalCapacity) * 100)
    : 0;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Stats Items */}
        <div className="flex items-center gap-6 flex-wrap">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <item.icon className={cn("h-4 w-4", item.color)} />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{item.value}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Capacity Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">
              {t("stats.capacityUsed")}
            </div>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  capacityPercentage > 90 ? "bg-amber-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium">{capacityPercentage}%</span>
        </div>
      </div>
    </Card>
  );
}
