"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { GuestsTableSkeleton } from "@/components/skeletons";
import { EventStatsCards } from "@/components/events/event-stats-cards";
import { InvitationImageUpload } from "@/components/events/invitation-image-upload";
import { DuplicatePhoneWarning } from "@/components/guests/duplicate-phone-warning";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { Icons } from "@/components/shared/icons";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";

// Lazy load the heavy GuestsTable component
const GuestsTable = dynamic(
  () => import("@/components/guests/guests-table").then((mod) => mod.GuestsTable),
  {
    loading: () => <GuestsTableSkeleton />,
  }
);

interface EventWithGuests {
  id: string;
  title: string;
  location: string;
  invitationImageUrl: string | null;
  guests: any[];
}

interface RsvpStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  totalAttending: number;
}

interface RsvpPageContentProps {
  event: EventWithGuests;
  events: EventOption[];
  stats: RsvpStats;
  activeFilter: string;
  locale: string;
}

export function RsvpPageContent({
  event,
  events,
  stats,
  activeFilter,
  locale
}: RsvpPageContentProps) {
  const t = useTranslations("rsvp");
  const isRTL = locale === "he";

  return (
    <PageFadeIn className="md:h-full">
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={event.id}
          locale={locale}
          basePath={`/${locale}/dashboard/rsvp`}
        />
      </div>

      {/* Event Title */}
      <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-4 mt-6">
        <Icons.calendar className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium truncate">{event.title}</h2>
          <p className="text-sm text-muted-foreground truncate">{event.location}</p>
        </div>
        <InvitationImageUpload eventId={event.id} currentImageUrl={event.invitationImageUrl} />
      </div>

      {/* Event Stats - Clickable Filters */}
      <div className="mt-6">
        <EventStatsCards
          stats={stats}
          eventId={event.id}
          activeFilter={activeFilter}
          basePath={`/${locale}/dashboard/rsvp?eventId=${event.id}`}
        />
      </div>

      {/* Duplicate Phone Warning */}
        <DuplicatePhoneWarning eventId={event.id} />
     

      {/* Guest Management with Messaging */}
      <div className="flex flex-col gap-3 sm:gap-4 md:min-h-0 md:flex-1 mt-6">
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold sm:text-xl">
            {isRTL ? "רשימת מוזמנים" : "Guest List"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "בחר מוזמנים ושלח הודעות"
              : "Select guests and send messages"}
          </p>
        </div>
        <div className="md:min-h-[500px] md:flex-1">
          <GuestsTable
            guests={event.guests}
            eventId={event.id}
            initialFilter={activeFilter}
            invitationImageUrl={event.invitationImageUrl}
          />
        </div>
      </div>
    </PageFadeIn>
  );
}
