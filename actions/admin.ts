"use server";

import { revalidatePath } from "next/cache";
import { UserRole, UserStatus, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/session";
import { PLAN_LIMITS } from "@/config/plans";
import { getStripe, getPriceId } from "@/lib/stripe";

export async function getAllUsers() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        // Get all users who have ROLE_WEDDING_OWNER in their roles array
        roles: {
          has: UserRole.ROLE_WEDDING_OWNER,
        },
      },
      include: {
        _count: {
          select: { weddingEvents: true },
        },
        weddingEvents: {
          select: {
            id: true,
            title: true,
            _count: {
              select: { guests: true },
            },
          },
        },
        usageTracking: true,
        vapiPhoneNumber: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate total guests and add plan limits for each user
    const usersWithStats = users.map((u) => {
      const planLimits = PLAN_LIMITS[u.plan];
      return {
        ...u,
        totalGuests: u.weddingEvents.reduce(
          (sum, event) => sum + event._count.guests,
          0
        ),
        planLimits,
      };
    });

    return { success: true, users: usersWithStats };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { error: "Failed to fetch users" };
  }
}

export async function getSuspendedUsers() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        // Get suspended users who have ROLE_WEDDING_OWNER in their roles array
        roles: {
          has: UserRole.ROLE_WEDDING_OWNER,
        },
        status: UserStatus.SUSPENDED,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching suspended users:", error);
    return { error: "Failed to fetch suspended users" };
  }
}

export async function reactivateUser(userId: string) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Error reactivating user:", error);
    return { error: "Failed to reactivate user" };
  }
}

export async function suspendUser(userId: string) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Error suspending user:", error);
    return { error: "Failed to suspend user" };
  }
}

