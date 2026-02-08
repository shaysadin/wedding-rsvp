"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  UserPlus,
  ExternalLink,
  CalendarCheck,
  LayoutGrid,
  ListTodo,
  Sparkles,
  Phone,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  PartyPopper,
  Mail,
  Palette,
  Gift,
  MessageSquare,
  CircleDot,
  Play,
  HelpCircle,
  ClipboardList,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlowingButton } from "@/components/ui/glowing-button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { EditEventModal } from "@/components/events/edit-event-modal";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { InvitationImageUpload } from "@/components/events/invitation-image-upload";

interface GuestStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  maybe: number;
  totalAttending: number;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

interface SeatingStats {
  tables: number;
  totalSeats: number;
  assignedGuests: number;
  unassignedGuests: number;
}

interface SupplierStats {
  total: number;
  totalBudget: number;
  totalPaid: number;
}

interface RecentGuest {
  id: string;
  name: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  guestCount: number;
  updatedAt: Date;
}

interface TaskItem {
  id: string;
  title: string;
  status: "BACKLOG" | "TODO" | "DOING" | "DONE";
  dueDate: Date | null;
}

interface SerializedEvent {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue: string | null;
  totalBudget: number | null;
  ownerId: string;
  workspaceId: string | null;
  description: string | null;
  notes: string | null;
  imageUrl: string | null;
  invitationImageUrl: string | null;
  invitationImagePublicId: string | null;
  smsSenderId: string | null;
  navigationCode: string | null;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rsvpConfirmedMessage: string | null;
  rsvpDeclinedMessage: string | null;
  rsvpMaybeMessage: string | null;
  rsvpMaybeReminderDelay: number;
  seatingCanvasWidth: number;
  seatingCanvasHeight: number;
  transportationEnabled: boolean;
}

