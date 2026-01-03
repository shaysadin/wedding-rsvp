import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
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

  // Shared card styles with glow effect
  const cardClassName = "group relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-1.5 text-center transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] sm:h-16 sm:w-16 sm:gap-1 sm:p-2";

  return (
    <PageFadeIn className="md:h-full">
      {/* Header with Title and Action Cards on same row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title Section */}
        <div className="min-w-0 shrink-0">
          <h1 className="font-heading text-xl font-semibold sm:text-2xl whitespace-nowrap overflow-hidden text-ellipsis">
            {event.title}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base whitespace-nowrap overflow-hidden text-ellipsis">
            {event.location}
          </p>
        </div>

        {/* Action Cards - Scrollable on mobile */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex gap-2">
            <EditEventModal event={event} variant="card" />
            <CopyLinkButton eventId={event.id} firstGuestSlug={firstGuestSlug} variant="card" />

            <Link href={`/${locale}/dashboard/events/${event.id}/seating`} className={cardClassName}>
              <Icons.layoutGrid className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "ישיבה" : "Seating"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/invitations`} className={cardClassName}>
              <Icons.mail className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "הזמנות" : "Invites"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/messages`} className={cardClassName}>
              <Icons.messageSquare className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "הודעות" : "Messages"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/customize`} className={cardClassName}>
              <Icons.palette className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "עיצוב" : "Design"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/voice-agent`} className={cardClassName}>
              <Icons.phone className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "קולי" : "Voice"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/automation`} className={cardClassName}>
              <Icons.sparkles className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "אוטומציות" : "Automations"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/pdf-invitations`} className={cardClassName}>
              <Icons.fileText className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "הזמנות" : "Invitations"}
              </span>
            </Link>

            <Link href={`/${locale}/dashboard/events/${event.id}/gifts`} className={cardClassName}>
              <Icons.gift className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
              <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
                {locale === "he" ? "מתנות" : "Gifts"}
              </span>
            </Link>
          </div>
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
        <div className="md:min-h-[500px] md:flex-1 md:overflow-hidden">
          <GuestsTable guests={event.guests} eventId={event.id} initialFilter={activeFilter} invitationImageUrl={event.invitationImageUrl} />
        </div>
      </div>
    </PageFadeIn>
  );
}