export async function changeUserPlan(
  userId: string,
  plan: PlanTier,
  resetUsage: boolean = false,
  syncWithStripe: boolean = false
) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // Get the user with current Stripe info
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripePriceId: true,
      },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    // If syncing with Stripe and user has an active subscription, update it
    if (syncWithStripe && targetUser.stripeSubscriptionId && plan !== "FREE") {
      try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(targetUser.stripeSubscriptionId);

        // Determine if current is yearly or monthly based on the price
        const currentPriceId = subscription.items.data[0]?.price.id;
        const isYearly = currentPriceId?.includes("yearly") || false;

        // Get the appropriate price ID for the new plan
        const planKey = plan as "BASIC" | "ADVANCED" | "PREMIUM";
        const newPriceId = getPriceId(planKey, isYearly ? "yearly" : "monthly");

        if (newPriceId && subscription.status === "active") {
          // Update the Stripe subscription
          await stripe.subscriptions.update(targetUser.stripeSubscriptionId, {
            items: [
              {
                id: subscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            proration_behavior: "create_prorations",
          });
        }
      } catch (stripeError) {
        console.error("Error syncing with Stripe:", stripeError);
        // Continue with local update even if Stripe sync fails
      }
    }

    // If downgrading to FREE and user has active subscription, cancel it
    if (syncWithStripe && targetUser.stripeSubscriptionId && plan === "FREE") {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(targetUser.stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Error canceling Stripe subscription:", stripeError);
      }
    }

    // Update user plan in database
    const updateData: {
      plan: PlanTier;
      stripeSubscriptionId?: null;
      stripePriceId?: null;
      stripeCurrentPeriodEnd?: null;
    } = { plan };

    // If setting to FREE, clear Stripe fields
    if (plan === "FREE") {
      updateData.stripeSubscriptionId = null;
      updateData.stripePriceId = null;
      updateData.stripeCurrentPeriodEnd = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create or update usage tracking
    if (resetUsage) {
      await prisma.usageTracking.upsert({
        where: { userId },
        create: {
          userId,
          whatsappSent: 0,
          smsSent: 0,
          periodStart: new Date(),
        },
        update: {
          whatsappSent: 0,
          smsSent: 0,
          periodStart: new Date(),
        },
      });
    } else {
      // Ensure usage tracking exists for the user
      await prisma.usageTracking.upsert({
        where: { userId },
        create: {
          userId,
          periodStart: new Date(),
        },
        update: {},
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Error changing user plan:", error);
    return { error: "Failed to change user plan" };
  }
}

export async function resetUserUsage(userId: string) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    await prisma.usageTracking.upsert({
      where: { userId },
      create: {
        userId,
        whatsappSent: 0,
        smsSent: 0,
        voiceCallsMade: 0,
        periodStart: new Date(),
      },
      update: {
        whatsappSent: 0,
        smsSent: 0,
        voiceCallsMade: 0,
        periodStart: new Date(),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Error resetting user usage:", error);
    return { error: "Failed to reset user usage" };
  }
}

export async function addBonusMessages(
  userId: string,
  whatsappBonus: number = 0,
  smsBonus: number = 0
) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    const usage = await prisma.usageTracking.upsert({
      where: { userId },
      create: {
        userId,
        whatsappBonus,
        smsBonus,
        periodStart: new Date(),
      },
      update: {
        whatsappBonus: { increment: whatsappBonus },
        smsBonus: { increment: smsBonus },
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, usage };
  } catch (error) {
    console.error("Error adding bonus messages:", error);
    return { error: "Failed to add bonus messages" };
  }
}

export async function adjustCredits(
  userId: string,
  whatsappAdjustment: number = 0,
  smsAdjustment: number = 0,
  voiceCallsAdjustment: number = 0
) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // Get current usage to validate we don't go below zero
    const currentUsage = await prisma.usageTracking.findUnique({
      where: { userId },
    });

    const currentWhatsappBonus = currentUsage?.whatsappBonus || 0;
    const currentSmsBonus = currentUsage?.smsBonus || 0;
    const currentVoiceCallsBonus = currentUsage?.voiceCallsBonus || 0;

    // Calculate new bonus values (ensure they don't go below 0)
    const newWhatsappBonus = Math.max(0, currentWhatsappBonus + whatsappAdjustment);
    const newSmsBonus = Math.max(0, currentSmsBonus + smsAdjustment);
    const newVoiceCallsBonus = Math.max(0, currentVoiceCallsBonus + voiceCallsAdjustment);

    const usage = await prisma.usageTracking.upsert({
      where: { userId },
      create: {
        userId,
        whatsappBonus: Math.max(0, whatsappAdjustment),
        smsBonus: Math.max(0, smsAdjustment),
        voiceCallsBonus: Math.max(0, voiceCallsAdjustment),
        periodStart: new Date(),
      },
      update: {
        whatsappBonus: newWhatsappBonus,
        smsBonus: newSmsBonus,
        voiceCallsBonus: newVoiceCallsBonus,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, usage };
  } catch (error) {
    console.error("Error adjusting credits:", error);
    return { error: "Failed to adjust credits" };
  }
}

export async function getRecentUsers(limit: number = 5) {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        roles: {
          has: UserRole.ROLE_WEDDING_OWNER,
        },
      },
      include: {
        _count: {
          select: { weddingEvents: true },
        },
        weddingEvents: {
          select: {
            id: true,
            title: true,
            _count: {
              select: { guests: true },
            },
          },
        },
        usageTracking: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate total guests and add plan limits for each user
    const usersWithStats = users.map((u) => {
      const planLimits = PLAN_LIMITS[u.plan];
      return {
        ...u,
        totalGuests: u.weddingEvents.reduce(
          (sum, event) => sum + event._count.guests,
          0
        ),
        planLimits,
      };
    });

    return { success: true, users: usersWithStats };
  } catch (error) {
    console.error("Error fetching recent users:", error);
    return { error: "Failed to fetch recent users" };
  }
}

export async function getUsageStats() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get aggregate usage stats
    const usageStats = await prisma.usageTracking.aggregate({
      _sum: {
        whatsappSent: true,
        smsSent: true,
      },
    });

    // Get pending approvals count
    const pendingApprovals = await prisma.user.count({
      where: {
        roles: { has: UserRole.ROLE_WEDDING_OWNER },
        status: UserStatus.PENDING_APPROVAL,
      },
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEvents = await prisma.weddingEvent.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const recentRsvps = await prisma.guestRsvp.count({
      where: {
        updatedAt: { gte: sevenDaysAgo },
        status: { not: "PENDING" },
      },
    });

    return {
      success: true,
      stats: {
        totalWhatsappSent: usageStats._sum.whatsappSent || 0,
        totalSmsSent: usageStats._sum.smsSent || 0,
        pendingApprovals,
        recentEvents,
        recentRsvps,
      },
    };
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return { error: "Failed to fetch usage stats" };
  }
}

export async function getUserUsage(userId: string) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { usageTracking: true },
    });

    if (!user) {
      return { error: "User not found" };
    }

    const planLimits = PLAN_LIMITS[user.plan];
    const usage = user.usageTracking;

    return {
      success: true,
      data: {
        plan: user.plan,
        planLimits,
        usage: usage || {
          whatsappSent: 0,
          smsSent: 0,
          whatsappBonus: 0,
          smsBonus: 0,
        },
        remaining: {
          whatsapp: Math.max(
            0,
            planLimits.maxWhatsappMessages + (usage?.whatsappBonus || 0) - (usage?.whatsappSent || 0)
          ),
          sms: Math.max(
            0,
            planLimits.maxSmsMessages + (usage?.smsBonus || 0) - (usage?.smsSent || 0)
          ),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching user usage:", error);
    return { error: "Failed to fetch user usage" };
  }
}

export async function toggleUserAdminRole(userId: string) {
  try {
    const currentUser = await requirePlatformOwner();

    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Check if user already has admin role
    const hasAdminRole = user.roles.includes(UserRole.ROLE_PLATFORM_OWNER);

    let newRoles: UserRole[];
    if (hasAdminRole) {
      // Remove admin role
      newRoles = user.roles.filter((r) => r !== UserRole.ROLE_PLATFORM_OWNER);
      // Ensure at least ROLE_WEDDING_OWNER remains
      if (newRoles.length === 0) {
        newRoles = [UserRole.ROLE_WEDDING_OWNER];
      }
    } else {
      // Add admin role
      newRoles = [...user.roles, UserRole.ROLE_PLATFORM_OWNER];
    }

    // Update user roles
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roles: newRoles,
        // If current active role is being removed, switch to the first available role
        role: newRoles.includes(user.role) ? user.role : newRoles[0],
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, user: updatedUser, hasAdminRole: !hasAdminRole };
  } catch (error) {
    console.error("Error toggling admin role:", error);
    return { error: "Failed to toggle admin role" };
  }
}

export async function getAdminStats() {
  try {
    const user = await requirePlatformOwner();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const [
      totalUsers,
      suspendedUsers,
      activeUsers,
      totalEvents,
      totalGuests,
      totalRsvps,
    ] = await Promise.all([
      prisma.user.count({
        where: { roles: { has: UserRole.ROLE_WEDDING_OWNER } },
      }),
      prisma.user.count({
        where: {
          roles: { has: UserRole.ROLE_WEDDING_OWNER },
          status: UserStatus.SUSPENDED,
        },
      }),
      prisma.user.count({
        where: {
          roles: { has: UserRole.ROLE_WEDDING_OWNER },
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.weddingEvent.count(),
      prisma.guest.count(),
      prisma.guestRsvp.count({
        where: {
          status: { not: "PENDING" },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        totalUsers,
        suspendedUsers,
        activeUsers,
        totalEvents,
        totalGuests,
        totalRsvps,
      },
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return { error: "Failed to fetch stats" };
  }
}
