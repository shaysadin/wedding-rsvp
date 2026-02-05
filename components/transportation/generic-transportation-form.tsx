"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MapPin, Phone, User, Calendar, CheckCircle2, Bus } from "lucide-react";

import { registerForTransportationGeneric } from "@/actions/transportation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface GenericTransportationFormProps {
  event: {
    id: string;
    title: string;
    dateTime: Date | string;
    location: string;
    venue: string | null;
  };
  locale: string;
}

export function GenericTransportationForm({ event, locale }: GenericTransportationFormProps) {
  const isRTL = locale === "he";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const eventDate = typeof event.dateTime === 'string' ? new Date(event.dateTime) : event.dateTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phoneNumber.trim() || !location.trim()) {
      toast.error(isRTL ? "נא למלא את כל השדות הנדרשים" : "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerForTransportationGeneric({
        eventId: event.id,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        location: location.trim(),
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "נרשמת בהצלחה להסעות!" : "Successfully registered for transportation!");
        setIsRegistered(true);
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה בשמירה" : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    return (
      <Card className="w-full max-w-2xl shadow-lg border-green-200" dir={isRTL ? "rtl" : "ltr"}>
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">
            {isRTL ? "נרשמת בהצלחה!" : "Successfully Registered!"}
          </CardTitle>
          <CardDescription className="text-base">
            {isRTL
              ? "נרשמת להסעות לאירוע"
              : "You're registered for transportation to"}
            <br />
            <span className="font-semibold text-foreground">{event.title}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Event Details */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isRTL ? "תאריך האירוע" : "Event Date"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(eventDate, "PPp", { locale: isRTL ? he : undefined })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isRTL ? "מיקום האירוע" : "Event Location"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {event.venue || event.location}
                </p>
              </div>
            </div>
          </div>

          {/* Registration Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {isRTL ? "פרטי ההרשמה שלך" : "Your Registration Details"}
            </h3>
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{location}</span>
              </div>
              {notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{notes}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            {isRTL
              ? "נצור איתך קשר לגבי פרטי ההסעות בקרוב"
              : "We'll contact you soon with transportation details"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg" dir={isRTL ? "rtl" : "ltr"}>
      <CardHeader className="text-center space-y-2 pb-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Bus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {isRTL ? "הרשמה להסעות" : "Transportation Registration"}
        </CardTitle>
        <CardDescription className="text-base">
          {isRTL ? "נשמח לארגן עבורך הסעות לאירוע" : "We'd love to arrange transportation for you"}
          <br />
          <span className="font-semibold text-foreground">{event.title}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Info */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(eventDate, "PPp", { locale: isRTL ? he : undefined })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.venue || event.location}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base">
                {isRTL ? "שם מלא" : "Full Name"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRTL ? "הזן שם מלא" : "Enter your full name"}
                required
                className="min-h-[48px] text-base"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-base">
                {isRTL ? "מספר טלפון" : "Phone Number"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={isRTL ? "הזן מספר טלפון" : "Enter your phone number"}
                required
                className="min-h-[48px] text-base"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-base">
                {isRTL ? "נקודת איסוף" : "Pickup Location"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isRTL ? "הזן כתובת או נקודת ציון" : "Enter address or landmark"}
                required
                className="min-h-[48px] text-base"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">
                {isRTL ? "הערות (אופציונלי)" : "Notes (Optional)"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRTL ? "הערות נוספות" : "Additional notes"}
                rows={3}
                className="text-base resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full min-h-[48px] text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className="me-2 h-5 w-5 animate-spin" />
                {isRTL ? "שומר..." : "Saving..."}
              </>
            ) : (
              <>
                <Bus className="me-2 h-5 w-5" />
                {isRTL ? "הירשם להסעות" : "Register for Transportation"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
