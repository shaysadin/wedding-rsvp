"use client";

import { WeddingEvent, RsvpPageSettings, CardStyle } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { GuestCounter } from "@/components/rsvp/guest-counter";
import { EventDateDisplay } from "@/components/rsvp/event-date-display";
import { cn } from "@/lib/utils";

interface RsvpFormPreviewProps {
  settings: Partial<RsvpPageSettings> & Record<string, any>;
  event: WeddingEvent;
  locale: string;
}

const cardStyles: Record<CardStyle, string> = {
  FLAT: "",
  ELEVATED: "shadow-xl",
  BORDERED: "border-2",
  GLASS: "backdrop-blur-md bg-white/80",
};

type DateDisplayStyle = "CARD" | "CALENDAR" | "MINIMAL";

export function RsvpFormPreview({ settings, event, locale }: RsvpFormPreviewProps) {
  const isRTL = locale === "he";
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

  // Card styling
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
    if (settings.cardBackground) {
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
  if (settings.fontFamily) {
    cardStyle.fontFamily = settings.fontFamily;
  }
  // Border settings
  if (settings.cardBorderWidth && settings.cardBorderWidth > 0) {
    cardStyle.borderWidth = `${settings.cardBorderWidth}px`;
    cardStyle.borderStyle = "solid";
    cardStyle.borderColor = settings.cardBorderColor || "#e5e7eb";
  }

  const maxWidth = settings.cardMaxWidth ? `${settings.cardMaxWidth}px` : "600px";
  const showShadow = settings.cardShadow !== false;

  // Theme colors
  const accentColor = settings.accentColor || settings.primaryColor || "#1a1a1a";
  const acceptColor = settings.acceptButtonColor || "#22c55e";
  const declineColor = settings.declineButtonColor || "#ef4444";

  // Button styling
  const buttonStyle: React.CSSProperties = {
    backgroundColor: settings.buttonColor || accentColor,
    color: settings.buttonTextColor || "#ffffff",
    borderRadius: settings.buttonBorderRadius ? `${settings.buttonBorderRadius}px` : "12px",
  };

  if (settings.buttonStyle === "outline") {
    buttonStyle.backgroundColor = "transparent";
    buttonStyle.border = `2px solid ${settings.buttonBorderColor || settings.buttonColor || accentColor}`;
    buttonStyle.color = settings.buttonColor || accentColor;
  } else if (settings.buttonStyle === "ghost") {
    buttonStyle.backgroundColor = "transparent";
    buttonStyle.border = "none";
    buttonStyle.color = settings.buttonColor || accentColor;
  }

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
            "w-full rounded-2xl bg-white",
            settings.cardStyle ? cardStyles[settings.cardStyle] : cardStyles.ELEVATED,
            showShadow && "shadow-xl"
          )}
          style={{
            ...cardStyle,
            maxWidth,
            boxShadow: showShadow ? undefined : "none",
          }}
        >
          {/* Main Content Container with proper spacing */}
          <div className="flex flex-col gap-6 p-6">

            {/* Header Section */}
            <div className="text-center space-y-2">
              <h1
                className="font-bold tracking-tight"
                style={{
                  fontSize: settings.titleFontSize ? `${settings.titleFontSize}px` : "24px",
                  lineHeight: 1.2,
                }}
              >
                {settings.welcomeTitle || event.title}
              </h1>
              <p
                className="text-muted-foreground leading-relaxed"
                style={{
                  color: settings.subtitleTextColor || undefined,
                  fontSize: settings.subtitleFontSize ? `${settings.subtitleFontSize}px` : "14px",
                }}
              >
                {settings.welcomeMessage || (isRTL
                  ? "נשמח לדעת אם תוכלו להגיע לאירוע שלנו"
                  : "We'd love to know if you can attend our event")}
              </p>
            </div>

            {/* Date Card Section */}
            <EventDateDisplay
              eventDate={eventDate}
              venue={event.venue}
              location={event.location}
              isRTL={isRTL}
              displayStyle={(settings.dateDisplayStyle as DateDisplayStyle) || "CALENDAR"}
              showCountdown={settings.showCountdown !== false}
              showTimeSection={settings.showTimeSection !== false}
              showAddressSection={settings.showAddressSection !== false}
              internalGap={10}
              backgroundColor={settings.dateCardBackground || undefined}
              textColor={settings.dateCardTextColor || undefined}
              accentColor={settings.dateCardAccentColor || settings.accentColor || accentColor}
              borderRadius={settings.dateCardBorderRadius || 16}
              padding={settings.dateCardPadding || 20}
              shadow={settings.dateCardShadow !== false}
              dateDayFontSize={settings.dateDayFontSize || 56}
              dateMonthFontSize={settings.dateMonthFontSize || 16}
              timeFontSize={settings.timeFontSize || 14}
              addressFontSize={settings.addressFontSize || 13}
              countdownBoxBackground={settings.countdownBoxBackground || undefined}
              countdownBoxTextColor={settings.countdownBoxTextColor || accentColor}
              countdownLabelColor={settings.countdownLabelColor || undefined}
              countdownNumberFontSize={settings.countdownNumberFontSize || 18}
              countdownLabelFontSize={9}
              countdownBoxSize={44}
            />

            {/* Navigation Buttons */}
            {(settings.showGoogleMaps !== false || settings.showWaze !== false) && (
              <div className="flex gap-3">
                {settings.showGoogleMaps !== false && (
                  <div
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                    style={{
                      borderColor: settings.inputBorderColor || "#e5e7eb",
                      backgroundColor: "#fafafa",
                      color: "#374151",
                    }}
                  >
                    <Icons.mapPin className="h-4 w-4" style={{ color: accentColor }} />
                    <span>Google Maps</span>
                  </div>
                )}
                {settings.showWaze !== false && (
                  <div
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                    style={{
                      borderColor: settings.inputBorderColor || "#e5e7eb",
                      backgroundColor: "#fafafa",
                      color: "#374151",
                    }}
                  >
                    <Icons.mapPin className="h-4 w-4" style={{ color: accentColor }} />
                    <span>Waze</span>
                  </div>
                )}
              </div>
            )}

            {/* Form Section */}
            <div className="space-y-5">
              {/* Name Input */}
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium"
                  style={{
                    color: settings.labelTextColor || undefined,
                    fontSize: settings.labelFontSize ? `${settings.labelFontSize}px` : "14px",
                  }}
                >
                  {isRTL ? "שם מלא" : "Full Name"}
                </Label>
                <Input
                  value={isRTL ? "ישראל ישראלי" : "John Doe"}
                  disabled
                  className="h-12 rounded-xl text-base"
                  style={{
                    backgroundColor: settings.inputBackgroundColor || "#f9fafb",
                    color: settings.inputTextColor || undefined,
                    borderColor: settings.inputBorderColor || "#e5e7eb",
                  }}
                />
              </div>

              {/* Guest Counter */}
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium"
                  style={{
                    color: settings.labelTextColor || undefined,
                    fontSize: settings.labelFontSize ? `${settings.labelFontSize}px` : "14px",
                  }}
                >
                  {isRTL ? "מספר אורחים" : "Number of Guests"}
                </Label>
                <GuestCounter
                  value={2}
                  onChange={() => {}}
                  min={1}
                  max={20}
                  isRTL={isRTL}
                  backgroundColor={settings.guestCounterBackground || settings.inputBackgroundColor || "#f9fafb"}
                  textColor={settings.guestCounterTextColor || settings.labelTextColor || undefined}
                  borderColor={settings.inputBorderColor || "#e5e7eb"}
                  accentColor={settings.guestCounterAccent || accentColor}
                />
              </div>

              {/* RSVP Question */}
              <div className="space-y-3">
                <Label
                  className="text-base font-semibold"
                  style={{
                    color: settings.questionTextColor || settings.labelTextColor || undefined,
                    fontSize: settings.questionFontSize ? `${settings.questionFontSize}px` : "16px",
                  }}
                >
                  {isRTL ? "האם תגיעו?" : "Will you attend?"}
                </Label>

                <div className="grid grid-cols-2 gap-3" dir={isRTL ? "rtl" : "ltr"}>
                  {/* Accept Button - Selected state shown in preview */}
                  <button
                    type="button"
                    className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-5 transition-all duration-300 overflow-hidden shadow-md"
                    style={{
                      backgroundColor: accentColor,
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        <Icons.heart className="h-6 w-6 text-white transition-transform duration-300" />
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {isRTL ? "בשמחה!" : "Count me in!"}
                      </span>
                    </div>
                  </button>

                  {/* Decline Button - Unselected state */}
                  <button
                    type="button"
                    className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 p-5 transition-all duration-300 overflow-hidden bg-gray-50/50 hover:bg-gray-100/80"
                  >
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200/80 text-gray-400 transition-all duration-300 group-hover:bg-gray-300/80 group-hover:text-gray-500">
                        <Icons.calendarX className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="text-sm font-medium text-gray-400 transition-colors duration-300 group-hover:text-gray-500">
                        {isRTL ? "לא הפעם" : "Not this time"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className={cn(
                "group relative w-full h-14 text-base font-semibold transition-all duration-300 overflow-hidden",
                settings.buttonShadow !== false && "shadow-lg hover:shadow-xl"
              )}
              style={{
                ...buttonStyle,
                borderRadius: settings.buttonBorderRadius ? `${settings.buttonBorderRadius}px` : "16px",
              }}
              disabled
            >
              {/* Hover gradient effect */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                style={{ display: settings.buttonStyle === "outline" || settings.buttonStyle === "ghost" ? "none" : undefined }}
              />

              {/* Button content */}
              <span className="relative flex items-center justify-center gap-2">
                <Icons.send className={cn(
                  "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                  isRTL && "rotate-180"
                )} />
                <span>{isRTL ? "שליחת אישור" : "Send RSVP"}</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
