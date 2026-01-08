import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SuppliersPageContent } from "@/components/suppliers/suppliers-page-content";

interface SuppliersPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SuppliersPage({ params }: SuppliersPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
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
    <SuppliersPageContent
      eventId={eventId}
      events={events}
      locale={locale}
    />
  );
}
