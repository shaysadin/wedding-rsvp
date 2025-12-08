"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Send, Clock, Image, ChevronRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InvitationsEventData } from "@/actions/event-selector";

interface InvitationsEventCardProps {
  event: InvitationsEventData;
  locale: string;
}

export function InvitationsEventCard({ event, locale }: InvitationsEventCardProps) {
  const t = useTranslations("invitations");
  const router = useRouter();
  const isRTL = locale === "he";

  const { invitationStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate send progress
  const sendProgress = invitationStats.guestsWithPhone > 0
    ? Math.round((invitationStats.invitationsSent / invitationStats.guestsWithPhone) * 100)
    : 0;

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/invitations`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Pink/Rose for invitations */}
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
              <Mail className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Image Status Banner */}
        <div className={cn(
          "mt-4 flex items-center gap-2 p-3 rounded-lg",
          invitationStats.hasInvitationImage
            ? "bg-emerald-50 dark:bg-emerald-900/20"
            : "bg-amber-50 dark:bg-amber-900/20"
        )}>
          <div className={cn(
            "p-1.5 rounded-full",
            invitationStats.hasInvitationImage
              ? "bg-emerald-100 dark:bg-emerald-800/30"
              : "bg-amber-100 dark:bg-amber-800/30"
          )}>
            <Image className={cn(
              "h-4 w-4",
              invitationStats.hasInvitationImage
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div className={cn("flex-1", isRTL && "text-right")}>
            <p className={cn(
              "text-sm font-medium",
              invitationStats.hasInvitationImage
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {invitationStats.hasInvitationImage
                ? (isRTL ? "תמונת הזמנה מוכנה" : "Invitation image ready")
                : (isRTL ? "לא הועלתה תמונה" : "No image uploaded")}
            </p>
          </div>
          {invitationStats.hasInvitationImage && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-3 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-lg font-semibold">{invitationStats.totalGuests}</p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? "אורחים" : "Guests"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <Send className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {invitationStats.invitationsSent}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "נשלחו" : "Sent"}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {invitationStats.invitationsNotSent}
              </p>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {isRTL ? "ממתינים" : "Pending"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className={cn(
            "mb-1 flex items-center justify-between text-xs",
            isRTL && "flex-row-reverse"
          )}>
            <span className="text-muted-foreground">
              {isRTL ? "התקדמות שליחה" : "Send progress"}
            </span>
            <span className="font-medium">{sendProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
              style={{ width: `${sendProgress}%` }}
            />
          </div>
        </div>

        {/* Quick action badge */}
        {invitationStats.invitationsNotSent > 0 && invitationStats.hasInvitationImage && (
          <div className={cn("mt-3 flex", isRTL ? "justify-start" : "justify-end")}>
            <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {isRTL
                ? `${invitationStats.invitationsNotSent} ממתינים לשליחה`
                : `${invitationStats.invitationsNotSent} ready to send`}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
