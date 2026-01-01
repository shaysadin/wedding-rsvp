"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { TasksEventCard } from "./tasks-event-card";
import type { TasksEventData } from "@/actions/event-selector";

interface TasksEventSelectorProps {
  events: TasksEventData[];
  title: string;
  description: string;
  locale: string;
}

export function TasksEventSelector({
  events,
  title,
  description,
  locale,
}: TasksEventSelectorProps) {
  const t = useTranslations("events");
  const router = useRouter();

  if (events.length === 0) {
    return (
      <EmptyPlaceholder className="min-h-[400px]">
        <EmptyPlaceholder.Icon name="calendar" />
        <EmptyPlaceholder.Title>{t("noEvents")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("createFirst")}
        </EmptyPlaceholder.Description>
        <Button onClick={() => router.push(`/${locale}/dashboard/events`)}>
          <Icons.add className="me-2 h-4 w-4" />
          {t("create")}
        </Button>
      </EmptyPlaceholder>
    );
  }

  // If only one event, redirect directly
  if (events.length === 1) {
    router.push(`/${locale}/dashboard/events/${events[0].id}/tasks`);
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <CheckSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Event Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("selectEvent")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <TasksEventCard
              key={event.id}
              event={event}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
