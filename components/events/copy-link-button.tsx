"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface PreviewRsvpButtonProps {
  eventId: string;
  firstGuestSlug?: string | null;
  variant?: "button" | "card";
}

export function CopyLinkButton({ eventId, firstGuestSlug, variant = "button" }: PreviewRsvpButtonProps) {
  const t = useTranslations("events");
  const locale = useLocale();
  const isHebrew = locale === "he";

  const handlePreview = () => {
    // If we have a guest slug, open the actual RSVP page
    // Otherwise, open the customize page which has a preview
    const url = firstGuestSlug
      ? `/rsvp/${firstGuestSlug}`
      : `/${locale}/dashboard/events/${eventId}/customize`;
    window.open(url, "_blank");
  };

  if (variant === "card") {
    return (
      <button
        onClick={handlePreview}
        className="group flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card p-2 text-center transition-all hover:border-primary/50 hover:bg-accent sm:h-20 sm:w-20"
      >
        <Icons.eye className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary sm:h-6 sm:w-6" />
        <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
          {isHebrew ? "צפה בדף" : "View Page"}
        </span>
      </button>
    );
  }

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
