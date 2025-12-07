"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { PlanTier } from "@prisma/client";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Heart,
  MapPin,
  Plus,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Phone,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface EventData {
  id: string;
  title: string;
  dateTime: Date;
  venue: string | null;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalGuestCount: number;
  };
}

interface UsageData {
  plan: PlanTier;
  whatsapp: {
    sent: number;
    limit: number;
    bonus: number;
    total: number;
    remaining: number;
  };
  sms: {
    sent: number;
    limit: number;
    bonus: number;
    total: number;
    remaining: number;
  };
  canSendMessages: boolean;
}

interface DashboardContentProps {
  userName: string;
  events: EventData[];
  stats: {
    totalEvents: number;
    totalGuests: number;
    totalPending: number;
    totalAccepted: number;
    totalDeclined: number;
    totalAttending: number;
  };
  locale: string;
  usageData?: UsageData;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

export function DashboardContent({ userName, events, stats, locale, usageData }: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const tPlans = useTranslations("plans");
  const isRTL = locale === "he";

  const getUsagePercent = (sent: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((sent / total) * 100));
  };

  const planColors: Record<PlanTier, string> = {
    FREE: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    BASIC: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    ADVANCED: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    PREMIUM: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    BUSINESS: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  const statCards = [
    {
      title: t("totalEvents"),
      value: stats.totalEvents,
      icon: Calendar,
      iconBg: "bg-violet-500",
      cardBg: "bg-violet-50 dark:bg-violet-950/40",
      borderColor: "border-violet-200/50 dark:border-violet-800/30",
    },
    {
      title: t("totalGuests"),
      value: stats.totalGuests,
      icon: Users,
      iconBg: "bg-blue-500",
      cardBg: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200/50 dark:border-blue-800/30",
    },
    {
      title: t("pendingRsvps"),
      value: stats.totalPending,
      icon: Clock,
      iconBg: "bg-amber-500",
      cardBg: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200/50 dark:border-amber-800/30",
    },
    {
      title: t("confirmedGuests"),
      value: stats.totalAttending,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500",
      cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
    },
  ];

  return (
    <motion.div
      className="flex h-full flex-col gap-6 overflow-y-auto pb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("welcome")}, {userName}
          <span className="ms-2 inline-block">
            <Sparkles className="h-6 w-6 text-amber-500" />
          </span>
        </h1>
        <p className="text-muted-foreground">
          {isRTL ? "הנה סקירה של האירועים שלך" : "Here's an overview of your events"}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={itemVariants}
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.15, ease: "easeOut" }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            style={{ willChange: "transform" }}
          >
            <Card className={cn(
              "relative overflow-hidden border transition-all duration-300 hover:shadow-md",
              stat.cardBg,
              stat.borderColor
            )}>
              <CardContent className="p-5">
                <div className={cn(
                  "flex items-center gap-4",
                  isRTL && "flex-row-reverse"
                )}>
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-105",
                      stat.iconBg
                    )}
                  >
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Messaging Quota Card */}
      {usageData && (
        <motion.div variants={itemVariants}>
          <Card className={cn(
            "relative overflow-hidden border transition-all duration-300",
            usageData?.canSendMessages === false
              ? "border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20"
              : "border-border/50"
          )}>
            <CardContent className="p-5">
              <div className={cn("flex flex-col gap-4", isRTL && "text-right")}>
                {/* Header */}
                <div className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row"
                )}>
                  <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                    <div>
                      <h3 className="font-semibold">
                        {isRTL ? "מכסת הודעות" : "Message Quota"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? "סטטוס השימוש החודשי שלך" : "Your monthly usage status"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                  </div>
                  <Badge className={planColors[usageData.plan]}>
                    {tPlans(usageData.plan.toLowerCase() as "free" | "basic" | "advanced" | "premium" | "business")}
                  </Badge>
                </div>

                {/* Usage Bars */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* WhatsApp Usage */}
                  <div className="space-y-2">
                    <div className={cn(
                      "flex items-center justify-between text-sm",
                      isRTL && "flex-row-reverse"
                    )}>
                      <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        WhatsApp
                      </span>
                      <span className="font-medium">
                        {usageData.whatsapp.remaining}/{usageData.whatsapp.total}
                        <span className="text-muted-foreground ms-1">
                          {isRTL ? "נותרו" : "left"}
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={getUsagePercent(usageData.whatsapp.sent, usageData.whatsapp.total)}
                      className="h-2"
                    />
                    {usageData.whatsapp.bonus > 0 && (
                      <p className="text-xs text-muted-foreground">
                        (+{usageData.whatsapp.bonus} {isRTL ? "בונוס" : "bonus"})
                      </p>
                    )}
                  </div>

                  {/* SMS Usage */}
                  <div className="space-y-2">
                    <div className={cn(
                      "flex items-center justify-between text-sm",
                      isRTL && "flex-row-reverse"
                    )}>
                      <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Phone className="h-4 w-4 text-blue-500" />
                        SMS
                      </span>
                      <span className="font-medium">
                        {usageData.sms.remaining}/{usageData.sms.total}
                        <span className="text-muted-foreground ms-1">
                          {isRTL ? "נותרו" : "left"}
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={getUsagePercent(usageData.sms.sent, usageData.sms.total)}
                      className="h-2"
                    />
                    {usageData.sms.bonus > 0 && (
                      <p className="text-xs text-muted-foreground">
                        (+{usageData.sms.bonus} {isRTL ? "בונוס" : "bonus"})
                      </p>
                    )}
                  </div>
                </div>

                {/* Upgrade Banner for Free Users */}
                {!usageData.canSendMessages && (
                  <div className={cn(
                    "flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/30",
                    isRTL && "flex-row-reverse"
                  )}>
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className={cn("flex-1", isRTL && "text-right")}>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {isRTL ? "שדרג כדי לשלוח הודעות" : "Upgrade to send messages"}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {isRTL
                          ? "התוכנית החינמית שלך לא כוללת הודעות. שדרג כדי להתחיל לשלוח הזמנות."
                          : "Your free plan doesn't include messages. Upgrade to start sending invitations."}
                      </p>
                    </div>
                    <Button size="sm" className="gap-1 shrink-0">
                      {isRTL ? "שדרג" : "Upgrade"}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions - Card Style */}
      <motion.div variants={itemVariants}>
        <div className={cn(
          "grid gap-4 sm:grid-cols-2",
          isRTL && "direction-rtl"
        )}>
          {/* Create Event Card */}
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            style={{ willChange: "transform" }}
          >
            <Link href={`/${locale}/dashboard/events/new`}>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:border-border hover:shadow-lg">
                <div className={cn(
                  "flex items-center gap-4",
                  isRTL && "flex-row-reverse"
                )}>
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-105">
                    <Plus className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <h3 className="font-semibold text-foreground">
                      {t("createEvent")}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {isRTL ? "התחל לתכנן את החתונה שלך" : "Start planning your wedding"}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className={cn(
                    "h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-foreground",
                    isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                  )} />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Send Invitations Card */}
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            style={{ willChange: "transform" }}
          >
            <Link href={`/${locale}/dashboard/events`}>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:border-border hover:shadow-lg">
                <div className={cn(
                  "flex items-center gap-4",
                  isRTL && "flex-row-reverse"
                )}>
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-transform duration-300 group-hover:scale-105">
                    <Send className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <h3 className="font-semibold text-foreground">
                      {isRTL ? "שלח הזמנות" : "Send Invitations"}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {isRTL ? "הזמן את האורחים שלך" : "Invite your guests"}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className={cn(
                    "h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-foreground",
                    isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                  )} />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Events Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className={cn(
          "flex items-center justify-between",
          isRTL && "flex-row"
        )}>
          <h2 className="text-lg font-semibold">{t("upcomingEvents")}</h2>
          {events.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href={`/${locale}/dashboard/events`}>
                {isRTL ? "הצג הכל" : "View all"}
                <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
              </Link>
            </Button>
          )}
        </div>

        {!events || events.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="calendar" />
            <EmptyPlaceholder.Title>{t("noEventsYet")}</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              {t("createFirstEvent")}
            </EmptyPlaceholder.Description>
            <Button asChild>
              <Link href={`/${locale}/dashboard/events/new`}>
                <Icons.add className="me-2 h-4 w-4" />
                {t("createEvent")}
              </Link>
            </Button>
          </EmptyPlaceholder>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 6).map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                locale={locale}
                index={index}
                isRTL={isRTL}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const EventCard = React.memo(function EventCard({
  event,
  locale,
  index,
  isRTL
}: {
  event: EventData;
  locale: string;
  index: number;
  isRTL: boolean;
}) {
  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = eventDate.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formattedTime = eventDate.toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const acceptanceRate = event.stats.total > 0
    ? Math.round((event.stats.accepted / event.stats.total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      whileHover={{ y: -3, transition: { duration: 0.1 } }}
      style={{ willChange: "transform" }}
    >
      <Link href={`/${locale}/dashboard/events/${event.id}`}>
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
          {/* Decorative top gradient */}
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
                {event.venue && (
                  <p className={cn(
                    "mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate",
                    isRTL && "flex-row-reverse justify-end"
                  )}>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <div className="rounded-full bg-gradient-to-br from-pink-100 to-rose-100 p-2 dark:from-pink-900/30 dark:to-rose-900/30 transition-transform duration-150 hover:rotate-12">
                  <Heart className="h-4 w-4 text-rose-500" />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className={cn(
              "mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5",
              isRTL && "flex-row-reverse"
            )}>
              <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-background shadow-sm">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {eventDate.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short" })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {eventDate.getDate()}
                </span>
              </div>
              <div className={cn("flex-1", isRTL && "text-right")}>
                <p className="text-sm font-medium">{formattedDate}</p>
                <p className="text-xs text-muted-foreground">{formattedTime}</p>
              </div>
              {isUpcoming && daysUntil <= 30 && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  daysUntil <= 7
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {daysUntil === 0
                    ? (isRTL ? "היום!" : "Today!")
                    : daysUntil === 1
                      ? (isRTL ? "מחר" : "Tomorrow")
                      : (isRTL ? `עוד ${daysUntil} ימים` : `${daysUntil} days`)}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className={cn(
              "mt-4 grid grid-cols-3 gap-2 text-center",
              isRTL && "direction-rtl"
            )}>
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-lg font-semibold">{event.stats.total}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isRTL ? "אורחים" : "Guests"}
                </p>
              </div>
              <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {event.stats.accepted}
                </p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                  {isRTL ? "מאושר" : "Confirmed"}
                </p>
              </div>
              <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {event.stats.pending}
                </p>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                  {isRTL ? "ממתין" : "Pending"}
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
                  {isRTL ? "אחוז אישורים" : "Response rate"}
                </span>
                <span className="font-medium">{acceptanceRate}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${acceptanceRate}%` }}
                  transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
});
