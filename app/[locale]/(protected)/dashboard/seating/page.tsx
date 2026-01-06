import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getEventsForDropdown } from "@/actions/event-selector";
import { SeatingPageContent } from "@/components/seating/seating-page-content";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SeatingPageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function SeatingPage({ searchParams }: SeatingPageProps) {
  const { eventId: selectedEventId } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getEventsForDropdown();

  if (result.error || !result.events) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const events = result.events;

  // If no events, show empty state
  if (events.length === 0) {
    return (
      <PageFadeIn>
        <EmptyPlaceholder className="min-h-[400px]">
          <EmptyPlaceholder.Icon name="calendar" />
          <EmptyPlaceholder.Title>
            {locale === "he" ? "אין אירועים" : "No Events"}
          </EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            {locale === "he"
              ? "צור אירוע חדש כדי להתחיל לנהל סידורי ישיבה"
              : "Create a new event to start managing seating"}
          </EmptyPlaceholder.Description>
          <Link href={`/${locale}/dashboard/events`}>
            <Button>
              <Icons.add className="me-2 h-4 w-4" />
              {locale === "he" ? "צור אירוע" : "Create Event"}
            </Button>
          </Link>
        </EmptyPlaceholder>
      </PageFadeIn>
    );
  }

  // Select event (use first event if none selected)
  const eventId = selectedEventId && events.find(e => e.id === selectedEventId)
    ? selectedEventId
    : events[0].id;

  return (
    <SeatingPageContent
      eventId={eventId}
      events={events}
      locale={locale}
    />
  );
}
