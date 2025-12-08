"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface SeatingStatsProps {
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

export function SeatingStats({ stats }: SeatingStatsProps) {
  const t = useTranslations("seating");

  const cards = [
    {
      title: t("stats.totalTables"),
      value: stats.totalTables,
      icon: Icons.layoutGrid,
      color: "text-primary",
    },
    {
      title: t("stats.totalSeats"),
      value: `${stats.capacityUsed}/${stats.totalCapacity}`,
      icon: Icons.users,
      color: "text-blue-500",
      subtitle: t("stats.capacityUsed"),
    },
    {
      title: t("stats.seatedGuests"),
      value: stats.seatedGuestsCount,
      icon: Icons.check,
      color: "text-green-500",
      subtitle: t("stats.seatedCount", { count: stats.seatedByPartySize }),
    },
    {
      title: t("stats.unseatedGuests"),
      value: stats.unseatedGuestsCount,
      icon: Icons.alertTriangle,
      color: stats.unseatedGuestsCount > 0 ? "text-amber-500" : "text-green-500",
      subtitle: t("stats.unseatedCount", { count: stats.unseatedByPartySize }),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-full p-2 bg-muted ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
