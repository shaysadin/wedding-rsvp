"use client";

import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { WeddingEvent, RsvpPageSettings, CardStyle } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface RsvpFormPreviewProps {
  settings: Partial<RsvpPageSettings>;
  event: WeddingEvent;
  locale: string;
}

const cardStyles: Record<CardStyle, string> = {
  FLAT: "",
  ELEVATED: "shadow-xl",
  BORDERED: "border-2",
  GLASS: "backdrop-blur-md bg-white/80",
};

export function RsvpFormPreview({ settings, event, locale }: RsvpFormPreviewProps) {
  const isRTL = locale === "he";
  const dateLocale = isRTL ? he : enUS;
  const eventDate = new Date(event.dateTime);

  // Build styles
  const backgroundStyle: React.CSSProperties = {};
  const cardStyle: React.CSSProperties = {};
  const overlayStyle: React.CSSProperties = {};

  if (settings.backgroundType === "COLOR" && settings.backgroundColor) {
    backgroundStyle.backgroundColor = settings.backgroundColor;
  } else if (settings.backgroundType === "IMAGE" && settings.backgroundImage) {
    backgroundStyle.backgroundImage = `url(${settings.backgroundImage})`;
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
  } else if (settings.backgroundType === "GRADIENT") {
    const primary = settings.primaryColor || "#667eea";
    const secondary = settings.secondaryColor || "#764ba2";
    backgroundStyle.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
  }

  if (settings.backgroundOverlay && settings.backgroundOverlay > 0) {
    overlayStyle.backgroundColor = "black";
    overlayStyle.opacity = settings.backgroundOverlay;
  }

  if (settings.cardBackground) {
    cardStyle.backgroundColor = settings.cardBackground;
  }
  if (settings.cardBorderRadius !== null && settings.cardBorderRadius !== undefined) {
    cardStyle.borderRadius = `${settings.cardBorderRadius}px`;
  }
  if (settings.cardPadding !== null && settings.cardPadding !== undefined) {
    cardStyle.padding = `${settings.cardPadding}px`;
  }
  if (settings.cardOpacity !== null && settings.cardOpacity !== undefined) {
    // For backdrop blur to work with opacity, use background color with alpha
    if (settings.cardBackground) {
      // Convert hex to rgba with opacity
      const hex = settings.cardBackground.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      cardStyle.backgroundColor = `rgba(${r}, ${g}, ${b}, ${settings.cardOpacity})`;
    }
  }
  if (settings.cardBlur !== null && settings.cardBlur !== undefined && settings.cardBlur > 0) {
    cardStyle.backdropFilter = `blur(${settings.cardBlur}px)`;
    cardStyle.WebkitBackdropFilter = `blur(${settings.cardBlur}px)`;
  }
  if (settings.textColor) {
    cardStyle.color = settings.textColor;
  }

  const maxWidth = settings.cardMaxWidth ? `${settings.cardMaxWidth}px` : "28rem";

  const getGoogleMapsUrl = () => {
    const query = encodeURIComponent(`${event.venue ? event.venue + ", " : ""}${event.location}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div
      className="relative h-full w-full overflow-auto"
      style={backgroundStyle}
    >
      {/* Overlay */}
      {settings.backgroundType === "IMAGE" && settings.backgroundOverlay && settings.backgroundOverlay > 0 && (
        <div className="absolute inset-0" style={overlayStyle} />
      )}

      {/* Content */}
      <div
        className="relative flex min-h-full items-center justify-center p-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div
          className={cn(
            "w-full rounded-xl bg-white",
            settings.cardStyle ? cardStyles[settings.cardStyle] : cardStyles.ELEVATED
          )}
          style={{
            ...cardStyle,
            maxWidth,
          }}
        >
          <div className="space-y-4">
            {/* Welcome Section */}
            <div className="text-center">
              <h1 className="text-xl font-bold">
                {settings.welcomeTitle || event.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings.welcomeMessage || (isRTL
                  ? "שלום, נשמח לדעת אם תוכלו להגיע לאירוע שלנו"
                  : "Hello, we'd love to know if you can attend our event")}
              </p>
            </div>

            {/* Event Date Calendar */}
            {settings.showCalendar !== false && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  {isRTL ? "תאריך האירוע" : "Event Date"}
                </Label>
                <div className="flex justify-center rounded-lg border bg-card p-2">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    month={eventDate}
                    locale={dateLocale}
                    disabled
                    className="rounded-md scale-75 origin-center"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Navigation Links */}
            {(settings.showGoogleMaps !== false || settings.showWaze !== false) && (
              <div className="flex gap-2">
                {settings.showGoogleMaps !== false && (
                  <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border bg-card p-2 text-[10px]">
                    <Icons.mapPin className="h-3 w-3" />
                    Google Maps
                  </div>
                )}
                {settings.showWaze !== false && (
                  <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border bg-card p-2 text-[10px]">
                    <Icons.mapPin className="h-3 w-3" />
                    Waze
                  </div>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? "שם מלא" : "Full Name"}</Label>
              <Input
                value={isRTL ? "ישראל ישראלי" : "John Doe"}
                disabled
                className="text-xs h-8"
              />
            </div>

            {/* Guest Count */}
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? "מספר אורחים" : "Number of Guests"}</Label>
              <Input
                type="number"
                value={2}
                disabled
                className="text-xs h-8 w-16"
              />
            </div>

            {/* RSVP Question */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {isRTL ? "האם תגיעו?" : "Will you attend?"}
              </Label>
              <div className="grid grid-cols-2 gap-2" dir={isRTL ? "rtl" : "ltr"}>
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-green-500 bg-green-50 p-2 text-green-700 shadow-sm ring-1 ring-green-200">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    <Icons.check className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-[10px] text-center">
                    {isRTL ? "כן, אגיע!" : "Yes!"}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white p-2 text-gray-600">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Icons.close className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-[10px] text-center">
                    {isRTL ? "לא אוכל" : "Can't"}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full text-xs h-9"
              style={{
                backgroundColor: settings.buttonColor || undefined,
                color: settings.buttonTextColor || undefined,
                borderRadius: settings.buttonBorderRadius ? `${settings.buttonBorderRadius}px` : undefined,
              }}
              disabled
            >
              {isRTL ? "שליחת אישור" : "Send RSVP"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
