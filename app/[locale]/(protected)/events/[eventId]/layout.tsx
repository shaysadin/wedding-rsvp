import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { Home } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EventProvider, EventOption } from "@/contexts/event-context";
import { EventSidebar } from "@/components/layout/event-sidebar";
import { EventMobileHeader } from "@/components/layout/event-mobile-header";
import { EventMobileBottomNav } from "@/components/layout/event-mobile-bottom-nav";
import { SearchCommand } from "@/components/dashboard/search-command";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { Button } from "@/components/ui/button";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { sidebarLinks } from "@/config/dashboard";

interface EventsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; eventId: string }>;
}

export default async function EventsLayout({ children, params }: EventsLayoutProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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
          <header className="hidden md:flex shrink-0 h-14 items-center border-b lg:h-[60px] px-4 gap-4">
            <Button variant="ghost" size="icon" asChild className="size-9 shrink-0">
              <Link href={`/${locale}/dashboard`}>
                <Home className="size-5" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </Button>
            <div className="flex-1" />
            <div className="w-72 lg:w-96">
              <SearchCommand links={sidebarLinks} fullWidth />
            </div>
            <div className="flex-1" />
            <div className="shrink-0">
              <UserAccountNav />
            </div>
          </header>

          {/* Mobile Header */}
          <EventMobileHeader
            currentEvent={currentEvent}
            events={events}
            locale={locale}
          />

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
