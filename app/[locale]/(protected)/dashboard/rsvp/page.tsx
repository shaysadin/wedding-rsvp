import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEventsForDropdown } from "@/actions/event-selector";
import { RsvpPageContent } from "@/components/rsvp/rsvp-page-content";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

interface RsvpPageProps {
  searchParams: Promise<{ eventId?: string; filter?: string }>;
}

export default async function RsvpPage({ searchParams }: RsvpPageProps) {
  const { eventId: selectedEventId, filter } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("rsvp");
  const isRTL = locale === "he";

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const eventsResult = await getEventsForDropdown();

  if (eventsResult.error || !eventsResult.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{eventsResult.error}</p>
      </div>
    );
  }

  const events = eventsResult.events;

  if (events.length === 0) {
    return (
      <PageFadeIn>
        <EmptyPlaceholder className="min-h-[400px]">
          <EmptyPlaceholder.Icon name="calendar" />
          <EmptyPlaceholder.Title>
            {isRTL ? "אין אירועים" : "No Events"}
          </EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            {isRTL
              ? "צור אירוע חדש כדי להתחיל לנהל אישורי הגעה"
              : "Create a new event to start managing RSVPs"}
          </EmptyPlaceholder.Description>
          <Link href={`/${locale}/dashboard/events`}>
            <Button>
              <Icons.add className="me-2 h-4 w-4" />
              {isRTL ? "צור אירוע" : "Create Event"}
            </Button>
          </Link>
        </EmptyPlaceholder>
      </PageFadeIn>
    );
  }

  const eventId = selectedEventId && events.find(e => e.id === selectedEventId)
    ? selectedEventId
    : events[0].id;

  // Get event with guests
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      ownerId: user.id
    },
    select: {
      id: true,
      title: true,
      location: true,
      invitationImageUrl: true,
      guests: {
        include: {
          rsvp: true,
          notificationLogs: true,
          vapiCallLogs: true,
        },
      },
    },
  });

  if (!event) {
    redirect(`/${locale}/dashboard/rsvp`);
  }

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
    <RsvpPageContent
      event={event}
      events={events}
      stats={stats}
      activeFilter={activeFilter}
      locale={locale}
    />
  );
}
