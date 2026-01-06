"use server";

import { revalidatePath } from "next/cache";
import { UserRole, AutomationFlowStatus, AutomationTrigger, AutomationAction } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { FLOW_TEMPLATES, AutomationContext } from "@/lib/automation/types";
import { onFlowActivated } from "@/lib/automation/event-handlers";
import { getAutomationStats } from "@/lib/automation/flow-processor";
import { executeAction } from "@/lib/automation/action-executor";

// ============================================
// FLOW TEMPLATES (System-wide)
// ============================================

/**
 * Get all available flow templates (auto-seeds if empty)
 */
export async function getFlowTemplates() {
  try {
    let templates = await prisma.automationFlowTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Auto-seed templates if none exist
    if (templates.length === 0) {
      console.log("No templates found, auto-seeding...");
      let sortOrder = 0;
      for (const template of FLOW_TEMPLATES) {
        const existing = await prisma.automationFlowTemplate.findUnique({
          where: { name: template.name },
        });

        if (!existing) {
          await prisma.automationFlowTemplate.create({
            data: {
              ...template,
              sortOrder: sortOrder++,
            },
          });
        }
      }

      // Fetch again after seeding
      templates = await prisma.automationFlowTemplate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching flow templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

/**
 * Seed default flow templates (admin only)
 */
export async function seedFlowTemplates() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    let created = 0;

    for (const template of FLOW_TEMPLATES) {
      const existing = await prisma.automationFlowTemplate.findUnique({
        where: { name: template.name },
      });

      if (!existing) {
        await prisma.automationFlowTemplate.create({
          data: {
            ...template,
            sortOrder: created,
          },
        });
        created++;
      }
    }

    return { success: true, created };
  } catch (error) {
    console.error("Error seeding flow templates:", error);
    return { error: "Failed to seed templates" };
  }
}

// ============================================
// AUTOMATION FLOWS (Event-specific)
// ============================================

/**
 * Get automation flows for an event
 */
export async function getEventAutomationFlows(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const flows = await prisma.automationFlow.findMany({
      where: { weddingEventId: eventId },
      include: {
        _count: {
          select: { executions: true },
        },
        executions: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats for each flow
    const flowsWithStats = flows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      trigger: flow.trigger,
      action: flow.action,
      status: flow.status,
      templateId: flow.templateId,
      customMessage: flow.customMessage,
      delayHours: flow.delayHours,
      createdAt: flow.createdAt,
      stats: {
        total: flow.executions.length,
        pending: flow.executions.filter((e) => e.status === "PENDING").length,
        completed: flow.executions.filter((e) => e.status === "COMPLETED").length,
        failed: flow.executions.filter((e) => e.status === "FAILED").length,
        skipped: flow.executions.filter((e) => e.status === "SKIPPED").length,
      },
    }));

    return { success: true, flows: flowsWithStats };
  } catch (error) {
    console.error("Error fetching automation flows:", error);
    return { error: "Failed to fetch automation flows" };
  }
}

/**
 * Create a new automation flow from a template
 */
