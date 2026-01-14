"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getEventGifts, getGiftPaymentSettings } from "@/actions/gift-payments";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { GiftsDashboard } from "@/components/gifts/gifts-dashboard";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";

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
    <PageFadeIn className="space-y-6">
      {/* Header with Event Dropdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
              {isRTL ? "מתנות" : "Gifts"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
