"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventStatsCardsProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalAttending: number;
  };
  eventId: string;
  activeFilter: string;
}

export function EventStatsCards({ stats, eventId, activeFilter }: EventStatsCardsProps) {
  const pathname = usePathname();
  const tGuests = useTranslations("guests");
  const tStatus = useTranslations("status");
  const tEvents = useTranslations("events");

  // Get base path without query params
  const basePath = pathname?.split("?")[0] || `/dashboard/events/${eventId}`;

  const cards = [
    {
      key: "all",
      label: tGuests("guestCount"),
      value: stats.total,
      colorClass: "text-muted-foreground",
      bgClass: "",
      activeClass: "ring-2 ring-primary ring-offset-2",
    },
    {
      key: "pending",
      label: tStatus("pending"),
      value: stats.pending,
      colorClass: "text-yellow-500",
      bgClass: "",
      activeClass: "ring-2 ring-yellow-500 ring-offset-2",
    },
    {
      key: "accepted",
      label: tStatus("accepted"),
      value: stats.accepted,
      colorClass: "text-green-500",
      bgClass: "",
      activeClass: "ring-2 ring-green-500 ring-offset-2",
    },
    {
      key: "declined",
      label: tStatus("declined"),
      value: stats.declined,
      colorClass: "text-red-500",
      bgClass: "",
      activeClass: "ring-2 ring-red-500 ring-offset-2",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.key === "all" ? basePath : `${basePath}?filter=${card.key}`}
          className="block"
        >
          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              card.bgClass,
              activeFilter === card.key && card.activeClass
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-sm font-medium", card.colorClass)}>
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        </Link>
      ))}

      {/* Total Attending - Not clickable, just informational */}
      <Card className="bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary">
            {tEvents("totalAttending")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAttending}</div>
        </CardContent>
      </Card>
    </div>
  );
}