export async function createAutomationFlowFromTemplate(
  eventId: string,
  templateId: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get the template
    const template = await prisma.automationFlowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // Check if a flow with the same trigger already exists
    const existingFlow = await prisma.automationFlow.findFirst({
      where: {
        weddingEventId: eventId,
        trigger: template.trigger,
      },
    });

    if (existingFlow) {
      return { error: "A flow with this trigger already exists for this event" };
    }

    // Create the flow
    const flow = await prisma.automationFlow.create({
      data: {
        weddingEventId: eventId,
        name: template.name,
        trigger: template.trigger,
        action: template.action,
        templateId: template.id,
        status: "DRAFT",
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/automation`);

    return { success: true, flow };
  } catch (error) {
    console.error("Error creating automation flow:", error);
    return { error: "Failed to create automation flow" };
  }
}

/**
 * Create a custom automation flow
 */
export async function createCustomAutomationFlow(
  eventId: string,
  data: {
    name: string;
    trigger: AutomationTrigger;
    action: AutomationAction;
    customMessage?: string;
    delayHours?: number;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if a flow with the same trigger already exists
    const existingFlow = await prisma.automationFlow.findFirst({
      where: {
        weddingEventId: eventId,
        trigger: data.trigger,
      },
    });

    if (existingFlow) {
      return { error: "A flow with this trigger already exists for this event" };
    }

    // Create the flow
    const flow = await prisma.automationFlow.create({
      data: {
        weddingEventId: eventId,
        name: data.name,
        trigger: data.trigger,
        action: data.action,
        customMessage: data.customMessage,
        delayHours: data.delayHours,
        status: "DRAFT",
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/automation`);

    return { success: true, flow };
  } catch (error) {
    console.error("Error creating custom automation flow:", error);
    return { error: "Failed to create automation flow" };
  }
}

/**
 * Update automation flow status
 */
export async function updateAutomationFlowStatus(
  flowId: string,
  status: AutomationFlowStatus
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Update the status
    await prisma.automationFlow.update({
      where: { id: flowId },
      data: { status },
    });

    // If activating, schedule executions for eligible guests
    if (status === "ACTIVE") {
      await onFlowActivated(flowId);
    }

    // If pausing or archiving, cancel pending executions
    if (status === "PAUSED" || status === "ARCHIVED") {
      await prisma.automationFlowExecution.updateMany({
        where: {
          flowId,
          status: "PENDING",
        },
        data: {
          status: "SKIPPED",
        },
      });
    }

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true };
  } catch (error) {
    console.error("Error updating automation flow status:", error);
    return { error: "Failed to update flow status" };
  }
}

/**
 * Update automation flow custom message
 */
export async function updateAutomationFlowMessage(
  flowId: string,
  customMessage: string | null
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Update the message
    await prisma.automationFlow.update({
      where: { id: flowId },
      data: { customMessage },
    });

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true };
  } catch (error) {
    console.error("Error updating automation flow message:", error);
    return { error: "Failed to update flow message" };
  }
}

/**
 * Get a single automation flow with full details
 */
export async function getAutomationFlow(flowId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            dateTime: true,
            location: true,
            venue: true,
          },
        },
        template: true,
        executions: {
          select: {
            id: true,
            status: true,
            scheduledFor: true,
            executedAt: true,
            errorMessage: true,
            retryCount: true,
            guest: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Calculate stats
    const stats = {
      total: flow.executions.length,
      pending: flow.executions.filter((e) => e.status === "PENDING").length,
      processing: flow.executions.filter((e) => e.status === "PROCESSING").length,
      completed: flow.executions.filter((e) => e.status === "COMPLETED").length,
      failed: flow.executions.filter((e) => e.status === "FAILED").length,
      skipped: flow.executions.filter((e) => e.status === "SKIPPED").length,
    };

    return {
      success: true,
      flow: {
        ...flow,
        stats,
      },
    };
  } catch (error) {
    console.error("Error fetching automation flow:", error);
    return { error: "Failed to fetch flow" };
  }
}

/**
 * Update automation flow (full edit)
 */
