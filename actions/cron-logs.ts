"use server";

import { UserRole, CronJobStatus, CronJobType, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Get all users with pending plan changes (scheduled but not yet applied)
export async function getPendingPlanChanges() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized", pendingChanges: [] };
    }

    const usersWithPendingChanges = await prisma.user.findMany({
      where: {
        pendingPlanChange: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        pendingPlanChange: true,
        pendingPlanChangeDate: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
      orderBy: { pendingPlanChangeDate: "asc" },
    });

    return {
      success: true,
      pendingChanges: usersWithPendingChanges,
    };
  } catch (error) {
    console.error("Error fetching pending plan changes:", error);
    return { error: "Failed to fetch pending plan changes", pendingChanges: [] };
  }
}

// Cancel a pending plan change for a user (admin only)
export async function cancelPendingPlanChange(userId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get the user to log the cancelled change
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan: true,
        pendingPlanChange: true,
        pendingPlanChangeDate: true,
      },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    if (!targetUser.pendingPlanChange) {
      return { error: "No pending plan change to cancel" };
    }

    // Log the cancellation
    await prisma.cronJobLog.create({
      data: {
        jobType: CronJobType.PLAN_CHANGE,
        status: CronJobStatus.SKIPPED,
        userId: targetUser.id,
        userEmail: targetUser.email,
        fromPlan: targetUser.plan,
        toPlan: targetUser.pendingPlanChange,
        scheduledFor: targetUser.pendingPlanChangeDate,
        message: `Pending plan change cancelled by admin (${currentUser.email})`,
      },
    });

    // Clear the pending plan change
    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingPlanChange: null,
        pendingPlanChangeDate: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling pending plan change:", error);
    return { error: "Failed to cancel pending plan change" };
  }
}

export async function getCronJobLogs(options?: {
  limit?: number;
  offset?: number;
  status?: CronJobStatus;
  jobType?: CronJobType;
}) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized", logs: [] };
    }

    const { limit = 50, offset = 0, status, jobType } = options || {};

    const where: {
      status?: CronJobStatus;
      jobType?: CronJobType;
    } = {};

    if (status) where.status = status;
    if (jobType) where.jobType = jobType;

    const [logs, total] = await Promise.all([
      prisma.cronJobLog.findMany({
        where,
        orderBy: { executedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.cronJobLog.count({ where }),
    ]);

    return {
      success: true,
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  } catch (error) {
    console.error("Error fetching cron job logs:", error);
    return { error: "Failed to fetch cron job logs", logs: [] };
  }
}

export async function getCronJobStats() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const [totalCount, successCount, failedCount, skippedCount, last24hCount] = await Promise.all([
      prisma.cronJobLog.count(),
      prisma.cronJobLog.count({ where: { status: CronJobStatus.SUCCESS } }),
      prisma.cronJobLog.count({ where: { status: CronJobStatus.FAILED } }),
      prisma.cronJobLog.count({ where: { status: CronJobStatus.SKIPPED } }),
      prisma.cronJobLog.count({
        where: {
          executedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        total: totalCount,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        last24h: last24hCount,
      },
    };
  } catch (error) {
    console.error("Error fetching cron job stats:", error);
    return { error: "Failed to fetch stats" };
  }
}
