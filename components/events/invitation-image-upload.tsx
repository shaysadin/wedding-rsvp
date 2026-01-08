"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/shared/icons";
import { uploadInvitationImage, deleteInvitationImage } from "@/actions/upload";

interface InvitationImageUploadProps {
  eventId: string;
  currentImageUrl?: string | null;
}

export function InvitationImageUpload({ eventId, currentImageUrl }: InvitationImageUploadProps) {
  const locale = useLocale();
  const isRTL = locale === "he";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(isRTL ? "אנא בחר קובץ תמונה" : "Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? "התמונה גדולה מדי. גודל מקסימלי 5MB" : "Image is too large. Maximum size is 5MB");
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;

        const result = await uploadInvitationImage(eventId, base64Data);

        if (result.error) {
          toast.error(result.error);
        } else if (result.success && result.url) {
          setPreviewUrl(result.url);
          toast.success(isRTL ? "התמונה הועלתה בהצלחה" : "Image uploaded successfully");
          router.refresh();
        }

        setUploading(false);
      };

      reader.onerror = () => {
        toast.error(isRTL ? "שגיאה בקריאת הקובץ" : "Error reading file");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(isRTL ? "שגיאה בהעלאת התמונה" : "Error uploading image");
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const result = await deleteInvitationImage(eventId);

      if (result.error) {
        toast.error(result.error);
      } else {
        setPreviewUrl(null);
        toast.success(isRTL ? "התמונה נמחקה" : "Image deleted");
        router.refresh();
      }
    } catch (error) {
      toast.error(isRTL ? "שגיאה במחיקת התמונה" : "Error deleting image");
    }

    setDeleting(false);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={previewUrl ? "outline" : "default"}
          className={!previewUrl ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
        >
          <Icons.media className="me-2 h-4 w-4" />
          {previewUrl
            ? (isRTL ? "תמונת הזמנה ✓" : "Invitation Image ✓")
            : (isRTL ? "העלה תמונת הזמנה" : "Upload Invitation")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.media className="h-5 w-5" />
            {isRTL ? "תמונת הזמנה להודעות" : "Invitation Image for Messages"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? "העלה תמונת הזמנה שתישלח יחד עם הודעות WhatsApp אינטראקטיביות"
              : "Upload an invitation image to include with interactive WhatsApp messages"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Image Preview */}
          {previewUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
              <Image
                src={previewUrl}
                alt="Invitation preview"
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={triggerFileSelect}
                    disabled={uploading}
                  >
                    <Icons.upload className="me-1 h-4 w-4" />
                    {isRTL ? "החלף" : "Replace"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={uploading}
              className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Icons.upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? "לחץ להעלאת תמונה" : "Click to upload image"}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    PNG, JPG, WEBP (max 5MB)
                  </span>
                </>
              )}
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Info text */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "תמונה זו תופיע בראש הודעות WhatsApp אינטראקטיביות כאשר תבחר באפשרות 'כלול תמונת הזמנה' בעת שליחת הודעות."
                : "This image will appear at the top of interactive WhatsApp messages when you select 'Include invitation image' while sending messages."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isRTL ? "סגור" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
