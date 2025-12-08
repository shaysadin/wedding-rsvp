"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface CopyLinkButtonProps {
  eventId: string;
}

export function CopyLinkButton({ eventId }: CopyLinkButtonProps) {
  const t = useTranslations("events");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // For wedding owners to share the event info (not individual RSVP links)
    // Individual guest RSVP links are generated per guest
    const url = `${window.location.origin}/rsvp/${eventId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 px-2.5 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Icons.check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t("copied")}
        </>
      ) : (
        <>
          <Icons.copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t("copyRsvpLink")}
        </>
      )}
    </Button>
  );
}
