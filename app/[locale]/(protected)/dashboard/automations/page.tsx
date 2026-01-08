import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { getEventsForDropdown } from "@/actions/event-selector";
import { AutomationsPageContent } from "@/components/automation/automations-page-content";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

interface AutomationsPageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function AutomationsPage({ searchParams }: AutomationsPageProps) {
  const { eventId: selectedEventId } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const isRTL = locale === "he";

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
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
              ? "צור אירוע חדש כדי להגדיר אוטומציות"
              : "Create a new event to set up automations"}
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

  return (
    <AutomationsPageContent
      eventId={eventId}
      events={events}
      locale={locale}
    />
  );
}