export async function updateAutomationFlow(
  flowId: string,
  data: {
    name?: string;
    trigger?: AutomationTrigger;
    action?: AutomationAction;
    customMessage?: string | null;
    delayHours?: number | null;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // If changing trigger, check for conflicts
    if (data.trigger && data.trigger !== flow.trigger) {
      const existingFlow = await prisma.automationFlow.findFirst({
        where: {
          weddingEventId: flow.weddingEventId,
          trigger: data.trigger,
          id: { not: flowId },
        },
      });

      if (existingFlow) {
        return { error: "A flow with this trigger already exists for this event" };
      }
    }

    // If flow is active and trigger/action changed, cancel pending executions
    if (flow.status === "ACTIVE" && (data.trigger || data.action)) {
      await prisma.automationFlowExecution.updateMany({
        where: {
          flowId,
          status: "PENDING",
        },
        data: {
          status: "SKIPPED",
        },
      });
    }

    // Update the flow
    const updatedFlow = await prisma.automationFlow.update({
      where: { id: flowId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.trigger !== undefined && { trigger: data.trigger }),
        ...(data.action !== undefined && { action: data.action }),
        ...(data.customMessage !== undefined && { customMessage: data.customMessage }),
        ...(data.delayHours !== undefined && { delayHours: data.delayHours }),
      },
    });

    // If flow is active and trigger changed, reschedule executions
    if (flow.status === "ACTIVE" && data.trigger) {
      await onFlowActivated(flowId);
    }

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true, flow: updatedFlow };
  } catch (error) {
    console.error("Error updating automation flow:", error);
    return { error: "Failed to update flow" };
  }
}

/**
 * Retry failed executions for a flow
 */
export async function retryFailedExecutions(flowId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Reset failed executions to pending
    const result = await prisma.automationFlowExecution.updateMany({
      where: {
        flowId,
        status: "FAILED",
      },
      data: {
        status: "PENDING",
        errorMessage: null,
        retryCount: { increment: 1 },
        scheduledFor: new Date(),
      },
    });

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true, retriedCount: result.count };
  } catch (error) {
    console.error("Error retrying failed executions:", error);
    return { error: "Failed to retry executions" };
  }
}

/**
 * Cancel pending executions for a flow
 */
export async function cancelPendingExecutions(flowId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Cancel pending executions
    const result = await prisma.automationFlowExecution.updateMany({
      where: {
        flowId,
        status: "PENDING",
      },
      data: {
        status: "SKIPPED",
      },
    });

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true, cancelledCount: result.count };
  } catch (error) {
    console.error("Error cancelling pending executions:", error);
    return { error: "Failed to cancel executions" };
  }
}

/**
 * Retry a single execution (works for both FAILED and PENDING with errors)
 */
export async function retrySingleExecution(executionId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get execution with flow and event
    const execution = await prisma.automationFlowExecution.findUnique({
      where: { id: executionId },
      include: {
        flow: {
          include: {
            weddingEvent: true,
          },
        },
      },
    });

    if (!execution || execution.flow.weddingEvent.ownerId !== user.id) {
      return { error: "Execution not found" };
    }

    // Reset to pending for immediate retry
    await prisma.automationFlowExecution.update({
      where: { id: executionId },
      data: {
        status: "PENDING",
        errorMessage: null,
        scheduledFor: new Date(), // Schedule for now
      },
    });

    revalidatePath(`/dashboard/automations`);

    return { success: true };
  } catch (error) {
    console.error("Error retrying single execution:", error);
    return { error: "Failed to retry execution" };
  }
}

/**
 * Run a single pending execution immediately
 * This bypasses the cron job and executes right now
 */
