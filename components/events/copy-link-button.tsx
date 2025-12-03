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
    <Button variant="outline" onClick={handleCopy}>
      {copied ? (
        <>
          <Icons.check className="me-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Icons.copy className="me-2 h-4 w-4" />
          {t("copyRsvpLink")}
        </>
      )}
    </Button>
  );
}
