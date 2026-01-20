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

// Lazy load the heavy GuestsPageTabs component
const GuestsPageTabs = dynamic(
  () => import("@/components/guests/guests-page-tabs").then((mod) => mod.GuestsPageTabs),
  {
    loading: () => <GuestsTableSkeleton />,
  }
);

interface GuestsPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string; tab?: string }>;
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
    maybe: event.guests.filter((g) => g.rsvp?.status === "MAYBE").length,
    totalAttending: event.guests
      .filter((g) => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  // Validate filter parameter
  const validFilters = ["all", "pending", "accepted", "declined", "maybe"];
  const activeFilter = filter && validFilters.includes(filter) ? filter : "all";

  return (
    <PageFadeIn className="md:h-full space-y-4">
      {/* Page Header */}
      <div className="shrink-0 space-y-4 sm:space-y-0">
        {/* Mobile layout */}
        <div className="flex flex-col gap-4 sm:hidden">
          {/* Title row with invitation */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold">{tGuests("title")}</h1>
              <p className="text-md text-muted-foreground truncate">{event.title}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
              <span className="text-[10px] text-muted-foreground">
                {locale === "he" ? "הזמנת החתונה" : "Invite"}
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <BulkAddGuestsDialog eventId={event.id} />
            <ImportGuestsDialog eventId={event.id} />
            <AddGuestDialog eventId={event.id} />
          </div>
        </div>

        {/* Desktop layout - Title + Buttons on left, Invitation on right */}
        <div className="hidden sm:flex sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{tGuests("title")}</h1>
              <p className="text-sm text-muted-foreground truncate">{event.title}</p>
            </div>
            <div className="flex gap-2">
              <BulkAddGuestsDialog eventId={event.id} />
              <ImportGuestsDialog eventId={event.id} />
              <AddGuestDialog eventId={event.id} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
            <span className="text-[10px] text-muted-foreground">
              {locale === "he" ? "הזמנה" : "Invite"}
            </span>
          </div>
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

      {/* Guest Table with Failed Messages Tab */}
      <div className="md:min-h-[500px] md:flex-1">
        <GuestsPageTabs
          guests={event.guests}
          eventId={event.id}
          initialFilter={activeFilter}
          invitationImageUrl={event.invitationImageUrl}
        />
      </div>
    </PageFadeIn>
  );
}
