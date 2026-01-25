import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { RsvpPageContent } from "@/components/rsvp/rsvp-page-content";

interface RsvpPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function RsvpPage({ params, searchParams }: RsvpPageProps) {
  const { eventId } = await params;
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Get event with guests - allow owner and collaborator access
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      isArchived: false,
      OR: [
        { ownerId: user.id },
        {
          collaborators: {
            some: {
              userId: user.id,
              acceptedAt: { not: null },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      location: true,
      dateTime: true,
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
    notFound();
  }

  // Calculate stats
  const stats = {
    total: event.guests.length,
    pending: event.guests.filter(g => !g.rsvp || g.rsvp.status === "PENDING").length,
    accepted: event.guests.filter(g => g.rsvp?.status === "ACCEPTED").length,
    declined: event.guests.filter(g => g.rsvp?.status === "DECLINED").length,
    maybe: event.guests.filter(g => g.rsvp?.status === "MAYBE").length,
    totalAttending: event.guests
      .filter(g => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  // Validate filter parameter
  const validFilters = ["all", "pending", "accepted", "declined", "maybe"];
  const activeFilter = filter && validFilters.includes(filter) ? filter : "all";

  // Build events array for the component
  const events = [{
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
  }];

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
