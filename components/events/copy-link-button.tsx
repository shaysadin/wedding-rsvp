"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface PreviewRsvpButtonProps {
  eventId: string;
  firstGuestSlug?: string | null;
}

export function CopyLinkButton({ eventId, firstGuestSlug }: PreviewRsvpButtonProps) {
  const t = useTranslations("events");
  const locale = useLocale();

  const handlePreview = () => {
    // If we have a guest slug, open the actual RSVP page
    // Otherwise, open the customize page which has a preview
    const url = firstGuestSlug
      ? `/rsvp/${firstGuestSlug}`
      : `/${locale}/dashboard/events/${eventId}/customize`;
    window.open(url, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 px-2.5 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
      onClick={handlePreview}
    >
      <Icons.eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      {t("viewRsvpPage")}
    </Button>
  );
}
