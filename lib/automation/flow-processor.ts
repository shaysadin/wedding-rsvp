import { prisma } from "@/lib/db";
import { AutomationExecutionStatus } from "@prisma/client";
import { executeAction } from "./action-executor";
import { checkTriggerCondition } from "./trigger-checkers";
import { AutomationContext } from "./types";

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Process all pending automation flow executions
 * This is called by the cron job every hour
 */
export async function processAutomationFlows(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  const now = new Date();

  // Get all pending executions that are due
  const pendingExecutions = await prisma.automationFlowExecution.findMany({
    where: {
      status: "PENDING",
      OR: [
        { scheduledFor: { lte: now } },
        { scheduledFor: null }, // Immediate executions
      ],
      flow: {
        status: "ACTIVE",
      },
    },
    include: {
      flow: {
        include: {
          weddingEvent: true,
        },
      },
      guest: {
        include: {
          rsvp: true,
          // Get invitation/reminder notifications for NO_RESPONSE triggers (both channels)
          notificationLogs: {
            where: {
              type: {
                in: ["INVITE", "REMINDER", "IMAGE_INVITE", "INTERACTIVE_INVITE", "INTERACTIVE_REMINDER"],
              },
              status: "SENT",
            },
            orderBy: { sentAt: "desc" },
          },
          tableAssignment: {
            include: {
              table: true,
            },
          },
        },
      },
    },
    take: 100, // Process in batches
  });

  for (const execution of pendingExecutions) {
    result.processed++;

    try {
      // Determine which notification to use based on trigger type
      let lastNotificationSentAt: Date | null = null;
      const trigger = execution.flow.trigger;

      if (trigger === "NO_RESPONSE_WHATSAPP") {
        // Only look at WhatsApp notifications
        const whatsappNotification = execution.guest.notificationLogs.find(
          (log) => log.channel === "WHATSAPP"
        );
        lastNotificationSentAt = whatsappNotification?.sentAt || null;
      } else if (trigger === "NO_RESPONSE_SMS") {
        // Only look at SMS notifications
        const smsNotification = execution.guest.notificationLogs.find(
          (log) => log.channel === "SMS"
        );
        lastNotificationSentAt = smsNotification?.sentAt || null;
      } else {
        // Legacy NO_RESPONSE or other triggers - use any notification
        lastNotificationSentAt = execution.guest.notificationLogs[0]?.sentAt || null;
      }

      // Verify trigger condition is still valid
      const triggerCheck = checkTriggerCondition(execution.flow.trigger, {
        guestId: execution.guest.id,
        rsvpStatus: execution.guest.rsvp?.status,
        lastNotificationSentAt,
        eventDateTime: execution.flow.weddingEvent.dateTime,
        hasTableAssignment: !!execution.guest.tableAssignment,
        delayHours: execution.flow.delayHours,
      });

      // For time-based triggers, re-check conditions
      if (!triggerCheck.shouldTrigger) {
        // Check if we should reschedule or skip
        if (triggerCheck.scheduledFor && triggerCheck.scheduledFor > now) {
          // Reschedule for later
          await prisma.automationFlowExecution.update({
            where: { id: execution.id },
            data: { scheduledFor: triggerCheck.scheduledFor },
          });
          result.skipped++;
          continue;
        }

        // Skip if condition is no longer valid (e.g., guest already responded)
        if (
          triggerCheck.reason === "Guest already responded" ||
          triggerCheck.reason === "Guest not confirmed"
        ) {
          await prisma.automationFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "SKIPPED",
              executedAt: now,
              errorMessage: triggerCheck.reason,
            },
          });
          result.skipped++;
          continue;
        }
      }

      // Mark as processing
      await prisma.automationFlowExecution.update({
        where: { id: execution.id },
        data: { status: "PROCESSING" },
      });

      // Build RSVP URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
      const rsvpUrl = `${baseUrl}/rsvp/${execution.guest.slug}`;

      // Format event time
      const timeFormatter = new Intl.DateTimeFormat("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const eventTime = timeFormatter.format(execution.flow.weddingEvent.dateTime);

      // Build context for action executor
      const context: AutomationContext = {
        guestId: execution.guest.id,
        weddingEventId: execution.flow.weddingEventId,
        guestName: execution.guest.name,
        guestPhone: execution.guest.phoneNumber,
        rsvpStatus: execution.guest.rsvp?.status,
        tableName: execution.guest.tableAssignment?.table.name,
        eventDate: execution.flow.weddingEvent.dateTime,
        eventTime,
        eventLocation: execution.flow.weddingEvent.location,
        eventVenue: execution.flow.weddingEvent.venue,
        customMessage: execution.flow.customMessage, // Pass custom message to executor
        rsvpLink: rsvpUrl,
      };

      // Execute the action
      const actionResult = await executeAction(execution.flow.action, context);

      // Update execution status
      if (actionResult.success) {
        await prisma.automationFlowExecution.update({
          where: { id: execution.id },
          data: {
            status: "COMPLETED",
            executedAt: now,
          },
        });
        result.succeeded++;
      } else {
        // Handle failure with retry logic
        const maxRetries = 3;
        const newRetryCount = execution.retryCount + 1;

        if (newRetryCount < maxRetries) {
          // Schedule for retry in 1 hour
          const retryTime = new Date(now.getTime() + 60 * 60 * 1000);
          await prisma.automationFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "PENDING",
              scheduledFor: retryTime,
              retryCount: newRetryCount,
              errorMessage: actionResult.message,
            },
          });
        } else {
          // Mark as failed after max retries
          await prisma.automationFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "FAILED",
              executedAt: now,
              errorMessage: `${actionResult.message} (after ${maxRetries} retries)`,
            },
          });
        }
        result.failed++;
      }
    } catch (error) {
      console.error(`Error processing execution ${execution.id}:`, error);

      await prisma.automationFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          executedAt: now,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      result.failed++;
    }
  }

  return result;
}

