import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EventProvider, EventOption } from "@/contexts/event-context";
import { EventSidebar, MobileSheetEventSidebar } from "@/components/layout/event-sidebar";
import { EventMobileHeader } from "@/components/layout/event-mobile-header";
import { EventMobileBottomNav } from "@/components/layout/event-mobile-bottom-nav";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export const dynamic = "force-dynamic";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch the specific event with ownership check
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      ownerId: user.id
    },
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

  // Fetch all user's events for the switcher
  const allEvents = await prisma.weddingEvent.findMany({
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

  const events: EventOption[] = allEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateTime: e.dateTime,
    location: e.location,
    venue: e.venue,
  }));

  return (
    <EventProvider event={currentEvent} events={events} locale={locale}>
      <div className="fixed inset-0 flex w-full overflow-hidden bg-sidebar">
        {/* Desktop Sidebar */}
        <EventSidebar
          currentEvent={currentEvent}
          events={events}
          locale={locale}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-xl md:border bg-background md:shadow-md md:p-2 md:m-3">
          {/* Desktop Header */}
          <header className="hidden shrink-0 md:flex h-14 justify-between items-center border-b lg:h-[60px] pe-3 ps-3">
            <MaxWidthWrapper className="flex justify-between w-full items-center gap-x-3 px-0">
              <MobileSheetEventSidebar
                currentEvent={currentEvent}
                events={events}
                locale={locale}
              />
              <div className="flex-1" />
              <div className="flex items-center">
                <UserAccountNav />
              </div>
            </MaxWidthWrapper>
          </header>

          {/* Mobile Header */}
          <EventMobileHeader
            currentEvent={currentEvent}
            events={events}
            locale={locale}
          />

          {/* Main Content */}
          <main className="flex min-h-0 flex-1 flex-col overflow-auto md:overflow-hidden">
            <MaxWidthWrapper className="flex w-full min-h-0 flex-1 pb-[74px] md:pb-0 flex-col gap-4 lg:gap-6">
              {children}
            </MaxWidthWrapper>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <EventMobileBottomNav eventId={eventId} locale={locale} />
      </div>
    </EventProvider>
  );
}
