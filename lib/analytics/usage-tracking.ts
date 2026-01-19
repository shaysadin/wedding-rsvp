import { prisma } from "@/lib/db";
import {
  TWILIO_PRICING,
  UPSEND_PRICING,
  VAPI_PRICING,
  calculateWhatsAppCost,
  calculateSmsCost,
  calculateVoiceCallCost,
} from "@/config/pricing";

/**
 * Usage Analytics Service
 *
 * Provides comprehensive cost tracking and analytics for all messaging/calling services
 * Tracks costs in USD for consistency across all providers
 */

export type ServiceType = "whatsapp" | "sms" | "voice";
export type ProviderType = "twilio" | "upsend" | "vapi";

export interface CostLogEntry {
  userId: string;
  weddingEventId?: string;
  guestId?: string;
  service: ServiceType;
  provider: ProviderType;
  quantity: number; // Message count or call duration in seconds
  unitCost: number;
  totalCost: number;
  metadata?: Record<string, any>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UserCostSummary {
  userId: string;
  period: DateRange;
  whatsapp: {
    count: number;
    cost: number;
    provider: "twilio";
  };
  sms: {
    count: number;
    cost: number;
    byProvider: {
      twilio: { count: number; cost: number };
      upsend: { count: number; cost: number };
    };
  };
  voice: {
    callCount: number;
    totalMinutes: number;
    cost: number;
    provider: "vapi";
  };
  totalCost: number;
}

export interface EventCostSummary {
  eventId: string;
  eventName: string;
  whatsapp: { count: number; cost: number };
  sms: { count: number; cost: number };
  voice: { callCount: number; minutes: number; cost: number };
  totalCost: number;
  guestCount: number;
  costPerGuest: number;
}

/**
 * Log a cost transaction
 * Creates an audit trail entry in CostLog table
 */
export async function logCost(entry: CostLogEntry): Promise<void> {
  await prisma.costLog.create({
    data: {
      userId: entry.userId,
      weddingEventId: entry.weddingEventId,
      guestId: entry.guestId,
      service: entry.service,
      provider: entry.provider,
      quantity: entry.quantity,
      unitCost: entry.unitCost,
      totalCost: entry.totalCost,
      metadata: entry.metadata || {},
    },
  });
}

/**
 * Log WhatsApp message cost
 */
export async function logWhatsAppCost(
  userId: string,
  weddingEventId: string,
  guestId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const unitCost = TWILIO_PRICING.whatsapp.israel.utility;

  await logCost({
    userId,
    weddingEventId,
    guestId,
    service: "whatsapp",
    provider: "twilio",
    quantity: 1,
    unitCost,
    totalCost: unitCost,
    metadata,
  });
}

/**
 * Log SMS cost (supports both Twilio and Upsend)
 */
export async function logSmsCost(
  userId: string,
  weddingEventId: string,
  guestId: string,
  provider: "twilio" | "upsend" = "twilio",
  metadata?: Record<string, any>
): Promise<void> {
  const unitCost =
    provider === "upsend"
      ? UPSEND_PRICING.sms.israel
      : TWILIO_PRICING.sms.israel;

  await logCost({
    userId,
    weddingEventId,
    guestId,
    service: "sms",
    provider,
    quantity: 1,
    unitCost,
    totalCost: unitCost,
    metadata,
  });
}

/**
 * Log voice call cost
 * @param durationSeconds - Call duration in seconds
 */
export async function logVoiceCallCost(
  userId: string,
  weddingEventId: string,
  guestId: string,
  durationSeconds: number,
  metadata?: Record<string, any>
): Promise<void> {
  const durationMinutes = durationSeconds / 60;
  const callCost = calculateVoiceCallCost(durationMinutes);

  await logCost({
    userId,
    weddingEventId,
    guestId,
    service: "voice",
    provider: "vapi",
    quantity: durationSeconds,
    unitCost: VAPI_PRICING.call.perMinute,
    totalCost: callCost,
    metadata,
  });
}

/**
 * Get aggregated costs for a user within a date range
 */
export async function getUserCosts(
  userId: string,
  dateRange?: DateRange
): Promise<UserCostSummary> {
  const where: any = { userId };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const costLogs = await prisma.costLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Aggregate costs by service
  const summary: UserCostSummary = {
    userId,
    period: dateRange || {
      start: new Date(0),
      end: new Date(),
    },
    whatsapp: {
      count: 0,
      cost: 0,
      provider: "twilio",
    },
    sms: {
      count: 0,
      cost: 0,
      byProvider: {
        twilio: { count: 0, cost: 0 },
        upsend: { count: 0, cost: 0 },
      },
    },
    voice: {
      callCount: 0,
      totalMinutes: 0,
      cost: 0,
      provider: "vapi",
    },
    totalCost: 0,
  };

  for (const log of costLogs) {
    const cost = parseFloat(log.totalCost.toString());

    switch (log.service) {
      case "whatsapp":
        summary.whatsapp.count += log.quantity;
        summary.whatsapp.cost += cost;
        break;

      case "sms":
        summary.sms.count += log.quantity;
        summary.sms.cost += cost;
        if (log.provider === "twilio") {
          summary.sms.byProvider.twilio.count += log.quantity;
          summary.sms.byProvider.twilio.cost += cost;
        } else if (log.provider === "upsend") {
          summary.sms.byProvider.upsend.count += log.quantity;
          summary.sms.byProvider.upsend.cost += cost;
        }
        break;

      case "voice":
        summary.voice.callCount += 1;
        summary.voice.totalMinutes += log.quantity / 60;
        summary.voice.cost += cost;
        break;
    }

    summary.totalCost += cost;
  }

  return summary;
}

/**
 * Get all costs for a specific event
 */
export async function getEventCosts(eventId: string): Promise<EventCostSummary> {
  const event = await prisma.weddingEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      _count: {
        select: { guests: true },
      },
    },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const costLogs = await prisma.costLog.findMany({
    where: { weddingEventId: eventId },
    orderBy: { createdAt: "desc" },
  });

