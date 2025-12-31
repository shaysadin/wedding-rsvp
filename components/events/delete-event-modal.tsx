"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, AlertTriangle } from "lucide-react";

import { deleteEvent } from "@/actions/events";
import { isR2Configured } from "@/lib/r2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Icons } from "@/components/shared/icons";

interface DeleteEventModalProps {
  eventId: string;
  eventTitle: string;
  guestCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteEventModal({
  eventId,
  eventTitle,
  guestCount,
  open,
  onOpenChange,
}: DeleteEventModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("events");
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isHebrew = locale === "he";
  const confirmWord = isHebrew ? "מחק" : "DELETE";
  const canDelete = confirmText === confirmWord;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteEvent(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isHebrew
          ? "האירוע נמחק בהצלחה ונשמר בארכיון"
          : "Event deleted and archived successfully"
      );
      onOpenChange(false);
      router.push(`/${locale}/dashboard/events`);
      router.refresh();
    } catch (error) {
      toast.error(isHebrew ? "משהו השתבש" : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDeleting) return;
    if (!newOpen) {
      setConfirmText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold">
            {isHebrew ? "מחיקת אירוע" : "Delete Event"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isHebrew
              ? "פעולה זו תמחק את האירוע לצמיתות."
              : "This action will permanently delete the event."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Archive notice */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <Archive className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {isHebrew ? "הנתונים יישמרו בארכיון" : "Data will be archived"}
              </p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                {isHebrew
                  ? "כל נתוני האירוע יישמרו ויהיו זמינים לצפייה בדף הארכיון."
                  : "All event data will be saved and available in the Archives page."}
              </p>
            </div>
          </div>

          {/* Event summary */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">{eventTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isHebrew
                ? `${guestCount} אורחים יימחקו`
                : `${guestCount} guests will be deleted`}
            </p>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? `הקלד "${confirmWord}" כדי לאשר:`
                : `Type "${confirmWord}" to confirm:`}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              disabled={isDeleting}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            {isHebrew ? "ביטול" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
            {isHebrew ? "מחק אירוע" : "Delete Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
