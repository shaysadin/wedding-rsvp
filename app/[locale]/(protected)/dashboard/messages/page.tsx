import { redirect, notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { getEventsForDropdown } from "@/actions/event-selector";
import { getEventTemplates, initializeEventTemplates } from "@/actions/message-templates";
import { MessageTemplateList } from "@/components/dashboard/message-template-list";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { EventDropdownSelector } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

interface MessagesPageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { eventId: selectedEventId } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("messageTemplates");
  const isRTL = locale === "he";

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

  // If no events, show empty state
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
              ? "צור אירוע חדש כדי להתחיל לנהל תבניות הודעות"
              : "Create a new event to start managing message templates"}
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

  // Select event (use first event if none selected)
  const eventId = selectedEventId && events.find(e => e.id === selectedEventId)
    ? selectedEventId
    : events[0].id;

  // Initialize default templates if needed
  await initializeEventTemplates(eventId, locale);

  const result = await getEventTemplates(eventId);

  if (!result.success || !result.event) {
    notFound();
  }

  return (
    <PageFadeIn>
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="font-heading text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDescription", { eventTitle: result.event.title })}
          </p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/messages`}
        />
      </div>

      <MessageTemplateList
        templates={result.templates || []}
        eventId={eventId}
        eventTitle={result.event.title}
        locale={locale}
        smsSenderId={result.event.smsSenderId}
      />
    </PageFadeIn>
  );
}
