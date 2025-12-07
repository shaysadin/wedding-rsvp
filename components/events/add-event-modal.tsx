"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createEvent } from "@/actions/events";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
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
} from "@/components/ui/dialog";
import { Icons } from "@/components/shared/icons";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventModal({ open, onOpenChange }: AddEventModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);

  const isHebrew = locale === "he";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      dateTime: undefined,
      location: "",
      venue: "",
      notes: "",
      imageUrl: "",
    },
  });

  const onSubmit = async (data: CreateEventInput) => {
    setIsLoading(true);

    try {
      const result = await createEvent(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isHebrew ? "האירוע נוצר בהצלחה" : "Event created successfully");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(isHebrew ? "משהו השתבש" : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isHebrew ? "הוספת אירוע חדש" : "Add New Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Event Information Section */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isHebrew ? "פרטי האירוע" : "Event Information"}
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isHebrew ? "שמור אירוע" : "Save Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
