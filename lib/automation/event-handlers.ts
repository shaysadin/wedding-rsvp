import { prisma } from "@/lib/db";
import {
  AutomationTrigger,
  AutomationAction,
  AutomationExecutionStatus,
  RsvpStatus,
} from "@prisma/client";
import { executeAction } from "./action-executor";
import { calculateScheduledTime, isEventBasedTrigger, isTimeBasedTrigger } from "./trigger-checkers";

interface RsvpEventData {
  guestId: string;
  weddingEventId: string;
  status: RsvpStatus;
  previousStatus?: RsvpStatus;
}

interface NotificationSentEventData {
  guestId: string;
  weddingEventId: string;
  notificationType: string;
  sentAt: Date;
}

/**
 * Handle RSVP status change events
 * Called when a guest's RSVP status changes
 */
export async function onRsvpStatusChanged(data: RsvpEventData): Promise<void> {
  const { guestId, weddingEventId, status, previousStatus } = data;

  // Determine which triggers should fire based on the new status
  let triggerToFire: AutomationTrigger | null = null;

  if (status === "ACCEPTED" && previousStatus !== "ACCEPTED") {
    triggerToFire = "RSVP_CONFIRMED";
  } else if (status === "DECLINED" && previousStatus !== "DECLINED") {
    triggerToFire = "RSVP_DECLINED";
  }

  if (!triggerToFire) {
    return;
  }

  // Find active automation flows for this event with the matching trigger
  const flows = await prisma.automationFlow.findMany({
    where: {
      weddingEventId,
      trigger: triggerToFire,
      status: "ACTIVE",
    },
  });

  // Create and execute automation flow executions
  for (const flow of flows) {
    await createAndExecuteImmediate(flow.id, guestId);
  }

  // If guest confirmed, cancel any pending "no response" executions
  if (status === "ACCEPTED" || status === "DECLINED") {
    await cancelPendingNoResponseExecutions(guestId);
  }
}

/**
 * Handle notification sent events
 * Called when an invitation or reminder is sent to a guest
 */
export async function onNotificationSent(data: NotificationSentEventData): Promise<void> {
  const { guestId, weddingEventId, notificationType, sentAt } = data;

  console.log(`[onNotificationSent] Processing for guest ${guestId}, type: ${notificationType}`);

  // Find active "no response" flows for this event
  // Include both legacy triggers and new flexible triggers
  const noResponseFlows = await prisma.automationFlow.findMany({
    where: {
      weddingEventId,
      trigger: {
        in: [
          // New flexible triggers
          "NO_RESPONSE_WHATSAPP",
          "NO_RESPONSE_SMS",
          "NO_RESPONSE",
          // Legacy triggers (backward compatibility)
          "NO_RESPONSE_24H",
          "NO_RESPONSE_48H",
          "NO_RESPONSE_72H",
        ],
      },
      status: "ACTIVE",
    },
    include: {
      weddingEvent: true,
    },
  });

  console.log(`[onNotificationSent] Found ${noResponseFlows.length} no-response flows`);

  // Get guest's current RSVP status
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { rsvp: true },
  });

  // Only schedule if RSVP is still pending
  if (!guest || guest.rsvp?.status !== "PENDING") {
    console.log(`[onNotificationSent] Guest not pending, skipping. Status: ${guest?.rsvp?.status}`);
    return;
  }

  // Schedule executions for each flow
  for (const flow of noResponseFlows) {
    // For flexible triggers, use delayHours from the flow
    const scheduledFor = calculateScheduledTime(
      flow.trigger,
      flow.weddingEvent.dateTime,
      sentAt,
      flow.delayHours // Pass delayHours for flexible triggers
    );

    console.log(`[onNotificationSent] Flow ${flow.id} (${flow.trigger}): scheduledFor = ${scheduledFor}`);

    if (scheduledFor && scheduledFor > new Date()) {
      // Use upsert to atomically create or update - prevents race conditions
      // Separate transaction to handle update conditionally based on status
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.automationFlowExecution.findUnique({
            where: {
              flowId_guestId: {
                flowId: flow.id,
                guestId,
              },
            },
          });

          if (existing) {
            // Only update if still pending
            if (existing.status === "PENDING") {
              await tx.automationFlowExecution.update({
                where: { id: existing.id },
                data: { scheduledFor },
              });
              console.log(`[onNotificationSent] Updated execution ${existing.id} to ${scheduledFor}`);
            } else {
              console.log(`[onNotificationSent] Execution ${existing.id} already ${existing.status}, not updating`);
            }
          } else {
            // Create new execution atomically
            const newExecution = await tx.automationFlowExecution.create({
              data: {
                flowId: flow.id,
                guestId,
                status: "PENDING",
                scheduledFor,
              },
            });
            console.log(`[onNotificationSent] Created execution ${newExecution.id} scheduled for ${scheduledFor}`);
          }
        });
      } catch (error) {
        // Silently catch unique constraint violations (race condition - another process already created it)
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          console.log(`[onNotificationSent] Execution already exists for flow ${flow.id} and guest ${guestId} (race condition handled)`);
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
  }
}

/**
 * Handle when a new automation flow is activated
 * Schedules executions for all eligible guests
 */
