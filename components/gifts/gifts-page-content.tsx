"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getEventGifts, getGiftPaymentSettings } from "@/actions/gift-payments";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { GiftsDashboard } from "@/components/gifts/gifts-dashboard";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

interface GiftsPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
}

export function GiftsPageContent({ eventId, events, locale }: GiftsPageContentProps) {
  const t = useTranslations("gifts");
  const isRTL = locale === "he";

  const [gifts, setGifts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [giftsResult, settingsResult] = await Promise.all([
        getEventGifts(eventId),
        getGiftPaymentSettings(eventId),
      ]);

      if (giftsResult.error) {
        toast.error(giftsResult.error);
      } else if (giftsResult.gifts) {
        setGifts(giftsResult.gifts);
      }

      if (settingsResult.settings) {
        setSettings(settingsResult.settings);
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
            {isRTL ? "מתנות" : "Gifts"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? "ניהול מתנות וצפייה בתשלומים" : "Manage gifts and view payments"}
          </p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/gifts`}
        />
      </div>

      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GiftsDashboard
          eventId={eventId}
          gifts={gifts}
          settings={settings}
          onRefresh={loadData}
        />
      )}
    </PageFadeIn>
  );
}