export async function runExecutionNow(executionId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get execution with all needed data
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

    if (!execution || execution.flow.weddingEvent.ownerId !== user.id) {
      return { error: "Execution not found" };
    }

    if (execution.status !== "PENDING" && execution.status !== "FAILED") {
      return { error: "Can only run pending or failed executions" };
    }

    // Import and execute
    const { executeAction } = await import("@/lib/automation/action-executor");

    // Mark as processing
    await prisma.automationFlowExecution.update({
      where: { id: executionId },
      data: { status: "PROCESSING" },
    });

    const now = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    const rsvpUrl = `${baseUrl}/rsvp/${execution.guest.slug}`;

    // Format event time
    const timeFormatter = new Intl.DateTimeFormat("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const eventTime = timeFormatter.format(execution.flow.weddingEvent.dateTime);

    // Build context
    const context = {
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
      customMessage: execution.flow.customMessage,
      rsvpLink: rsvpUrl,
    };

    // Execute the action
    const actionResult = await executeAction(execution.flow.action, context);

    // Update execution status
    if (actionResult.success) {
      await prisma.automationFlowExecution.update({
        where: { id: executionId },
        data: {
          status: "COMPLETED",
          executedAt: now,
          errorMessage: null,
        },
      });

      revalidatePath(`/dashboard/automations`);
      return { success: true, message: actionResult.message };
    } else {
      // Mark as failed
      await prisma.automationFlowExecution.update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          executedAt: now,
          errorMessage: actionResult.message,
          retryCount: { increment: 1 },
        },
      });

      revalidatePath(`/dashboard/automations`);
      return { error: actionResult.message };
    }
  } catch (error) {
    console.error("Error running execution now:", error);

    // Try to mark as failed
    try {
      await prisma.automationFlowExecution.update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          executedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch {}

    return { error: error instanceof Error ? error.message : "Failed to run execution" };
  }
}

/**
 * Delete an automation flow
 */
export async function deleteAutomationFlow(flowId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    const eventId = flow.weddingEventId;

    // Delete the flow (cascades to executions)
    await prisma.automationFlow.delete({
      where: { id: flowId },
    });

    revalidatePath(`/dashboard/events/${eventId}/automation`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting automation flow:", error);
    return { error: "Failed to delete automation flow" };
  }
}

/**
 * Update system automation message for an event
 */
