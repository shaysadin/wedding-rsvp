"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { PlanTier, CollaboratorRole } from "@prisma/client";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Heart,
  MapPin,
  Plus,
  Sparkles,
  Send,
  MessageSquare,
  Phone,
  AlertCircle,
  ArrowUpRight,
  LayoutGrid,
  List,
  UserCheck,
  MoreVertical,
  Archive,
  Trash2,
  Share2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { softArchiveEvent } from "@/actions/events";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AddEventModal } from "@/components/events/add-event-modal";

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
  isOwner?: boolean;
  isPlatformOwner?: boolean;
  collaboratorRole?: CollaboratorRole | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
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
  calls?: {
    made: number;
    limit: number;
    remaining: number;
  };
  canSendMessages: boolean;
}

interface DashboardContentProps {
  userName: string;
  events: EventData[];
  collaboratedEvents?: EventData[];
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
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

const floatingAnimation = {
  y: [0, -4, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

export function DashboardContent({ userName, events, collaboratedEvents = [], stats, locale, usageData }: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const tCollab = useTranslations("collaboration");
  const tPlans = useTranslations("plans");
  const isRTL = locale === "he";
  const router = useRouter();
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("dashboard-events-view") as "grid" | "list") || "grid";
    }
    return "grid";
  });

  // Combine owned events and collaborated events
  // Preserve the isOwner field from the server (important for platform owners)
  const allEvents = [
    ...events, // These already have the correct isOwner field
    ...collaboratedEvents.map(e => ({ ...e, isOwner: false })),
  ];

  // Save view mode to localStorage
  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-events-view", mode);
    }
  };

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
      shortTitle: isRTL ? "אירועים" : "Events",
      value: stats.totalEvents,
      icon: Calendar,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      glowColor: "violet",
      cardBg: "bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/40 dark:to-purple-950/20",
      borderColor: "border-violet-200/60 dark:border-violet-700/30",
      iconShadow: "shadow-violet-500/30",
    },
    {
      title: t("totalGuests"),
      shortTitle: isRTL ? "אורחים" : "Guests",
      value: stats.totalGuests,
      icon: Users,
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      glowColor: "blue",
      cardBg: "bg-gradient-to-br from-blue-50/80 to-cyan-50/50 dark:from-blue-950/40 dark:to-cyan-950/20",
      borderColor: "border-blue-200/60 dark:border-blue-700/30",
      iconShadow: "shadow-blue-500/30",
    },
    {
      title: t("pendingRsvps"),
      shortTitle: isRTL ? "ממתינים" : "Pending",
      value: stats.totalPending,
      icon: Clock,
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      glowColor: "amber",
      cardBg: "bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20",
      borderColor: "border-amber-200/60 dark:border-amber-700/30",
      iconShadow: "shadow-amber-500/30",
    },
    {
      title: t("confirmedGuests"),
      shortTitle: isRTL ? "מאושרים" : "Confirmed",
      value: stats.totalAttending,
      icon: CheckCircle2,
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
      glowColor: "emerald",
      cardBg: "bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/40 dark:to-green-950/20",
      borderColor: "border-emerald-200/60 dark:border-emerald-700/30",
      iconShadow: "shadow-emerald-500/30",
    },
  ];

  return (
    <motion.div
      className="flex flex-col gap-8 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Welcome Header with Action Buttons */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
              {t("welcome")}, {userName}
            </h1>
            <motion.div
              animate={floatingAnimation}
              className="relative"
            >
              <Sparkles className="h-6 w-6 text-amber-500" />
              <div className="absolute inset-0 blur-md bg-amber-500/30 rounded-full" />
            </motion.div>
          </div>
          <p className="text-muted-foreground">
            {isRTL ? "הנה סקירה של האירועים שלך" : "Here's an overview of your events"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setShowAddEventModal(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 me-2" />
            {t("createEvent")}
          </Button>
          {events.length > 0 && (
            <Button variant="outline" asChild className="backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all hover:-translate-y-0.5">
              <Link href={`/${locale}/events/${events[0].id}/invitations`}>
                <Send className="h-4 w-4 me-2" />
                {isRTL ? "שלח הזמנות" : "Send Invitations"}
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Grid - Always 1 row */}
      <motion.div
        className="grid grid-cols-4 gap-2 sm:gap-4"
        variants={itemVariants}
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
            style={{ willChange: "transform" }}
          >
            <Card className={cn(
              "relative overflow-hidden border backdrop-blur-sm transition-all duration-300",
              "hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20",
              stat.cardBg,
              stat.borderColor
            )}>
              {/* Subtle shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shine-effect pointer-events-none" />

              <CardContent className="px-2 py-3 sm:p-4 relative">
                <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
                  {/* Icon with glow */}
                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                        "shadow-lg",
                        stat.iconBg,
                        stat.iconShadow
                      )}
                    >
                      <stat.icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
                    </div>
                    {/* Glow effect behind icon */}
                    <div className={cn(
                      "absolute inset-0 rounded-xl blur-lg opacity-40",
                      stat.iconBg
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-center sm:text-start">
                    {/* Short title on mobile, full title on desktop */}
                    <p className="sm:hidden text-[12px] font-medium text-muted-foreground/80 truncate">
                      {stat.shortTitle}
                    </p>
                    <p className="hidden sm:block text-xs sm:text-sm font-medium text-muted-foreground/80 truncate">
                      {stat.title}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>



      {/* Events Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold">{t("upcomingEvents")}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "בחר אירוע לניהול" : "Select an event to manage"}
            </p>
          </div>
          {events && events.length > 0 && (
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 backdrop-blur-sm">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 transition-all",
                  viewMode === "grid" && "shadow-sm"
                )}
                onClick={() => handleViewModeChange("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 transition-all",
                  viewMode === "list" && "shadow-sm"
                )}
                onClick={() => handleViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {allEvents.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="calendar" />
            <EmptyPlaceholder.Title>{t("noEventsYet")}</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              {t("createFirstEvent")}
            </EmptyPlaceholder.Description>
            <Button onClick={() => setShowAddEventModal(true)}>
              <Icons.add className="me-2 h-4 w-4" />
              {t("createEvent")}
            </Button>
          </EmptyPlaceholder>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                locale={locale}
                index={index}
                isRTL={isRTL}
                onRefresh={() => router.refresh()}
                sharedLabel={tCollab("sharedWithYou")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            {allEvents.map((event, index) => (
              <EventListItem
                key={event.id}
                event={event}
                locale={locale}
                index={index}
                isRTL={isRTL}
                isLast={index === allEvents.length - 1}
                sharedLabel={tCollab("sharedWithYou")}
              />
            ))}
          </div>
        )}
      </motion.div>

            {/* Usage Tracking Section */}
      {usageData && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Header - Outside Card */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold">{isRTL ? "מעקב שימוש" : "Usage Tracking"}</h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? "סטטוס השימוש החודשי שלך" : "Your monthly usage status"}
              </p>
            </div>
            <Badge className={cn("shadow-sm", planColors[usageData.plan])}>
              {tPlans(usageData.plan.toLowerCase() as "free" | "basic" | "advanced" | "premium" | "business")}
            </Badge>
          </div>

          {/* Card with Usage Bars */}
          <Card className={cn(
            "relative overflow-hidden border backdrop-blur-sm transition-all duration-300",
            usageData?.canSendMessages === false
              ? "border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20"
              : "border-border/50 bg-gradient-to-br from-background to-muted/30"
          )}>
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl translate-y-24 -translate-x-24" />

            <CardContent className="p-4 relative">
              <div className="flex flex-col gap-4">
                {/* Usage Bars */}
                <div className={cn(
                  "grid gap-4",
                  usageData.calls ? "sm:grid-cols-3" : "sm:grid-cols-2"
                )}>
                  {/* WhatsApp Usage */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200/30 dark:border-green-800/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-green-500/10">
                          <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-medium">WhatsApp</span>
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {usageData.whatsapp.remaining}
                        <span className="text-muted-foreground font-normal ms-0.5">/{usageData.whatsapp.total}</span>
                      </span>
                    </div>
                    <Progress
                      value={getUsagePercent(usageData.whatsapp.sent, usageData.whatsapp.total)}
                      className="h-2 bg-green-100 dark:bg-green-900/30"
                    />
                    {usageData.whatsapp.bonus > 0 && (
                      <p className="text-xs text-green-600/70 dark:text-green-400/70">
                        +{usageData.whatsapp.bonus} {isRTL ? "בונוס" : "bonus"}
                      </p>
                    )}
                  </div>

                  {/* SMS Usage */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/30 dark:to-cyan-950/20 border border-blue-200/30 dark:border-blue-800/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                          <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">SMS</span>
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {usageData.sms.remaining}
                        <span className="text-muted-foreground font-normal ms-0.5">/{usageData.sms.total}</span>
                      </span>
                    </div>
                    <Progress
                      value={getUsagePercent(usageData.sms.sent, usageData.sms.total)}
                      className="h-2 bg-blue-100 dark:bg-blue-900/30"
                    />
                    {usageData.sms.bonus > 0 && (
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                        +{usageData.sms.bonus} {isRTL ? "בונוס" : "bonus"}
                      </p>
                    )}
                  </div>

                  {/* Phone Calls Usage */}
                  {usageData.calls && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/30 dark:to-violet-950/20 border border-purple-200/30 dark:border-purple-800/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-purple-500/10">
                            <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-medium">{isRTL ? "שיחות" : "Calls"}</span>
                        </span>
                        <span className="font-semibold text-purple-700 dark:text-purple-400">
                          {usageData.calls.remaining}
                          <span className="text-muted-foreground font-normal ms-0.5">/{usageData.calls.limit}</span>
                        </span>
                      </div>
                      <Progress
                        value={getUsagePercent(usageData.calls.made, usageData.calls.limit)}
                        className="h-2 bg-purple-100 dark:bg-purple-900/30"
                      />
                      <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                        {usageData.calls.made} {isRTL ? "שיחות בוצעו" : "calls made"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Upgrade Banner for Free Users */}
                {!usageData.canSendMessages && (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800/30 dark:from-amber-900/30 dark:to-orange-900/20 shadow-sm">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {isRTL ? "שדרג כדי לשלוח הודעות" : "Upgrade to send messages"}
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                        {isRTL
                          ? "התוכנית החינמית שלך לא כוללת הודעות. שדרג כדי להתחיל לשלוח הזמנות."
                          : "Your free plan doesn't include messages. Upgrade to start sending invitations."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1 shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
                      asChild
                    >
                      <Link href={`/${locale}/dashboard/billing`}>
                        {isRTL ? "שדרג" : "Upgrade"}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Add Event Modal */}
      <AddEventModal
        open={showAddEventModal}
        onOpenChange={setShowAddEventModal}
      />
    </motion.div>
  );
}

const EventCard = React.memo(function EventCard({
  event,
  locale,
  index,
  isRTL,
  onRefresh,
  sharedLabel,
}: {
  event: EventData;
  locale: string;
  index: number;
  isRTL: boolean;
  onRefresh?: () => void;
  sharedLabel?: string;
}) {
  const [isArchiving, setIsArchiving] = React.useState(false);
  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOwner = event.isOwner !== false;
  const isShared = event.isOwner === false && !event.isPlatformOwner;
  const isOtherUsersEvent = event.isOwner === false && event.isPlatformOwner === true;

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

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsArchiving(true);
    try {
      const result = await softArchiveEvent(event.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האירוע הועבר לארכיון בהצלחה" : "Event archived successfully");
        onRefresh?.();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהעברה לארכיון" : "Failed to archive event");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link href={`/${locale}/events/${event.id}`}>
        <Card className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-200",
          "bg-background hover:bg-muted/30",
          "border-2 border-border/60 hover:border-primary/50",
          "shadow-sm hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-primary/5",
          "hover:-translate-y-1"
        )}>
          {/* Top bar with badges, manage text, and actions dropdown */}
          <div className="absolute top-4 end-4 flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors z-10">
            {/* Collaborated event badge */}
            {isShared && sharedLabel && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 me-1">
                <Share2 className="h-3 w-3" />
                {sharedLabel}
              </span>
            )}
            {/* Platform owner viewing another user's event - show owner info */}
            {isOtherUsersEvent && event.owner && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 me-1">
                <Users className="h-3 w-3" />
                {event.owner.name || event.owner.email}
              </span>
            )}
            {/* My event badge for platform owners */}
            {event.isPlatformOwner && isOwner && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 me-1">
                <Heart className="h-3 w-3" />
                {isRTL ? "שלי" : "My Event"}
              </span>
            )}
            <span className="hidden sm:inline">{isRTL ? "לחץ לניהול" : "Click to manage"}</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />

            {/* Actions dropdown - show for all events when platform owner, only for owned events otherwise */}
            {(isOwner || event.isPlatformOwner) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.preventDefault()}
                    className="rounded-full p-1.5 ms-1 transition-all hover:bg-muted/80 hover:scale-110"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48 backdrop-blur-xl bg-background/95">
                  <DropdownMenuItem
                    onClick={handleArchive}
                    disabled={isArchiving}
                    className="text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400"
                  >
                    <Archive className="me-2 h-4 w-4" />
                    {isRTL ? "העבר לארכיון" : "Archive Event"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <CardContent className="p-5 relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 pe-20">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors duration-200">
                  {event.title}
                </h3>
                {event.venue && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                    <span className="truncate">{event.venue}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time - Keeping as is per request */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
              <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-background shadow-sm">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {eventDate.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short" })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {eventDate.getDate()}
                </span>
              </div>
              <div className="flex-1">
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

            {/* Stats - Clean minimal design */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-lg font-bold">{event.stats.total}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isRTL ? "אורחים" : "Guests"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {event.stats.accepted}
                  </p>
                </div>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                  {isRTL ? "מאושר" : "Confirmed"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {event.stats.pending}
                  </p>
                </div>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                  {isRTL ? "ממתין" : "Pending"}
                </p>
              </div>
            </div>

            {/* Progress bar - Clean */}
            <div className="mt-4 pt-3 border-t">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {isRTL ? "אחוז אישורים" : "Response rate"}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {acceptanceRate}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${acceptanceRate}%` }}
                  transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
});

const EventListItem = React.memo(function EventListItem({
  event,
  locale,
  index,
  isRTL,
  isLast,
  sharedLabel,
}: {
  event: EventData;
  locale: string;
  index: number;
  isRTL: boolean;
  isLast: boolean;
  sharedLabel?: string;
}) {
  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOwner = event.isOwner !== false;
  const isShared = event.isOwner === false && !event.isPlatformOwner;
  const isOtherUsersEvent = event.isOwner === false && event.isPlatformOwner === true;

  const formattedDate = eventDate.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
    >
      <Link href={`/${locale}/events/${event.id}`}>
        <div className={cn(
          "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
          !isLast && "border-b"
        )}>
          {/* Date badge */}
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-muted shrink-0">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              {eventDate.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short" })}
            </span>
            <span className="text-lg font-bold leading-none">
              {eventDate.getDate()}
            </span>
          </div>

          {/* Event info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{event.title}</h3>
              {/* Collaborated event badge */}
              {isShared && sharedLabel && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  <Share2 className="h-3 w-3" />
                  {sharedLabel}
                </span>
              )}
              {/* Platform owner viewing another user's event */}
              {isOtherUsersEvent && event.owner && (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                  <Users className="h-3 w-3" />
                  {event.owner.name || event.owner.email}
                </span>
              )}
              {/* My event badge for platform owners */}
              {event.isPlatformOwner && isOwner && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  <Heart className="h-3 w-3" />
                  {isRTL ? "שלי" : "My Event"}
                </span>
              )}
              {isUpcoming && daysUntil <= 7 && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                  daysUntil <= 3
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {daysUntil === 0
                    ? (isRTL ? "היום!" : "Today!")
                    : daysUntil === 1
                      ? (isRTL ? "מחר" : "Tomorrow")
                      : (isRTL ? `עוד ${daysUntil} ימים` : `${daysUntil}d`)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {formattedDate} {event.venue && `• ${event.venue}`}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-sm font-semibold">{event.stats.total}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? "אורחים" : "Guests"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {event.stats.accepted}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                {isRTL ? "מאושר" : "Confirmed"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {event.stats.pending}
              </p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                {isRTL ? "ממתין" : "Pending"}
              </p>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="flex sm:hidden items-center gap-2 text-xs shrink-0">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {event.stats.accepted}
            </span>
            <span className="text-muted-foreground">/</span>
            <span>{event.stats.total}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
