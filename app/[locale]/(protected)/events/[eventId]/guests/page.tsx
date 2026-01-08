import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
import { GuestsTableSkeleton } from "@/components/skeletons";
import { AddGuestDialog } from "@/components/guests/add-guest-dialog";
import { BulkAddGuestsDialog } from "@/components/guests/bulk-add-guests-dialog";
import { ImportGuestsDialog } from "@/components/guests/import-guests-dialog";
import { EventStatsCards } from "@/components/events/event-stats-cards";
import { InvitationImageUpload } from "@/components/events/invitation-image-upload";
import { DuplicatePhoneWarning } from "@/components/guests/duplicate-phone-warning";
import { PageFadeIn } from "@/components/shared/page-fade-in";

// Lazy load the heavy GuestsTable component
const GuestsTable = dynamic(
  () => import("@/components/guests/guests-table").then((mod) => mod.GuestsTable),
  {
    loading: () => <GuestsTableSkeleton />,
  }
);

interface GuestsPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function GuestsPage({ params, searchParams }: GuestsPageProps) {
  const { eventId } = await params;
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const tGuests = await getTranslations("guests");

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
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
    pending: event.guests.filter((g) => !g.rsvp || g.rsvp.status === "PENDING").length,
    accepted: event.guests.filter((g) => g.rsvp?.status === "ACCEPTED").length,
    declined: event.guests.filter((g) => g.rsvp?.status === "DECLINED").length,
    totalAttending: event.guests
      .filter((g) => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  // Validate filter parameter
  const validFilters = ["all", "pending", "accepted", "declined"];
  const activeFilter = filter && validFilters.includes(filter) ? filter : "all";

  return (
    <PageFadeIn className="md:h-full space-y-4">
      {/* Page Header */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{tGuests("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {event.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
          <BulkAddGuestsDialog eventId={event.id} />
          <ImportGuestsDialog eventId={event.id} />
          <AddGuestDialog eventId={event.id} />
        </div>
      </div>

      {/* Event Stats - Clickable Filters */}
      <EventStatsCards
        stats={stats}
        eventId={event.id}
        activeFilter={activeFilter}
        basePath={`/${locale}/events/${eventId}/guests`}
      />

      {/* Duplicate Phone Warning */}
      <DuplicatePhoneWarning eventId={event.id} />

      {/* Guest Table */}
      <div className="md:min-h-[500px] md:flex-1">
        <GuestsTable
          guests={event.guests}
          eventId={event.id}
          initialFilter={activeFilter}
          invitationImageUrl={event.invitationImageUrl}
        />
      </div>
    </PageFadeIn>
  );
}
