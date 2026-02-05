import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TransportationPageContent } from "@/components/transportation/transportation-page-content";

interface TransportationPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function TransportationPage({ params }: TransportationPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Allow both owner and collaborator access
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
    select: { id: true, title: true, dateTime: true, location: true },
  });

  if (!event) {
    notFound();
  }

  // Fetch all transportation registrations for this event
  const transportationRegistrations = await prisma.transportationRegistration.findMany({
    where: {
      weddingEventId: eventId,
    },
    include: {
      guest: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          slug: true,
          transportationSlug: true,
          side: true,
          groupName: true,
        },
      },
    },
    orderBy: {
      registeredAt: "desc",
    },
  });

  const events = [{
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
  }];

  return (
    <TransportationPageContent
      eventId={eventId}
      events={events}
      locale={locale}
      transportationRegistrations={transportationRegistrations}
    />
  );
}
