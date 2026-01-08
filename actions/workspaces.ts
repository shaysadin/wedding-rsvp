"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  generateSlug,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
} from "@/lib/validations/workspace";
// Note: Workspace management is only available to BUSINESS plan users

// ============================================
// WORKSPACE CRUD OPERATIONS
// ============================================

/**
 * Create a new workspace
 * Only available to BUSINESS plan users
 */
export async function createWorkspace(input: CreateWorkspaceInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const userId = user.id;

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    // Only BUSINESS users can create additional workspaces
    if (dbUser?.plan !== "BUSINESS") {
      return {
        error: "Workspace management is only available on the Business plan.",
        limitReached: true,
      };
    }

    const validatedData = createWorkspaceSchema.parse(input);

    // Generate slug if not provided
    let slug = validatedData.slug || generateSlug(validatedData.name);

    // Ensure slug is unique
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existingWorkspace) {
      // Append random suffix to make unique
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Check if this is the first workspace (make it default)
    const workspaceCount = await prisma.workspace.count({
      where: { ownerId: userId },
    });
    const isFirstWorkspace = workspaceCount === 0;

    const workspace = await prisma.workspace.create({
      data: {
        name: validatedData.name,
        slug,
        ownerId: userId,
        isDefault: isFirstWorkspace,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/workspaces");

    return { success: true, workspace };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return { error: "Failed to create workspace" };
  }
}

/**
 * Get all workspaces for the current user
 */
export async function getWorkspaces() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    // Fetch workspaces and user's current plan from DB (plan in session might be stale)
    const [workspaces, dbUser] = await Promise.all([
      prisma.workspace.findMany({
        where: { ownerId: user.id },
        include: {
          _count: {
            select: { events: true },
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "asc" },
        ],
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { plan: true },
      }),
    ]);

    return {
      success: true,
      workspaces,
      userPlan: dbUser?.plan || user.plan, // Return fresh plan from DB
    };
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return { error: "Failed to fetch workspaces" };
  }
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspaceById(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      include: {
        events: {
          orderBy: { dateTime: "desc" },
          take: 10,
        },
        _count: {
          select: { events: true },
        },
      },
    });

    if (!workspace) {
      return { error: "Workspace not found" };
    }

    return { success: true, workspace };
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return { error: "Failed to fetch workspace" };
  }
}

/**
 * Update a workspace
 * Only available to BUSINESS plan users
 */
export async function updateWorkspace(input: UpdateWorkspaceInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    // Only BUSINESS users can manage workspaces
    if (dbUser?.plan !== "BUSINESS") {
      return { error: "Workspace management is only available on the Business plan." };
    }

    const validatedData = updateWorkspaceSchema.parse(input);

    // Verify ownership
    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        id: validatedData.id,
        ownerId: user.id,
      },
    });

    if (!existingWorkspace) {
      return { error: "Workspace not found or unauthorized" };
    }

    // If slug is being updated, ensure it's unique
    if (validatedData.slug && validatedData.slug !== existingWorkspace.slug) {
      const slugExists = await prisma.workspace.findFirst({
        where: {
          slug: validatedData.slug,
          id: { not: validatedData.id },
        },
      });

      if (slugExists) {
        return { error: "This slug is already in use" };
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.slug && { slug: validatedData.slug }),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/workspaces");

    return { success: true, workspace };
  } catch (error) {
    console.error("Error updating workspace:", error);
    return { error: "Failed to update workspace" };
  }
}

/**
 * Delete a workspace
 * Only available to BUSINESS plan users
 */
export async function deleteWorkspace(id: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    // Only BUSINESS users can manage workspaces
    if (dbUser?.plan !== "BUSINESS") {
      return { error: "Workspace management is only available on the Business plan." };
    }

    // Verify ownership and check if default
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    if (!workspace) {
      return { error: "Workspace not found or unauthorized" };
    }

    // Cannot delete default workspace
    if (workspace.isDefault) {
      return { error: "Cannot delete the default workspace. Set another workspace as default first." };
    }

    // Check if workspace has events
    if (workspace._count.events > 0) {
      return {
        error: "Cannot delete workspace with events. Move or delete all events first.",
        hasEvents: true,
      };
    }

    await prisma.workspace.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/workspaces");

    return { success: true };
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return { error: "Failed to delete workspace" };
  }
}

/**
 * Set a workspace as the default
 * Only available to BUSINESS plan users
 */
export async function setDefaultWorkspace(id: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    // Only BUSINESS users can manage workspaces
    if (dbUser?.plan !== "BUSINESS") {
      return { error: "Workspace management is only available on the Business plan." };
    }

    // Verify ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!workspace) {
      return { error: "Workspace not found or unauthorized" };
    }

    // Use transaction to update default status
    await prisma.$transaction([
      // Remove default from all user's workspaces
      prisma.workspace.updateMany({
        where: { ownerId: user.id },
        data: { isDefault: false },
      }),
      // Set the new default
      prisma.workspace.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/workspaces");

    return { success: true };
  } catch (error) {
    console.error("Error setting default workspace:", error);
    return { error: "Failed to set default workspace" };
  }
}