  const summary: EventCostSummary = {
    eventId,
    eventName: event.title,
    whatsapp: { count: 0, cost: 0 },
    sms: { count: 0, cost: 0 },
    voice: { callCount: 0, minutes: 0, cost: 0 },
    totalCost: 0,
    guestCount: event._count.guests,
    costPerGuest: 0,
  };

  for (const log of costLogs) {
    const cost = parseFloat(log.totalCost.toString());

    switch (log.service) {
      case "whatsapp":
        summary.whatsapp.count += log.quantity;
        summary.whatsapp.cost += cost;
        break;

      case "sms":
        summary.sms.count += log.quantity;
        summary.sms.cost += cost;
        break;

      case "voice":
        summary.voice.callCount += 1;
        summary.voice.minutes += log.quantity / 60;
        summary.voice.cost += cost;
        break;
    }

    summary.totalCost += cost;
  }

  // Calculate cost per guest
  if (summary.guestCount > 0) {
    summary.costPerGuest = summary.totalCost / summary.guestCount;
  }

  return summary;
}

/**
 * Update aggregated costs in UsageTracking table
 * Should be called periodically or after batch operations
 */
export async function updateUsageTrackingCosts(userId: string): Promise<void> {
  // Get current period start for the user
  const usageTracking = await prisma.usageTracking.findUnique({
    where: { userId },
    select: { periodStart: true },
  });

  if (!usageTracking) {
    // No usage tracking record yet, will be created on first usage
    return;
  }

  // Get costs since period start
  const costs = await getUserCosts(userId, {
    start: usageTracking.periodStart,
    end: new Date(),
  });

  // Update the usage tracking record with aggregated costs
  await prisma.usageTracking.update({
    where: { userId },
    data: {
      whatsappCost: costs.whatsapp.cost,
      smsCost: costs.sms.cost,
      voiceCallsCost: costs.voice.cost,
      totalCost: costs.totalCost,
    },
  });
}

/**
 * Get system-wide cost statistics (admin only)
 */
