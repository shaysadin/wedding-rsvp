"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { RsvpStatus } from "@prisma/client";

import { getInvitationImage, getGuestsForInvitations } from "@/actions/invitations";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { InvitationImageUpload } from "@/components/invitations/invitation-image-upload";
import { InvitationsGuestTable } from "@/components/invitations/invitations-guest-table";

interface GuestForInvitation {
  id: string;
  name: string;
  phoneNumber: string | null;
  side: string | null;
  groupName: string | null;
  expectedGuests: number;
  rsvp?: {
    status: RsvpStatus;
    guestCount: number | null;
  } | null;
  imageInvitationSent: boolean;
  imageInvitationStatus: string | null;
  imageInvitationSentAt: Date | null;
}

interface InvitationsPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function InvitationsPage({ params }: InvitationsPageProps) {
  const t = useTranslations("invitations");
  const tc = useTranslations("common");

  const [eventId, setEventId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("en");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestForInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setLocale(p.locale);
    });
  }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      const [imageResult, guestsResult] = await Promise.all([
        getInvitationImage(eventId),
        getGuestsForInvitations(eventId),
      ]);

      if (imageResult.error) {
        toast.error(imageResult.error);
      } else {
        setImageUrl(imageResult.imageUrl || null);
      }

      if (guestsResult.error) {
        toast.error(guestsResult.error);
      } else if (guestsResult.guests) {
        setGuests(guestsResult.guests as GuestForInvitation[]);
      }
    } catch {
      toast.error("Failed to load invitation data");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Load data when eventId is available
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

  // Listen for data refresh events
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener("invitation-data-changed", handleRefresh);
    return () => {
      window.removeEventListener("invitation-data-changed", handleRefresh);
    };
  }, [loadData]);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader heading={t("title")} text={t("description")}>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/dashboard/events/${eventId}`}>
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            {tc("back")}
          </Link>
        </Button>
      </DashboardHeader>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Image Upload Section */}
          <InvitationImageUpload
            eventId={eventId}
            currentImageUrl={imageUrl}
          />

          {/* Guests Table Section */}
          <div className="space-y-4">
            <InvitationsGuestTable
              guests={guests}
              eventId={eventId}
              hasInvitationImage={!!imageUrl}
            />
          </div>
        </div>
      )}
    </>
  );
}