/**
 * Get or create the default workspace for a user
 * Used when user needs a workspace but doesn't have one yet
 */
export async function getOrCreateDefaultWorkspace() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    // Try to find existing default workspace
    let workspace = await prisma.workspace.findFirst({
      where: {
        ownerId: user.id,
        isDefault: true,
      },
    });

    // If no default workspace, create one
    if (!workspace) {
      // Check if user has any workspaces
      const existingWorkspace = await prisma.workspace.findFirst({
        where: { ownerId: user.id },
      });

      if (existingWorkspace) {
        // Set the first existing workspace as default
        workspace = await prisma.workspace.update({
          where: { id: existingWorkspace.id },
          data: { isDefault: true },
        });
      } else {
        // Create new default workspace
        const slug = `workspace-${user.id.slice(-8)}`;
        workspace = await prisma.workspace.create({
          data: {
            name: "My Events",
            slug,
            ownerId: user.id,
            isDefault: true,
          },
        });
      }
    }

    return { success: true, workspace };
  } catch (error) {
    console.error("Error getting/creating default workspace:", error);
    return { error: "Failed to get default workspace" };
  }
}

// ============================================
// SUBSCRIPTION OPTIONS (Gift System & Voice)
// ============================================

/**
 * Toggle gift system discount for user
 * When enabled, user gets 50% off subscription
 * When disabled, user pays full price (100% more)
 */
export async function toggleGiftSystemDiscount(enabled: boolean) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    // Update user's gift system preference
    await prisma.user.update({
      where: { id: user.id },
      data: { giftSystemEnabled: enabled },
    });

    // TODO: If user has active Stripe subscription, update the subscription
    // to use the appropriate price ID (with or without gift discount)
    // This will be implemented in the Stripe integration phase

    revalidatePath("/dashboard/billing");

    return { success: true, giftSystemEnabled: enabled };
  } catch (error) {
    console.error("Error toggling gift system discount:", error);
    return { error: "Failed to update gift system preference" };
  }
}

/**
 * Toggle voice calls for BUSINESS plan users
 * This switches between Business plan variants (with/without voice)
 * Voice is included in the plan price, not a separate add-on
 */
export async function toggleVoiceCallsAddon(enabled: boolean) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return { error: "Unauthorized" };
    }

    // Only BUSINESS plan users can toggle voice
    if (user.plan !== "BUSINESS") {
      return { error: "Voice calls option is only available for Business plan" };
    }

    // Update user's voice preference
    // The actual subscription change will happen through Stripe's customer portal
    // or a separate API call to update the subscription price
    await prisma.user.update({
      where: { id: user.id },
      data: { voiceCallsAddOn: enabled },
    });

    // TODO: Update Stripe subscription to switch between:
    // - Business (no voice): $585/mo or $1170/mo (no gift)
    // - Business (with voice): $750/mo or $1500/mo (no gift)
    // This requires updating the subscription's price ID

    revalidatePath("/dashboard/billing");

    return { success: true, voiceCallsAddOn: enabled };
  } catch (error) {
    console.error("Error toggling voice calls:", error);
    return { error: "Failed to update voice calls preference" };
  }
}

/**
 * Move events from one workspace to another
 * Only available to BUSINESS plan users
 */
export async function moveEventsToWorkspace(eventIds: string[], targetWorkspaceId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Fetch fresh plan from database (session might be stale)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    // Only BUSINESS users can manage workspaces
    if (dbUser?.plan !== "BUSINESS") {
      return { error: "Workspace management is only available on the Business plan." };
    }

    // Verify target workspace ownership
    const targetWorkspace = await prisma.workspace.findFirst({
      where: {
        id: targetWorkspaceId,
        ownerId: user.id,
      },
    });

    if (!targetWorkspace) {
      return { error: "Target workspace not found or unauthorized" };
    }

    // Verify all events belong to user
    const events = await prisma.weddingEvent.findMany({
      where: {
        id: { in: eventIds },
        ownerId: user.id,
      },
    });

    if (events.length !== eventIds.length) {
      return { error: "Some events not found or unauthorized" };
    }

    // Move events to target workspace
    await prisma.weddingEvent.updateMany({
      where: {
        id: { in: eventIds },
        ownerId: user.id,
      },
      data: {
        workspaceId: targetWorkspaceId,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/workspaces");

    return { success: true, movedCount: eventIds.length };
  } catch (error) {
    console.error("Error moving events:", error);
    return { error: "Failed to move events" };
  }
}
