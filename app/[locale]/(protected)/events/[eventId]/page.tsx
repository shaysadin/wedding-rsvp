import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { FeatureCard, FeatureStat, FeatureProgress } from "@/components/events/feature-card";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { EditEventModal } from "@/components/events/edit-event-modal";
import { PageFadeIn } from "@/components/shared/page-fade-in";

interface EventDashboardPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDashboardPage({ params }: EventDashboardPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch event with all related data for dashboard summaries
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    include: {
      guests: {
        include: {
          rsvp: true,
          tableAssignment: true,
        },
      },
      tasks: true,
      tables: true,
      suppliers: {
        include: {
          payments: true,
        },
      },
      automationFlows: {
        where: { status: "ACTIVE" },
      },
      messageTemplates: true,
      giftPaymentSettings: true,
      _count: {
        select: {
          guests: true,
          tasks: true,
          tables: true,
          suppliers: true,
          giftPayments: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Calculate statistics
  const guestStats = {
    total: event.guests.length,
    pending: event.guests.filter((g) => !g.rsvp || g.rsvp.status === "PENDING").length,
    accepted: event.guests.filter((g) => g.rsvp?.status === "ACCEPTED").length,
    declined: event.guests.filter((g) => g.rsvp?.status === "DECLINED").length,
    totalAttending: event.guests
      .filter((g) => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  const taskStats = {
    total: event.tasks.length,
    completed: event.tasks.filter((t) => t.status === "DONE").length,
    inProgress: event.tasks.filter((t) => t.status === "DOING").length,
    pending: event.tasks.filter((t) => t.status === "TODO" || t.status === "BACKLOG").length,
  };

  const seatingStats = {
    tables: event.tables.length,
    totalSeats: event.tables.reduce((sum, t) => sum + t.capacity, 0),
    assignedGuests: event.guests.filter((g) => g.tableAssignment).length,
    unassignedGuests: guestStats.accepted - event.guests.filter((g) => g.tableAssignment).length,
  };

  const supplierStats = {
    total: event.suppliers.length,
    totalBudget: event.suppliers.reduce((sum, s) => sum + (s.agreedPrice?.toNumber() || s.estimatedCost?.toNumber() || 0), 0),
    totalPaid: event.suppliers.reduce((sum, s) => sum + s.payments.reduce((pSum, p) => pSum + p.amount.toNumber(), 0), 0),
  };

  // Get first guest slug for RSVP preview
  const firstGuestSlug = event.guests[0]?.slug || null;

  // Serialize event for client components (convert Decimal to number)
  const serializedEvent = {
    ...event,
    totalBudget: event.totalBudget?.toNumber() || null,
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isRTL = locale === "he";

  return (
    <PageFadeIn className="space-y-6 py-4">
      {/* Event Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/80 border border-gray-200/80 dark:border-gray-700/50 p-4 sm:p-6 shadow-sm">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-pink-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-500/10 to-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent break-words">
              {event.title}
            </h1>
            <div className="flex flex-col gap-1.5 mt-3 text-muted-foreground">
              <div className="flex items-center gap-2 group">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-900/30 transition-transform group-hover:scale-110">
                  <Icons.calendar className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                <span className="text-sm font-medium">{formatDate(event.dateTime)}</span>
              </div>
              <div className="flex items-start gap-2 group">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30 transition-transform group-hover:scale-110">
                  <Icons.mapPin className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span>{event.location}</span>
                  {event.venue && (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="font-medium">{event.venue}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <EditEventModal event={serializedEvent} />
            <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} />
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Guests */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-gray-100/80 dark:from-slate-900/80 dark:to-gray-900/60 border border-slate-200/50 dark:border-slate-700/30 p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-slate-500/10 hover:scale-[1.02] hover:border-slate-300/50 dark:hover:border-slate-600/50">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <div className="relative">
              <Icons.users className="h-5 w-5 text-slate-600 dark:text-slate-400 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-slate-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-200 dark:to-slate-300 bg-clip-text text-transparent">{guestStats.total}</span>
          </div>
          <p className="relative text-sm text-muted-foreground mt-1 font-medium">
            {isRTL ? "סה״כ אורחים" : "Total Guests"}
          </p>
        </div>

        {/* Confirmed */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-100/80 dark:from-emerald-950/80 dark:to-green-950/60 border border-emerald-200/50 dark:border-emerald-700/30 p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02] hover:border-emerald-300/50 dark:hover:border-emerald-600/50">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <div className="relative">
              <Icons.checkCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-emerald-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 dark:from-emerald-300 dark:to-green-400 bg-clip-text text-transparent">{guestStats.accepted}</span>
          </div>
          <p className="relative text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-1 font-medium">
            {isRTL ? "אישרו הגעה" : "Confirmed"}
          </p>
        </div>

        {/* Pending */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100/80 dark:from-amber-950/80 dark:to-yellow-950/60 border border-amber-200/50 dark:border-amber-700/30 p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.02] hover:border-amber-300/50 dark:hover:border-amber-600/50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <div className="relative">
              <Icons.clock className="h-5 w-5 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-yellow-600 dark:from-amber-300 dark:to-yellow-400 bg-clip-text text-transparent">{guestStats.pending}</span>
          </div>
          <p className="relative text-sm text-amber-700/70 dark:text-amber-400/70 mt-1 font-medium">
            {isRTL ? "ממתינים" : "Pending"}
          </p>
        </div>

        {/* Attending */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-purple-100/80 dark:from-violet-950/80 dark:to-purple-950/60 border border-violet-200/50 dark:border-violet-700/30 p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 hover:scale-[1.02] hover:border-violet-300/50 dark:hover:border-violet-600/50">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <div className="relative">
              <Icons.partyPopper className="h-5 w-5 text-violet-600 dark:text-violet-400 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-violet-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-600 dark:from-violet-300 dark:to-purple-400 bg-clip-text text-transparent">{guestStats.totalAttending}</span>
          </div>
          <p className="relative text-sm text-violet-700/70 dark:text-violet-400/70 mt-1 font-medium">
            {isRTL ? "מגיעים" : "Attending"}
          </p>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {/* Guests Card */}
        <FeatureCard
          title={t("navigation.guests")}
          icon="users"
          href={`/${locale}/events/${eventId}/guests`}
          summary={`${guestStats.total} ${isRTL ? "אורחים" : "guests"}`}
          locale={locale}
          expandedContent={
            <>
              <FeatureStat
                label={isRTL ? "אישרו הגעה" : "Confirmed"}
                value={guestStats.accepted}
                trend="up"
              />
              <FeatureStat
                label={isRTL ? "ממתינים" : "Pending"}
                value={guestStats.pending}
              />
              <FeatureStat
                label={isRTL ? "סירבו" : "Declined"}
                value={guestStats.declined}
                trend="down"
              />
              <FeatureProgress
                label={isRTL ? "אחוז תגובות" : "Response Rate"}
                value={guestStats.accepted + guestStats.declined}
                max={guestStats.total}
              />
            </>
          }
        />

        {/* Tasks Card */}
        <FeatureCard
          title={t("navigation.tasks")}
          icon="checkSquare"
          href={`/${locale}/events/${eventId}/tasks`}
          summary={`${taskStats.pending} ${isRTL ? "משימות ממתינות" : "pending tasks"}`}
          locale={locale}
          expandedContent={
            <>
              <FeatureStat
                label={isRTL ? "הושלמו" : "Completed"}
                value={taskStats.completed}
                trend="up"
              />
              <FeatureStat
                label={isRTL ? "בתהליך" : "In Progress"}
                value={taskStats.inProgress}
              />
              <FeatureStat
                label={isRTL ? "ממתינות" : "Pending"}
                value={taskStats.pending}
              />
              <FeatureProgress
                label={isRTL ? "התקדמות" : "Progress"}
                value={taskStats.completed}
                max={taskStats.total}
              />
            </>
          }
        />

        {/* Seating Card */}
        <FeatureCard
          title={t("navigation.seating")}
          icon="layoutGrid"
          href={`/${locale}/events/${eventId}/seating`}
          summary={`${seatingStats.tables} ${isRTL ? "שולחנות" : "tables"}`}
          locale={locale}
          expandedContent={
            <>
              <FeatureStat
                label={isRTL ? "סה״כ מקומות" : "Total Seats"}
                value={seatingStats.totalSeats}
              />
              <FeatureStat
                label={isRTL ? "אורחים מוקצים" : "Assigned Guests"}
                value={seatingStats.assignedGuests}
              />
              <FeatureStat
                label={isRTL ? "לא מוקצים" : "Unassigned"}
                value={Math.max(0, seatingStats.unassignedGuests)}
              />
            </>
          }
        />

        {/* Suppliers Card */}
        <FeatureCard
          title={t("navigation.suppliers")}
          icon="suppliers"
          href={`/${locale}/events/${eventId}/suppliers`}
          summary={`${supplierStats.total} ${isRTL ? "ספקים" : "suppliers"}`}
          locale={locale}
          expandedContent={
            <>
              <FeatureStat
                label={isRTL ? "תקציב כולל" : "Total Budget"}
                value={`₪${supplierStats.totalBudget.toLocaleString()}`}
              />
              <FeatureStat
                label={isRTL ? "שולם" : "Paid"}
                value={`₪${supplierStats.totalPaid.toLocaleString()}`}
                trend="up"
              />
              <FeatureProgress
                label={isRTL ? "התקדמות תשלום" : "Payment Progress"}
                value={supplierStats.totalPaid}
                max={supplierStats.totalBudget}
              />
            </>
          }
        />

        {/* Gifts Card */}
        <FeatureCard
          title={t("navigation.gifts")}
          icon="gift"
          href={`/${locale}/events/${eventId}/gifts`}
          summary={`${event._count.giftPayments} ${isRTL ? "מתנות" : "gifts"}`}
          locale={locale}
        />

        {/* Invitations Card */}
        <FeatureCard
          title={t("navigation.invitations")}
          icon="mail"
          href={`/${locale}/events/${eventId}/invitations`}
          summary={isRTL ? "שליחת הזמנות" : "Send invitations"}
          locale={locale}
        />

        {/* Messages Card */}
        <FeatureCard
          title={t("navigation.messages")}
          icon="messageSquare"
          href={`/${locale}/events/${eventId}/messages`}
          summary={`${event.messageTemplates.length} ${isRTL ? "תבניות" : "templates"}`}
          locale={locale}
        />

        {/* Automations Card */}
        <FeatureCard
          title={t("navigation.automations")}
          icon="sparkles"
          href={`/${locale}/events/${eventId}/automations`}
          summary={`${event.automationFlows.length} ${isRTL ? "אוטומציות פעילות" : "active flows"}`}
          locale={locale}
        />

        {/* Customize RSVP Card */}
        <FeatureCard
          title={t("navigation.customize")}
          icon="palette"
          href={`/${locale}/events/${eventId}/customize`}
          summary={isRTL ? "עיצוב דף האישור" : "Design RSVP page"}
          locale={locale}
        />

        {/* Voice Agent Card */}
        <FeatureCard
          title={t("navigation.voiceAgent")}
          icon="phone"
          href={`/${locale}/events/${eventId}/voice-agent`}
          summary={isRTL ? "שיחות קוליות" : "Voice calls"}
          locale={locale}
        />

        {/* RSVP Approvals Card */}
        <FeatureCard
          title={t("navigation.rsvp")}
          icon="mailCheck"
          href={`/${locale}/events/${eventId}/rsvp`}
          summary={isRTL ? "אישורי הגעה" : "RSVP responses"}
          locale={locale}
        />
      </div>
    </PageFadeIn>
  );
}
