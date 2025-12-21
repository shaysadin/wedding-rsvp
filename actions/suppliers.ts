"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPaymentSchema,
  updatePaymentSchema,
  updateBudgetSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreatePaymentInput,
  type UpdatePaymentInput,
  type UpdateBudgetInput,
} from "@/lib/validations/supplier";
import { SupplierCategory } from "@prisma/client";

// ============ Supplier CRUD ============

/**
 * Create a new supplier
 */
export async function createSupplier(input: CreateSupplierInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = createSupplierSchema.parse(input);

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.weddingEventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    const supplier = await prisma.supplier.create({
      data: {
        weddingEventId: validatedData.weddingEventId,
        name: validatedData.name,
        category: validatedData.category,
        status: validatedData.status || "INQUIRY",
        contactName: validatedData.contactName,
        phoneNumber: validatedData.phoneNumber,
        email: validatedData.email || null,
        website: validatedData.website || null,
        estimatedCost: validatedData.estimatedCost
          ? new Decimal(validatedData.estimatedCost)
          : null,
        agreedPrice: validatedData.agreedPrice
          ? new Decimal(validatedData.agreedPrice)
          : null,
        currency: validatedData.currency || "ILS",
        notes: validatedData.notes,
        contractUrl: validatedData.contractUrl || null,
        bookedAt: validatedData.bookedAt,
      },
    });

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}/suppliers`);

    return { success: true, supplier };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { error: "Failed to create supplier" };
  }
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(input: UpdateSupplierInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateSupplierSchema.parse(input);

    // Verify supplier belongs to user's event
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.id,
        weddingEvent: { ownerId: user.id },
      },
    });

    if (!existingSupplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    const supplier = await prisma.supplier.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        category: validatedData.category,
        status: validatedData.status,
        contactName: validatedData.contactName,
        phoneNumber: validatedData.phoneNumber,
        email: validatedData.email || null,
        website: validatedData.website || null,
        estimatedCost:
          validatedData.estimatedCost !== undefined
            ? new Decimal(validatedData.estimatedCost)
            : undefined,
        agreedPrice:
          validatedData.agreedPrice !== undefined
            ? new Decimal(validatedData.agreedPrice)
            : undefined,
        currency: validatedData.currency,
        notes: validatedData.notes,
        contractUrl: validatedData.contractUrl || null,
        bookedAt: validatedData.bookedAt,
      },
    });

    revalidatePath(`/dashboard/events/${existingSupplier.weddingEventId}/suppliers`);

    return { success: true, supplier };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return { error: "Failed to update supplier" };
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify supplier belongs to user's event
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        weddingEvent: { ownerId: user.id },
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    revalidatePath(`/dashboard/events/${supplier.weddingEventId}/suppliers`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return { error: "Failed to delete supplier" };
  }
}

/**
 * Get all suppliers for an event
 */
export async function getEventSuppliers(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    const suppliers = await prisma.supplier.findMany({
      where: { weddingEventId: eventId },
      include: {
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return { success: true, suppliers };
  } catch (error) {
    console.error("Error getting suppliers:", error);
    return { error: "Failed to get suppliers" };
  }
}

/**
 * Get supplier details with payments
 */
export async function getSupplierDetails(supplierId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        weddingEvent: { ownerId: user.id },
      },
      include: {
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    return { success: true, supplier };
  } catch (error) {
    console.error("Error getting supplier details:", error);
    return { error: "Failed to get supplier details" };
  }
}

// ============ Payment CRUD ============

/**
 * Add a payment to a supplier
 */
export async function addSupplierPayment(input: CreatePaymentInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = createPaymentSchema.parse(input);

    // Verify supplier belongs to user's event
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.supplierId,
        weddingEvent: { ownerId: user.id },
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        supplierId: validatedData.supplierId,
        amount: new Decimal(validatedData.amount),
        method: validatedData.method || "BANK_TRANSFER",
        description: validatedData.description,
        paidAt: validatedData.paidAt,
        dueDate: validatedData.dueDate,
        receiptUrl: validatedData.receiptUrl || null,
        notes: validatedData.notes,
      },
    });

    revalidatePath(`/dashboard/events/${supplier.weddingEventId}/suppliers`);

    return { success: true, payment };
  } catch (error) {
    console.error("Error adding payment:", error);
    return { error: "Failed to add payment" };
  }
}

/**
 * Update a payment
 */
export async function updateSupplierPayment(input: UpdatePaymentInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = updatePaymentSchema.parse(input);

    // Verify payment's supplier belongs to user's event
    const existingPayment = await prisma.supplierPayment.findFirst({
      where: {
        id: validatedData.id,
        supplier: { weddingEvent: { ownerId: user.id } },
      },
      include: { supplier: true },
    });

    if (!existingPayment) {
      return { error: "Payment not found or unauthorized" };
    }

    const payment = await prisma.supplierPayment.update({
      where: { id: validatedData.id },
      data: {
        amount:
          validatedData.amount !== undefined
            ? new Decimal(validatedData.amount)
            : undefined,
        method: validatedData.method,
        description: validatedData.description,
        paidAt: validatedData.paidAt,
        dueDate: validatedData.dueDate,
        receiptUrl: validatedData.receiptUrl || null,
        notes: validatedData.notes,
      },
    });

    revalidatePath(
      `/dashboard/events/${existingPayment.supplier.weddingEventId}/suppliers`
    );

    return { success: true, payment };
  } catch (error) {
    console.error("Error updating payment:", error);
    return { error: "Failed to update payment" };
  }
}

/**
 * Delete a payment
 */
export async function deleteSupplierPayment(paymentId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify payment's supplier belongs to user's event
    const payment = await prisma.supplierPayment.findFirst({
      where: {
        id: paymentId,
        supplier: { weddingEvent: { ownerId: user.id } },
      },
      include: { supplier: true },
    });

    if (!payment) {
      return { error: "Payment not found or unauthorized" };
    }

    await prisma.supplierPayment.delete({
      where: { id: paymentId },
    });

    revalidatePath(
      `/dashboard/events/${payment.supplier.weddingEventId}/suppliers`
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting payment:", error);
    return { error: "Failed to delete payment" };
  }
}

// ============ Budget ============

/**
 * Update event budget
 */
export async function updateEventBudget(input: UpdateBudgetInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateBudgetSchema.parse(input);

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    await prisma.weddingEvent.update({
      where: { id: validatedData.eventId },
      data: {
        totalBudget:
          validatedData.totalBudget !== undefined
            ? new Decimal(validatedData.totalBudget)
            : null,
      },
    });

    revalidatePath(`/dashboard/events/${validatedData.eventId}/suppliers`);

    return { success: true };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { error: "Failed to update budget" };
  }
}

// ============ Statistics ============

/**
 * Get supplier statistics for an event
 */
export async function getSupplierStats(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user and get budget
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: { totalBudget: true },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Get all suppliers with payments
    const suppliers = await prisma.supplier.findMany({
      where: { weddingEventId: eventId },
      include: {
        payments: {
          select: { amount: true, dueDate: true, paidAt: true },
        },
      },
    });

    const now = new Date();

    // Calculate totals
    let totalAgreed = 0;
    let totalPaid = 0;
    let overdueCount = 0;

    const byCategory: Record<
      string,
      { count: number; totalAgreed: number; totalPaid: number }
    > = {};
    const byStatus: Record<string, number> = {};

    for (const supplier of suppliers) {
      // Sum agreed prices
      if (supplier.agreedPrice) {
        totalAgreed += Number(supplier.agreedPrice);
      }

      // Sum payments
      let supplierPaid = 0;
      for (const payment of supplier.payments) {
        supplierPaid += Number(payment.amount);

        // Check for overdue payments (due date passed but payment not made before due date)
        if (payment.dueDate && payment.dueDate < now) {
          // This payment was due before now
          if (payment.paidAt > payment.dueDate) {
            // Payment was made after due date - was overdue
          }
        }
      }
      totalPaid += supplierPaid;

      // Check if supplier has any overdue situation (paid less than agreed and past booking)
      if (supplier.agreedPrice && supplierPaid < Number(supplier.agreedPrice)) {
        // Check if any payment has passed due date
        for (const payment of supplier.payments) {
          if (payment.dueDate && payment.dueDate < now) {
            overdueCount++;
            break;
          }
        }
      }

      // Category breakdown
      const cat = supplier.category;
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, totalAgreed: 0, totalPaid: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].totalAgreed += supplier.agreedPrice
        ? Number(supplier.agreedPrice)
        : 0;
      byCategory[cat].totalPaid += supplierPaid;

      // Status breakdown
      const status = supplier.status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    const totalBudget = event.totalBudget ? Number(event.totalBudget) : 0;

    return {
      success: true,
      stats: {
        totalBudget,
        totalAgreed,
        totalPaid,
        remainingBudget: totalBudget - totalAgreed,
        remainingPayments: totalAgreed - totalPaid,
        supplierCount: suppliers.length,
        overdueCount,
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
          category: category as SupplierCategory,
          ...data,
        })),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({
          status,
          count,
        })),
      },
    };
  } catch (error) {
    console.error("Error getting supplier stats:", error);
    return { error: "Failed to get supplier statistics" };
  }
}
