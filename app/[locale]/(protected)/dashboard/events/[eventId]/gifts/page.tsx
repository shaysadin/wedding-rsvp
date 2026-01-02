"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { getEventGifts, getGiftPaymentSettings } from "@/actions/gift-payments";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { GiftsDashboard } from "@/components/gifts/gifts-dashboard";
import { cn } from "@/lib/utils";

interface GiftsPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function GiftsPage({ params }: GiftsPageProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [eventId, setEventId] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string>("en");
  const [gifts, setGifts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
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
        heading={isRTL ? "מתנות" : "Gifts"}
        text={isRTL ? "ניהול מתנות וצפייה בתשלומים" : "Manage gifts and view payments"}
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
