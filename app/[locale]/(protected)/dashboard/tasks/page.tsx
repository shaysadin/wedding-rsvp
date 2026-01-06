import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEventsForDropdown } from "@/actions/event-selector";
import { getTasks } from "@/actions/tasks";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { EventDropdownSelector } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

interface TasksPageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { eventId: selectedEventId } = await searchParams;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("tasks");
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
              ? "צור אירוע חדש כדי להתחיל לנהל משימות"
              : "Create a new event to start managing tasks"}
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

  // Verify event exists and belongs to user
  const event = await prisma.weddingEvent.findFirst({
    where: {
      id: eventId,
      ownerId: user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!event) {
    notFound();
  }

  const result = await getTasks(eventId);

  return (
    <PageFadeIn className="flex flex-1 flex-col">
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{`${t("manageTasks")} - ${event.title}`}</p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/tasks`}
        />
      </div>
      <div className="flex flex-1 flex-col pb-4">
        <TasksPageClient
          eventId={eventId}
          initialTasks={result.tasks || []}
          locale={locale}
        />
      </div>
    </PageFadeIn>
  );
}
