import { prisma } from "@/lib/db";
import { uploadToR2, getFromR2, isR2Configured } from "@/lib/r2";

/**
 * Complete event archive snapshot structure
 */
export interface EventArchiveSnapshot {
  event: {
    id: string;
    title: string;
    description: string | null;
    dateTime: string;
    location: string;
    venue: string | null;
    notes: string | null;
    imageUrl: string | null;
    invitationImageUrl: string | null;
    totalBudget: number | null;
    smsSenderId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  guests: Array<{
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
    slug: string;
    side: string | null;
    groupName: string | null;
    notes: string | null;
    expectedGuests: number;
    rsvp: {
      status: string;
      guestCount: number;
      note: string | null;
      respondedAt: string | null;
    } | null;
  }>;
  notificationLogs: Array<{
    guestId: string;
    guestName: string;
    type: string;
    channel: string;
    status: string;
    sentAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
  }>;
  messageTemplates: Array<{
    type: string;
    locale: string;
    title: string;
    message: string;
    isAcceptedVariant: boolean;
    isActive: boolean;
  }>;
  rsvpPageSettings: Record<string, unknown> | null;
  vapiSettings: {
    customSystemPrompt: string | null;
    customFirstMessage: string | null;
    voiceId: string | null;
    isEnabled: boolean;
    canUpdateRsvp: boolean;
  } | null;
  vapiCallLogs: Array<{
    guestId: string;
    guestName: string;
    phoneNumber: string;
    status: string;
    duration: number | null;
    rsvpUpdated: boolean;
    rsvpStatus: string | null;
    guestCount: number | null;
    transcript: string | null;
    startedAt: string | null;
    endedAt: string | null;
  }>;
  suppliers: Array<{
    name: string;
    category: string;
    status: string;
    contactName: string | null;
    phoneNumber: string | null;
    email: string | null;
    website: string | null;
    estimatedCost: number | null;
    agreedPrice: number | null;
    currency: string;
    notes: string | null;
    payments: Array<{
      amount: number;
      method: string;
      description: string | null;
      paidAt: string;
      dueDate: string | null;
    }>;
  }>;
  seating: {
    tables: Array<{
      name: string;
      capacity: number;
      positionX: number | null;
      positionY: number | null;
      shape: string | null;
      width: number;
      height: number;
      rotation: number;
      assignments: Array<{
        guestId: string;
        guestName: string;
      }>;
    }>;
    venueBlocks: Array<{
      name: string;
      type: string;
      positionX: number | null;
      positionY: number | null;
      width: number;
      height: number;
      rotation: number;
      shape: string;
    }>;
  };
  bulkMessageJobs: Array<{
    messageType: string;
    channel: string | null;
    status: string;
    totalGuests: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
  }>;
  statistics: {
    totalGuests: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
    totalExpectedAttendees: number;
    totalSupplierCost: number;
    totalPaidAmount: number;
  };
  archiveMetadata: {
    archivedAt: string;
    archivedBy: string;
    version: string;
  };
}

/**
 * Collect complete event snapshot with all related data
 */
export async function collectEventSnapshot(
  eventId: string,
  userId: string
): Promise<EventArchiveSnapshot> {
  const event = await prisma.weddingEvent.findUnique({
    where: { id: eventId },
    include: {
      guests: {
        include: {
          rsvp: true,
          notificationLogs: true,
          tableAssignment: {
            include: { table: true },
          },
          vapiCallLogs: true,
        },
      },
      messageTemplates: true,
      rsvpPageSettings: true,
      vapiSettings: true,
      suppliers: {
        include: { payments: true },
      },
      tables: {
        include: {
          assignments: {
            include: { guest: true },
          },
        },
      },
      venueBlocks: true,
      bulkMessageJobs: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Calculate statistics
  const acceptedGuests = event.guests.filter(
    (g) => g.rsvp?.status === "ACCEPTED"
  );
  const declinedGuests = event.guests.filter(
    (g) => g.rsvp?.status === "DECLINED"
  );
  const pendingGuests = event.guests.filter(
    (g) => !g.rsvp || g.rsvp.status === "PENDING"
  );
  const totalExpectedAttendees = acceptedGuests.reduce(
    (sum, g) => sum + (g.rsvp?.guestCount || 1),
    0
  );
  const totalSupplierCost = event.suppliers.reduce(
    (sum, s) => sum + (s.agreedPrice ? Number(s.agreedPrice) : 0),
    0
  );
  const totalPaidAmount = event.suppliers.reduce(
    (sum, s) =>
      sum + s.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
    0
  );

  // Build snapshot
  const snapshot: EventArchiveSnapshot = {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      dateTime: event.dateTime.toISOString(),
      location: event.location,
      venue: event.venue,
      notes: event.notes,
      imageUrl: event.imageUrl,
      invitationImageUrl: event.invitationImageUrl,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : null,
      smsSenderId: event.smsSenderId,
      isActive: event.isActive,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    },
    guests: event.guests.map((g) => ({
      id: g.id,
      name: g.name,
      phoneNumber: g.phoneNumber,
      email: g.email,
      slug: g.slug,
      side: g.side,
      groupName: g.groupName,
      notes: g.notes,
      expectedGuests: g.expectedGuests,
      rsvp: g.rsvp
        ? {
            status: g.rsvp.status,
            guestCount: g.rsvp.guestCount,
            note: g.rsvp.note,
            respondedAt: g.rsvp.respondedAt?.toISOString() || null,
          }
        : null,
    })),
    notificationLogs: event.guests.flatMap((g) =>
      g.notificationLogs.map((log) => ({
        guestId: g.id,
        guestName: g.name,
        type: log.type,
        channel: log.channel,
        status: log.status,
        sentAt: log.sentAt?.toISOString() || null,
        deliveredAt: log.deliveredAt?.toISOString() || null,
        createdAt: log.createdAt.toISOString(),
      }))
    ),
    messageTemplates: event.messageTemplates.map((mt) => ({
      type: mt.type,
      locale: mt.locale,
      title: mt.title,
      message: mt.message,
      isAcceptedVariant: mt.isAcceptedVariant,
      isActive: mt.isActive,
    })),
    rsvpPageSettings: event.rsvpPageSettings
      ? {
          ...event.rsvpPageSettings,
          createdAt: event.rsvpPageSettings.createdAt.toISOString(),
          updatedAt: event.rsvpPageSettings.updatedAt.toISOString(),
        }
      : null,
    vapiSettings: event.vapiSettings
      ? {
          customSystemPrompt: event.vapiSettings.customSystemPrompt,
          customFirstMessage: event.vapiSettings.customFirstMessage,
          voiceId: event.vapiSettings.voiceId,
          isEnabled: event.vapiSettings.isEnabled,
          canUpdateRsvp: event.vapiSettings.canUpdateRsvp,
        }
      : null,
    vapiCallLogs: event.guests.flatMap((g) =>
      g.vapiCallLogs.map((log) => ({
        guestId: g.id,
        guestName: g.name,
        phoneNumber: log.phoneNumber,
        status: log.status,
        duration: log.duration,
        rsvpUpdated: log.rsvpUpdated,
        rsvpStatus: log.rsvpStatus,
        guestCount: log.guestCount,
        transcript: log.transcript,
        startedAt: log.startedAt?.toISOString() || null,
        endedAt: log.endedAt?.toISOString() || null,
      }))
    ),
    suppliers: event.suppliers.map((s) => ({
      name: s.name,
      category: s.category,
      status: s.status,
      contactName: s.contactName,
      phoneNumber: s.phoneNumber,
      email: s.email,
      website: s.website,
      estimatedCost: s.estimatedCost ? Number(s.estimatedCost) : null,
      agreedPrice: s.agreedPrice ? Number(s.agreedPrice) : null,
      currency: s.currency,
      notes: s.notes,
      payments: s.payments.map((p) => ({
        amount: Number(p.amount),
        method: p.method,
        description: p.description,
        paidAt: p.paidAt.toISOString(),
        dueDate: p.dueDate?.toISOString() || null,
      })),
    })),
    seating: {
      tables: event.tables.map((t) => ({
        name: t.name,
        capacity: t.capacity,
        positionX: t.positionX,
        positionY: t.positionY,
        shape: t.shape,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        assignments: t.assignments.map((a) => ({
          guestId: a.guestId,
          guestName: a.guest.name,
        })),
      })),
      venueBlocks: event.venueBlocks.map((vb) => ({
        name: vb.name,
        type: vb.type,
        positionX: vb.positionX,
        positionY: vb.positionY,
        width: vb.width,
        height: vb.height,
        rotation: vb.rotation,
        shape: vb.shape,
      })),
    },
    bulkMessageJobs: event.bulkMessageJobs.map((job) => ({
      messageType: job.messageType,
      channel: job.channel,
      status: job.status,
      totalGuests: job.totalGuests,
      successCount: job.successCount,
      failedCount: job.failedCount,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
    })),
    statistics: {
      totalGuests: event.guests.length,
      acceptedCount: acceptedGuests.length,
      declinedCount: declinedGuests.length,
      pendingCount: pendingGuests.length,
      totalExpectedAttendees,
      totalSupplierCost,
      totalPaidAmount,
    },
    archiveMetadata: {
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      version: "1.0",
    },
  };

  return snapshot;
}

/**
 * Archive an event to R2 storage
 * @param eventId - The event ID to archive
 * @param userId - The user ID performing the archive
 * @returns The R2 key where the archive was stored
 */
export async function archiveEvent(
  eventId: string,
  userId: string
): Promise<string> {
  // Check if R2 is configured
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Event archiving requires R2 storage to be set up."
    );
  }

  // 1. Collect snapshot
  const snapshot = await collectEventSnapshot(eventId, userId);

  // 2. Generate R2 key
  const r2Key = `archives/events/${userId}/${eventId}.json`;

  // 3. Upload to R2
  const jsonData = JSON.stringify(snapshot, null, 2);
  const { size } = await uploadToR2(r2Key, jsonData);

  // 4. Save archive metadata to DB
  await prisma.eventArchive.create({
    data: {
      userId,
      originalEventId: eventId,
      eventTitle: snapshot.event.title,
      eventDate: new Date(snapshot.event.dateTime),
      r2Key,
      guestCount: snapshot.statistics.totalGuests,
      archiveSize: size,
    },
  });

  return r2Key;
}

/**
 * Get an archived event from R2 storage
 * @param archiveId - The archive ID
 * @param userId - The user ID (for authorization)
 * @returns The archived event snapshot or null if not found
 */
export async function getArchivedEvent(
  archiveId: string,
  userId: string
): Promise<EventArchiveSnapshot | null> {
  const archive = await prisma.eventArchive.findFirst({
    where: { id: archiveId, userId },
  });

  if (!archive) return null;

  const data = await getFromR2(archive.r2Key);
  return JSON.parse(data) as EventArchiveSnapshot;
}

/**
 * Get all archives for a user
 * @param userId - The user ID
 * @returns List of archive metadata
 */
export async function getUserArchives(userId: string) {
  return prisma.eventArchive.findMany({
    where: { userId },
    orderBy: { archivedAt: "desc" },
  });
}
