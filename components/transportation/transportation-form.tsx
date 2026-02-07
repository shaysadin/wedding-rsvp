"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MapPin, Phone, User, Calendar, CheckCircle2, Bus, MapPinned } from "lucide-react";

import { registerForTransportation, getPickupPlaces } from "@/actions/transportation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface TransportationFormProps {
  guest: {
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
  };
  event: {
    id: string;
    title: string;
    dateTime: Date | string;
    location: string;
    venue: string | null;
  };
  existingRegistration: {
    id: string;
    fullName: string;
    phoneNumber: string;
    pickupPlaceId: string | null;
    location: string;
    notes: string | null;
    registeredAt: Date | string;
    pickupPlace?: {
      id: string;
      name: string;
      nameHe: string | null;
      nameEn: string | null;
      nameAr: string | null;
      address: string | null;
    } | null;
  } | null;
  locale: string;
}

const LANGUAGES = [
  { code: "he", nameHe: "עברית", nameEn: "Hebrew", nameAr: "العبرية", flag: "🇮🇱" },
  { code: "en", nameHe: "אנגלית", nameEn: "English", nameAr: "الإنجليزية", flag: "🇬🇧" },
  { code: "ar", nameHe: "ערבית", nameEn: "Arabic", nameAr: "العربية", flag: "🇸🇦" },
];