export async function updateSystemAutomationMessage(
  eventId: string,
  field: "rsvpConfirmedMessage" | "rsvpDeclinedMessage",
  message: string | null
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: { ownerId: true },
    });

    if (!event || event.ownerId !== user.id) {
      return { error: "Event not found" };
    }

    // Update the message
    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        [field]: message,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/automation`);

    return { success: true };
  } catch (error) {
    console.error("Error updating system automation message:", error);
    return { error: "Failed to update message" };
  }
}

/**
 * Get event with system automation messages
 */
export async function getEventAutomationSettings(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        ownerId: true,
        rsvpConfirmedMessage: true,
        rsvpDeclinedMessage: true,
      },
    });

    if (!event || event.ownerId !== user.id) {
      return { error: "Event not found" };
    }

    return {
      success: true,
      customMessages: {
        rsvpConfirmedMessage: event.rsvpConfirmedMessage,
        rsvpDeclinedMessage: event.rsvpDeclinedMessage,
      },
    };
  } catch (error) {
    console.error("Error fetching event automation settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

// ============================================
// AUTOMATION EXECUTIONS
// ============================================

/**
 * Get execution history for a flow
 */
export async function getFlowExecutions(
  flowId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    const executions = await prisma.automationFlowExecution.findMany({
      where: {
        flowId,
        ...(options?.status ? { status: options.status as any } : {}),
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return { success: true, executions };
  } catch (error) {
    console.error("Error fetching flow executions:", error);
    return { error: "Failed to fetch executions" };
  }
}

/**
 * Manually trigger an automation for specific guests
 */
export async function triggerAutomationForGuests(
  flowId: string,
  guestIds: string[]
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through the event
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        weddingEvent: true,
      },
    });

    if (!flow || flow.weddingEvent.ownerId !== user.id) {
      return { error: "Flow not found" };
    }

    // Create pending executions for the selected guests
    let created = 0;
    for (const guestId of guestIds) {
      // Check if execution already exists
      const existing = await prisma.automationFlowExecution.findUnique({
        where: {
          flowId_guestId: {
            flowId,
            guestId,
          },
        },
      });

      if (!existing) {
        await prisma.automationFlowExecution.create({
          data: {
            flowId,
            guestId,
            status: "PENDING",
            scheduledFor: new Date(), // Execute immediately on next cron run
          },
        });
        created++;
      }
    }

    revalidatePath(`/dashboard/events/${flow.weddingEventId}/automation`);

    return { success: true, created };
  } catch (error) {
    console.error("Error triggering automation:", error);
    return { error: "Failed to trigger automation" };
  }
}

/**
 * Get automation statistics for an event
 */
export async function getEventAutomationStats(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const stats = await getAutomationStats(eventId);

    return { success: true, stats };
  } catch (error) {
    console.error("Error fetching automation stats:", error);
    return { error: "Failed to fetch stats" };
  }
}

// ============================================
// TEST AUTOMATION
// ============================================

/**
 * Test an automation flow by sending to a test phone number immediately
 */
export async function testAutomationFlow(
  flowId: string,
  testPhone: string,
  testName?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Validate and format phone number
    let cleanPhone = testPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      return { error: "Invalid phone number" };
    }

    // Convert Israeli local format (05xxxxxxxx) to international format (+9725xxxxxxxx)
    if (cleanPhone.startsWith("05") && cleanPhone.length === 10) {
      cleanPhone = "972" + cleanPhone.substring(1);
    }
    // Handle numbers starting with 0 (other local formats)
    else if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.substring(1);
    }

    // Get the flow with event details
    const flow = await prisma.automationFlow.findFirst({
      where: { id: flowId },
      include: {
        weddingEvent: {
          include: {
            rsvpPageSettings: true,
          },
        },
      },
    });

    if (!flow) {
      return { error: "Automation flow not found" };
    }

    // Verify ownership
    if (flow.weddingEvent.ownerId !== user.id) {
      return { error: "Unauthorized" };
    }

    const event = flow.weddingEvent;

    // Build the automation context for the test
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";

    const context: AutomationContext = {
      guestId: "test-guest-id",
      weddingEventId: event.id,
      guestName: testName || "Test Guest",
      guestPhone: cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`,
      rsvpStatus: "PENDING",
      eventDate: event.dateTime,
      eventTime: event.dateTime ? event.dateTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : undefined,
      eventLocation: event.location || "",
      eventVenue: event.venue || "",
      eventAddress: event.location || "",
      customMessage: flow.customMessage || undefined,
      rsvpLink: `${baseUrl}/rsvp/test-preview`,
      guestCount: 2,
      tableName: "Test Table",
    };

    // Execute the action immediately
    const result = await executeAction(flow.action, context);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        channel: flow.action.includes("SMS") ? "SMS" : "WhatsApp"
      };
    } else {
      return {
        error: result.message || "Test failed",
        errorCode: result.errorCode
      };
    }
  } catch (error) {
    console.error("Error testing automation:", error);
    return { error: error instanceof Error ? error.message : "Failed to test automation" };
  }
}

/**
 * Test automation with an existing guest (uses their real phone number)
 */
export async function testAutomationWithGuest(
  flowId: string,
  guestId: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get the flow with event details
    const flow = await prisma.automationFlow.findFirst({
      where: { id: flowId },
      include: {
        weddingEvent: {
          include: {
            rsvpPageSettings: true,
          },
        },
      },
    });

    if (!flow) {
      return { error: "Automation flow not found" };
    }

    // Verify ownership
    if (flow.weddingEvent.ownerId !== user.id) {
      return { error: "Unauthorized" };
    }

    // Get the guest
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        weddingEventId: flow.weddingEventId,
      },
      include: {
        rsvp: true,
        tableAssignment: {
          include: { table: true },
        },
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    const event = flow.weddingEvent;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";

    // Build the automation context with real guest data
    const context: AutomationContext = {
      guestId: guest.id,
      weddingEventId: event.id,
      guestName: guest.name,
      guestPhone: guest.phoneNumber,
      rsvpStatus: guest.rsvp?.status || "PENDING",
      eventDate: event.dateTime,
      eventTime: event.dateTime ? event.dateTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : undefined,
      eventLocation: event.location || "",
      eventVenue: event.venue || "",
      eventAddress: event.location || "",
      customMessage: flow.customMessage || undefined,
      rsvpLink: `${baseUrl}/rsvp/${guest.slug}`,
      guestCount: guest.expectedGuests || 1,
      tableName: guest.tableAssignment?.table?.name || undefined,
    };

    // Execute the action immediately
    const result = await executeAction(flow.action, context);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        channel: flow.action.includes("SMS") ? "SMS" : "WhatsApp",
        guestName: guest.name
      };
    } else {
      return {
        error: result.message || "Test failed",
        errorCode: result.errorCode
      };
    }
  } catch (error) {
    console.error("Error testing automation with guest:", error);
    return { error: error instanceof Error ? error.message : "Failed to test automation" };
  }
}

