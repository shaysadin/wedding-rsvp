"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlanTier } from "@prisma/client";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  MapPin,
  Plus,
  Send,
  MessageSquare,
  Phone,
  AlertCircle,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  UserCheck,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { AddEventModal } from "@/components/events/add-event-modal";
import { Button, Badge } from "@/components/template";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/template/ui/table";

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

export function DashboardContent({
  userName,
  events,
  stats,
  locale,
  usageData,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const tPlans = useTranslations("plans");
  const isRTL = locale === "he";
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  const getUsagePercent = (sent: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((sent / total) * 100));
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Row 1: Metric Cards (Left) + Usage Tracking (Right) */}
      <div className="col-span-12 xl:col-span-7">
        {/* Metric Cards Grid - 2x2 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          {/* Total Events */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <Calendar className="text-gray-800 size-6 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("totalEvents")}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {stats.totalEvents}
                </h4>
              </div>
              {stats.totalEvents > 0 && (
                <Badge color="success">
                  <ArrowUp className="h-3 w-3" />
                  {isRTL ? "פעיל" : "Active"}
                </Badge>
              )}
            </div>
          </div>

          {/* Total Guests */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <Users className="text-gray-800 size-6 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("totalGuests")}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {stats.totalGuests}
                </h4>
              </div>
              {stats.totalGuests > 0 && (
                <Badge color="primary">
                  <Users className="h-3 w-3" />
                  {isRTL ? "רשומים" : "Registered"}
                </Badge>
              )}
            </div>
          </div>

          {/* Confirmed Guests */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-success-50 rounded-xl dark:bg-success-500/15">
              <CheckCircle2 className="text-success-500 size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("confirmedGuests")}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {stats.totalAttending}
                </h4>
              </div>
              {stats.totalGuests > 0 && (
                <Badge color="success">
                  <ArrowUp className="h-3 w-3" />
                  {Math.round((stats.totalAccepted / stats.totalGuests) * 100)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Pending RSVPs */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-50 rounded-xl dark:bg-warning-500/15">
              <Clock className="text-warning-500 size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("pendingRsvps")}
                </span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {stats.totalPending}
                </h4>
              </div>
              {stats.totalPending > 0 && (
                <Badge color="warning">
                  <Clock className="h-3 w-3" />
                  {isRTL ? "ממתין" : "Waiting"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Tracking - Right Side of Row 1 */}
      <div className="col-span-12 xl:col-span-5">
        {usageData ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {isRTL ? "מעקב שימוש" : "Usage Tracking"}
                  </h3>
                  <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                    {isRTL ? "סטטוס השימוש החודשי שלך" : "Your monthly usage status"}
                  </p>
                </div>
                <Badge
                  color={
                    usageData.plan === "FREE"
                      ? "light"
                      : usageData.plan === "BUSINESS"
                      ? "warning"
                      : "primary"
                  }
                >
                  {tPlans(
                    usageData.plan.toLowerCase() as
                      | "free"
                      | "basic"
                      | "advanced"
                      | "premium"
                      | "business"
                  )}
                </Badge>
              </div>

              {/* Usage Progress Bars */}
              <div className="space-y-5">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-success-50 rounded-lg dark:bg-success-500/15">
                        <MessageSquare className="h-4 w-4 text-success-500" />
                      </div>
                      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        WhatsApp
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {usageData.whatsapp.remaining}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        /{usageData.whatsapp.total}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-success-500 transition-all duration-500"
                      style={{
                        width: `${getUsagePercent(usageData.whatsapp.sent, usageData.whatsapp.total)}%`,
                      }}
                    />
                  </div>
                  {usageData.whatsapp.bonus > 0 && (
                    <p className="text-theme-xs text-success-500">
                      +{usageData.whatsapp.bonus} {isRTL ? "בונוס" : "bonus"}
                    </p>
                  )}
                </div>

                {/* SMS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-brand-50 rounded-lg dark:bg-brand-500/15">
                        <Send className="h-4 w-4 text-brand-500" />
                      </div>
                      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        SMS
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {usageData.sms.remaining}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        /{usageData.sms.total}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{
                        width: `${getUsagePercent(usageData.sms.sent, usageData.sms.total)}%`,
                      }}
                    />
                  </div>
                  {usageData.sms.bonus > 0 && (
                    <p className="text-theme-xs text-brand-500">
                      +{usageData.sms.bonus} {isRTL ? "בונוס" : "bonus"}
                    </p>
                  )}
                </div>

                {/* Calls */}
                {usageData.calls && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-warning-50 rounded-lg dark:bg-warning-500/15">
                          <Phone className="h-4 w-4 text-warning-500" />
                        </div>
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {isRTL ? "שיחות" : "Voice Calls"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {usageData.calls.remaining}
                        <span className="font-normal text-gray-500 dark:text-gray-400">
                          /{usageData.calls.limit}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-warning-500 transition-all duration-500"
                        style={{
                          width: `${getUsagePercent(usageData.calls.made, usageData.calls.limit)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upgrade banner */}
              {!usageData.canSendMessages && (
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
                  <div className="flex items-center justify-center w-10 h-10 bg-warning-100 rounded-lg dark:bg-warning-500/20">
                    <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-warning-800 dark:text-warning-200">
                      {isRTL ? "שדרג כדי לשלוח הודעות" : "Upgrade to send messages"}
                    </p>
                    <p className="text-theme-xs text-warning-700 dark:text-warning-300">
                      {isRTL
                        ? "התוכנית החינמית לא כוללת הודעות"
                        : "Free plan doesn't include messages"}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" asChild>
                    <Link href={`/${locale}/dashboard/billing`}>
                      {isRTL ? "שדרג" : "Upgrade"}
                      <ArrowUpRight className="h-4 w-4 ms-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom Stats Row */}
            <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
              <div>
                <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                  {isRTL ? "מאושרים" : "Confirmed"}
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {stats.totalAccepted}
                  <ArrowUp className="h-4 w-4 text-success-500" />
                </p>
              </div>

              <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

              <div>
                <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                  {isRTL ? "ממתינים" : "Pending"}
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {stats.totalPending}
                  <Clock className="h-4 w-4 text-warning-500" />
                </p>
              </div>

              <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

              <div>
                <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                  {isRTL ? "סירבו" : "Declined"}
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {stats.totalDeclined}
                  <ArrowDown className="h-4 w-4 text-error-500" />
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Welcome Card when no usage data */
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-brand-50 rounded-2xl dark:bg-brand-500/15 mb-4">
                <Calendar className="text-brand-500 size-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
                {t("welcome")}, {userName}!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                {isRTL
                  ? "התחל ליצור את האירוע הראשון שלך ולנהל את האורחים"
                  : "Start by creating your first event and managing your guests"}
              </p>
              <Button variant="primary" onClick={() => setShowAddEventModal(true)}>
                <Plus className="h-4 w-4 me-2" />
                {t("createEvent")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Events Table - Full Width */}
      <div className="col-span-12">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {t("upcomingEvents")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? "בחר אירוע לניהול" : "Select an event to manage"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowAddEventModal(true)}>
                <Plus className="h-4 w-4 me-1.5" />
                {t("createEvent")}
              </Button>
              {events.length > 0 && (
                <Button variant="primary" size="sm" asChild>
                  <Link href={`/${locale}/events/${events[0].id}/invitations`}>
                    <Send className="h-4 w-4 me-1.5" />
                    {isRTL ? "שלח הזמנות" : "Send Invitations"}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {!events || events.length === 0 ? (
            <div className="py-12">
              <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="calendar" />
                <EmptyPlaceholder.Title>{t("noEventsYet")}</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                  {t("createFirstEvent")}
                </EmptyPlaceholder.Description>
                <Button variant="primary" onClick={() => setShowAddEventModal(true)}>
                  <Icons.add className="me-2 h-4 w-4" />
                  {t("createEvent")}
                </Button>
              </EmptyPlaceholder>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "אירוע" : "Event"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "תאריך" : "Date"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "אורחים" : "Guests"}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {isRTL ? "סטטוס" : "Status"}
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {events.slice(0, 5).map((event) => {
                    const eventDate = new Date(event.dateTime);
                    const isUpcoming = eventDate > new Date();
                    const daysUntil = Math.ceil(
                      (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <TableCell className="px-5 py-4">
                          <Link
                            href={`/${locale}/events/${event.id}`}
                            className="flex items-center gap-3"
                          >
                            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                              <span className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
                                {eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
                                  month: "short",
                                })}
                              </span>
                              <span className="text-lg font-bold text-gray-800 dark:text-white/90 leading-none">
                                {eventDate.getDate()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {event.title}
                              </p>
                              {event.venue && (
                                <span className="flex items-center gap-1 text-gray-500 text-theme-xs dark:text-gray-400">
                                  <MapPin className="h-3 w-3" />
                                  {event.venue}
                                </span>
                              )}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                          <div>
                            <p>
                              {eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-theme-xs">
                              {eventDate.toLocaleTimeString(isRTL ? "he-IL" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                                {event.stats.total}
                              </p>
                              <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                                {isRTL ? "סה״כ" : "Total"}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-success-500 text-theme-sm">
                                {event.stats.accepted}
                              </p>
                              <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                                {isRTL ? "אישרו" : "Yes"}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-warning-500 text-theme-sm">
                                {event.stats.pending}
                              </p>
                              <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                                {isRTL ? "ממתין" : "Pending"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          {isUpcoming ? (
                            daysUntil <= 7 ? (
                              <Badge color="error" size="sm">
                                {daysUntil === 0
                                  ? isRTL
                                    ? "היום!"
                                    : "Today!"
                                  : daysUntil === 1
                                  ? isRTL
                                    ? "מחר"
                                    : "Tomorrow"
                                  : isRTL
                                  ? `עוד ${daysUntil} ימים`
                                  : `${daysUntil} days`}
                              </Badge>
                            ) : (
                              <Badge color="success" size="sm">
                                {isRTL ? "קרוב" : "Upcoming"}
                              </Badge>
                            )
                          ) : (
                            <Badge color="light" size="sm">
                              {isRTL ? "עבר" : "Past"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Quick Actions (5 cols) + Tips (7 cols) - using grid subgrid pattern */}
      <div className={cn(
        "col-span-12 xl:col-span-5",
        events.length === 0 && "hidden"
      )}>
        <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            {isRTL ? "פעולות מהירות" : "Quick Actions"}
          </h3>
          {events.length > 0 && (
            <div className="space-y-3">
              <Link
                href={`/${locale}/events/${events[0].id}/guests`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
                  <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {isRTL ? "נהל אורחים" : "Manage Guests"}
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {isRTL ? "הוסף, ערוך ועדכן אורחים" : "Add, edit, and update guests"}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href={`/${locale}/events/${events[0].id}/invitations`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-brand-50 rounded-lg dark:bg-brand-500/15">
                  <Send className="h-5 w-5 text-brand-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {isRTL ? "שלח הזמנות" : "Send Invitations"}
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {isRTL ? "צור ושלח הזמנות לאורחים" : "Create and send invitations"}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href={`/${locale}/events/${events[0].id}/seating`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-success-50 rounded-lg dark:bg-success-500/15">
                  <UserCheck className="h-5 w-5 text-success-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {isRTL ? "סידורי ישיבה" : "Seating Plan"}
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {isRTL ? "תכנן את סידורי הישיבה" : "Plan your seating arrangements"}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        "col-span-12 xl:col-span-7",
        events.length === 0 && "hidden"
      )}>
        <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            {isRTL ? "טיפים לתכנון האירוע" : "Event Planning Tips"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-8 h-8 bg-brand-50 rounded-lg dark:bg-brand-500/15 shrink-0">
                <Calendar className="h-4 w-4 text-brand-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {isRTL ? "שלח הזמנות מוקדם" : "Send invites early"}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {isRTL ? "לפחות 4-6 שבועות לפני" : "At least 4-6 weeks before"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-8 h-8 bg-success-50 rounded-lg dark:bg-success-500/15 shrink-0">
                <MessageSquare className="h-4 w-4 text-success-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {isRTL ? "שלח תזכורות" : "Send reminders"}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {isRTL ? "למי שלא הגיב" : "To non-responders"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-8 h-8 bg-warning-50 rounded-lg dark:bg-warning-500/15 shrink-0">
                <Users className="h-4 w-4 text-warning-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {isRTL ? "עדכן את רשימת האורחים" : "Update guest list"}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {isRTL ? "לפני סיום הישיבה" : "Before finalizing seating"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-8 h-8 bg-error-50 rounded-lg dark:bg-error-500/15 shrink-0">
                <Phone className="h-4 w-4 text-error-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {isRTL ? "השתמש בסוכן הקולי" : "Use voice agent"}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {isRTL ? "לאישורים אוטומטיים" : "For auto confirmations"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal open={showAddEventModal} onOpenChange={setShowAddEventModal} />
    </div>
  );
}
