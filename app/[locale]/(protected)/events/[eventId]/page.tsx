import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EventDashboardContent } from "@/components/events/event-dashboard-content";

interface EventDashboardPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDashboardPage({ params }: EventDashboardPageProps) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Check if user has ROLE_WEDDING_OWNER in their roles array
  const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
  if (!user || !hasWeddingOwnerRole) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch event with all related data for dashboard summaries
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, ownerId: user.id },
    include: {
      guests: {
        include: {
          rsvp: true,
          tableAssignment: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      tasks: true,
      tables: true,
      suppliers: {
        include: {
          payments: true,
        },
      },
      automationFlows: {
        where: { status: "ACTIVE" },
      },
      messageTemplates: true,
      giftPaymentSettings: true,
      _count: {
        select: {
          guests: true,
          tasks: true,
          tables: true,
          suppliers: true,
          giftPayments: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Calculate statistics
  const guestStats = {
    total: event.guests.length,
    pending: event.guests.filter((g) => !g.rsvp || g.rsvp.status === "PENDING").length,
    accepted: event.guests.filter((g) => g.rsvp?.status === "ACCEPTED").length,
    declined: event.guests.filter((g) => g.rsvp?.status === "DECLINED").length,
    maybe: event.guests.filter((g) => g.rsvp?.status === "MAYBE").length,
    totalAttending: event.guests
      .filter((g) => g.rsvp?.status === "ACCEPTED")
      .reduce((sum, g) => sum + (g.rsvp?.guestCount || 0), 0),
  };

  const taskStats = {
    total: event.tasks.length,
    completed: event.tasks.filter((t) => t.status === "DONE").length,
    inProgress: event.tasks.filter((t) => t.status === "DOING").length,
    pending: event.tasks.filter((t) => t.status === "TODO" || t.status === "BACKLOG").length,
  };

  const seatingStats = {
    tables: event.tables.length,
    totalSeats: event.tables.reduce((sum, t) => sum + t.capacity, 0),
    assignedGuests: event.guests.filter((g) => g.tableAssignment).length,
    unassignedGuests: guestStats.accepted - event.guests.filter((g) => g.tableAssignment).length,
  };

  const supplierStats = {
    total: event.suppliers.length,
    totalBudget: event.suppliers.reduce((sum, s) => sum + (s.agreedPrice?.toNumber() || s.estimatedCost?.toNumber() || 0), 0),
    totalPaid: event.suppliers.reduce((sum, s) => sum + s.payments.reduce((pSum, p) => pSum + p.amount.toNumber(), 0), 0),
  };

  // Get first guest slug for RSVP preview
  const firstGuestSlug = event.guests[0]?.slug || null;

  // Get recent guests with RSVP activity (limit to 5)
  const recentGuests = event.guests
    .filter((g) => g.rsvp)
    .slice(0, 5)
    .map((g) => ({
      id: g.id,
      name: g.name,
      status: g.rsvp?.status || "PENDING",
      guestCount: g.rsvp?.guestCount || 0,
      updatedAt: g.rsvp?.updatedAt || g.updatedAt,
    })) as {
      id: string;
      name: string;
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      guestCount: number;
      updatedAt: Date;
    }[];

  // Get active tasks (DOING and TODO) for the task list
  const recentTasks = event.tasks
    .filter((t) => t.status === "DOING" || t.status === "TODO")
    .sort((a, b) => {
      // Sort by status (DOING first), then by due date
      if (a.status === "DOING" && b.status !== "DOING") return -1;
      if (a.status !== "DOING" && b.status === "DOING") return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as "BACKLOG" | "TODO" | "DOING" | "DONE",
      dueDate: t.dueDate,
    }));

  // Serialize event for client component (includes all fields needed by EditEventModal)
  const serializedEvent = {
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    location: event.location,
    venue: event.venue,
    totalBudget: event.totalBudget?.toNumber() || null,
    ownerId: event.ownerId,
    workspaceId: event.workspaceId,
    description: event.description,
    notes: event.notes,
    imageUrl: event.imageUrl,
    invitationImageUrl: event.invitationImageUrl,
    invitationImagePublicId: event.invitationImagePublicId,
    smsSenderId: event.smsSenderId,
    isActive: event.isActive,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    rsvpConfirmedMessage: event.rsvpConfirmedMessage,
    rsvpDeclinedMessage: event.rsvpDeclinedMessage,
    rsvpMaybeMessage: event.rsvpMaybeMessage,
    rsvpMaybeReminderDelay: event.rsvpMaybeReminderDelay,
  };

  return (
    <PageFadeIn>
      <EventDashboardContent
        event={serializedEvent}
        guestStats={guestStats}
        taskStats={taskStats}
        seatingStats={seatingStats}
        supplierStats={supplierStats}
        recentGuests={recentGuests}
        recentTasks={recentTasks}
        activeAutomations={event.automationFlows.length}
        messageTemplates={event.messageTemplates.length}
        firstGuestSlug={firstGuestSlug}
        locale={locale}
      />
    </PageFadeIn>
  );
}
