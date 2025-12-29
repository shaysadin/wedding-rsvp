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
        className="group relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-1.5 text-center transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] sm:h-16 sm:w-16 sm:gap-1 sm:p-2"
      >
        <Icons.eye className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-500 sm:h-5 sm:w-5" />
        <span className="text-[9px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[10px]">
          {isHebrew ? "צפייה" : "View"}
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
