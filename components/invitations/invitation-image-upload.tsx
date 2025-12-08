"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import Image from "next/image";

import { uploadInvitationImage, deleteInvitationImage } from "@/actions/invitations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface InvitationImageUploadProps {
  eventId: string;
  currentImageUrl: string | null;
}

export function InvitationImageUpload({
  eventId,
  currentImageUrl,
}: InvitationImageUploadProps) {
  const t = useTranslations("invitations");
  const tc = useTranslations("common");

  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(t("invalidFormat"));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }

      setIsUploading(true);

      try {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const result = await uploadInvitationImage(eventId, base64);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        if (result.url) {
          setImageUrl(result.url);
          toast.success(t("uploadSuccess"));
        }
      } catch {
        toast.error(t("uploadFailed"));
      } finally {
        setIsUploading(false);
      }
    },
    [eventId, t]
  );

  const handleDelete = async () => {
    if (!imageUrl) return;

    setIsDeleting(true);
    try {
      const result = await deleteInvitationImage(eventId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setImageUrl(null);
      toast.success(t("imageDeleted"));
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("uploadImage")}</CardTitle>
        <CardDescription>{t("uploadDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {imageUrl ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/5] max-w-sm mx-auto rounded-lg overflow-hidden border">
              <Image
                src={imageUrl}
                alt={t("currentImage")}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex justify-center gap-2">
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <Button variant="outline" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      {t("uploadProgress")}
                    </>
                  ) : (
                    <>
                      <Icons.upload className="mr-2 h-4 w-4" />
                      {t("changeImage")}
                    </>
                  )}
                </Button>
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.trash className="mr-2 h-4 w-4" />
                )}
                {t("deleteImage")}
              </Button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <>
                  <Icons.spinner className="h-10 w-10 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">{t("uploadProgress")}</p>
                </>
              ) : (
                <>
                  <Icons.upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive ? t("dropHere") : t("dragOrClick")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("uploadDescription")}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
