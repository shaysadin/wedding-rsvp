"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Palette, CheckCircle2, Clock, Users, ChevronRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CustomizeEventData } from "@/actions/event-selector";

interface CustomizeEventCardProps {
  event: CustomizeEventData;
  locale: string;
}

export function CustomizeEventCard({ event, locale }: CustomizeEventCardProps) {
  const t = useTranslations("events");
  const router = useRouter();
  const isRTL = locale === "he";

  const { customizeStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/customize`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Orange/Amber for customize */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

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
            <div className="rounded-full bg-gradient-to-br from-orange-100 to-amber-100 p-2 dark:from-orange-900/30 dark:to-amber-900/30 transition-transform duration-150 group-hover:rotate-12">
              <Palette className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Customization Status Banner */}
        <div className={cn(
          "mt-4 flex items-center gap-2 p-3 rounded-lg",
          customizeStats.hasCustomization
            ? "bg-emerald-50 dark:bg-emerald-900/20"
            : "bg-amber-50 dark:bg-amber-900/20"
        )}>
          <div className={cn(
            "p-1.5 rounded-full",
            customizeStats.hasCustomization
              ? "bg-emerald-100 dark:bg-emerald-800/30"
              : "bg-amber-100 dark:bg-amber-800/30"
          )}>
            <Sparkles className={cn(
              "h-4 w-4",
              customizeStats.hasCustomization
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div className={cn("flex-1", isRTL && "text-right")}>
            <p className={cn(
              "text-sm font-medium",
              customizeStats.hasCustomization
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {customizeStats.hasCustomization
                ? (isRTL ? "דף RSVP מותאם אישית" : "RSVP page customized")
                : (isRTL ? "ברירת מחדל - התאם אישית!" : "Default style - customize it!")}
            </p>
          </div>
          {customizeStats.hasCustomization && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-semibold">{customizeStats.totalGuests}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? "אורחים" : "Guests"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {customizeStats.rsvpResponses}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "הגיבו" : "Responded"}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {customizeStats.pendingResponses}
              </p>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {isRTL ? "ממתינים" : "Pending"}
            </p>
          </div>
        </div>

        {/* Response rate progress bar */}
        <div className="mt-4">
          <div className={cn(
            "mb-1 flex items-center justify-between text-xs",
            isRTL && "flex-row-reverse"
          )}>
            <span className="text-muted-foreground">
              {isRTL ? "אחוז תגובות" : "Response rate"}
            </span>
            <span className="font-medium">{customizeStats.responseRate}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${customizeStats.responseRate}%` }}
            />
          </div>
        </div>

        {/* Customize CTA */}
        {!customizeStats.hasCustomization && (
          <div className={cn("mt-3 flex", isRTL ? "justify-start" : "justify-end")}>
            <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              {isRTL ? "התאם עכשיו" : "Customize now"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
