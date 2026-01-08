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

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl truncate">
            {event.title}
          </h1>
          <div className="flex flex-col gap-1 mt-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icons.calendar className="h-4 w-4 shrink-0" />
              <span className="text-sm">{formatDate(event.dateTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.mapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm truncate">{event.location}</span>
              {event.venue && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="text-sm truncate">{event.venue}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <EditEventModal event={serializedEvent} />
          <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} />
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Icons.users className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{guestStats.total}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "סה״כ אורחים" : "Total Guests"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Icons.checkCircle className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold">{guestStats.accepted}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "אישרו הגעה" : "Confirmed"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Icons.clock className="h-5 w-5 text-yellow-600" />
            <span className="text-2xl font-bold">{guestStats.pending}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "ממתינים" : "Pending"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Icons.partyPopper className="h-5 w-5 text-purple-600" />
            <span className="text-2xl font-bold">{guestStats.totalAttending}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "מגיעים" : "Attending"}
          </p>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
