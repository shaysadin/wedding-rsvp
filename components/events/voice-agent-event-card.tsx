"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Phone, PhoneCall, CheckCircle2, Users, ChevronRight, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VoiceAgentEventData } from "@/actions/event-selector";

interface VoiceAgentEventCardProps {
  event: VoiceAgentEventData;
  locale: string;
}

export function VoiceAgentEventCard({ event, locale }: VoiceAgentEventCardProps) {
  const t = useTranslations("voiceAgent");
  const router = useRouter();
  const isRTL = locale === "he";

  const { voiceAgentStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate completion rate
  const completionRate = voiceAgentStats.callsMade > 0
    ? Math.round((voiceAgentStats.callsCompleted / voiceAgentStats.callsMade) * 100)
    : 0;

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/voice-agent`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Purple/Indigo for voice agent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

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
            <div className="rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 p-2 dark:from-purple-900/30 dark:to-indigo-900/30 transition-transform duration-150 group-hover:scale-110">
              <Phone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Status Banner */}
        <div className={cn(
          "mt-4 flex items-center gap-2 p-3 rounded-lg",
          voiceAgentStats.isEnabled
            ? "bg-emerald-50 dark:bg-emerald-900/20"
            : "bg-amber-50 dark:bg-amber-900/20"
        )}>
          <div className={cn(
            "p-1.5 rounded-full",
            voiceAgentStats.isEnabled
              ? "bg-emerald-100 dark:bg-emerald-800/30"
              : "bg-amber-100 dark:bg-amber-800/30"
          )}>
            {voiceAgentStats.isEnabled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className={cn("flex-1", isRTL && "text-right")}>
            <p className={cn(
              "text-sm font-medium",
              voiceAgentStats.isEnabled
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {voiceAgentStats.isEnabled
                ? (isRTL ? "סוכן קולי פעיל" : "Voice agent active")
                : (isRTL ? "סוכן קולי לא מופעל" : "Voice agent not enabled")}
            </p>
          </div>
          {voiceAgentStats.hasSyncedData && (
            <Badge variant="outline" className="text-[10px]">
              {isRTL ? "מסונכרן" : "Synced"}
            </Badge>
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
              <p className="text-lg font-semibold">{voiceAgentStats.guestsWithPhone}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? "עם טלפון" : "With phone"}
            </p>
          </div>
          <div className="rounded-md bg-indigo-50 p-2 dark:bg-indigo-900/20">
            <div className="flex items-center justify-center gap-1">
              <PhoneCall className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {voiceAgentStats.callsCompleted}
              </p>
            </div>
            <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
              {isRTL ? "שיחות" : "Calls"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {voiceAgentStats.rsvpFromCalls}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "אישורים" : "RSVPs"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {voiceAgentStats.callsMade > 0 && (
          <div className="mt-4">
            <div className={cn(
              "mb-1 flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "שיעור הצלחה" : "Success rate"}
              </span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick action badge */}
        {voiceAgentStats.isEnabled && voiceAgentStats.guestsWithPhone > voiceAgentStats.callsMade && (
          <div className={cn("mt-3 flex", isRTL ? "justify-start" : "justify-end")}>
            <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              {isRTL
                ? `${voiceAgentStats.guestsWithPhone - voiceAgentStats.callsMade} ממתינים לשיחה`
                : `${voiceAgentStats.guestsWithPhone - voiceAgentStats.callsMade} ready to call`}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
