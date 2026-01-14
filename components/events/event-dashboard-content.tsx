"use client";

import Link from "next/link";
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
  MessageSquare,
  CircleDot,
  Play,
  ArrowUp,
  MapPin,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import { EditEventModal } from "@/components/events/edit-event-modal";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { Button, Badge } from "@/components/template";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/template/ui/table";

interface GuestStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  rsvpConfirmedMessage: string | null;
  rsvpDeclinedMessage: string | null;
  rsvpMaybeMessage: string | null;
  rsvpMaybeReminderDelay: number;
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

  const daysUntilEvent = Math.ceil(
    (new Date(event.dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const guestChartData = [
    { name: isRTL ? "אישרו" : "Confirmed", value: guestStats.accepted, color: "#12b76a" },
    { name: isRTL ? "ממתינים" : "Pending", value: guestStats.pending, color: "#f79009" },
    { name: isRTL ? "סירבו" : "Declined", value: guestStats.declined, color: "#f04438" },
  ].filter((item) => item.value > 0);

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

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "DOING":
        return <Play className="h-3.5 w-3.5 text-brand-500" />;
      case "DONE":
        return <CheckCircle className="h-3.5 w-3.5 text-success-500" />;
      default:
        return <CircleDot className="h-3.5 w-3.5 text-warning-500" />;
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

  // Filter tasks to show (in progress and todo only, limit 3)
  const activeTasks = recentTasks.filter((t) => t.status === "DOING" || t.status === "TODO").slice(0, 3);

  // Navigation cards
  const navCards = [
    {
      title: isRTL ? "אורחים" : "Guests",
      description: isRTL ? "ניהול רשימת אורחים" : "Manage guest list",
      icon: Users,
      href: `/${locale}/events/${event.id}/guests`,
      count: guestStats.total,
    },
    {
      title: isRTL ? "סידורי ישיבה" : "Seating",
      description: isRTL ? "תכנון שולחנות" : "Table planning",
      icon: LayoutGrid,
      href: `/${locale}/events/${event.id}/seating`,
      count: seatingStats.tables,
    },
    {
      title: isRTL ? "משימות" : "Tasks",
      description: isRTL ? "מעקב משימות" : "Task tracking",
      icon: ListTodo,
      href: `/${locale}/events/${event.id}/tasks`,
      count: taskStats.pending + taskStats.inProgress,
      countLabel: isRTL ? "פתוחות" : "open",
    },
    {
      title: isRTL ? "הזמנות" : "Invitations",
      description: isRTL ? "עיצוב ושליחה" : "Design & send",
      icon: Mail,
      href: `/${locale}/events/${event.id}/invitations`,
    },
    {
      title: isRTL ? "אוטומציות" : "Automations",
      description: isRTL ? "תזכורות אוטומטיות" : "Auto reminders",
      icon: Sparkles,
      href: `/${locale}/events/${event.id}/automations`,
      count: activeAutomations,
      countLabel: isRTL ? "פעילות" : "active",
    },
    {
      title: isRTL ? "סוכן קולי" : "Voice Agent",
      description: isRTL ? "שיחות אוטומטיות" : "Auto calls",
      icon: Phone,
      href: `/${locale}/events/${event.id}/voice-agent`,
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Left Column - Event Header + Stats + Guest Activity */}
      <div className="col-span-12 xl:col-span-7 flex flex-col gap-4 md:gap-6">
        {/* Event Header Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
                  {event.title}
                </h1>
                {daysUntilEvent > 0 && daysUntilEvent <= 30 && (
                  <Badge color={daysUntilEvent <= 7 ? "error" : "warning"} size="sm">
                    <CalendarCheck className="h-3 w-3 me-1" />
                    {daysUntilEvent} {isRTL ? "ימים" : "days"}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  <span className="text-sm">{formatDate(event.dateTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  <span className="text-sm">
                    {event.location}
                    {event.venue && <span className="font-medium"> • {event.venue}</span>}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EditEventModal event={event} />
              <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} />
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          {/* Total Guests */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <Users className="text-gray-800 size-6 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? "סה״כ אורחים" : "Total Guests"}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {guestStats.total}
                </h4>
              </div>
              {guestStats.total > 0 && (
                <Badge color="primary">
                  <Users className="h-3 w-3" />
                  {isRTL ? "רשומים" : "Registered"}
                </Badge>
              )}
            </div>
          </div>

          {/* Confirmed */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-success-50 rounded-xl dark:bg-success-500/15">
              <CheckCircle className="text-success-500 size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? "אישרו הגעה" : "Confirmed"}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {guestStats.accepted}
                </h4>
              </div>
              {guestStats.total > 0 && (
                <Badge color="success">
                  <ArrowUp className="h-3 w-3" />
                  {Math.round((guestStats.accepted / guestStats.total) * 100)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Pending */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-50 rounded-xl dark:bg-warning-500/15">
              <Clock className="text-warning-500 size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? "ממתינים" : "Pending"}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {guestStats.pending}
                </h4>
              </div>
              {guestStats.pending > 0 && (
                <Badge color="warning">
                  <Clock className="h-3 w-3" />
                  {isRTL ? "ממתין" : "Waiting"}
                </Badge>
              )}
            </div>
          </div>

          {/* Attending */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-brand-50 rounded-xl dark:bg-brand-500/15">
              <PartyPopper className="text-brand-500 size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? "מגיעים" : "Attending"}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {guestStats.totalAttending}
                </h4>
              </div>
              {guestStats.totalAttending > 0 && (
                <Badge color="primary">
                  <PartyPopper className="h-3 w-3" />
                  {isRTL ? "אנשים" : "People"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {isRTL ? "פעילות אחרונה" : "Recent Activity"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? "אורחים שעודכנו לאחרונה" : "Recently updated guests"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/events/${event.id}/guests?action=add`}>
                  <UserPlus className="h-4 w-4 me-1.5" />
                  {isRTL ? "הוסף אורח" : "Add Guest"}
                </Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link href={`/${locale}/events/${event.id}/rsvp`}>
                  <Send className="h-4 w-4 me-1.5" />
                  {isRTL ? "שלח הזמנות" : "Send Invitations"}
                </Link>
              </Button>
            </div>
          </div>

          {recentGuests.length > 0 ? (
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "שם האורח" : "Guest Name"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "סטטוס" : "Status"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "מס׳ אורחים" : "Guests"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "עודכן" : "Updated"}
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="px-5 py-4">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {guest.name}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          color={
                            guest.status === "ACCEPTED"
                              ? "success"
                              : guest.status === "DECLINED"
                              ? "error"
                              : "warning"
                          }
                          size="sm"
                        >
                          {guest.status === "ACCEPTED" && <CheckCircle className="h-3 w-3 me-1" />}
                          {guest.status === "DECLINED" && <XCircle className="h-3 w-3 me-1" />}
                          {guest.status === "PENDING" && <Clock className="h-3 w-3 me-1" />}
                          {guest.status === "ACCEPTED"
                            ? isRTL
                              ? "אישר"
                              : "Confirmed"
                            : guest.status === "DECLINED"
                            ? isRTL
                              ? "סירב"
                              : "Declined"
                            : isRTL
                            ? "ממתין"
                            : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400 tabular-nums">
                        {guest.guestCount}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                        {formatTimeAgo(guest.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? "אין אורחים עדיין" : "No guests yet"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Chart + Tasks + Quick Navigation */}
      <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 md:gap-6">
        {/* Guests by Status Chart */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {isRTL ? "אורחים לפי סטטוס" : "Guests by Status"}
                </h3>
                <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                  {isRTL ? "התפלגות מאשרים" : "Response distribution"}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/events/${event.id}/guests`}>
                  {isRTL ? "צפה בכל" : "View All"}
                </Link>
              </Button>
            </div>

            {/* Chart */}
            <div className="flex items-center gap-6">
              <div className="relative w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        guestChartData.length > 0
                          ? guestChartData
                          : [{ name: "Empty", value: 1, color: "#e4e7ec" }]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={58}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(guestChartData.length > 0 ? guestChartData : [{ color: "#e4e7ec" }]).map(
                        (entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        )
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {guestStats.total}
                  </span>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {isRTL ? "אורחים" : "Guests"}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success-500" />
                    <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                      {isRTL ? "אישרו" : "Confirmed"}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {guestStats.accepted}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning-500" />
                    <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                      {isRTL ? "ממתינים" : "Pending"}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {guestStats.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error-500" />
                    <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                      {isRTL ? "סירבו" : "Declined"}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {guestStats.declined}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Stats Row */}
          <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                {isRTL ? "שולחנות" : "Tables"}
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {seatingStats.tables}
                <LayoutGrid className="h-4 w-4 text-brand-500" />
              </p>
            </div>

            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                {isRTL ? "משימות" : "Tasks"}
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {taskStats.pending + taskStats.inProgress}
                <ListTodo className="h-4 w-4 text-warning-500" />
              </p>
            </div>

            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                {isRTL ? "ספקים" : "Suppliers"}
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {supplierStats.total}
                <TrendingUp className="h-4 w-4 text-success-500" />
              </p>
            </div>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isRTL ? "משימות פעילות" : "Active Tasks"}
            </h3>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/events/${event.id}/tasks`}>
                {isRTL ? "כל המשימות" : "All Tasks"}
                <NavArrow className="h-4 w-4 ms-1" />
              </Link>
            </Button>
          </div>

          {activeTasks.length > 0 ? (
            <div className="space-y-3">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {getTaskStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate">
                      {task.title}
                    </p>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      {getTaskStatusLabel(task.status)}
                    </p>
                  </div>
                  {task.status === "DOING" && (
                    <Badge color="primary" size="sm">
                      {isRTL ? "בעבודה" : "Active"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-success-500 mb-3 opacity-50" />
              <p className="font-medium text-gray-800 dark:text-white/90">
                {isRTL ? "אין משימות פתוחות" : "No open tasks"}
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-1">
                {isRTL ? "כל המשימות הושלמו!" : "All tasks completed!"}
              </p>
            </div>
          )}

          {/* Task Summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-theme-xs text-gray-500 dark:text-gray-400">
            <span>
              {taskStats.completed} {isRTL ? "הושלמו" : "completed"}
            </span>
            <span>
              {taskStats.inProgress} {isRTL ? "בתהליך" : "in progress"}
            </span>
            <span>
              {taskStats.pending} {isRTL ? "ממתינים" : "pending"}
            </span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            {isRTL ? "ניווט מהיר" : "Quick Navigation"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {navCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
                  <card.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {card.title}
                  </p>
                  {card.count !== undefined && (
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      {card.count} {card.countLabel || ""}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