/**
 * Get guests with phone numbers for testing automations
 */
export async function getEventGuestsForTesting(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get guests with phone numbers
    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        phoneNumber: { not: null },
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    // Map to expected interface (phone instead of phoneNumber)
    const mappedGuests = guests.map(g => ({
      id: g.id,
      name: g.name,
      phone: g.phoneNumber,
    }));

    return { success: true, guests: mappedGuests };
  } catch (error) {
    console.error("Error fetching guests for testing:", error);
    return { error: "Failed to fetch guests" };
  }
}

// Trigger labels for simulation display
const TRIGGER_LABELS: Record<string, { en: string; he: string }> = {
  NO_RESPONSE_WHATSAPP: { en: "No WhatsApp response", he: "אין תגובה בוואטסאפ" },
  NO_RESPONSE_SMS: { en: "No SMS response", he: "אין תגובה ב-SMS" },
  RSVP_CONFIRMED: { en: "RSVP confirmed", he: "אישור הגעה" },
  RSVP_DECLINED: { en: "RSVP declined", he: "סירוב הגעה" },
  BEFORE_EVENT_1_DAY: { en: "1 day before event", he: "יום לפני האירוע" },
  BEFORE_EVENT_3_DAYS: { en: "3 days before event", he: "3 ימים לפני האירוע" },
  BEFORE_EVENT_1_WEEK: { en: "1 week before event", he: "שבוע לפני האירוע" },
  EVENT_DAY_MORNING: { en: "Event day morning", he: "בוקר יום האירוע" },
  AFTER_EVENT_1_DAY: { en: "1 day after event", he: "יום אחרי האירוע" },
};

const ACTION_LABELS: Record<string, { en: string; he: string }> = {
  SEND_WHATSAPP_INVITE: { en: "Send WhatsApp invitation", he: "שלח הזמנה בוואטסאפ" },
  SEND_WHATSAPP_REMINDER: { en: "Send WhatsApp reminder", he: "שלח תזכורת בוואטסאפ" },
  SEND_WHATSAPP_CONFIRMATION: { en: "Send WhatsApp confirmation", he: "שלח אישור בוואטסאפ" },
  SEND_CUSTOM_WHATSAPP: { en: "Send custom WhatsApp", he: "שלח הודעת וואטסאפ מותאמת" },
  SEND_CUSTOM_SMS: { en: "Send custom SMS", he: "שלח SMS מותאם" },
  SEND_SMS_REMINDER: { en: "Send SMS reminder", he: "שלח תזכורת ב-SMS" },
  SEND_TABLE_ASSIGNMENT: { en: "Send table assignment", he: "שלח שיבוץ שולחן" },
};

/**
 * Simulate a full automation flow test
 * This tests the complete flow: trigger check -> delay simulation -> action execution
 */
