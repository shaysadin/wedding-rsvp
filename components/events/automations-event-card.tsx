"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, Zap, Clock, CheckCircle, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { AutomationsEventData } from "@/actions/event-selector";

interface AutomationsEventCardProps {
  event: AutomationsEventData;
  locale: string;
}

export function AutomationsEventCard({ event, locale }: AutomationsEventCardProps) {
  const t = useTranslations("automation");
  const router = useRouter();
  const isRTL = locale === "he";

  const { automationStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/automation`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Purple/Pink for automations */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

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
            <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-2 dark:from-purple-900/30 dark:to-pink-900/30 transition-transform duration-150 group-hover:scale-110">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-muted/30 rounded-lg">
          {automationStats.activeFlows === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? "אין אוטומציות פעילות" : "No active automations"}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {isRTL
                  ? `${automationStats.activeFlows} אוטומציות פעילות`
                  : `${automationStats.activeFlows} active automation${automationStats.activeFlows > 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-purple-50 p-2 dark:bg-purple-900/20">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {automationStats.activeFlows}
              </p>
            </div>
            <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">
              {isRTL ? "פעילות" : "Active"}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {automationStats.pendingExecutions}
              </p>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {isRTL ? "ממתינות" : "Pending"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {automationStats.completedExecutions}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "הושלמו" : "Completed"}
            </p>
          </div>
        </div>

        {/* Total executions indicator */}
        {automationStats.totalExecutions > 0 && (
          <div className="mt-4">
            <div className={cn(
              "flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "סה״כ הרצות" : "Total executions"}
              </span>
              <span className="font-medium">{automationStats.totalExecutions}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
