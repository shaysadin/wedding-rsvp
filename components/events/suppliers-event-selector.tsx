"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { SuppliersEventCard } from "./suppliers-event-card";
import type { SuppliersEventData } from "@/actions/event-selector";

interface SuppliersEventSelectorProps {
  events: SuppliersEventData[];
  title: string;
  description: string;
  locale: string;
}

export function SuppliersEventSelector({
  events,
  title,
  description,
  locale,
}: SuppliersEventSelectorProps) {
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
    router.push(`/${locale}/dashboard/events/${events[0].id}/suppliers`);
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
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Store className="h-6 w-6 text-violet-600 dark:text-violet-400" />
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
            <SuppliersEventCard
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
