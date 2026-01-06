"use client";

import { WeddingEvent, RsvpPageSettings, CardStyle } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { GuestCounter } from "@/components/rsvp/guest-counter";
import { EventDateDisplay } from "@/components/rsvp/event-date-display";
import { cn } from "@/lib/utils";

// Serialized event type for client components (Decimal converted to number)
type SerializedWeddingEvent = Omit<WeddingEvent, 'totalBudget'> & {
  totalBudget: number | null;
};

interface RsvpFormPreviewProps {
  settings: Partial<RsvpPageSettings> & Record<string, any>;
  event: SerializedWeddingEvent;
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
                className="tracking-tight"
                style={{
                  fontSize: settings.titleFontSize ? `${settings.titleFontSize}px` : "24px",
                  lineHeight: 1.2,
                  color: settings.titleTextColor || undefined,
                  fontWeight: settings.titleFontWeight || 700,
                }}
              >
                {settings.welcomeTitle || event.title}
              </h1>
              <p
                className="leading-relaxed"
                style={{
                  color: settings.subtitleTextColor || undefined,
                  fontSize: settings.subtitleFontSize ? `${settings.subtitleFontSize}px` : "14px",
                  fontWeight: settings.subtitleFontWeight || 400,
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
              // Individual Date Text Colors
              dateDayOfWeekColor={settings.dateDayOfWeekColor || undefined}
              dateDayOfWeekFontSize={settings.dateDayOfWeekFontSize || 11}
              dateDayOfWeekFontWeight={settings.dateDayOfWeekFontWeight || 500}
              dateDayNumberColor={settings.dateDayNumberColor || undefined}
              dateDayFontWeight={settings.dateDayFontWeight || 700}
              dateMonthYearColor={settings.dateMonthYearColor || undefined}
              dateMonthFontWeight={settings.dateMonthFontWeight || 500}
              // Time Section
              timeFontSize={settings.timeFontSize || 14}
              timeFontWeight={settings.timeFontWeight || 600}
              timeSectionTextColor={settings.timeSectionTextColor || undefined}
              timeIconColor={settings.timeIconColor || undefined}
              // Address Section
              addressFontSize={settings.addressFontSize || 13}
              addressFontWeight={settings.addressFontWeight || 500}
              addressSectionTextColor={settings.addressSectionTextColor || undefined}
              addressIconColor={settings.addressIconColor || undefined}
              // Countdown
              countdownBoxBackground={settings.countdownBoxBackground || undefined}
              countdownBoxTextColor={settings.countdownBoxTextColor || accentColor}
              countdownLabelColor={settings.countdownLabelColor || undefined}
              countdownNumberFontSize={settings.countdownNumberFontSize || 18}
              countdownNumberFontWeight={settings.countdownNumberFontWeight || 700}
              countdownLabelFontSize={settings.countdownLabelFontSize || 9}
              countdownLabelFontWeight={settings.countdownLabelFontWeight || 500}
              countdownBoxSize={44}
            />

            {/* Navigation Buttons */}
            {(settings.showGoogleMaps !== false || settings.showWaze !== false) && (
              <div className="flex gap-3">
                {settings.showGoogleMaps !== false && (
                  <div
                    className="flex flex-1 items-center justify-center gap-2 border px-4 py-3"
                    style={{
                      borderColor: settings.navButtonBorderColor || settings.inputBorderColor || "#e5e7eb",
                      backgroundColor: settings.navButtonBackground || "#fafafa",
                      color: settings.navButtonTextColor || "#374151",
                      borderRadius: settings.navButtonBorderRadius ? `${settings.navButtonBorderRadius}px` : "12px",
                      fontSize: settings.navButtonFontSize ? `${settings.navButtonFontSize}px` : "14px",
                      fontWeight: settings.navButtonFontWeight || 500,
                      borderWidth: settings.navButtonBorderWidth ? `${settings.navButtonBorderWidth}px` : "1px",
                    }}
                  >
                    <Icons.mapPin className="h-4 w-4" style={{ color: accentColor }} />
                    <span>Google Maps</span>
                  </div>
                )}
                {settings.showWaze !== false && (
                  <div
                    className="flex flex-1 items-center justify-center gap-2 border px-4 py-3"
                    style={{
                      borderColor: settings.navButtonBorderColor || settings.inputBorderColor || "#e5e7eb",
                      backgroundColor: settings.navButtonBackground || "#fafafa",
                      color: settings.navButtonTextColor || "#374151",
                      borderRadius: settings.navButtonBorderRadius ? `${settings.navButtonBorderRadius}px` : "12px",
                      fontSize: settings.navButtonFontSize ? `${settings.navButtonFontSize}px` : "14px",
                      fontWeight: settings.navButtonFontWeight || 500,
                      borderWidth: settings.navButtonBorderWidth ? `${settings.navButtonBorderWidth}px` : "1px",
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
                      backgroundColor: settings.rsvpAcceptBackground || accentColor,
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        <Icons.heart
                          className="h-6 w-6 transition-transform duration-300"
                          style={{ color: settings.rsvpAcceptTextColor || "#ffffff" }}
                        />
                      </div>
                      <span
                        className="font-semibold"
                        style={{
                          color: settings.rsvpAcceptTextColor || "#ffffff",
                          fontSize: settings.rsvpButtonFontSize ? `${settings.rsvpButtonFontSize}px` : "14px",
                        }}
                      >
                        {isRTL ? "בשמחה!" : "Count me in!"}
                      </span>
                    </div>
                  </button>

                  {/* Decline Button - Unselected state */}
                  <button
                    type="button"
                    className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 transition-all duration-300 overflow-hidden"
                    style={{
                      backgroundColor: settings.rsvpDeclineBackground || "#f9fafb",
                      borderColor: settings.inputBorderColor || "#e5e7eb",
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: settings.rsvpDeclineBackground ? "rgba(0,0,0,0.1)" : "#e5e7eb",
                        }}
                      >
                        <Icons.calendarX
                          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                          style={{ color: settings.rsvpDeclineTextColor || "#9ca3af" }}
                        />
                      </div>
                      <span
                        className="font-medium transition-colors duration-300"
                        style={{
                          color: settings.rsvpDeclineTextColor || "#9ca3af",
                          fontSize: settings.rsvpButtonFontSize ? `${settings.rsvpButtonFontSize}px` : "14px",
                        }}
                      >
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