/**
 * Schedule event-based triggers for upcoming events
 * Called by the cron job to prepare EVENT_MORNING and HOURS_BEFORE_EVENT_2 executions
 */
export async function scheduleUpcomingEventTriggers(): Promise<number> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find events happening in the next 24 hours
  const upcomingEvents = await prisma.weddingEvent.findMany({
    where: {
      dateTime: {
        gte: now,
        lte: tomorrow,
      },
      isActive: true,
    },
    include: {
      automationFlows: {
        where: {
          status: "ACTIVE",
          trigger: {
            in: ["EVENT_MORNING", "HOURS_BEFORE_EVENT_2"],
          },
        },
      },
      guests: {
        where: {
          rsvp: {
            status: "ACCEPTED",
          },
        },
      },
    },
  });

  let scheduled = 0;

  for (const event of upcomingEvents) {
    for (const flow of event.automationFlows) {
      // Calculate scheduled time
      let scheduledFor: Date;

      if (flow.trigger === "EVENT_MORNING") {
        scheduledFor = new Date(event.dateTime);
        scheduledFor.setHours(8, 0, 0, 0);
      } else {
        // HOURS_BEFORE_EVENT_2
        scheduledFor = new Date(event.dateTime.getTime() - 2 * 60 * 60 * 1000);
      }

      // Skip if already past
      if (scheduledFor <= now) {
        continue;
      }

      // Create executions for all confirmed guests
      for (const guest of event.guests) {
        // Check if execution already exists
        const existing = await prisma.automationFlowExecution.findUnique({
          where: {
            flowId_guestId: {
              flowId: flow.id,
              guestId: guest.id,
            },
          },
        });

        if (!existing) {
          await prisma.automationFlowExecution.create({
            data: {
              flowId: flow.id,
              guestId: guest.id,
              status: "PENDING",
              scheduledFor,
            },
          });
          scheduled++;
        }
      }
    }
  }

  return scheduled;
}

/**
 * Clean up old completed/failed executions
 */
export async function cleanupOldExecutions(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.automationFlowExecution.deleteMany({
    where: {
      status: {
        in: ["COMPLETED", "FAILED", "SKIPPED"],
      },
      executedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get statistics for automation flows
 */
export async function getAutomationStats(weddingEventId: string) {
  const flows = await prisma.automationFlow.findMany({
    where: { weddingEventId },
    include: {
      executions: {
        select: {
          status: true,
        },
      },
    },
  });

  return flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    trigger: flow.trigger,
    action: flow.action,
    status: flow.status,
    stats: {
      total: flow.executions.length,
      pending: flow.executions.filter((e) => e.status === "PENDING").length,
      completed: flow.executions.filter((e) => e.status === "COMPLETED").length,
      failed: flow.executions.filter((e) => e.status === "FAILED").length,
      skipped: flow.executions.filter((e) => e.status === "SKIPPED").length,
    },
  }));
}
