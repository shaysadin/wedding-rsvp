import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";
import { GuestsTableSkeleton } from "@/components/skeletons";
import { AddGuestDialog } from "@/components/guests/add-guest-dialog";
import { BulkAddGuestsDialog } from "@/components/guests/bulk-add-guests-dialog";
import { ImportGuestsDialog } from "@/components/guests/import-guests-dialog";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { EventStatsCards } from "@/components/events/event-stats-cards";
import { InvitationImageUpload } from "@/components/events/invitation-image-upload";
import { EditEventModal } from "@/components/events/edit-event-modal";
import { DuplicatePhoneWarning } from "@/components/guests/duplicate-phone-warning";
import { PageFadeIn } from "@/components/shared/page-fade-in";

// Lazy load the heavy GuestsTable component (~721 lines, ~60KB)
const GuestsTable = dynamic(
  () => import("@/components/guests/guests-table").then((mod) => mod.GuestsTable),
  {
    loading: () => <GuestsTableSkeleton />,
  }
);

interface EventPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { eventId } = await params;
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");
  const tGuests = await getTranslations("guests");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventById(eventId);

  if (result.error || !result.event) {
    notFound();
  }

  const event = result.event;

  // Calculate stats
  const stats = {
    total: event.guests.length,
    pending: event.guests.filter(g => !g.rsvp || g.rsvp.status === "PENDING").length,
    accepted: event.guests.filter(g => g.rsvp?.status === "ACCEPTED").length,
    declined: event.guests.filter(g => g.rsvp?.status === "DECLINED").length,
    totalAttending: event.guests
      .filter(g => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  // Validate filter parameter
  const validFilters = ["all", "pending", "accepted", "declined"];
  const activeFilter = filter && validFilters.includes(filter) ? filter : "all";

  // Get the first guest's slug for RSVP preview
  const firstGuestSlug = event.guests[0]?.slug || null;

  return (
    <PageFadeIn className="md:h-full">
      <DashboardHeader heading={event.title} text={event.location} />

      {/* Action Cards Grid */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
        <div className="flex gap-2 sm:gap-3">
          {/* Edit Event Modal Card */}
          <EditEventModal event={event} variant="card" />

          {/* Copy Link / View RSVP Card */}
          <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} variant="card" />

          {/* Seating Card */}
          <Link
            href={`/${locale}/dashboard/events/${event.id}/seating`}
            className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
          >
            <Icons.layoutGrid className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
              {locale === "he" ? "סידורי ישיבה" : "Seating"}
            </span>
          </Link>

          {/* Invitations Card */}
          <Link
            href={`/${locale}/dashboard/events/${event.id}/invitations`}
            className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
          >
            <Icons.mail className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
              {locale === "he" ? "הזמנות" : "Invitations"}
            </span>
          </Link>

          {/* Message Templates Card */}
          <Link
            href={`/${locale}/dashboard/events/${event.id}/messages`}
            className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
          >
            <Icons.messageSquare className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
              {locale === "he" ? "הודעות" : "Messages"}
            </span>
          </Link>

          {/* Customize RSVP Card */}
          <Link
            href={`/${locale}/dashboard/events/${event.id}/customize`}
            className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
          >
            <Icons.palette className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
              {locale === "he" ? "עיצוב" : "Design"}
            </span>
          </Link>

          {/* Voice Agent Card */}
          <Link
            href={`/${locale}/dashboard/events/${event.id}/voice-agent`}
            className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
          >
            <Icons.phone className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
              {locale === "he" ? "סוכן קולי" : "Voice"}
            </span>
          </Link>
        </div>
      </div>

      {/* Event Stats - Clickable Filters */}
      <EventStatsCards
        stats={stats}
        eventId={event.id}
        activeFilter={activeFilter}
      />

      {/* Duplicate Phone Warning */}
      <DuplicatePhoneWarning eventId={event.id} />

      {/* Guest Management - flex-1 and min-h-0 to allow table to take remaining space and scroll on desktop */}
      <div className="flex flex-col gap-3 sm:gap-4 md:min-h-0 md:flex-1 md:overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-lg font-semibold sm:text-xl">{tGuests("title")}</h2>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
            <BulkAddGuestsDialog eventId={event.id} />
            <ImportGuestsDialog eventId={event.id} />
            <AddGuestDialog eventId={event.id} />
          </div>
        </div>
        <div className="md:min-h-0 md:flex-1 md:overflow-hidden">
          <GuestsTable guests={event.guests} eventId={event.id} initialFilter={activeFilter} invitationImageUrl={event.invitationImageUrl} />
        </div>
      </div>
    </PageFadeIn>
  );
}
