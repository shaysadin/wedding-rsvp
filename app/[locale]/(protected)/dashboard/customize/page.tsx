import dynamic from "next/dynamic";
import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { getEventsForDropdown } from "@/actions/event-selector";
import { getRsvpPageSettings, getTemplates } from "@/actions/rsvp-settings";
import { RsvpCustomizerSkeleton } from "@/components/skeletons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { EventDropdownSelector } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

// Lazy load the heavy RsvpCustomizer component
const RsvpCustomizer = dynamic(
  () => import("@/components/rsvp/rsvp-customizer").then((mod) => mod.RsvpCustomizer),
  {
    loading: () => <RsvpCustomizerSkeleton />,
  }
);

interface CustomizePageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function CustomizePage({ searchParams }: CustomizePageProps) {
  const { eventId: selectedEventId } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("rsvpSettings");
  const isRTL = locale === "he";

  // Allow both wedding owners and platform owners (admins)
  if (!user || (user.role !== UserRole.ROLE_WEDDING_OWNER && user.role !== UserRole.ROLE_PLATFORM_OWNER)) {
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
              ? "צור אירוע חדש כדי להתחיל להתאים אישית את דף האישור"
              : "Create a new event to start customizing the RSVP page"}
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

  const settingsResult = await getRsvpPageSettings(eventId);
  const templatesResult = await getTemplates();

  if (settingsResult.error || !settingsResult.event) {
    notFound();
  }

  const { settings, event } = settingsResult;
  const templates = templatesResult.templates || [];

  return (
    <PageFadeIn className="min-h-0 flex-1 flex flex-col">
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 shrink-0">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/customize`}
        />
      </div>

      <div className="min-h-0 flex-1">
        <RsvpCustomizer
          eventId={eventId}
          event={event}
          initialSettings={settings}
          templates={templates}
          locale={locale}
        />
      </div>
    </PageFadeIn>
  );
}
