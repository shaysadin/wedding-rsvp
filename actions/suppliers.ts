"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
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
 * If status is COMPLETED and agreedPrice is set, automatically creates a full payment
 */
export async function createSupplier(input: CreateSupplierInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = createSupplierSchema.parse(input);

    // Verify event access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(validatedData.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
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

    // If status is COMPLETED and agreedPrice is set, create a full payment automatically
    if (validatedData.status === "COMPLETED" && validatedData.agreedPrice && validatedData.agreedPrice > 0) {
      await prisma.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          amount: new Decimal(validatedData.agreedPrice),
          method: "BANK_TRANSFER",
          description: "Full payment (auto-created on completion)",
          paidAt: new Date(),
        },
      });
    }

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}/suppliers`);

    return { success: true, supplier };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return { error: "Failed to create supplier" };
  }
}

/**
 * Update an existing supplier
 * If status changes to COMPLETED and there's remaining payment, automatically creates a payment for the remaining amount
 */
export async function updateSupplier(input: UpdateSupplierInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateSupplierSchema.parse(input);

    // Verify supplier exists and user has access
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.id,
      },
      include: {
        weddingEvent: true,
        payments: {
          select: { amount: true },
        },
      },
    });

    if (!existingSupplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    // Verify access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(existingSupplier.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // If status is changing to COMPLETED, create a payment for any remaining amount
    if (
      validatedData.status === "COMPLETED" &&
      existingSupplier.status !== "COMPLETED"
    ) {
      // Use the new agreedPrice if provided, otherwise use existing
      const agreedPrice = validatedData.agreedPrice !== undefined
        ? validatedData.agreedPrice
        : existingSupplier.agreedPrice
          ? Number(existingSupplier.agreedPrice)
          : 0;

      if (agreedPrice > 0) {
        // Calculate total already paid
        const totalPaid = existingSupplier.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        // Calculate remaining amount
        const remainingAmount = agreedPrice - totalPaid;

        // Create payment for remaining amount if there's any
        if (remainingAmount > 0) {
          await prisma.supplierPayment.create({
            data: {
              supplierId: supplier.id,
              amount: new Decimal(remainingAmount),
              method: "BANK_TRANSFER",
              description: remainingAmount === agreedPrice
                ? "Full payment (auto-created on completion)"
                : "Final payment (auto-created on completion)",
              paidAt: new Date(),
            },
          });
        }
      }
    }

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

    // Verify supplier exists and user has access
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
      },
      include: {
        weddingEvent: true,
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    // Verify access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(supplier.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // Verify event access (owner or collaborator)
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
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
      },
      include: {
        weddingEvent: true,
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    // Verify access (owner or collaborator)
    const hasAccess = await canAccessEvent(supplier.weddingEventId, user.id);
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // Verify supplier exists and user has access
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: validatedData.supplierId,
      },
      include: {
        weddingEvent: true,
      },
    });

    if (!supplier) {
      return { error: "Supplier not found or unauthorized" };
    }

    // Verify access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(supplier.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // Verify payment exists and user has access
    const existingPayment = await prisma.supplierPayment.findFirst({
      where: {
        id: validatedData.id,
      },
      include: {
        supplier: {
          include: {
            weddingEvent: true,
          },
        },
      },
    });

    if (!existingPayment) {
      return { error: "Payment not found or unauthorized" };
    }

    // Verify access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(existingPayment.supplier.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // Verify payment exists and user has access
    const payment = await prisma.supplierPayment.findFirst({
      where: {
        id: paymentId,
      },
      include: {
        supplier: {
          include: {
            weddingEvent: true,
          },
        },
      },
    });

    if (!payment) {
      return { error: "Payment not found or unauthorized" };
    }

    // Verify access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(payment.supplier.weddingEventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Unauthorized" };
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

    // Verify event access (owner or collaborator with EDITOR role)
    const hasAccess = await canAccessEvent(validatedData.eventId, user.id, "EDITOR");
    if (!hasAccess) {
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

    // Verify event access (owner or collaborator)
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { error: "Event not found or unauthorized" };
    }

    // Get budget + guests
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId },
      select: {
        totalBudget: true,
        guests: {
          select: {
            id: true,
            rsvp: {
              select: {
                status: true,
                guestCount: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Calculate guest statistics
    const totalInvited = event.guests.length;
    const acceptedGuests = event.guests.filter(g => g.rsvp?.status === "ACCEPTED");
    const approvedGuestCount = acceptedGuests.reduce((sum, g) => sum + (g.rsvp?.guestCount || 1), 0);
    const declinedCount = event.guests.filter(g => g.rsvp?.status === "DECLINED").length;
    const pendingCount = event.guests.filter(g => !g.rsvp || g.rsvp.status === "PENDING").length;

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

    // Calculate cost per guest metrics
    const costPerApprovedGuest = approvedGuestCount > 0 ? totalAgreed / approvedGuestCount : 0;
    const costPerInvited = totalInvited > 0 ? totalAgreed / totalInvited : 0;
    const budgetPerApprovedGuest = approvedGuestCount > 0 && totalBudget > 0 ? totalBudget / approvedGuestCount : 0;
    const budgetPerInvited = totalInvited > 0 && totalBudget > 0 ? totalBudget / totalInvited : 0;

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
        // Guest statistics
        totalInvited,
        approvedGuestCount,
        acceptedInvitations: acceptedGuests.length,
        declinedCount,
        pendingCount,
        // Cost per guest metrics
        costPerApprovedGuest,
        costPerInvited,
        budgetPerApprovedGuest,
        budgetPerInvited,
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
