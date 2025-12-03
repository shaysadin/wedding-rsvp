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
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

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

  const [status, setStatus] = useState<RsvpStatus | null>(
    existingRsvp?.status || null
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

        {status === "ACCEPTED" && (settings?.showEventDetails !== false) && (
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Welcome Section */}
      <div className="text-center">
        {settings?.coupleImageUrl && (
          <img
            src={settings.coupleImageUrl}
            alt=""
            className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
          />
        )}
        <h1 className="text-2xl font-bold">
          {settings?.welcomeTitle || event.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {settings?.welcomeMessage || (isRTL
            ? `שלום ${guest.name}, נשמח לדעת אם תוכלו להגיע לאירוע שלנו`
            : `Hello ${guest.name}, we'd love to know if you can attend our event`)}
        </p>
      </div>

      {/* Event Date Calendar */}
      {settings?.showCalendar !== false && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {isRTL ? "תאריך האירוע" : "Event Date"}
          </Label>
          <div className="flex justify-center rounded-lg border bg-card p-3">
            <Calendar
              mode="single"
              selected={eventDate}
              month={eventDate}
              locale={dateLocale}
              disabled
              className="rounded-md"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      {(settings?.showGoogleMaps !== false || settings?.showWaze !== false) && (
        <div className="flex gap-2">
          {settings?.showGoogleMaps !== false && (
            <a
              href={getGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-card p-3 text-sm hover:bg-accent transition-colors"
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
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-card p-3 text-sm hover:bg-accent transition-colors"
            >
              <Icons.mapPin className="h-4 w-4" />
              Waze
            </a>
          )}
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          {isRTL ? "שם מלא" : "Full Name"}
        </Label>
        <Input
          id="fullName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={isRTL ? "הזן את שמך המלא" : "Enter your full name"}
          className="text-start"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      {/* Guest Count */}
      <div className="space-y-2">
        <Label htmlFor="guestCount">
          {isRTL ? "מספר אורחים" : "Number of Guests"}
        </Label>
        <Input
          id="guestCount"
          type="number"
          min={1}
          max={20}
          value={guestCount}
          onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
          className="text-start"
        />
      </div>

      {/* RSVP Question */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          {isRTL ? "האם תגיעו?" : "Will you attend?"}
        </Label>
        <div className="grid grid-cols-2 gap-3" dir={isRTL ? "rtl" : "ltr"}>
          <button
            type="button"
            onClick={() => setStatus("ACCEPTED")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
              status === "ACCEPTED"
                ? "border-green-500 bg-green-50 text-green-700 shadow-md ring-2 ring-green-200 dark:bg-green-950 dark:text-green-300"
                : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-600"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              status === "ACCEPTED" ? "bg-green-500 text-white" : "bg-green-100 text-green-600 dark:bg-green-900"
            )}>
              <Icons.check className="h-5 w-5" />
            </div>
            <span className="font-medium text-sm">
              {isRTL ? "כן, אגיע בשמחה!" : "Yes, I'll be there!"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("DECLINED")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
              status === "DECLINED"
                ? "border-red-500 bg-red-50 text-red-700 shadow-md ring-2 ring-red-200 dark:bg-red-950 dark:text-red-300"
                : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-red-600"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              status === "DECLINED" ? "bg-red-500 text-white" : "bg-red-100 text-red-600 dark:bg-red-900"
            )}>
              <Icons.close className="h-5 w-5" />
            </div>
            <span className="font-medium text-sm">
              {isRTL ? "מצטער, לא אוכל" : "Sorry, can't make it"}
            </span>
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className={cn(
          "w-full",
          settings?.buttonStyle === "outline" && "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
          settings?.buttonStyle === "ghost" && "bg-transparent hover:bg-accent"
        )}
        style={{
          backgroundColor: settings?.buttonColor || undefined,
          color: settings?.buttonTextColor || undefined,
          borderRadius: settings?.buttonBorderRadius ? `${settings.buttonBorderRadius}px` : undefined,
        }}
        disabled={isLoading || !status}
      >
        {isLoading ? (
          <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
        ) : null}
        {isRTL ? "שליחת אישור" : "Send RSVP"}
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
