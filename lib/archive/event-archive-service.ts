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
    navigationCode: string | null;
    rsvpConfirmedMessage: string | null;
    rsvpDeclinedMessage: string | null;
    rsvpMaybeMessage: string | null;
    rsvpMaybeReminderDelay: number;
    seatingCanvasWidth: number;
    seatingCanvasHeight: number;
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
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    position: number;
    dueDate: string | null;
    createdAt: string;
    notes: Array<{
      id: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  automationFlows: Array<{
    id: string;
    name: string;
    trigger: string;
    action: string;
    status: string;
    templateId: string | null;
    customMessage: string | null;
    delayHours: number | null;
    templateStyle: string | null;
    createdAt: string;
    executions: Array<{
      id: string;
      guestId: string;
      guestName: string;
      status: string;
      scheduledFor: string | null;
      executedAt: string | null;
      errorMessage: string | null;
      retryCount: number;
    }>;
  }>;
  generatedInvitations: Array<{
    id: string;
    templateId: string;
    pngUrl: string | null;
    pdfUrl: string | null;
    fieldValues: Record<string, any>;
    createdAt: string;
  }>;
  giftPaymentSettings: {
    id: string;
    isEnabled: boolean;
    currency: string;
    minAmount: number;
    maxAmount: number;
    suggestedAmounts: number[] | null;
    allowCustomAmount: boolean;
    thankYouMessage: string | null;
    thankYouMessageHe: string | null;
    useExternalProvider: boolean;
    externalProviderUrl: string | null;
  } | null;
  giftPayments: Array<{
    id: string;
    guestId: string | null;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    amount: number;
    serviceFee: number;
    totalCharged: number;
    currency: string;
    status: string;
    greetingMessage: string | null;
    greetingImage: string | null;
    isManual: boolean;
    paidAt: string | null;
    createdAt: string;
  }>;
  smsTemplates: Array<{
    type: string;
    style: string;
    nameHe: string;
    nameEn: string;
    messageBodyHe: string;
    messageBodyEn: string | null;
    isDefault: boolean;
    sortOrder: number;
  }>;
  transportationRegistrations: Array<{
    id: string;
    guestId: string | null;
    fullName: string;
    phoneNumber: string;
    location: string;
    notes: string | null;
    registeredAt: string;
    createdAt: string;
  }>;
  collaborators: Array<{
    userId: string;
    userEmail: string;
    userName: string | null;
    role: string;
    addedAt: string;
  }>;
  costLogs: Array<{
    service: string;
    provider: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    metadata: Record<string, any> | null;
    createdAt: string;
  }>;
  manualCallLogs: Array<{
    guestId: string;
    guestName: string;
    phoneNumber: string;
    status: string;
    direction: string;
    notes: string | null;
    duration: number | null;
    rsvpUpdated: boolean;
    initiatedAt: string;
    connectedAt: string | null;
    endedAt: string | null;
  }>;
  statistics: {
    totalGuests: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
    totalExpectedAttendees: number;
    totalSupplierCost: number;
    totalPaidAmount: number;
    totalGiftPayments: number;
    totalTasks: number;
    completedTasks: number;
    totalAutomations: number;
    activeAutomations: number;
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
          giftPayments: true,
          transportationRegistration: true,
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
      tasks: {
        include: {
          notes: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      automationFlows: {
        include: {
          executions: {
            include: {
              guest: {
                select: { name: true },
              },
            },
          },
        },
      },
      generatedInvitations: {
        orderBy: { createdAt: 'desc' },
      },
      giftPaymentSettings: true,
      smsTemplates: {
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      },
      transportationRegistrations: {
        orderBy: { createdAt: 'desc' },
      },
      collaborators: {
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
      costLogs: {
        orderBy: { createdAt: 'desc' },
      },
      manualCallLogs: {
        include: {
          guest: {
            select: { name: true },
          },
        },
        orderBy: { initiatedAt: 'desc' },
      },
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
      navigationCode: event.navigationCode,
      rsvpConfirmedMessage: event.rsvpConfirmedMessage,
      rsvpDeclinedMessage: event.rsvpDeclinedMessage,
      rsvpMaybeMessage: event.rsvpMaybeMessage,
      rsvpMaybeReminderDelay: event.rsvpMaybeReminderDelay,
      seatingCanvasWidth: event.seatingCanvasWidth,
      seatingCanvasHeight: event.seatingCanvasHeight,
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
    tasks: event.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      position: task.position,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      notes: task.notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      })),
    })),
    automationFlows: event.automationFlows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      trigger: flow.trigger,
      action: flow.action,
      status: flow.status,
      templateId: flow.templateId,
      customMessage: flow.customMessage,
      delayHours: flow.delayHours,
      templateStyle: flow.templateStyle,
      createdAt: flow.createdAt.toISOString(),
      executions: flow.executions.map((exec) => ({
        id: exec.id,
        guestId: exec.guestId,
        guestName: exec.guest.name,
        status: exec.status,
        scheduledFor: exec.scheduledFor?.toISOString() || null,
        executedAt: exec.executedAt?.toISOString() || null,
        errorMessage: exec.errorMessage,
        retryCount: exec.retryCount,
      })),
    })),
    generatedInvitations: event.generatedInvitations.map((inv) => ({
      id: inv.id,
      templateId: inv.templateId,
      pngUrl: inv.pngUrl,
      pdfUrl: inv.pdfUrl,
      fieldValues: inv.fieldValues as Record<string, any>,
      createdAt: inv.createdAt.toISOString(),
    })),
    giftPaymentSettings: event.giftPaymentSettings
      ? {
          id: event.giftPaymentSettings.id,
          isEnabled: event.giftPaymentSettings.isEnabled,
          currency: event.giftPaymentSettings.currency,
          minAmount: Number(event.giftPaymentSettings.minAmount),
          maxAmount: Number(event.giftPaymentSettings.maxAmount),
          suggestedAmounts: event.giftPaymentSettings.suggestedAmounts as number[] | null,
          allowCustomAmount: event.giftPaymentSettings.allowCustomAmount,
          thankYouMessage: event.giftPaymentSettings.thankYouMessage,
          thankYouMessageHe: event.giftPaymentSettings.thankYouMessageHe,
          useExternalProvider: event.giftPaymentSettings.useExternalProvider,
          externalProviderUrl: event.giftPaymentSettings.externalProviderUrl,
        }
      : null,
    giftPayments: event.guests.flatMap((g) =>
      (g.giftPayments || []).map((payment) => ({
        id: payment.id,
        guestId: payment.guestId,
        guestName: payment.guestName,
        guestEmail: payment.guestEmail,
        guestPhone: payment.guestPhone,
        amount: Number(payment.amount),
        serviceFee: Number(payment.serviceFee),
        totalCharged: Number(payment.totalCharged),
        currency: payment.currency,
        status: payment.status,
        greetingMessage: payment.greetingMessage,
        greetingImage: payment.greetingImage,
        isManual: payment.isManual,
        paidAt: payment.paidAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
      }))
    ),
    smsTemplates: event.smsTemplates.map((template) => ({
      type: template.type,
      style: template.style,
      nameHe: template.nameHe,
      nameEn: template.nameEn,
      messageBodyHe: template.messageBodyHe,
      messageBodyEn: template.messageBodyEn,
      isDefault: template.isDefault,
      sortOrder: template.sortOrder,
    })),
    transportationRegistrations: event.transportationRegistrations.map((reg) => ({
      id: reg.id,
      guestId: reg.guestId,
      fullName: reg.fullName,
      phoneNumber: reg.phoneNumber,
      location: reg.location,
      notes: reg.notes,
      registeredAt: reg.registeredAt.toISOString(),
      createdAt: reg.createdAt.toISOString(),
    })),
    collaborators: event.collaborators.map((collab) => ({
      userId: collab.userId,
      userEmail: collab.user.email,
      userName: collab.user.name,
      role: collab.role,
      addedAt: collab.createdAt.toISOString(),
    })),
    costLogs: event.costLogs.map((log) => ({
      service: log.service,
      provider: log.provider,
      quantity: log.quantity,
      unitCost: Number(log.unitCost),
      totalCost: Number(log.totalCost),
      metadata: log.metadata as Record<string, any> | null,
      createdAt: log.createdAt.toISOString(),
    })),
    manualCallLogs: event.manualCallLogs.map((log) => ({
      guestId: log.guestId,
      guestName: log.guest.name,
      phoneNumber: log.phoneNumber,
      status: log.status,
      direction: log.direction,
      notes: log.notes,
      duration: log.duration,
      rsvpUpdated: log.rsvpUpdated,
      initiatedAt: log.initiatedAt.toISOString(),
      connectedAt: log.connectedAt?.toISOString() || null,
      endedAt: log.endedAt?.toISOString() || null,
    })),
    statistics: {
      totalGuests: event.guests.length,
      acceptedCount: acceptedGuests.length,
      declinedCount: declinedGuests.length,
      pendingCount: pendingGuests.length,
      totalExpectedAttendees,
      totalSupplierCost,
      totalPaidAmount,
      totalGiftPayments: event.guests.reduce(
        (sum, g) => sum + (g.giftPayments?.length || 0),
        0
      ),
      totalTasks: event.tasks.length,
      completedTasks: event.tasks.filter((t) => t.status === 'DONE').length,
      totalAutomations: event.automationFlows.length,
      activeAutomations: event.automationFlows.filter((f) => f.status === 'ACTIVE').length,
    },
    archiveMetadata: {
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      version: "2.0", // Updated to include all event data: tasks, automations, invitations, gifts, SMS templates, collaborators, transportation, etc.
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
