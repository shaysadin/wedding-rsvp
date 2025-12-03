"use server";

import { revalidatePath } from "next/cache";
import { UserRole, UserStatus, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function getAllUsers() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        role: UserRole.ROLE_WEDDING_OWNER,
      },
      include: {
        _count: {
          select: { weddingEvents: true },
        },
        weddingEvents: {
          include: {
            _count: {
              select: { guests: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate total guests for each user
    const usersWithStats = users.map((u) => ({
      ...u,
      totalGuests: u.weddingEvents.reduce(
        (sum, event) => sum + event._count.guests,
        0
      ),
    }));

    return { success: true, users: usersWithStats };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { error: "Failed to fetch users" };
  }
}

export async function getPendingUsers() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        role: UserRole.ROLE_WEDDING_OWNER,
        status: UserStatus.PENDING_APPROVAL,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return { error: "Failed to fetch pending users" };
  }
}

export async function approveUser(userId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== UserRole.ROLE_PLATFORM_OWNER) {
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
    console.error("Error approving user:", error);
    return { error: "Failed to approve user" };
  }
}

export async function suspendUser(userId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== UserRole.ROLE_PLATFORM_OWNER) {
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

export async function changeUserPlan(userId: string, plan: PlanTier) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Error changing user plan:", error);
    return { error: "Failed to change user plan" };
  }
}

export async function getAdminStats() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      totalEvents,
      totalGuests,
      totalRsvps,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: UserRole.ROLE_WEDDING_OWNER },
      }),
      prisma.user.count({
        where: {
          role: UserRole.ROLE_WEDDING_OWNER,
          status: UserStatus.PENDING_APPROVAL,
        },
      }),
      prisma.user.count({
        where: {
          role: UserRole.ROLE_WEDDING_OWNER,
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
        pendingUsers,
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
