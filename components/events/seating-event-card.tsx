"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, Users, Armchair, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { SeatingEventData } from "@/actions/event-selector";

interface SeatingEventCardProps {
  event: SeatingEventData;
  locale: string;
}

export function SeatingEventCard({ event, locale }: SeatingEventCardProps) {
  const t = useTranslations("seating");
  const router = useRouter();
  const isRTL = locale === "he";

  const { seatingStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate seating progress
  const seatingProgress = seatingStats.totalGuests > 0
    ? Math.round((seatingStats.seatedGuests / seatingStats.totalGuests) * 100)
    : 0;

  // Calculate capacity usage
  const capacityUsage = seatingStats.totalCapacity > 0
    ? Math.round((seatingStats.seatedSeats / seatingStats.totalCapacity) * 100)
    : 0;

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/seating`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Purple/Blue for seating */}
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
              <LayoutGrid className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Visual Table Representation */}
        <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-muted/30 rounded-lg">
          {seatingStats.totalTables === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? "אין שולחנות עדיין" : "No tables yet"}
            </p>
          ) : (
            <>
              {/* Show up to 5 mini table icons */}
              {Array.from({ length: Math.min(seatingStats.totalTables, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/30 flex items-center justify-center"
                >
                  <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                    {i + 1}
                  </span>
                </div>
              ))}
              {seatingStats.totalTables > 5 && (
                <span className="text-sm font-medium text-muted-foreground">
                  +{seatingStats.totalTables - 5}
                </span>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-violet-50 p-2 dark:bg-violet-900/20">
            <div className="flex items-center justify-center gap-1">
              <LayoutGrid className="h-3 w-3 text-violet-600 dark:text-violet-400" />
              <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                {seatingStats.totalTables}
              </p>
            </div>
            <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70">
              {isRTL ? "שולחנות" : "Tables"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {seatingStats.seatedGuests}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "משובצים" : "Seated"}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <Armchair className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {seatingStats.unseatedGuests}
              </p>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {isRTL ? "ממתינים" : "Unseated"}
            </p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="mt-4 space-y-2">
          {/* Seating progress */}
          <div>
            <div className={cn(
              "mb-1 flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "אורחים משובצים" : "Guests seated"}
              </span>
              <span className="font-medium">{seatingProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${seatingProgress}%` }}
              />
            </div>
          </div>

          {/* Capacity usage */}
          {seatingStats.totalCapacity > 0 && (
            <div>
              <div className={cn(
                "mb-1 flex items-center justify-between text-xs",
                isRTL && "flex-row-reverse"
              )}>
                <span className="text-muted-foreground">
                  {isRTL ? "ניצול קיבולת" : "Capacity used"}
                </span>
                <span className="font-medium">
                  {seatingStats.seatedSeats}/{seatingStats.totalCapacity}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    capacityUsage > 90
                      ? "bg-gradient-to-r from-red-500 to-rose-500"
                      : "bg-gradient-to-r from-indigo-500 to-blue-500"
                  )}
                  style={{ width: `${Math.min(capacityUsage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