export async function simulateAutomationFlow(
  flowId: string,
  testPhone: string,
  testName?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Validate and format phone number
    let cleanPhone = testPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      return { error: "Invalid phone number" };
    }

    // Convert Israeli local format to international format
    if (cleanPhone.startsWith("05") && cleanPhone.length === 10) {
      cleanPhone = "972" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.substring(1);
    }

    // Get the flow with event details
    const flow = await prisma.automationFlow.findFirst({
      where: { id: flowId },
      include: {
        weddingEvent: {
          include: {
            rsvpPageSettings: true,
          },
        },
      },
    });

    if (!flow) {
      return { error: "Automation flow not found" };
    }

    if (flow.weddingEvent.ownerId !== user.id) {
      return { error: "Unauthorized" };
    }

    const event = flow.weddingEvent;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    const isHebrew = true; // Default to Hebrew for Israeli market

    // Simulate the flow steps
    const steps: Array<{
      step: number;
      type: "trigger" | "delay" | "action";
      title: string;
      description: string;
      status: "pending" | "simulated" | "executed" | "failed";
      result?: string;
    }> = [];

    // Step 1: Trigger
    const triggerLabel = TRIGGER_LABELS[flow.trigger] || { en: flow.trigger, he: flow.trigger };
    steps.push({
      step: 1,
      type: "trigger",
      title: isHebrew ? "טריגר" : "Trigger",
      description: isHebrew ? triggerLabel.he : triggerLabel.en,
      status: "simulated",
      result: isHebrew ? "הטריגר הופעל (סימולציה)" : "Trigger activated (simulated)",
    });

    // Step 2: Delay (if applicable)
    if (flow.delayHours && flow.delayHours > 0) {
      steps.push({
        step: 2,
        type: "delay",
        title: isHebrew ? "המתנה" : "Delay",
        description: isHebrew
          ? `המתנה של ${flow.delayHours} שעות`
          : `Wait ${flow.delayHours} hours`,
        status: "simulated",
        result: isHebrew
          ? `דילגנו על ההמתנה בסימולציה`
          : `Delay skipped in simulation`,
      });
    }

    // Step 3: Execute Action
    const actionLabel = ACTION_LABELS[flow.action] || { en: flow.action, he: flow.action };
    const actionStep: typeof steps[number] = {
      step: flow.delayHours ? 3 : 2,
      type: "action",
      title: isHebrew ? "פעולה" : "Action",
      description: isHebrew ? actionLabel.he : actionLabel.en,
      status: "pending",
    };

    // Build the automation context
    const context: AutomationContext = {
      guestId: "test-guest-id",
      weddingEventId: event.id,
      guestName: testName || "אורח בדיקה",
      guestPhone: cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`,
      rsvpStatus: "PENDING",
      eventDate: event.dateTime,
      eventTime: event.dateTime
        ? event.dateTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
        : undefined,
      eventLocation: event.location || "",
      eventVenue: event.venue || "",
      eventAddress: event.location || "",
      customMessage: flow.customMessage || undefined,
      rsvpLink: `${baseUrl}/rsvp/test-preview`,
      guestCount: 2,
      tableName: "שולחן בדיקה",
    };

    // Execute the action
    const result = await executeAction(flow.action, context);

    if (result.success) {
      actionStep.status = "executed";
      actionStep.result = result.message;
    } else {
      actionStep.status = "failed";
      actionStep.result = result.message;
    }

    steps.push(actionStep);

    // Determine overall success
    const allSuccessful = steps.every((s) => s.status !== "failed");

    return {
      success: allSuccessful,
      flowName: flow.name,
      trigger: flow.trigger,
      action: flow.action,
      delayHours: flow.delayHours,
      steps,
      channel: flow.action.includes("SMS") ? "SMS" : "WhatsApp",
      message: allSuccessful
        ? isHebrew
          ? "סימולציית האוטומציה הושלמה בהצלחה!"
          : "Automation simulation completed successfully!"
        : isHebrew
        ? "הסימולציה נכשלה בשלב הפעולה"
        : "Simulation failed at action step",
    };
  } catch (error) {
    console.error("Error simulating automation flow:", error);
    return { error: error instanceof Error ? error.message : "Simulation failed" };
  }
}
