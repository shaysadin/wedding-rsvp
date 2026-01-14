import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EventProvider, EventOption } from "@/contexts/event-context";
import { EventSidebar } from "@/components/layout/event-sidebar";
import { EventMobileBottomNav } from "@/components/layout/event-mobile-bottom-nav";
import { EventMainWrapper } from "@/components/layout/event-main-wrapper";
import { EventHeader } from "@/components/layout/event-header";

interface EventsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; eventId: string }>;
}

export default async function EventsLayout({ children, params }: EventsLayoutProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch current event
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    select: {
      id: true,
      title: true,
      dateTime: true,
      location: true,
      venue: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Fetch all user events for the event switcher
  const userEvents = await prisma.weddingEvent.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      title: true,
      dateTime: true,
      location: true,
      venue: true,
    },
    orderBy: { dateTime: "asc" },
  });

  const currentEvent: EventOption = {
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
    venue: event.venue,
  };

  const events: EventOption[] = userEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateTime: e.dateTime,
    location: e.location,
    venue: e.venue,
  }));

  const isRTL = locale === "he";

  return (
    <EventProvider event={currentEvent} events={events} locale={locale}>
      <div
        className="app-shell flex w-full h-screen overflow-hidden bg-gray-50 dark:bg-gray-900"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Desktop Sidebar */}
        <EventSidebar
          currentEvent={currentEvent}
          events={events}
          locale={locale}
        />

        <EventMainWrapper isRTL={isRTL}>
          {/* Header */}
          <EventHeader locale={locale} />

          {/* Page Content */}
          <main className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6 w-full pb-[74px] md:pb-6">
            {children}
          </main>
        </EventMainWrapper>

        {/* Mobile Bottom Navigation */}
        <EventMobileBottomNav eventId={eventId} locale={locale} />
      </div>
    </EventProvider>
  );
}
