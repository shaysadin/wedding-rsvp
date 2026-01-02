"use server";

import { revalidatePath } from "next/cache";
import { UserRole, AutomationFlowStatus, AutomationTrigger, AutomationAction } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { FLOW_TEMPLATES } from "@/lib/automation/types";
import { onFlowActivated } from "@/lib/automation/event-handlers";
import { getAutomationStats } from "@/lib/automation/flow-processor";

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
