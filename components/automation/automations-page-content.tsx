"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getEventAutomationFlows, getFlowTemplates, getEventAutomationSettings } from "@/actions/automation";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { AutomationDashboard } from "@/components/automation/automation-dashboard";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";

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
    rsvpMaybeMessage?: string | null;
  }>({});
  const [rsvpMaybeReminderDelay, setRsvpMaybeReminderDelay] = useState<number>(24);
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
      if (settingsResult.rsvpMaybeReminderDelay !== undefined) {
        setRsvpMaybeReminderDelay(settingsResult.rsvpMaybeReminderDelay);
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
    <PageFadeIn className="space-y-6">
      {/* Header with Event Dropdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 text-start">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
              {isRTL ? "אוטומציות" : "Automations"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
          rsvpMaybeReminderDelay={rsvpMaybeReminderDelay}
          onRefresh={loadData}
        />
      )}
    </PageFadeIn>
  );
}
