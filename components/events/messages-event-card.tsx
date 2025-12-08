"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquare, Send, Bell, Users, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { MessagesEventData } from "@/actions/event-selector";

interface MessagesEventCardProps {
  event: MessagesEventData;
  locale: string;
}

export function MessagesEventCard({ event, locale }: MessagesEventCardProps) {
  const t = useTranslations("events");
  const router = useRouter();
  const isRTL = locale === "he";

  const { messageStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/messages`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Blue/Cyan for messages */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

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
            <div className="rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 p-2 dark:from-blue-900/30 dark:to-cyan-900/30 transition-transform duration-150 group-hover:scale-110">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Message Activity Visualization */}
        <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
          <div className={cn(
            "flex items-center gap-3",
            isRTL && "flex-row-reverse"
          )}>
            {/* Message bubbles visualization */}
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center border-2 border-white dark:border-gray-800">
                <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-200 dark:bg-cyan-800 flex items-center justify-center border-2 border-white dark:border-gray-800">
                <Bell className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div className={cn("flex-1", isRTL && "text-right")}>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {messageStats.totalMessagesSent > 0
                  ? (isRTL ? `${messageStats.totalMessagesSent} הודעות נשלחו` : `${messageStats.totalMessagesSent} messages sent`)
                  : (isRTL ? "אין הודעות שנשלחו" : "No messages sent yet")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-muted/30 p-2">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-semibold">{messageStats.totalGuests}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? "אורחים" : "Guests"}
            </p>
          </div>
          <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
            <div className="flex items-center justify-center gap-1">
              <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {messageStats.invitesSent}
              </p>
            </div>
            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
              {isRTL ? "הזמנות" : "Invites"}
            </p>
          </div>
          <div className="rounded-md bg-cyan-50 p-2 dark:bg-cyan-900/20">
            <div className="flex items-center justify-center gap-1">
              <Bell className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                {messageStats.remindersSent}
              </p>
            </div>
            <p className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70">
              {isRTL ? "תזכורות" : "Reminders"}
            </p>
          </div>
        </div>

        {/* Activity indicator */}
        <div className="mt-4">
          <div className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isRTL && "flex-row-reverse"
          )}>
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse" style={{ width: "60%" }} />
            </div>
            <span>
              {isRTL ? "ערוך תבניות" : "Edit templates"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
