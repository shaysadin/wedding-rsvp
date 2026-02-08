"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MapPin, Phone, User, Calendar, CheckCircle2, Bus, MapPinned } from "lucide-react";

import { registerForTransportationGeneric } from "@/actions/transportation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface PickupPlace {
  id: string;
  name: string;
  nameHe: string | null;
  nameEn: string | null;
  nameAr: string | null;
  address: string | null;
}

interface GenericTransportationFormProps {
  event: {
    id: string;
    title: string;
    dateTime: Date | string;
    location: string;
    venue: string | null;
  };
  locale: string;
  pickupPlaces: PickupPlace[];
}

const LANGUAGES = [
  { code: "he", nameHe: "עברית", nameEn: "Hebrew", nameAr: "العبرية", flag: "🇮🇱" },
  { code: "en", nameHe: "אנגלית", nameEn: "English", nameAr: "الإنجليزية", flag: "🇬🇧" },
  { code: "ar", nameHe: "ערבית", nameEn: "Arabic", nameAr: "العربية", flag: "🇸🇦" },
];

export function GenericTransportationForm({ event, locale, pickupPlaces }: GenericTransportationFormProps) {
  // UI language state (not saved in registration)
  const [selectedLanguage, setSelectedLanguage] = useState(locale || "he");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pickupPlaceId, setPickupPlaceId] = useState<string>("");
  const [notes, setNotes] = useState("");

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
        quantity: "כמות אנשים",
        quantityHelp: "כמה אנשים יגיעו איתך (כולל אותך)",
        pickupPlace: "נקודת איסוף",
        selectPickup: "בחר נקודת איסוף",
        notes: "הערות",
        notesPlaceholder: "הערות נוספות למארגנים",
        submit: "שלח",
        saving: "שומר...",
        people: "אנשים",
        noPickupPlaces: "אין נקודות איסוף זמינות כרגע",
        register: "הירשם להסעות",
      },
      en: {
        registrationTitle: "Transportation Registration",
        registrationDesc: "We'd love to arrange transportation for you",
        successTitle: "Successfully Registered!",
        successDesc: "You're registered for transportation to",
        eventDate: "Event Date",
        eventLocation: "Event Location",
        yourDetails: "Your Registration Details",
        contactSoon: "We'll contact you soon with transportation details",
        fullName: "Full Name",
        phoneNumber: "Phone Number",
        quantity: "Number of People",
        quantityHelp: "How many people will come with you (including you)",
        pickupPlace: "Pickup Place",
        selectPickup: "Select pickup place",
        notes: "Notes",
        notesPlaceholder: "Additional notes for organizers",
        submit: "Submit",
        saving: "Saving...",
        people: "people",
        noPickupPlaces: "No pickup places available at the moment",
        register: "Register for Transportation",
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
        quantity: "عدد الأشخاص",
        quantityHelp: "كم عدد الأشخاص القادمين معك (بما فيك أنت)",
        pickupPlace: "نقطة الاستلام",
        selectPickup: "اختر نقطة الاستلام",
        notes: "ملاحظات",
        notesPlaceholder: "ملاحظات إضافية للمنظمين",
        submit: "إرسال",
        saving: "جاري الحفظ...",
        people: "أشخاص",
        noPickupPlaces: "لا توجد نقاط استلام متاحة حالياً",
        register: "التسجيل للنقل",
      },
    };
    return translations[selectedLanguage][key] || key;
  };

  const getPickupPlaceName = (place: PickupPlace) => {
    if (selectedLanguage === "he" && place.nameHe) return place.nameHe;
    if (selectedLanguage === "en" && place.nameEn) return place.nameEn;
    if (selectedLanguage === "ar" && place.nameAr) return place.nameAr;
    return place.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phoneNumber.trim()) {
      toast.error(selectedLanguage === "he" ? "נא למלא את כל השדות הנדרשים" : selectedLanguage === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    // Validate pickup place is selected
    if (!pickupPlaceId) {
      toast.error(selectedLanguage === "he" ? "יש לבחור נקודת איסוף" : selectedLanguage === "ar" ? "يرجى اختيار نقطة الاستلام" : "Please select a pickup place");
      return;
    }

    // Find the selected pickup place and handle if it was deleted
    const selectedPlace = pickupPlaces.find(p => p.id === pickupPlaceId);
    if (!selectedPlace) {
      toast.error(selectedLanguage === "he" ? "נקודת האיסוף שנבחרה אינה קיימת יותר, אנא בחר נקודה אחרת" : selectedLanguage === "ar" ? "نقطة الاستلام المحددة لم تعد موجودة، يرجى اختيار نقطة أخرى" : "Selected pickup place no longer exists, please select another");
      setPickupPlaceId("");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerForTransportationGeneric({
        eventId: event.id,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        pickupPlaceId: pickupPlaceId,
        location: getPickupPlaceName(selectedPlace),
        quantity: quantity,
        language: selectedLanguage,
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(selectedLanguage === "he" ? "נרשמת בהצלחה להסעות!" : selectedLanguage === "ar" ? "تم التسجيل بنجاح!" : "Successfully registered for transportation!");
        setIsRegistered(true);
      }
    } catch (error) {
      console.error("Exception in handleSubmit:", error);
      toast.error(selectedLanguage === "he" ? "שגיאה בשמירה" : selectedLanguage === "ar" ? "فشل الحفظ" : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    const selectedPlace = pickupPlaces.find(p => p.id === pickupPlaceId);
    const pickupPlaceName = selectedPlace ? getPickupPlaceName(selectedPlace) : "";

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

      <Card className="w-full max-w-2xl shadow-lg border-green-200" dir={isRTL ? "rtl" : "ltr"}>
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
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t("eventDate")}
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
                  {t("eventLocation")}
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
              {t("yourDetails")}
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
                <Bus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {quantity} {t("people")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{pickupPlaceName}</span>
              </div>
              {notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{notes}</p>
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

    <Card className="w-full max-w-2xl shadow-lg" dir={isRTL ? "rtl" : "ltr"}>
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

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName")} *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="min-h-[48px] text-base"
                disabled={isSubmitting}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t("phoneNumber")} *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="min-h-[48px] text-base"
                disabled={isSubmitting}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{t("quantity")} *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="20"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                required
                className="min-h-[48px] text-base"
                dir="ltr"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">{t("quantityHelp")}</p>
            </div>

            {/* Pickup Place */}
            <div className="space-y-2">
              <Label htmlFor="pickupPlace">{t("pickupPlace")} *</Label>
              {pickupPlaces.length > 0 ? (
                <Select value={pickupPlaceId} onValueChange={setPickupPlaceId} required disabled={isSubmitting}>
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
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                  {t("noPickupPlaces")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-base resize-none"
                placeholder={t("notesPlaceholder")}
                disabled={isSubmitting}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || pickupPlaces.length === 0}
            className="w-full min-h-[48px] text-base"
          >
            {isSubmitting ? t("saving") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
