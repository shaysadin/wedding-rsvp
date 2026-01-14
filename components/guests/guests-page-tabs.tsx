"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Guest, GuestRsvp, NotificationLog, VapiCallLog } from "@prisma/client";

import { getFailedNotifications, getFailedNotificationsCount } from "@/actions/notifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GuestsTable } from "./guests-table";
import { FailedMessagesTab, FailedNotification } from "./failed-messages-tab";
import { cn } from "@/lib/utils";

type GuestWithRsvp = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs: NotificationLog[];
  vapiCallLogs?: VapiCallLog[];
};

interface GuestsPageTabsProps {
  guests: GuestWithRsvp[];
  eventId: string;
  initialFilter?: string;
  invitationImageUrl?: string | null;
}

export function GuestsPageTabs({
  guests,
  eventId,
  initialFilter,
  invitationImageUrl,
}: GuestsPageTabsProps) {
  const t = useTranslations("failedMessages");
  const tGuests = useTranslations("guests");
  const locale = useLocale();
  const isRTL = locale === "he";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial tab from URL or default to "guests"
  const initialTab = searchParams.get("tab") || "guests";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [failedCount, setFailedCount] = useState(0);
  const [failedNotifications, setFailedNotifications] = useState<FailedNotification[]>([]);
  const [isLoadingFailed, setIsLoadingFailed] = useState(false);

  // Load failed notifications count on mount
  useEffect(() => {
    const loadFailedCount = async () => {
      const result = await getFailedNotificationsCount(eventId);
      if (result.success) {
        setFailedCount(result.count ?? 0);
      }
    };
    loadFailedCount();
  }, [eventId]);

  // Load full failed notifications when tab is switched to "failed"
  const loadFailedNotifications = useCallback(async () => {
    if (activeTab !== "failed") return;

    setIsLoadingFailed(true);
    try {
      const result = await getFailedNotifications(eventId);
      if (result.success && result.notifications) {
        setFailedNotifications(result.notifications as FailedNotification[]);
        setFailedCount(result.notifications.length);
      }
    } finally {
      setIsLoadingFailed(false);
    }
  }, [activeTab, eventId]);

  useEffect(() => {
    if (activeTab === "failed") {
      loadFailedNotifications();
    }
  }, [activeTab, loadFailedNotifications]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Update URL with tab parameter
    const params = new URLSearchParams(searchParams.toString());
    if (value === "guests") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Refresh failed notifications
  const handleRefresh = () => {
    loadFailedNotifications();
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" dir={isRTL ? "rtl" : "ltr"}>
      <TabsList className={cn("mb-4", isRTL && "flex-row-reverse")}>
        <TabsTrigger value="guests" className="gap-2">
          {tGuests("title")}
        </TabsTrigger>
        <TabsTrigger value="failed" className="gap-2">
          {t("tabLabel")}
          {failedCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
              {failedCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="guests" className="mt-0" dir={isRTL ? "rtl" : "ltr"}>
        <GuestsTable
          guests={guests}
          eventId={eventId}
          initialFilter={initialFilter}
          invitationImageUrl={invitationImageUrl}
        />
      </TabsContent>

      <TabsContent value="failed" className="mt-0" dir={isRTL ? "rtl" : "ltr"}>
        {isLoadingFailed ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <FailedMessagesTab
            notifications={failedNotifications}
            eventId={eventId}
            onRefresh={handleRefresh}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
