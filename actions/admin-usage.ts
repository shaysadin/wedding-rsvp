"use server";

import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import {
  getSystemCostStats,
  getRecentCostLogs,
  getUserCosts,
  DateRange,
} from "@/lib/analytics/usage-tracking";
import { prisma } from "@/lib/db";

/**
 * Get system-wide usage statistics (admin only)
 */
export async function getSystemUsageStats(dateRange?: DateRange) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized - Platform owner access required" };
    }

    const stats = await getSystemCostStats(dateRange);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("Error fetching system usage stats:", error);
    return { error: "Failed to fetch usage statistics" };
  }
}

/**
 * Get recent cost transactions (admin only)
 */
export async function getRecentTransactions(limit: number = 50) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized - Platform owner access required" };
    }

    const transactions = await getRecentCostLogs(limit);

    return {
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        userId: t.userId,
        userName: t.user.name || t.user.email,
        userEmail: t.user.email,
        eventId: t.weddingEventId,
        eventName: t.weddingEvent?.title,
        guestId: t.guestId,
        guestName: t.guest?.name,
        service: t.service,
        provider: t.provider,
        quantity: t.quantity,
        unitCost: parseFloat(t.unitCost.toString()),
        totalCost: parseFloat(t.totalCost.toString()),
        metadata: t.metadata,
        createdAt: t.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    return { error: "Failed to fetch transactions" };
  }
}

/**
 * Get top users by cost (admin only)
 */
export async function getTopUsersByCost(dateRange?: DateRange, limit: number = 10) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized - Platform owner access required" };
    }

    // Get all users with their cost totals
    const users = await prisma.user.findMany({
      where: {
        roles: {
          has: UserRole.ROLE_WEDDING_OWNER,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        createdAt: true,
      },
      take: 100, // Limit to avoid performance issues
    });

    // Get costs for each user
    const usersWithCosts = await Promise.all(
      users.map(async (u) => {
        const costs = await getUserCosts(u.id, dateRange);
        return {
          userId: u.id,
          userName: u.name || u.email,
          userEmail: u.email,
          plan: u.plan,
          whatsappCost: costs.whatsapp.cost,
          smsCost: costs.sms.cost,
          voiceCost: costs.voice.cost,
          totalCost: costs.totalCost,
          whatsappCount: costs.whatsapp.count,
          smsCount: costs.sms.count,
          voiceCount: costs.voice.callCount,
          createdAt: u.createdAt,
        };
      })
    );

    // Sort by total cost descending
    const topUsers = usersWithCosts
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);

    return {
      success: true,
      users: topUsers,
    };
  } catch (error) {
    console.error("Error fetching top users:", error);
    return { error: "Failed to fetch top users" };
  }
}

/**
 * Get cost breakdown by service type (admin only)
 */
export async function getCostBreakdownByService(dateRange?: DateRange) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized - Platform owner access required" };
    }

    const where: any = {};
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Aggregate costs by service
    const costLogs = await prisma.costLog.findMany({
      where,
      select: {
        service: true,
        provider: true,
        quantity: true,
        totalCost: true,
      },
    });

    const breakdown = {
      whatsapp: {
        count: 0,
        cost: 0,
        avgCostPerMessage: 0,
      },
      sms: {
        twilio: { count: 0, cost: 0 },
        upsend: { count: 0, cost: 0 },
        total: { count: 0, cost: 0 },
        avgCostPerMessage: 0,
      },
      voice: {
        callCount: 0,
        totalMinutes: 0,
        cost: 0,
        avgCostPerCall: 0,
        avgCostPerMinute: 0,
      },
    };

    for (const log of costLogs) {
      const cost = parseFloat(log.totalCost.toString());

      switch (log.service) {
        case "whatsapp":
          breakdown.whatsapp.count += log.quantity;
          breakdown.whatsapp.cost += cost;
          break;

        case "sms":
          breakdown.sms.total.count += log.quantity;
          breakdown.sms.total.cost += cost;
          if (log.provider === "twilio") {
            breakdown.sms.twilio.count += log.quantity;
            breakdown.sms.twilio.cost += cost;
          } else if (log.provider === "upsend") {
            breakdown.sms.upsend.count += log.quantity;
            breakdown.sms.upsend.cost += cost;
          }
          break;

        case "voice":
          breakdown.voice.callCount += 1;
          breakdown.voice.totalMinutes += log.quantity / 60;
          breakdown.voice.cost += cost;
          break;
      }
    }

    // Calculate averages
    if (breakdown.whatsapp.count > 0) {
      breakdown.whatsapp.avgCostPerMessage =
        breakdown.whatsapp.cost / breakdown.whatsapp.count;
    }

    if (breakdown.sms.total.count > 0) {
      breakdown.sms.avgCostPerMessage =
        breakdown.sms.total.cost / breakdown.sms.total.count;
    }

    if (breakdown.voice.callCount > 0) {
      breakdown.voice.avgCostPerCall =
        breakdown.voice.cost / breakdown.voice.callCount;
    }

    if (breakdown.voice.totalMinutes > 0) {
      breakdown.voice.avgCostPerMinute =
        breakdown.voice.cost / breakdown.voice.totalMinutes;
    }

    return {
      success: true,
      breakdown,
    };
  } catch (error) {
    console.error("Error fetching cost breakdown:", error);
    return { error: "Failed to fetch cost breakdown" };
  }
}

/**
 * Get daily cost trend (admin only)
 */
export async function getDailyCostTrend(days: number = 30) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized - Platform owner access required" };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costLogs = await prisma.costLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        service: true,
        totalCost: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day
    const dailyData = new Map<string, { date: string; whatsapp: number; sms: number; voice: number; total: number }>();

    for (const log of costLogs) {
      const dateKey = log.createdAt.toISOString().split("T")[0];
      const cost = parseFloat(log.totalCost.toString());

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          whatsapp: 0,
          sms: 0,
          voice: 0,
          total: 0,
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.total += cost;

      switch (log.service) {
        case "whatsapp":
          dayData.whatsapp += cost;
          break;
        case "sms":
          dayData.sms += cost;
          break;
        case "voice":
          dayData.voice += cost;
          break;
      }
    }

    const trend = Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      success: true,
      trend,
    };
  } catch (error) {
    console.error("Error fetching daily cost trend:", error);
    return { error: "Failed to fetch cost trend" };
  }
}
