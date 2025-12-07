"use client";

import Link from "next/link";
import { WeddingEvent, Guest, GuestRsvp } from "@prisma/client";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/shared/icons";

type EventWithStats = WeddingEvent & {
  guests?: (Guest & { rsvp: GuestRsvp | null })[];
  _count?: { guests: number };
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalGuestCount: number;
  };
};

interface EventCardProps {
  event: EventWithStats;
  locale: string;
}

export function EventCard({ event, locale }: EventCardProps) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const responseRate = event.stats.total > 0
    ? ((event.stats.accepted + event.stats.declined) / event.stats.total) * 100
    : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2">
          <span className="line-clamp-2">{event.title}</span>
          {event.isActive ? (
            <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
              {tc("active")}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">
              {tc("inactive")}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icons.calendar className="h-4 w-4" />
            <span>
              {new Date(event.dateTime).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icons.mapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icons.users className="h-4 w-4" />
            <span>{event.stats.total} {t("guestCount")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("rsvpStats")}</span>
            <span className="font-medium">{Math.round(responseRate)}%</span>
          </div>
          <Progress value={responseRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-green-500">{event.stats.accepted} {ts("accepted").toLowerCase()}</span>
            <span className="text-yellow-500">{event.stats.pending} {ts("pending").toLowerCase()}</span>
            <span className="text-red-500">{event.stats.declined} {ts("declined").toLowerCase()}</span>
          </div>
        </div>

        {event.stats.totalGuestCount > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{event.stats.totalGuestCount}</p>
            <p className="text-xs text-muted-foreground">{tc("total")} {tc("attending")}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/${locale}/dashboard/events/${event.id}`}>
            <Icons.users className="me-2 h-4 w-4" />
            {t("manageGuests")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/dashboard/events/${event.id}/customize`}>
            <Icons.pencil className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
