"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CollaboratorRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { EventCard } from "@/components/events/event-card";
import { AddEventModal } from "@/components/events/add-event-modal";
import { DashboardHeader } from "@/components/dashboard/header";

interface EventWithStats {
  id: string;
  title: string;
  description: string | null;
  dateTime: Date;
  location: string;
  venue: string | null;
  notes: string | null;
  imageUrl: string | null;
  smsSenderId: string | null;
  navigationCode: string | null;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  workspaceId: string | null;
  invitationImageUrl: string | null;
  invitationImagePublicId: string | null;
  totalBudget: any;
  rsvpConfirmedMessage: string | null;
  rsvpDeclinedMessage: string | null;
  rsvpMaybeMessage: string | null;
  rsvpMaybeReminderDelay: number;
  seatingCanvasWidth: number;
  seatingCanvasHeight: number;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalGuestCount: number;
  };
  owner?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  isOwner?: boolean;
  collaboratorRole?: CollaboratorRole | null;
}

interface EventsPageClientProps {
  events: EventWithStats[];
  locale: string;
}

export function EventsPageClient({ events, locale }: EventsPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations("events");
  const td = useTranslations("dashboard");

  return (
    <>
      <DashboardHeader heading={t("title")} text={td("manageEvents")}>
        <Button onClick={() => setIsModalOpen(true)}>
          <Icons.add className="me-2 h-4 w-4" />
          {t("create")}
        </Button>
      </DashboardHeader>

      {!events || events.length === 0 ? (
        <EmptyPlaceholder className="min-h-[400px]">
          <EmptyPlaceholder.Icon name="calendar" />
          <EmptyPlaceholder.Title>{t("noEvents")}</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            {t("createFirst")}
          </EmptyPlaceholder.Description>
          <Button onClick={() => setIsModalOpen(true)}>
            <Icons.add className="me-2 h-4 w-4" />
            {t("create")}
          </Button>
        </EmptyPlaceholder>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      )}

      <AddEventModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
