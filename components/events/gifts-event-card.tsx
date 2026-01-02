"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift, Users, CheckCircle, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { GiftsEventData } from "@/actions/event-selector";

interface GiftsEventCardProps {
  event: GiftsEventData;
  locale: string;
}

export function GiftsEventCard({ event, locale }: GiftsEventCardProps) {
  const t = useTranslations("gifts");
  const router = useRouter();
  const isRTL = locale === "he";

  const { giftStats } = event;
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
    }).format(amount);
  };

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/gifts`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Pink/Rose for gifts */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" />

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
            <div className="rounded-full bg-gradient-to-br from-pink-100 to-rose-100 p-2 dark:from-pink-900/30 dark:to-rose-900/30 transition-transform duration-150 group-hover:scale-110">
              <Gift className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-muted/30 rounded-lg">
          {!giftStats.isEnabled ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? "מתנות לא מופעל" : "Gifts not enabled"}
            </p>
          ) : giftStats.totalAmount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? "אין מתנות עדיין" : "No gifts yet"}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                {formatCurrency(giftStats.totalAmount)}
              </span>
              <span className="text-sm text-muted-foreground">
                {isRTL ? "התקבלו" : "received"}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-pink-50 p-2 dark:bg-pink-900/20">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-pink-600 dark:text-pink-400" />
              <p className="text-lg font-semibold text-pink-600 dark:text-pink-400">
                {giftStats.totalGuests}
              </p>
            </div>
            <p className="text-[10px] text-pink-600/70 dark:text-pink-400/70">
              {isRTL ? "אורחים" : "Guests"}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <Gift className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {giftStats.totalGifts}
              </p>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {isRTL ? "מתנות" : "Gifts"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {giftStats.completedGifts}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "הושלמו" : "Completed"}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-4 flex justify-center">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            giftStats.isEnabled
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              giftStats.isEnabled ? "bg-green-500" : "bg-gray-400"
            )} />
            {giftStats.isEnabled
              ? (isRTL ? "מתנות מופעל" : "Gifts enabled")
              : (isRTL ? "מתנות מושבת" : "Gifts disabled")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