export async function onFlowActivated(flowId: string): Promise<void> {
  const flow = await prisma.automationFlow.findUnique({
    where: { id: flowId },
    include: {
      weddingEvent: {
        include: {
          guests: {
            include: {
              rsvp: true,
              notificationLogs: {
                orderBy: { sentAt: "desc" },
                take: 1,
              },
              tableAssignment: true,
            },
          },
        },
      },
    },
  });

  if (!flow || flow.status !== "ACTIVE") {
    return;
  }

  // Event-based triggers don't need scheduling
  if (isEventBasedTrigger(flow.trigger)) {
    return;
  }

  // Schedule executions for eligible guests
  for (const guest of flow.weddingEvent.guests) {
    // Calculate when to schedule
    const lastNotification = guest.notificationLogs[0]?.sentAt ?? null;
    const scheduledFor = calculateScheduledTime(
      flow.trigger,
      flow.weddingEvent.dateTime,
      lastNotification,
      flow.delayHours // Pass delayHours for flexible triggers
    );

    // Check eligibility based on trigger type
    let isEligible = false;

    switch (flow.trigger) {
      // New flexible no-response triggers
      case "NO_RESPONSE_WHATSAPP":
      case "NO_RESPONSE_SMS":
      case "NO_RESPONSE":
      // Legacy no-response triggers
      case "NO_RESPONSE_24H":
      case "NO_RESPONSE_48H":
      case "NO_RESPONSE_72H":
        // Only for pending RSVPs with at least one notification sent
        isEligible = guest.rsvp?.status === "PENDING" && lastNotification !== null;
        break;

      // Before event triggers
      case "BEFORE_EVENT":
      case "EVENT_DAY_MORNING":
      case "EVENT_MORNING":
      case "HOURS_BEFORE_EVENT_2":
        // Only for confirmed guests
        isEligible = guest.rsvp?.status === "ACCEPTED";
        break;

      // After event triggers
      case "AFTER_EVENT":
      case "DAY_AFTER_MORNING":
      case "DAY_AFTER_EVENT":
        // Only for confirmed guests
        isEligible = guest.rsvp?.status === "ACCEPTED";
        break;
    }

    if (isEligible && scheduledFor && scheduledFor > new Date()) {
      // Use transaction to atomically check and create - prevents duplicates
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.automationFlowExecution.findUnique({
            where: {
              flowId_guestId: {
                flowId: flow.id,
                guestId: guest.id,
              },
            },
          });

          if (!existing) {
            await tx.automationFlowExecution.create({
              data: {
                flowId: flow.id,
                guestId: guest.id,
                status: "PENDING",
                scheduledFor,
              },
            });
          }
        });
      } catch (error) {
        // Silently catch unique constraint violations (race condition - another process already created it)
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          console.log(`[onFlowActivated] Execution already exists for flow ${flow.id} and guest ${guest.id}`);
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
  }
}

/**
 * Create and immediately execute an automation
 */
async function createAndExecuteImmediate(
  flowId: string,
  guestId: string
): Promise<void> {
  // Use transaction to atomically check, create, and update status
  const executionId = await prisma.$transaction(async (tx) => {
    const existing = await tx.automationFlowExecution.findUnique({
      where: {
        flowId_guestId: {
          flowId,
          guestId,
        },
      },
    });

    if (existing) {
      // Skip if already completed
      if (existing.status === "COMPLETED") {
        return null;
      }
      // Update to processing
      await tx.automationFlowExecution.update({
        where: { id: existing.id },
        data: { status: "PROCESSING" },
      });
      return existing.id;
    } else {
      // Create new execution with PROCESSING status
      const execution = await tx.automationFlowExecution.create({
        data: {
          flowId,
          guestId,
          status: "PROCESSING",
        },
      });
      return execution.id;
    }
  });

  if (!executionId) {
    return; // Already completed
  }

  try {
    // Get flow and guest details
    const execution = await prisma.automationFlowExecution.findUnique({
      where: { id: executionId },
      include: {
        flow: {
          include: {
            weddingEvent: true,
          },
        },
        guest: {
          include: {
            rsvp: true,
            tableAssignment: {
              include: {
                table: true,
              },
            },
          },
        },
      },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    // Execute the action
    const result = await executeAction(execution.flow.action, {
      guestId: execution.guest.id,
      weddingEventId: execution.flow.weddingEventId,
      guestName: execution.guest.name,
      guestPhone: execution.guest.phoneNumber,
      rsvpStatus: execution.guest.rsvp?.status,
      tableName: execution.guest.tableAssignment?.table.name,
      eventDate: execution.flow.weddingEvent.dateTime,
      eventLocation: execution.flow.weddingEvent.location,
      eventVenue: execution.flow.weddingEvent.venue,
    });

    // Update execution status
    await prisma.automationFlowExecution.update({
      where: { id: executionId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        executedAt: new Date(),
        errorMessage: result.message,
      },
    });
  } catch (error) {
    // Mark as failed
    await prisma.automationFlowExecution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        executedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        retryCount: { increment: 1 },
      },
    });
  }
}

/**
 * Cancel pending "no response" executions when guest responds
 */
async function cancelPendingNoResponseExecutions(guestId: string): Promise<void> {
  await prisma.automationFlowExecution.updateMany({
    where: {
      guestId,
      status: "PENDING",
      flow: {
        trigger: {
          in: [
            // New flexible triggers
            "NO_RESPONSE_WHATSAPP",
            "NO_RESPONSE_SMS",
            "NO_RESPONSE",
            // Legacy triggers
            "NO_RESPONSE_24H",
            "NO_RESPONSE_48H",
            "NO_RESPONSE_72H",
          ],
        },
      },
    },
    data: {
      status: "SKIPPED",
    },
  });
}
