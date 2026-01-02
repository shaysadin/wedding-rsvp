"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

import { getEventAutomationFlows, getFlowTemplates, getEventAutomationSettings } from "@/actions/automation";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { AutomationDashboard } from "@/components/automation/automation-dashboard";
import { cn } from "@/lib/utils";

interface AutomationPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function AutomationPage({ params }: AutomationPageProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [eventId, setEventId] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string>("en");
  const [flows, setFlows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customMessages, setCustomMessages] = useState<{
    rsvpConfirmedMessage?: string | null;
    rsvpDeclinedMessage?: string | null;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setResolvedLocale(p.locale);
    });
  }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;

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

  // Load data when eventId is available
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "אוטומציות" : "Automations"}
        text={
          isRTL
            ? "הגדירו אוטומציות לשליחת הודעות אוטומטיות לאורחים"
            : "Set up automations to send automatic messages to guests"
        }
      >
        <div className={cn("flex flex-row flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" asChild>
            <Link href={`/${resolvedLocale}/dashboard/events/${eventId}`}>
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {isRTL ? "חזרה" : "Back"}
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      {/* Loading State */}
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
