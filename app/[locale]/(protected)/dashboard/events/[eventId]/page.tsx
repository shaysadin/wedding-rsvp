import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventById } from "@/actions/events";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { GuestsTable } from "@/components/guests/guests-table";
import { AddGuestDialog } from "@/components/guests/add-guest-dialog";
import { BulkAddGuestsDialog } from "@/components/guests/bulk-add-guests-dialog";
import { ImportGuestsDialog } from "@/components/guests/import-guests-dialog";
import { CopyLinkButton } from "@/components/events/copy-link-button";

interface EventPageProps {
  params: { eventId: string };
}

export default async function EventPage({ params }: EventPageProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("events");
  const tGuests = await getTranslations("guests");
  const tStatus = await getTranslations("status");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventById(params.eventId);

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

  return (
    <>
      <DashboardHeader heading={event.title} text={event.location}>
        <div className="flex flex-row gap-2">
          <CopyLinkButton eventId={event.id} />
          <Button variant="outline" className="text-accent-foreground shadow-md flex flex-row">
            <Link className="flex flex-row gap-2 justify-center items-center" href={`/${locale}/dashboard/events/${event.id}/customize`}>
              <Icons.palette className="h-4 w-4" />
              {t("customizeRsvp")}
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      {/* Event Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tGuests("guestCount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-500">
              {tStatus("pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">
              {tStatus("accepted")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">
              {tStatus("declined")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.declined}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              {t("totalAttending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttending}</div>
          </CardContent>
        </Card>
      </div>

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
        <GuestsTable guests={event.guests} eventId={event.id} />
      </div>
    </>
  );
}
