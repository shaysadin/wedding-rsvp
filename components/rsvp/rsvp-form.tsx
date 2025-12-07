"use client";

import { useState } from "react";
import { Guest, WeddingEvent, GuestRsvp, RsvpPageSettings, RsvpStatus } from "@prisma/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";

import { submitRsvp } from "@/actions/rsvp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { GuestCounter } from "@/components/rsvp/guest-counter";
import { EventDateDisplay } from "@/components/rsvp/event-date-display";
import { cn } from "@/lib/utils";

type DateDisplayStyle = "CARD" | "CALENDAR" | "MINIMAL";

interface RsvpFormProps {
  guest: Guest;
  event: WeddingEvent;
  existingRsvp: GuestRsvp | null;
  settings: RsvpPageSettings | null;
  locale?: string;
}

export function RsvpForm({ guest, event, existingRsvp, settings, locale = "he" }: RsvpFormProps) {
  const isRTL = locale === "he";
  const dateLocale = isRTL ? he : enUS;

  // Default to ACCEPTED unless guest already responded with ACCEPTED or DECLINED
  const [status, setStatus] = useState<RsvpStatus | null>(
    existingRsvp?.status === "ACCEPTED" || existingRsvp?.status === "DECLINED"
      ? existingRsvp.status
      : "ACCEPTED"
  );
  const [guestCount, setGuestCount] = useState(existingRsvp?.guestCount || 1);
  const [guestName, setGuestName] = useState(guest.name);
  const [note, setNote] = useState(existingRsvp?.note || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const eventDate = new Date(event.dateTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!status) {
      toast.error(isRTL ? "אנא בחרו אם תגיעו לאירוע" : "Please select if you will attend");
      return;
    }

    setIsLoading(true);

    try {
      const result = await submitRsvp({
        slug: guest.slug,
        status,
        guestCount: status === "ACCEPTED" ? guestCount : 0,
        note: note || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setIsSubmitted(true);
      toast.success(isRTL ? "התשובה נשמרה בהצלחה!" : "Response saved successfully!");
    } catch (error) {
      toast.error(isRTL ? "אירעה שגיאה, אנא נסו שוב" : "An error occurred, please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const getGoogleMapsUrl = () => {
    if (settings?.googleMapsUrl) return settings.googleMapsUrl;
    const query = encodeURIComponent(`${event.venue ? event.venue + ", " : ""}${event.location}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getWazeUrl = () => {
    if (settings?.wazeUrl) return settings.wazeUrl;
    const query = encodeURIComponent(`${event.venue ? event.venue + ", " : ""}${event.location}`);
    return `https://waze.com/ul?q=${query}&navigate=yes`;
  };

  // Show thank you message after submission
  if (isSubmitted) {
    return (
      <div className="text-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icons.check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">
          {settings?.thankYouMessage || (isRTL ? "תודה על התשובה!" : "Thank you for your response!")}
        </h2>
        <p className="text-muted-foreground">
          {status === "ACCEPTED"
            ? (isRTL ? "נתראה באירוע!" : "See you at the event!")
            : (settings?.declineMessage || (isRTL ? "מקווים לראותכם בהזדמנות אחרת" : "Hope to see you another time"))}
        </p>

        {status === "ACCEPTED" && (
          <div className="mt-6 rounded-lg bg-muted/50 p-4 text-start">
            <h3 className="mb-2 font-semibold">{isRTL ? "פרטי האירוע:" : "Event Details:"}</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Icons.calendar className="h-4 w-4 shrink-0" />
                {format(eventDate, "EEEE, d MMMM yyyy", { locale: dateLocale })}
              </p>
              <p className="flex items-center gap-2">
                <Icons.clock className="h-4 w-4 shrink-0" />
                {format(eventDate, "HH:mm", { locale: dateLocale })}
              </p>
              <p className="flex items-center gap-2">
                <Icons.mapPin className="h-4 w-4 shrink-0" />
                {event.venue && `${event.venue}, `}{event.location}
              </p>
            </div>

            {(settings?.showGoogleMaps !== false || settings?.showWaze !== false) && (
              <div className="mt-3 flex flex-wrap gap-3">
                {settings?.showGoogleMaps !== false && (
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Icons.mapPin className="h-4 w-4" />
                    Google Maps
                  </a>
                )}
                {settings?.showWaze !== false && (
                  <a
                    href={getWazeUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-100 transition-colors"
                  >
                    <Icons.mapPin className="h-4 w-4" />
                    Waze
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          className="mt-6"
          variant="outline"
          onClick={() => setIsSubmitted(false)}
        >
          {isRTL ? "עדכון תשובה" : "Update Response"}
        </Button>
      </div>
    );
  }

  // Theme color - used for button styling
  const accentColor = settings?.accentColor || settings?.primaryColor || "#1a1a1a";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {settings?.welcomeTitle || event.title}
        </h1>
        <p
          className="mt-2 text-muted-foreground"
          style={{ color: settings?.subtitleTextColor || undefined }}
        >
          {settings?.welcomeMessage || (isRTL
            ? `שלום ${guest.name}, נשמח לדעת אם תוכלו להגיע לאירוע שלנו`
            : `Hello ${guest.name}, we'd love to know if you can attend our event`)}
        </p>
      </div>

      {/* Event Date Display */}
      <EventDateDisplay
        eventDate={eventDate}
        venue={event.venue}
        location={event.location}
        isRTL={isRTL}
        displayStyle={(settings?.dateDisplayStyle as DateDisplayStyle) || "CALENDAR"}
        showCountdown={settings?.showCountdown !== false}
        showTimeSection={settings?.showTimeSection !== false}
        showAddressSection={settings?.showAddressSection !== false}
        internalGap={10}
        backgroundColor={settings?.dateCardBackground || undefined}
        textColor={settings?.dateCardTextColor || undefined}
        accentColor={settings?.dateCardAccentColor || settings?.accentColor || "#1a1a1a"}
        borderRadius={settings?.dateCardBorderRadius || 16}
        padding={settings?.dateCardPadding || 20}
        shadow={settings?.dateCardShadow !== false}
        dateDayFontSize={settings?.dateDayFontSize || 56}
        dateMonthFontSize={settings?.dateMonthFontSize || 16}
        timeFontSize={settings?.timeFontSize || 14}
        addressFontSize={settings?.addressFontSize || 13}
        countdownBoxBackground={settings?.countdownBoxBackground || undefined}
        countdownBoxTextColor={settings?.countdownBoxTextColor || settings?.accentColor || "#1a1a1a"}
        countdownNumberFontSize={settings?.countdownNumberFontSize || 18}
        countdownLabelFontSize={9}
        countdownBoxSize={44}
      />

      {/* Navigation Links */}
      {(settings?.showGoogleMaps !== false || settings?.showWaze !== false) && (
        <div className="flex gap-3">
          {settings?.showGoogleMaps !== false && (
            <a
              href={getGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              style={{
                borderColor: settings?.inputBorderColor || "#e5e7eb",
                backgroundColor: settings?.inputBackgroundColor || "#fafafa",
              }}
            >
              <Icons.mapPin className="h-4 w-4" style={{ color: accentColor }} />
              Google Maps
            </a>
          )}
          {settings?.showWaze !== false && (
            <a
              href={getWazeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              style={{
                borderColor: settings?.inputBorderColor || "#e5e7eb",
                backgroundColor: settings?.inputBackgroundColor || "#fafafa",
              }}
            >
              <Icons.mapPin className="h-4 w-4" style={{ color: accentColor }} />
              Waze
            </a>
          )}
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label
          htmlFor="fullName"
          style={{ color: settings?.labelTextColor || undefined }}
        >
          {isRTL ? "שם מלא" : "Full Name"}
        </Label>
        <Input
          id="fullName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={isRTL ? "הזן את שמך המלא" : "Enter your full name"}
          className="text-start h-12 rounded-xl text-base"
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            backgroundColor: settings?.inputBackgroundColor || "#f9fafb",
            color: settings?.inputTextColor || undefined,
            borderColor: settings?.inputBorderColor || "#e5e7eb",
          }}
        />
      </div>

      {/* Guest Count */}
      <GuestCounter
        value={guestCount}
        onChange={setGuestCount}
        min={1}
        max={20}
        label={isRTL ? "מספר אורחים" : "Number of Guests"}
        isRTL={isRTL}
        backgroundColor={settings?.guestCounterBackground || settings?.inputBackgroundColor || "#f9fafb"}
        textColor={settings?.guestCounterTextColor || settings?.labelTextColor || undefined}
        borderColor={settings?.inputBorderColor || "#e5e7eb"}
        accentColor={settings?.guestCounterAccent || settings?.accentColor || "#1a1a1a"}
      />

      {/* RSVP Question */}
      <div className="space-y-3">
        <Label
          className="text-base font-medium"
          style={{ color: settings?.labelTextColor || undefined }}
        >
          {isRTL ? "האם תגיעו?" : "Will you attend?"}
        </Label>
        <div className="grid grid-cols-2 gap-3" dir={isRTL ? "rtl" : "ltr"}>
          {/* Accept Button */}
          <button
            type="button"
            onClick={() => setStatus("ACCEPTED")}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-5 transition-all duration-300 overflow-hidden",
              status === "ACCEPTED"
                ? "shadow-md"
                : "border border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/80"
            )}
            style={status === "ACCEPTED" ? {
              backgroundColor: settings?.accentColor || "#1a1a1a",
            } : undefined}
          >
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                  status !== "ACCEPTED" && "bg-gray-200/80 text-gray-400 group-hover:bg-gray-300/80 group-hover:text-gray-500 dark:bg-gray-700 dark:text-gray-500"
                )}
                style={status === "ACCEPTED" ? {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                } : undefined}
              >
                <Icons.heart
                  className={cn(
                    "h-6 w-6 transition-transform duration-300",
                    status === "ACCEPTED" ? "text-white" : "",
                    status !== "ACCEPTED" && "h-5 w-5 group-hover:scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  status === "ACCEPTED"
                    ? "text-white"
                    : "text-gray-400 group-hover:text-gray-500 dark:text-gray-400"
                )}
              >
                {isRTL ? "בשמחה!" : "Count me in!"}
              </span>
            </div>
          </button>

          {/* Decline Button */}
          <button
            type="button"
            onClick={() => setStatus("DECLINED")}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-5 transition-all duration-300 overflow-hidden",
              status === "DECLINED"
                ? "bg-gray-500 shadow-md dark:bg-gray-600"
                : "border border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/80"
            )}
          >
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                  status === "DECLINED"
                    ? "bg-white/20"
                    : "bg-gray-200/80 text-gray-400 group-hover:bg-gray-300/80 group-hover:text-gray-500 dark:bg-gray-700 dark:text-gray-500"
                )}
              >
                <Icons.calendarX
                  className={cn(
                    "transition-transform duration-300",
                    status === "DECLINED" ? "h-6 w-6 text-white" : "h-5 w-5 group-hover:scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  status === "DECLINED"
                    ? "text-white"
                    : "text-gray-400 group-hover:text-gray-500 dark:text-gray-400"
                )}
              >
                {isRTL ? "לא הפעם" : "Not this time"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className={cn(
          "group relative w-full h-14 text-base font-semibold transition-all duration-300 overflow-hidden",
          settings?.buttonStyle === "outline" && "bg-transparent border-2 hover:bg-black/5",
          settings?.buttonStyle === "ghost" && "bg-transparent hover:bg-accent",
          settings?.buttonShadow !== false && "shadow-lg hover:shadow-xl",
          settings?.buttonSize === "sm" && "h-11 text-sm",
          settings?.buttonSize === "lg" && "h-16 text-lg",
          !status && "opacity-60 cursor-not-allowed"
        )}
        style={{
          backgroundColor: settings?.buttonStyle === "outline" || settings?.buttonStyle === "ghost"
            ? "transparent"
            : settings?.buttonColor || accentColor,
          color: settings?.buttonStyle === "outline" || settings?.buttonStyle === "ghost"
            ? settings?.buttonColor || accentColor
            : settings?.buttonTextColor || "#ffffff",
          borderRadius: settings?.buttonBorderRadius ? `${settings.buttonBorderRadius}px` : "16px",
          borderColor: settings?.buttonBorderColor || settings?.buttonColor || accentColor,
        }}
        disabled={isLoading || !status}
      >
        {/* Hover gradient effect */}
        <span
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
          style={{ display: settings?.buttonStyle === "outline" || settings?.buttonStyle === "ghost" ? "none" : undefined }}
        />

        {/* Button content */}
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <Icons.spinner className="h-5 w-5 animate-spin" />
          ) : (
            <Icons.send className={cn(
              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
              isRTL && "rotate-180"
            )} />
          )}
          <span>{isRTL ? "שליחת אישור" : "Send RSVP"}</span>
        </span>
      </Button>

      {/* Already responded notice */}
      {existingRsvp && existingRsvp.respondedAt && (
        <p className="text-center text-xs text-muted-foreground">
          {isRTL
            ? `כבר השבתם להזמנה זו ב-${format(new Date(existingRsvp.respondedAt), "d/M/yyyy", { locale: dateLocale })}. תוכלו לעדכן את התשובה.`
            : `You already responded on ${format(new Date(existingRsvp.respondedAt), "MM/dd/yyyy", { locale: dateLocale })}. You can update your response.`}
        </p>
      )}
    </form>
  );
}