export function TransportationForm({ guest, event, existingRegistration, locale }: TransportationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(!!existingRegistration);
  const [pickupPlaces, setPickupPlaces] = useState<Array<{
    id: string;
    name: string;
    nameHe: string | null;
    nameEn: string | null;
    nameAr: string | null;
    address: string | null;
  }>>([]);

  // UI language state (not saved in registration)
  const [selectedLanguage, setSelectedLanguage] = useState("he");

  // Form state
  const [fullName, setFullName] = useState(existingRegistration?.fullName || guest.name || "");
  const [phoneNumber, setPhoneNumber] = useState(existingRegistration?.phoneNumber || guest.phoneNumber || "");
  const [pickupPlaceId, setPickupPlaceId] = useState<string>(existingRegistration?.pickupPlaceId || "");
  const [customLocation, setCustomLocation] = useState(existingRegistration?.location || "");
  const [notes, setNotes] = useState(existingRegistration?.notes || "");

  const isRTL = selectedLanguage === "he" || selectedLanguage === "ar";
  const eventDate = typeof event.dateTime === 'string' ? new Date(event.dateTime) : event.dateTime;

  // Translations based on selected language
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      he: {
        registrationTitle: "הרשמה להסעות",
        registrationDesc: "נשמח לארגן עבורך הסעות לאירוע",
        successTitle: "נרשמת בהצלחה!",
        successDesc: "נרשמת להסעות לאירוע",
        eventDate: "תאריך האירוע",
        eventLocation: "מיקום האירוע",
        yourDetails: "פרטי ההרשמה שלך",
        contactSoon: "נצור איתך קשר לגבי פרטי ההסעות בקרוב",
        fullName: "שם מלא",
        phoneNumber: "מספר טלפון",
        pickupPlace: "נקודת איסוף",
        selectPickup: "בחר נקודת איסוף",
        customLocation: "מיקום מותאם אישית",
        location: "מיקום",
        notes: "הערות",
        notesPlaceholder: "הערות נוספות למארגנים",
        submit: "שלח",
        updating: "מעדכן...",
        registering: "נרשם...",
      },
      en: {
        registrationTitle: "Transportation Registration",
        registrationDesc: "We'd love to arrange transportation for you",
        successTitle: "Successfully Registered!",
        successDesc: "You are registered for transportation to",
        eventDate: "Event Date",
        eventLocation: "Event Location",
        yourDetails: "Your Registration Details",
        contactSoon: "We will contact you soon regarding transportation details",
        fullName: "Full Name",
        phoneNumber: "Phone Number",
        pickupPlace: "Pickup Place",
        selectPickup: "Select pickup place",
        customLocation: "Custom Location",
        location: "Location",
        notes: "Notes",
        notesPlaceholder: "Additional notes for organizers",
        submit: "Submit",
        updating: "Updating...",
        registering: "Registering...",
      },
      ar: {
        registrationTitle: "التسجيل للنقل",
        registrationDesc: "يسعدنا ترتيب وسائل النقل لك",
        successTitle: "تم التسجيل بنجاح!",
        successDesc: "أنت مسجل للنقل إلى",
        eventDate: "تاريخ الحدث",
        eventLocation: "موقع الحدث",
        yourDetails: "تفاصيل التسجيل الخاصة بك",
        contactSoon: "سنتواصل معك قريباً بخصوص تفاصيل النقل",
        fullName: "الاسم الكامل",
        phoneNumber: "رقم الهاتف",
        pickupPlace: "نقطة الالتقاء",
        selectPickup: "اختر نقطة الالتقاء",
        customLocation: "موقع مخصص",
        location: "الموقع",
        notes: "ملاحظات",
        notesPlaceholder: "ملاحظات إضافية للمنظمين",
        submit: "إرسال",
        updating: "جاري التحديث...",
        registering: "جاري التسجيل...",
      },
    };
    return translations[selectedLanguage][key] || key;
  };

  // Load pickup places on mount
  useEffect(() => {
    const loadPickupPlaces = async () => {
      const result = await getPickupPlaces(event.id);
      if (!result.error && result.places) {
        setPickupPlaces(result.places);
      }
    };

    loadPickupPlaces();
  }, [event.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await registerForTransportation({
        guestId: guest.id,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        pickupPlaceId: pickupPlaceId || undefined,
        location: pickupPlaceId ? (pickupPlaces.find(p => p.id === pickupPlaceId)?.name || customLocation) : customLocation.trim(),
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(selectedLanguage === "he" ? "נרשמת בהצלחה להסעות!" : selectedLanguage === "ar" ? "تم التسجيل بنجاح!" : "Successfully registered for transportation!");
        setIsRegistered(true);
      }
    } catch (error) {
      toast.error(selectedLanguage === "he" ? "שגיאה בשמירה" : selectedLanguage === "ar" ? "فشل الحفظ" : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPickupPlaceName = (place: typeof pickupPlaces[0]) => {
    if (selectedLanguage === "he" && place.nameHe) return place.nameHe;
    if (selectedLanguage === "en" && place.nameEn) return place.nameEn;
    if (selectedLanguage === "ar" && place.nameAr) return place.nameAr;
    return place.name;
  };

  if (isRegistered && existingRegistration) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        {/* Language Selector - Outside Form */}
        <div className="flex justify-center">
          <RadioGroup value={selectedLanguage} onValueChange={setSelectedLanguage} className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <label
                key={lang.code}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all",
                  selectedLanguage === lang.code
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={lang.code} className="sr-only" />
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium">
                  {lang[`name${selectedLanguage === "he" ? "He" : selectedLanguage === "ar" ? "Ar" : "En"}`]}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Card className="shadow-lg border-green-200" dir={isRTL ? "rtl" : "ltr"}>
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">
              {t("successTitle")}
            </CardTitle>
            <CardDescription className="text-base">
              {t("successDesc")}
              <br />
              <span className="font-semibold text-foreground">{event.title}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("eventDate")}</p>
                  <p className="text-muted-foreground">
                    {format(eventDate, "PPP", { locale: isRTL ? he : undefined })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("eventLocation")}</p>
                  <p className="text-muted-foreground">{event.location}</p>
                  {event.venue && <p className="text-muted-foreground text-xs">{event.venue}</p>}
                </div>
              </div>
            </div>

            {/* Registration Details */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t("yourDetails")}</h3>
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{existingRegistration.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{existingRegistration.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPinned className="h-4 w-4 text-muted-foreground" />
                  <span>{existingRegistration.location}</span>
                </div>
                {existingRegistration.notes && (
                  <div className="flex items-start gap-2 text-sm pt-2 border-t">
                    <span className="text-muted-foreground">{t("notes")}:</span>
                    <span className="italic">{existingRegistration.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              {t("contactSoon")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Language Selector - Outside Form */}
      <div className="flex justify-center">
        <RadioGroup value={selectedLanguage} onValueChange={setSelectedLanguage} className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <label
              key={lang.code}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all",
                selectedLanguage === lang.code
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={lang.code} className="sr-only" />
              <span className="text-xl">{lang.flag}</span>
              <span className="text-sm font-medium">
                {lang[`name${selectedLanguage === "he" ? "He" : selectedLanguage === "ar" ? "Ar" : "En"}`]}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <Card className="shadow-lg" dir={isRTL ? "rtl" : "ltr"}>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{t("registrationTitle")}</CardTitle>
              <CardDescription>{t("registrationDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Info */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm">{event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(eventDate, "PPP", { locale: isRTL ? he : undefined })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName")} *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="min-h-[48px] text-base"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t("phoneNumber")} *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="min-h-[48px] text-base"
                dir="ltr"
              />
            </div>

            {/* Pickup Place */}
            {pickupPlaces.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pickupPlace">{t("pickupPlace")}</Label>
                <Select value={pickupPlaceId} onValueChange={setPickupPlaceId}>
                  <SelectTrigger className="min-h-[48px] text-base">
                    <SelectValue placeholder={t("selectPickup")} />
                  </SelectTrigger>
                  <SelectContent>
                    {pickupPlaces.map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {getPickupPlaceName(place)}
                        {place.address && <span className="text-xs text-muted-foreground ms-2">({place.address})</span>}
                      </SelectItem>
                    ))}
                    <SelectItem value="">
                      {t("customLocation")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Location */}
            {(!pickupPlaceId || pickupPlaces.length === 0) && (
              <div className="space-y-2">
                <Label htmlFor="customLocation">{t("location")} *</Label>
                <Input
                  id="customLocation"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  required={!pickupPlaceId}
                  className="min-h-[48px] text-base"
                  dir={isRTL ? "rtl" : "ltr"}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-base resize-none"
                placeholder={t("notesPlaceholder")}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] text-base"
            >
              {isSubmitting
                ? (existingRegistration ? t("updating") : t("registering"))
                : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
