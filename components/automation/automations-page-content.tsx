"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getEventAutomationFlows, getFlowTemplates, getEventAutomationSettings } from "@/actions/automation";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { AutomationDashboard } from "@/components/automation/automation-dashboard";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

interface AutomationsPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
}

export function AutomationsPageContent({ eventId, events, locale }: AutomationsPageContentProps) {
  const t = useTranslations("automation");
  const isRTL = locale === "he";

  const [flows, setFlows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customMessages, setCustomMessages] = useState<{
    rsvpConfirmedMessage?: string | null;
    rsvpDeclinedMessage?: string | null;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [flowsResult, templatesResult, settingsResult] = await Promise.all([
        getEventAutomationFlows(eventId),
        getFlowTemplates(),
        getEventAutomationSettings(eventId),
      ]);

      if (flowsResult.error) {
        toast.error(flowsResult.error);
      } else if (flowsResult.flows) {
        setFlows(flowsResult.flows);
      }

      if (templatesResult.error) {
        toast.error(templatesResult.error);
      } else if (templatesResult.templates) {
        setTemplates(templatesResult.templates);
      }

      if (settingsResult.customMessages) {
        setCustomMessages(settingsResult.customMessages);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת הנתונים" : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isRTL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <PageFadeIn>
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className={cn("space-y-1", isRTL && "text-right")}>
          <h1 className="text-2xl font-bold tracking-tight">
            {isRTL ? "אוטומציות" : "Automations"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL
              ? "הגדירו אוטומציות לשליחת הודעות אוטומטיות לאורחים"
              : "Set up automations to send automatic messages to guests"}
          </p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/automations`}
        />
      </div>

      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AutomationDashboard
          eventId={eventId}
          flows={flows}
          templates={templates}
          customMessages={customMessages}
          onRefresh={loadData}
        />
      )}
    </PageFadeIn>
  );
}