export async function getSystemCostStats(dateRange?: DateRange) {
  const where: any = {};

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const costLogs = await prisma.costLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    totalCost: 0,
    whatsapp: {
      messageCount: 0,
      totalCost: 0,
      avgCostPerMessage: 0,
    },
    sms: {
      messageCount: 0,
      totalCost: 0,
      avgCostPerMessage: 0,
      byProvider: {
        twilio: { count: 0, cost: 0 },
        upsend: { count: 0, cost: 0 },
      },
    },
    voice: {
      callCount: 0,
      totalMinutes: 0,
      totalCost: 0,
      avgCostPerCall: 0,
      avgCostPerMinute: 0,
    },
    userCount: new Set<string>(),
    eventCount: new Set<string>(),
  };

  for (const log of costLogs) {
    const cost = parseFloat(log.totalCost.toString());
    stats.totalCost += cost;
    stats.userCount.add(log.userId);
    if (log.weddingEventId) {
      stats.eventCount.add(log.weddingEventId);
    }

    switch (log.service) {
      case "whatsapp":
        stats.whatsapp.messageCount += log.quantity;
        stats.whatsapp.totalCost += cost;
        break;

      case "sms":
        stats.sms.messageCount += log.quantity;
        stats.sms.totalCost += cost;
        if (log.provider === "twilio") {
          stats.sms.byProvider.twilio.count += log.quantity;
          stats.sms.byProvider.twilio.cost += cost;
        } else if (log.provider === "upsend") {
          stats.sms.byProvider.upsend.count += log.quantity;
          stats.sms.byProvider.upsend.cost += cost;
        }
        break;

      case "voice":
        stats.voice.callCount += 1;
        stats.voice.totalMinutes += log.quantity / 60;
        stats.voice.totalCost += cost;
        break;
    }
  }

  // Calculate averages
  if (stats.whatsapp.messageCount > 0) {
    stats.whatsapp.avgCostPerMessage =
      stats.whatsapp.totalCost / stats.whatsapp.messageCount;
  }

  if (stats.sms.messageCount > 0) {
    stats.sms.avgCostPerMessage =
      stats.sms.totalCost / stats.sms.messageCount;
  }

  if (stats.voice.callCount > 0) {
    stats.voice.avgCostPerCall = stats.voice.totalCost / stats.voice.callCount;
  }

  if (stats.voice.totalMinutes > 0) {
    stats.voice.avgCostPerMinute =
      stats.voice.totalCost / stats.voice.totalMinutes;
  }

  return {
    ...stats,
    userCount: stats.userCount.size,
    eventCount: stats.eventCount.size,
  };
}

/**
 * Get recent cost transactions (admin only)
 */
export async function getRecentCostLogs(limit: number = 50) {
  return prisma.costLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      weddingEvent: {
        select: {
          id: true,
          title: true,
        },
      },
      guest: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get cost breakdown by event for a user
 */
export async function getUserEventCosts(userId: string, dateRange?: DateRange) {
  const where: any = { userId };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const costLogs = await prisma.costLog.findMany({
    where,
    include: {
      weddingEvent: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by event
  const eventCosts = new Map<string, EventCostSummary>();

  for (const log of costLogs) {
    if (!log.weddingEventId || !log.weddingEvent) continue;

    const eventId = log.weddingEventId;

    if (!eventCosts.has(eventId)) {
      eventCosts.set(eventId, {
        eventId,
        eventName: log.weddingEvent.title,
        whatsapp: { count: 0, cost: 0 },
        sms: { count: 0, cost: 0 },
        voice: { callCount: 0, minutes: 0, cost: 0 },
        totalCost: 0,
        guestCount: 0, // Will be populated separately if needed
        costPerGuest: 0,
      });
    }

    const summary = eventCosts.get(eventId)!;
    const cost = parseFloat(log.totalCost.toString());

    switch (log.service) {
      case "whatsapp":
        summary.whatsapp.count += log.quantity;
        summary.whatsapp.cost += cost;
        break;

      case "sms":
        summary.sms.count += log.quantity;
        summary.sms.cost += cost;
        break;

      case "voice":
        summary.voice.callCount += 1;
        summary.voice.minutes += log.quantity / 60;
        summary.voice.cost += cost;
        break;
    }

    summary.totalCost += cost;
  }

  return Array.from(eventCosts.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );
}
