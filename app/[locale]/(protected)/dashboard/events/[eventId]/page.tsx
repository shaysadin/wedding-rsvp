import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { GuestsTable } from "@/components/guests/guests-table";
import { AddGuestDialog } from "@/components/guests/add-guest-dialog";
import { BulkAddGuestsDialog } from "@/components/guests/bulk-add-guests-dialog";
import { ImportGuestsDialog } from "@/components/guests/import-guests-dialog";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { EventStatsCards } from "@/components/events/event-stats-cards";
import { DuplicatePhoneWarning } from "@/components/guests/duplicate-phone-warning";

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
  const tSeating = await getTranslations("seating");
  const tInvitations = await getTranslations("invitations");

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

  return (
    <>
      <DashboardHeader heading={event.title} text={event.location}>
        <div className="flex flex-row flex-wrap gap-2">
          <CopyLinkButton eventId={event.id} />
          <Button variant="outline" className="text-accent-foreground shadow-md flex flex-row" asChild>
            <Link href={`/${locale}/dashboard/events/${event.id}/seating`}>
              <Icons.layoutGrid className="mr-2 h-4 w-4" />
              {tSeating("title")}
            </Link>
          </Button>
          <Button variant="outline" className="text-accent-foreground shadow-md flex flex-row" asChild>
            <Link href={`/${locale}/dashboard/events/${event.id}/invitations`}>
              <Icons.mail className="mr-2 h-4 w-4" />
              {tInvitations("title")}
            </Link>
          </Button>
          <Button variant="outline" className="text-accent-foreground shadow-md flex flex-row" asChild>
            <Link href={`/${locale}/dashboard/events/${event.id}/messages`}>
              <Icons.settings className="mr-2 h-4 w-4" />
              {t("messageTemplates")}
            </Link>
          </Button>
          <Button variant="outline" className="text-accent-foreground shadow-md flex flex-row" asChild>
            <Link href={`/${locale}/dashboard/events/${event.id}/customize`}>
              <Icons.palette className="mr-2 h-4 w-4" />
              {t("customizeRsvp")}
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      {/* Event Stats - Clickable Filters */}
      <EventStatsCards
        stats={stats}
        eventId={event.id}
        activeFilter={activeFilter}
      />

      {/* Duplicate Phone Warning */}
      <DuplicatePhoneWarning eventId={event.id} />

      {/* Guest Management */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">{tGuests("title")}</h2>
          <div className="flex flex-wrap gap-2">
            <BulkAddGuestsDialog eventId={event.id} />
            <ImportGuestsDialog eventId={event.id} />
            <AddGuestDialog eventId={event.id} />
          </div>
        </div>
        <GuestsTable guests={event.guests} eventId={event.id} initialFilter={activeFilter} />
      </div>
    </>
  );
}
