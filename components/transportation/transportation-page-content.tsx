"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Copy, Check, MapPin, Phone, User, Calendar } from "lucide-react";

import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBaseUrl, absoluteUrl } from "@/lib/utils";

interface TransportationRegistration {
  id: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  notes: string | null;
  registeredAt: Date | string;
  guest: {
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
    slug: string;
    transportationSlug: string | null;
    side: string | null;
    groupName: string | null;
  } | null; // Guest can be null for generic registrations
}

interface TransportationPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
  transportationRegistrations: TransportationRegistration[];
}

export function TransportationPageContent({
  eventId,
  events,
  locale,
  transportationRegistrations,
}: TransportationPageContentProps) {
  const isRTL = locale === "he";
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedGeneric, setCopiedGeneric] = useState(false);

  const handleCopyLink = async (slug: string) => {
    const link = absoluteUrl(`/transportation/${slug}`);
    await navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCopyGenericLink = async () => {
    const link = absoluteUrl(`/transportation/event/${eventId}`);
    await navigator.clipboard.writeText(link);
    setCopiedGeneric(true);
    setTimeout(() => setCopiedGeneric(false), 2000);
  };

  const getSideLabel = (side: string | null | undefined) => {
    if (!side) return null;
    const sideLabels: Record<string, string> = isRTL
      ? { bride: "כלה", groom: "חתן", both: "שניהם" }
      : { bride: "Bride", groom: "Groom", both: "Both" };
    return sideLabels[side.toLowerCase()] || side;
  };

  const getGroupLabel = (group: string | null | undefined) => {
    if (!group) return null;
    const groupLabels: Record<string, string> = isRTL
      ? { family: "משפחה", friends: "חברים", work: "עבודה", other: "אחר" }
      : { family: "Family", friends: "Friends", work: "Work", other: "Other" };
    return groupLabels[group.toLowerCase()] || group;
  };

  return (
    <PageFadeIn>
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isRTL ? "הסעות" : "Transportation"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? "רשימת אורחים שנרשמו להסעות" : "List of guests registered for transportation"}
          </p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/events/${eventId}/transportation`}
        />
      </div>

      {/* Stats Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {isRTL ? "סטטיסטיקה" : "Statistics"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyGenericLink}
              className="gap-2"
            >
              {copiedGeneric ? (
                <>
                  <Check className="h-4 w-4" />
                  {isRTL ? "הועתק" : "Copied"}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {isRTL ? "העתק קישור כללי" : "Copy Generic Link"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {transportationRegistrations.length}
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "אורחים נרשמו להסעות" : "guests registered for transportation"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {isRTL
              ? "הקישור הכללי מאפשר לכל אחד להירשם להסעות ללא הזמנה אישית"
              : "The generic link allows anyone to register for transportation without a personal invitation"}
          </p>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isRTL ? "רשימת נרשמים" : "Registration List"}
          </CardTitle>
          <CardDescription>
            {isRTL ? "כל האורחים שנרשמו להסעות" : "All guests who registered for transportation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transportationRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.bus className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "אין נרשמים עדיין" : "No registrations yet"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {isRTL
                  ? "לא נרשמו אורחים להסעות. שלח הודעת WhatsApp עם קישור ההסעות לאורחים."
                  : "No guests have registered for transportation yet. Send a WhatsApp message with the transportation link to your guests."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transportationRegistrations.map((registration) => {
                const registeredDate = typeof registration.registeredAt === 'string'
                  ? new Date(registration.registeredAt)
                  : registration.registeredAt;

                return (
                  <div
                    key={registration.id}
                    className={cn(
                      "flex flex-col gap-4 p-4 rounded-lg border",
                      "hover:bg-accent/50 transition-colors"
                    )}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* Top Row: Guest Info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{registration.fullName}</span>
                          {!registration.guest && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {isRTL ? "הרשמה כללית" : "Generic"}
                            </Badge>
                          )}
                          {registration.guest?.side && (
                            <Badge variant="secondary" className="text-xs">
                              {getSideLabel(registration.guest.side)}
                            </Badge>
                          )}
                          {registration.guest?.groupName && (
                            <Badge variant="outline" className="text-xs">
                              {getGroupLabel(registration.guest.groupName)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{registration.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{registration.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(registeredDate, "PPp", { locale: isRTL ? he : undefined })}
                            </span>
                          </div>
                        </div>

                        {registration.notes && (
                          <div className="text-sm text-muted-foreground italic">
                            {registration.notes}
                          </div>
                        )}
                      </div>

                      {/* Copy Link Button - only for guest-specific registrations */}
                      {registration.guest?.transportationSlug && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(registration.guest!.transportationSlug!)}
                          className="shrink-0"
                        >
                          {copiedSlug === registration.guest.transportationSlug ? (
                            <>
                              <Check className="h-4 w-4 me-1.5" />
                              {isRTL ? "הועתק" : "Copied"}
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 me-1.5" />
                              {isRTL ? "העתק קישור" : "Copy Link"}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageFadeIn>
  );
}
