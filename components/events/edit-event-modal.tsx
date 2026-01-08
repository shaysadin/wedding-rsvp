"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { WeddingEvent } from "@prisma/client";

import { updateEvent } from "@/actions/events";
import { uploadInvitationImage, deleteInvitationImage } from "@/actions/upload";
import { updateEventSchema, type UpdateEventInput } from "@/lib/validations/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/shared/icons";
import { DateTimePicker } from "@/components/ui/date-time-picker";

// Serialized event type for client components (Decimal converted to number)
type SerializedWeddingEvent = Omit<WeddingEvent, 'totalBudget'> & {
  totalBudget: number | null;
};

interface EditEventModalProps {
  event: SerializedWeddingEvent;
  variant?: "button" | "card";
}

export function EditEventModal({ event, variant = "button" }: EditEventModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationImagePreview, setInvitationImagePreview] = useState<string | null>(
    event.invitationImageUrl || null
  );
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHebrew = locale === "he";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      id: event.id,
      title: event.title,
      description: event.description || "",
      dateTime: event.dateTime ? new Date(event.dateTime).toISOString() : undefined,
      location: event.location,
      venue: event.venue || "",
      notes: event.notes || "",
      imageUrl: event.imageUrl || "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset({
        id: event.id,
        title: event.title,
        description: event.description || "",
        dateTime: event.dateTime ? new Date(event.dateTime).toISOString() : undefined,
        location: event.location,
        venue: event.venue || "",
        notes: event.notes || "",
        imageUrl: event.imageUrl || "",
      });
      setInvitationImagePreview(event.invitationImageUrl || null);
      setNewImageBase64(null);
      setImageChanged(false);
    }
  }, [open, event, reset]);

  const handleInvitationImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(isHebrew ? "אנא בחר קובץ תמונה" : "Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isHebrew ? "התמונה גדולה מדי. גודל מקסימלי 5MB" : "Image is too large. Maximum size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setNewImageBase64(base64);
      setInvitationImagePreview(base64);
      setImageChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const removeInvitationImage = () => {
    setNewImageBase64(null);
    setInvitationImagePreview(null);
    setImageChanged(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: UpdateEventInput) => {
    setIsLoading(true);

    try {
      // Handle invitation image changes
      if (imageChanged) {
        if (newImageBase64) {
          // Upload new image
          const uploadResult = await uploadInvitationImage(event.id, newImageBase64);
          if (uploadResult.error) {
            toast.error(uploadResult.error);
          }
        } else if (!invitationImagePreview && event.invitationImageUrl) {
          // Delete existing image
          await deleteInvitationImage(event.id);
        }
      }

      // Update event data
      const result = await updateEvent(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isHebrew ? "האירוע עודכן בהצלחה" : "Event updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(isHebrew ? "משהו השתבש" : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while loading
    if (!newOpen && isLoading) {
      return;
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === "card" ? (
          <button className="group relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-1.5 text-center transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] sm:h-16 sm:w-16 sm:gap-1 sm:p-2">
            <Icons.settings className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
            <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
              {isHebrew ? "עריכה" : "Edit"}
            </span>
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Icons.settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {isHebrew ? "ערוך פרטי אירוע" : "Edit Event Info"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold sm:text-xl">
            {isHebrew ? "עריכת פרטי האירוע" : "Edit Event Details"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-6">
          {/* Event Information Section */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isHebrew ? "פרטי האירוע" : "Event Information"}
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t("eventName")}
              </Label>
              <Input
                id="title"
                placeholder={isHebrew ? "לדוגמה: החתונה של שרה ודוד" : "e.g., Wedding of Sarah & David"}
                disabled={isLoading}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="dateTime">
                {t("eventDate")}
              </Label>
              <Controller
                name="dateTime"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date?.toISOString())}
                    disabled={isLoading}
                    locale={locale}
                    placeholder={isHebrew ? "בחר תאריך ושעה" : "Pick date and time"}
                  />
                )}
              />
              {errors.dateTime && (
                <p className="text-xs text-red-600">{errors.dateTime.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                {t("location")}
              </Label>
              <Input
                id="location"
                placeholder={isHebrew ? "לדוגמה: תל אביב, ישראל" : "e.g., Tel Aviv, Israel"}
                disabled={isLoading}
                {...register("location")}
              />
              {errors.location && (
                <p className="text-xs text-red-600">{errors.location.message}</p>
              )}
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue">
                {t("venue")}
              </Label>
              <Input
                id="venue"
                placeholder={isHebrew ? "לדוגמה: אולם האירועים הגדול" : "e.g., Grand Hotel Ballroom"}
                disabled={isLoading}
                {...register("venue")}
              />
              {errors.venue && (
                <p className="text-xs text-red-600">{errors.venue.message}</p>
              )}
            </div>
          </div>

          {/* Description - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("description")}
            </Label>
            <Textarea
              id="description"
              placeholder={isHebrew ? "תיאור אופציונלי לאירוע" : "Optional description for your event"}
              rows={3}
              disabled={isLoading}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Notes - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {tCommon("notes")}
            </Label>
            <Textarea
              id="notes"
              placeholder={isHebrew ? "הערות פנימיות (לא נראות לאורחים)" : "Internal notes (not visible to guests)"}
              rows={2}
              disabled={isLoading}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Invitation Image Upload */}
          <div className="space-y-2">
            <Label>
              {isHebrew ? "תמונת הזמנה (לשליחה ב-WhatsApp)" : "Invitation Image (for WhatsApp)"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isHebrew
                ? "תמונה זו תישלח יחד עם הודעות WhatsApp אינטראקטיביות"
                : "This image will be sent with interactive WhatsApp messages"}
            </p>

            {invitationImagePreview ? (
              <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={invitationImagePreview}
                  alt="Invitation preview"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={removeInvitationImage}
                  disabled={isLoading}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Icons.close className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex aspect-[4/3] w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 transition-colors hover:border-purple-400 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-700 dark:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:bg-purple-900/30"
              >
                <Icons.upload className="h-8 w-8 text-purple-500" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {isHebrew ? "העלה תמונת הזמנה" : "Upload Invitation Image"}
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP (max 5MB)
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInvitationImageSelect}
              className="hidden"
            />
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:gap-0 sm:border-0 sm:pt-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isHebrew ? "שמור שינויים" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