interface EventDashboardContentProps {
  event: SerializedEvent;
  guestStats: GuestStats;
  taskStats: TaskStats;
  seatingStats: SeatingStats;
  supplierStats: SupplierStats;
  recentGuests: RecentGuest[];
  recentTasks: TaskItem[];
  activeAutomations: number;
  messageTemplates: number;
  firstGuestSlug: string | null;
  locale: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export function EventDashboardContent({
  event,
  guestStats,
  taskStats,
  seatingStats,
  supplierStats,
  recentGuests,
  recentTasks,
  activeAutomations,
  messageTemplates,
  firstGuestSlug,
  locale,
}: EventDashboardContentProps) {
  const isRTL = locale === "he";
  const NavArrow = isRTL ? ArrowLeft : ArrowRight;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const daysUntilEvent = Math.ceil((new Date(event.dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const guestChartData = [
    { name: isRTL ? "אישרו" : "Confirmed", value: guestStats.accepted, color: "#10b981" },
    { name: isRTL ? "ממתינים" : "Pending", value: guestStats.pending, color: "#f59e0b" },
    { name: isRTL ? "סירבו" : "Declined", value: guestStats.declined, color: "#ef4444" },
  ].filter(item => item.value > 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            {isRTL ? "אישר" : "Confirmed"}
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            {isRTL ? "סירב" : "Declined"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
            <Clock className="h-3 w-3 mr-1" />
            {isRTL ? "ממתין" : "Pending"}
          </Badge>
        );
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "DOING":
        return <Play className="h-3.5 w-3.5 text-blue-500" />;
      case "DONE":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <CircleDot className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case "DOING":
        return isRTL ? "בתהליך" : "In Progress";
      case "TODO":
        return isRTL ? "לביצוע" : "To Do";
      case "BACKLOG":
        return isRTL ? "ממתין" : "Backlog";
      default:
        return status;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return isRTL ? `לפני ${days} ימים` : `${days}d ago`;
    if (hours > 0) return isRTL ? `לפני ${hours} שעות` : `${hours}h ago`;
    if (minutes > 0) return isRTL ? `לפני ${minutes} דקות` : `${minutes}m ago`;
    return isRTL ? "עכשיו" : "Just now";
  };

  // Quick action buttons with glow colors
  const quickActions = [
    {
      label: isRTL ? "שלח הזמנות" : "Send Invitations",
      icon: Send,
      href: `/${locale}/events/${event.id}/rsvp`,
      external: false,
      disabled: false,
      glowColor: "#8b5cf6", // purple
    },
    {
      label: isRTL ? "הוסף אורח" : "Add Guest",
      icon: UserPlus,
      href: `/${locale}/events/${event.id}/guests?action=add`,
      external: false,
      disabled: false,
      glowColor: "#10b981", // green
    },
    {
      label: isRTL ? "צפה ב-RSVP" : "View RSVP",
      icon: ExternalLink,
      href: firstGuestSlug ? `/rsvp/${firstGuestSlug}` : "#",
      external: true,
      disabled: !firstGuestSlug,
      glowColor: "#06b6d4", // cyan
    },
    {
      label: isRTL ? "אשת קבלה" : "Hostess",
      icon: ClipboardList,
      href: `/${locale}/hostess/${event.id}`,
      external: true,
      disabled: false,
      glowColor: "#ec4899", // pink
    },
  ];

  // Navigation cards - neutral with subtle icon colors
  const navCards = [
    {
      title: isRTL ? "אורחים" : "Guests",
      description: isRTL ? "ניהול רשימת אורחים" : "Manage guest list",
      icon: Users,
      href: `/${locale}/events/${event.id}/guests`,
      count: guestStats.total,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: isRTL ? "סידורי ישיבה" : "Seating",
      description: isRTL ? "תכנון שולחנות" : "Table planning",
      icon: LayoutGrid,
      href: `/${locale}/events/${event.id}/seating`,
      count: seatingStats.tables,
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: isRTL ? "משימות" : "Tasks",
      description: isRTL ? "מעקב משימות" : "Task tracking",
      icon: ListTodo,
      href: `/${locale}/events/${event.id}/tasks`,
      count: taskStats.pending + taskStats.inProgress,
      countLabel: isRTL ? "פתוחות" : "open",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: isRTL ? "הזמנות" : "Invitations",
      description: isRTL ? "עיצוב ושליחה" : "Design & send",
      icon: Mail,
      href: `/${locale}/events/${event.id}/invitations`,
      count: null,
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      title: isRTL ? "אוטומציות" : "Automations",
      description: isRTL ? "תזכורות אוטומטיות" : "Auto reminders",
      icon: Sparkles,
      href: `/${locale}/events/${event.id}/automations`,
      count: activeAutomations,
      countLabel: isRTL ? "פעילות" : "active",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      title: isRTL ? "סוכן קולי" : "Voice Agent",
      description: isRTL ? "שיחות אוטומטיות" : "Auto calls",
      icon: Phone,
      href: `/${locale}/events/${event.id}/voice-agent`,
      count: null,
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: isRTL ? "הודעות" : "Messages",
      description: isRTL ? "תבניות הודעות" : "Message templates",
      icon: MessageSquare,
      href: `/${locale}/events/${event.id}/messages`,
      count: messageTemplates,
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      title: isRTL ? "עיצוב RSVP" : "Customize",
      description: isRTL ? "עיצוב דף אישור" : "RSVP page design",
      icon: Palette,
      href: `/${locale}/events/${event.id}/customize`,
      count: null,
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];

  // Filter tasks to show (in progress and todo only, limit 3)
  const activeTasks = recentTasks
    .filter(t => t.status === "DOING" || t.status === "TODO")
    .slice(0, 3);

  return (
    <motion.div
      className="space-y-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Event Header */}
      <motion.div variants={itemVariants}>
        <div className="relative rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/80 border border-gray-200/80 dark:border-gray-700/50 p-4 sm:p-6 shadow-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-pink-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-500/10 to-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex gap-4">
          

            {/* Event Info */}
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent break-words">
                    {event.title}
                  </h1>
                  {daysUntilEvent > 0 && daysUntilEvent <= 30 && (
                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 shrink-0">
                      <CalendarCheck className="h-3 w-3 mr-1" />
                      {daysUntilEvent} {isRTL ? "ימים" : "days"}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Icons.calendar className="h-4 w-4 text-rose-500" />
                    <span className="text-sm">{formatDate(event.dateTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icons.mapPin className="h-4 w-4 text-violet-500" />
                    <span className="text-sm">
                      {event.location}
                      {event.venue && <span className="font-medium"> • {event.venue}</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <EditEventModal event={event} />
                <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} />
              </div>
            </div>
              {/* Invitation Preview */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
              <span className="text-[10px] text-muted-foreground">
                {isRTL ? "הזמנת החתונה" : "Invitation"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions - 4 buttons in one line on mobile, regular size on desktop */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-3">
          {quickActions.map((action) => (
            action.disabled ? (
              <GlowingButton
                key={action.label}
                disabled
                glowColor={action.glowColor}
                className="h-auto py-2.5 px-3 sm:py-2.5 sm:px-4 opacity-50 cursor-not-allowed"
              >
                <action.icon className="h-4 w-4 shrink-0" />
                <span className="text-[12px] sm:text-sm whitespace-nowrap">{action.label}</span>
              </GlowingButton>
            ) : (
              <Link
                key={action.label}
                href={action.href}
                target={action.external ? "_blank" : undefined}
              >
                <GlowingButton
                  glowColor={action.glowColor}
                  className="w-full h-auto py-2.5 px-3 sm:py-2.5 sm:px-4"
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  <span className="text-[12px] sm:text-sm whitespace-nowrap">{action.label}</span>
                </GlowingButton>
              </Link>
            )
          ))}
        </div>
      </motion.div>

      {/* Stats Overview Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-200/50 dark:border-slate-700/30 bg-gradient-to-br from-slate-50 to-gray-100/80 dark:from-slate-900/80 dark:to-gray-900/60">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <span className="text-2xl font-bold">{guestStats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">{isRTL ? "סה״כ אורחים" : "Total Guests"}</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/50 dark:border-emerald-700/30 bg-gradient-to-br from-emerald-50 to-green-100/80 dark:from-emerald-950/80 dark:to-green-950/60">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{guestStats.totalAttending}</span>
              </div>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">{isRTL ? "מגיעים" : "Arriving"}</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/50 dark:border-amber-700/30 bg-gradient-to-br from-amber-50 to-yellow-100/80 dark:from-amber-950/80 dark:to-yellow-950/60">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{guestStats.pending}</span>
              </div>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">{isRTL ? "ממתינים" : "Pending"}</p>
            </CardContent>
          </Card>

          <Card className="border-violet-200/50 dark:border-violet-700/30 bg-gradient-to-br from-violet-50 to-purple-100/80 dark:from-violet-950/80 dark:to-purple-950/60">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{guestStats.maybe}</span>
              </div>
              <p className="text-xs text-violet-700/70 dark:text-violet-400/70">{isRTL ? "מתלבטים" : "Maybe"}</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Charts and Tasks Row */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Guests by Status - Donut Chart */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {isRTL ? "אורחים לפי סטטוס" : "Guests by Status"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center py-6">
              <div className="flex items-center gap-8 w-full">
                <div className="relative w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={guestChartData.length > 0 ? guestChartData : [{ name: "Empty", value: 1, color: "#e5e7eb" }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(guestChartData.length > 0 ? guestChartData : [{ color: "#e5e7eb" }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{guestStats.total}</span>
                    <span className="text-sm text-muted-foreground">{isRTL ? "אורחים" : "Guests"}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-500" />
                      <span className="text-base">{isRTL ? "אישרו" : "Confirmed"}</span>
                    </div>
                    <span className="text-lg font-semibold">{guestStats.accepted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-amber-500" />
                      <span className="text-base">{isRTL ? "ממתינים" : "Pending"}</span>
                    </div>
                    <span className="text-lg font-semibold">{guestStats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <span className="text-base">{isRTL ? "סירבו" : "Declined"}</span>
                    </div>
                    <span className="text-lg font-semibold">{guestStats.declined}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Tasks List */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? "משימות פעילות" : "Active Tasks"}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/${locale}/events/${event.id}/tasks`}>
                    {isRTL ? "כל המשימות" : "All Tasks"}
                    <NavArrow className="h-4 w-4 ms-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {activeTasks.length > 0 ? (
                <div className="space-y-2 flex-1">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {getTaskStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{getTaskStatusLabel(task.status)}</p>
                      </div>
                      {task.status === "DOING" && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-xs">
                          {isRTL ? "בעבודה" : "Active"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-4">
                  <CheckCircle className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
                  <p className="text-sm font-medium">{isRTL ? "אין משימות פתוחות" : "No open tasks"}</p>
                  <p className="text-xs mt-1">{isRTL ? "כל המשימות הושלמו!" : "All tasks completed!"}</p>
                </div>
              )}
              {/* Task Summary */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <span>{taskStats.completed} {isRTL ? "הושלמו" : "completed"}</span>
                <span>{taskStats.inProgress} {isRTL ? "בתהליך" : "in progress"}</span>
                <span>{taskStats.pending} {isRTL ? "ממתינים" : "pending"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Quick Navigation Grid - Clean neutral style */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-4">{isRTL ? "ניווט מהיר" : "Quick Navigation"}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "group relative flex flex-col p-4 rounded-lg border bg-card transition-all duration-200",
                "hover:shadow-md hover:border-primary/30"
              )}
            >
              {/* Icon */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                  <card.icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                <h3 className="font-medium text-sm">{card.title}</h3>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground">{card.description}</p>

              {/* Count */}
              {card.count !== null && (
                <div className="mt-auto pt-2">
                  <span className="text-lg font-semibold">{card.count}</span>
                  {card.countLabel && (
                    <span className="text-xs text-muted-foreground ms-1">{card.countLabel}</span>
                  )}
                </div>
              )}

              {/* Arrow indicator */}
              <div className="absolute top-4 end-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <NavArrow className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity Table - Moved below Quick Navigation */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{isRTL ? "פעילות אחרונה" : "Recent Activity"}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/events/${event.id}/guests`}>
                  {isRTL ? "צפה בכל" : "View All"}
                  <NavArrow className="h-4 w-4 ms-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>{isRTL ? "אורחים שעודכנו לאחרונה" : "Recently updated guests"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentGuests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-start px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? "שם האורח" : "Guest Name"}</th>
                      <th className="text-start px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? "סטטוס" : "Status"}</th>
                      <th className="text-start px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? "מס׳ אורחים" : "Guests"}</th>
                      <th className="text-start px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? "עודכן" : "Updated"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGuests.map((guest, index) => (
                      <tr
                        key={guest.id}
                        className={cn(
                          "border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors",
                          index % 2 === 0 && "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium">{guest.name}</td>
                        <td className="px-4 py-3">{getStatusBadge(guest.status)}</td>
                        <td className="px-4 py-3 text-sm tabular-nums">{guest.guestCount}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatTimeAgo(guest.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{isRTL ? "אין אורחים עדיין" : "No guests yet"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Additional Stats Row */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Seating Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-blue-500" />
                {isRTL ? "סידורי ישיבה" : "Seating Overview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "שולחנות" : "Tables"}</span>
                <span className="font-semibold">{seatingStats.tables}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "מקומות" : "Seats"}</span>
                <span className="font-semibold">{seatingStats.totalSeats}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "מוקצים" : "Assigned"}</span>
                <span className="font-semibold text-emerald-600">{seatingStats.assignedGuests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "לא מוקצים" : "Unassigned"}</span>
                <span className="font-semibold text-amber-600">{Math.max(0, seatingStats.unassignedGuests)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Budget Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {isRTL ? "תקציב וספקים" : "Budget & Suppliers"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "ספקים" : "Suppliers"}</span>
                <span className="font-semibold">{supplierStats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "תקציב כולל" : "Total Budget"}</span>
                <span className="font-semibold">₪{supplierStats.totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "שולם" : "Paid"}</span>
                <span className="font-semibold text-emerald-600">₪{supplierStats.totalPaid.toLocaleString()}</span>
              </div>
              {supplierStats.totalBudget > 0 && (
                <div className="pt-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (supplierStats.totalPaid / supplierStats.totalBudget) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {Math.round((supplierStats.totalPaid / supplierStats.totalBudget) * 100)}% {isRTL ? "שולם" : "paid"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {isRTL ? "אוטומציות" : "Automations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{activeAutomations}</span>
                </div>
                <div>
                  <p className="font-medium">{isRTL ? "אוטומציות פעילות" : "Active Automations"}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeAutomations > 0
                      ? isRTL ? "עובדות ברקע" : "Running in background"
                      : isRTL ? "אין אוטומציות פעילות" : "No active automations"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link href={`/${locale}/events/${event.id}/automations`}>
                  {isRTL ? "נהל אוטומציות" : "Manage Automations"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
