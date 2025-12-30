"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// ============ PHONE NUMBER MANAGEMENT ============

export interface CreateVapiPhoneNumberInput {
  phoneNumber: string;
  vapiPhoneId: string;
  displayName?: string;
  isDefault?: boolean;
}

export async function createVapiPhoneNumber(input: CreateVapiPhoneNumberInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // If setting as default, unset other defaults first
    if (input.isDefault) {
      await prisma.vapiPhoneNumber.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const phoneNumber = await prisma.vapiPhoneNumber.create({
      data: {
        phoneNumber: input.phoneNumber,
        vapiPhoneId: input.vapiPhoneId,
        displayName: input.displayName,
        isDefault: input.isDefault || false,
      },
    });

    revalidatePath("/admin/vapi");

    return { success: true, phoneNumber };
  } catch (error) {
    console.error("Error creating VAPI phone number:", error);
    return { error: "Failed to create phone number" };
  }
}

export async function updateVapiPhoneNumber(
  id: string,
  input: Partial<CreateVapiPhoneNumberInput> & { isActive?: boolean }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // If setting as default, unset other defaults first
    if (input.isDefault) {
      await prisma.vapiPhoneNumber.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const phoneNumber = await prisma.vapiPhoneNumber.update({
      where: { id },
      data: input,
    });

    revalidatePath("/admin/vapi");

    return { success: true, phoneNumber };
  } catch (error) {
    console.error("Error updating VAPI phone number:", error);
    return { error: "Failed to update phone number" };
  }
}

export async function deleteVapiPhoneNumber(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Check if phone number is assigned to any users
    const phoneNumber = await prisma.vapiPhoneNumber.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!phoneNumber) {
      return { error: "Phone number not found" };
    }

    if (phoneNumber._count.users > 0) {
      return { error: `Cannot delete: phone number is assigned to ${phoneNumber._count.users} user(s). Please reassign them first.` };
    }

    await prisma.vapiPhoneNumber.delete({
      where: { id },
    });

    revalidatePath("/admin/vapi");

    return { success: true };
  } catch (error) {
    console.error("Error deleting VAPI phone number:", error);
    return { error: "Failed to delete phone number" };
  }
}

export async function setDefaultVapiPhoneNumber(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Unset all defaults and set the new one
    await prisma.$transaction([
      prisma.vapiPhoneNumber.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.vapiPhoneNumber.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/admin/vapi");

    return { success: true };
  } catch (error) {
    console.error("Error setting default phone number:", error);
    return { error: "Failed to set default phone number" };
  }
}

export async function getVapiPhoneNumbers() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    const phoneNumbers = await prisma.vapiPhoneNumber.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return { success: true, phoneNumbers };
  } catch (error) {
    console.error("Error fetching VAPI phone numbers:", error);
    return { error: "Failed to fetch phone numbers" };
  }
}

export async function getDefaultVapiPhoneNumber() {
  try {
    const phoneNumber = await prisma.vapiPhoneNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    return { success: true, phoneNumber };
  } catch (error) {
    console.error("Error fetching default phone number:", error);
    return { error: "Failed to fetch default phone number" };
  }
}

// ============ USER PHONE NUMBER ASSIGNMENT ============

export async function assignPhoneNumberToUser(userId: string, phoneNumberId: string | null) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify phone number exists if provided
    if (phoneNumberId) {
      const phoneNumber = await prisma.vapiPhoneNumber.findUnique({
        where: { id: phoneNumberId },
      });

      if (!phoneNumber) {
        return { error: "Phone number not found" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { vapiPhoneNumberId: phoneNumberId },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/vapi");

    return { success: true };
  } catch (error) {
    console.error("Error assigning phone number to user:", error);
    return { error: "Failed to assign phone number" };
  }
}

export async function getUserPhoneNumber(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vapiPhoneNumber: true },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // If user has assigned phone number, return it
    if (user.vapiPhoneNumber && user.vapiPhoneNumber.isActive) {
      return { success: true, phoneNumber: user.vapiPhoneNumber };
    }

    // Otherwise, return the default phone number
    const defaultPhoneNumber = await prisma.vapiPhoneNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    return { success: true, phoneNumber: defaultPhoneNumber };
  } catch (error) {
    console.error("Error fetching user phone number:", error);
    return { error: "Failed to fetch phone number" };
  }
}

// Get the effective phone number ID for making calls (user's assigned or default)
export async function getEffectivePhoneNumberId(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vapiPhoneNumber: true },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // If user has an active assigned phone number, use it
    if (user.vapiPhoneNumber && user.vapiPhoneNumber.isActive) {
      return {
        success: true,
        vapiPhoneId: user.vapiPhoneNumber.vapiPhoneId,
        phoneNumber: user.vapiPhoneNumber.phoneNumber,
        source: "assigned" as const,
      };
    }

    // Otherwise, use the default
    const defaultPhoneNumber = await prisma.vapiPhoneNumber.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultPhoneNumber) {
      return { error: "No default phone number configured" };
    }

    return {
      success: true,
      vapiPhoneId: defaultPhoneNumber.vapiPhoneId,
      phoneNumber: defaultPhoneNumber.phoneNumber,
      source: "default" as const,
    };
  } catch (error) {
    console.error("Error fetching effective phone number:", error);
    return { error: "Failed to fetch phone number" };
  }
}
