import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AutomationsPageContent } from "@/components/automation/automations-page-content";

interface AutomationsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AutomationsPage({ params }: AutomationsPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    select: { id: true, title: true, dateTime: true, location: true },
  });

  if (!event) {
    notFound();
  }

  const events = [{
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
  }];

  return (
    <AutomationsPageContent
      eventId={eventId}
      events={events}
      locale={locale}
    />
  );
}
