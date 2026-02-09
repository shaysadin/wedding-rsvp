"use server";

import { revalidatePath } from "next/cache";
import { UserRole, GiftPaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { getPaymentProvider, calculateTotalWithFee } from "@/lib/payments";

// ============================================
// PUBLIC - Guest Payment Actions
// ============================================

/**
 * Get gift payment settings for an event (by guest slug)
 */
export async function getGiftSettingsByGuestSlug(guestSlug: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { slug: guestSlug },
      include: {
        weddingEvent: {
          include: {
            giftPaymentSettings: true,
          },
        },
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    if (!guest.weddingEvent.giftPaymentSettings?.isEnabled) {
      return { error: "Gift payments not enabled for this event" };
    }

    // Get couple names from event owner or title
    const owner = await prisma.user.findUnique({
      where: { id: guest.weddingEvent.ownerId },
      select: { name: true },
    });

    return {
      success: true,
      settings: guest.weddingEvent.giftPaymentSettings,
      eventTitle: guest.weddingEvent.title,
      guestName: guest.name,
      guestId: guest.id,
      eventId: guest.weddingEventId,
      coupleName: owner?.name || guest.weddingEvent.title,
    };
  } catch (error) {
    console.error("Error fetching gift settings:", error);
    return { error: "Failed to fetch gift settings" };
  }
}

/**
 * Initiate a gift payment
 */
export async function initiateGiftPayment(data: {
  guestSlug: string;
  amount: number;
  currency?: string;
  message?: string;
  senderName?: string;
}) {
  try {
    // Look up guest by slug
    const guest = await prisma.guest.findUnique({
      where: { slug: data.guestSlug },
      include: {
        weddingEvent: {
          include: {
            giftPaymentSettings: true,
          },
        },
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    const eventId = guest.weddingEventId;
    const settings = guest.weddingEvent.giftPaymentSettings;

    if (!settings?.isEnabled) {
      return { error: "Gift payments not enabled" };
    }

    // Validate amount
    const minAmount = Number(settings.minAmount);
    const maxAmount = Number(settings.maxAmount);

    if (data.amount < minAmount || data.amount > maxAmount) {
      return { error: `Amount must be between ${minAmount} and ${maxAmount}` };
    }

    // Calculate fee
    const feeResult = calculateTotalWithFee(data.amount);
    const serviceFee = feeResult.serviceFee;
    const total = feeResult.total;

    // Use sender name from form, fallback to guest name
    const senderName = data.senderName || guest.name;

    // Create gift payment record
    const giftPayment = await prisma.giftPayment.create({
      data: {
        weddingEventId: eventId,
        guestId: guest.id,
        guestName: senderName,
        guestEmail: guest.email,
        guestPhone: guest.phoneNumber,
        amount: data.amount,
        serviceFee,
        totalCharged: total,
        currency: settings.currency,
        status: "PENDING",
        greetingMessage: data.message,
      },
    });

    // Get payment provider
    const provider = getPaymentProvider();

    // Create payment with provider
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const result = await provider.createPayment({
      amount: total,
      currency: settings.currency,
      giftPaymentId: giftPayment.id,
      guestName: senderName,
      guestEmail: guest.email || undefined,
      guestPhone: guest.phoneNumber || undefined,
      description: `Gift for ${guest.weddingEvent.title}`,
      successUrl: `${baseUrl}/gift/success?paymentId=${giftPayment.id}`,
      cancelUrl: `${baseUrl}/gift/cancel?slug=${data.guestSlug}`,
      webhookUrl: `${baseUrl}/api/payments/gift/webhook/${provider.name}`,
      metadata: {
        eventId,
        guestId: guest.id,
      },
    });

    if (!result.success) {
      // Mark payment as failed
      await prisma.giftPayment.update({
        where: { id: giftPayment.id },
        data: { status: "FAILED" },
      });

      return { error: result.error || "Failed to create payment" };
    }

    // Create transaction record
    await prisma.paymentTransaction.create({
      data: {
        giftPaymentId: giftPayment.id,
        provider: provider.name,
        providerTransactionId: result.transactionId,
        providerPageCode: result.pageCode,
        status: "initiated",
      },
    });

    return {
      success: true,
      paymentUrl: result.paymentUrl,
      paymentId: giftPayment.id,
    };
  } catch (error) {
    console.error("Error initiating gift payment:", error);
    return { error: "Failed to initiate payment" };
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(paymentId: string) {
  try {
    const payment = await prisma.giftPayment.findUnique({
      where: { id: paymentId },
      include: {
        weddingEvent: {
          select: {
            title: true,
            giftPaymentSettings: {
              select: {
                thankYouMessage: true,
                thankYouMessageHe: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!payment) {
      return { error: "Payment not found" };
    }

    return {
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        serviceFee: Number(payment.serviceFee),
        total: Number(payment.totalCharged),
        currency: payment.currency,
        guestName: payment.guestName,
        eventTitle: payment.weddingEvent.title,
        thankYouMessage: payment.weddingEvent.giftPaymentSettings?.thankYouMessage,
        thankYouMessageHe: payment.weddingEvent.giftPaymentSettings?.thankYouMessageHe,
      },
    };
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return { error: "Failed to fetch payment status" };
  }
}

// ============================================
// EVENT OWNER - Gift Management
// ============================================

/**
 * Get gift payment settings for event
 */
export async function getGiftPaymentSettings(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify access (owner or collaborator)
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { error: "Event not found" };
    }

    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      include: {
        giftPaymentSettings: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    return { success: true, settings: event.giftPaymentSettings };
  } catch (error) {
    console.error("Error fetching gift settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

/**
 * Update gift payment settings
 */
export async function updateGiftPaymentSettings(
  eventId: string,
  data: {
    isEnabled?: boolean;
    minAmount?: number;
    maxAmount?: number;
    suggestedAmounts?: number[];
    allowCustomAmount?: boolean;
    currency?: string;
    thankYouMessage?: string;
    thankYouMessageHe?: string;
    useExternalProvider?: boolean;
    externalProviderUrl?: string;
  }
) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Upsert settings
    const settings = await prisma.giftPaymentSettings.upsert({
      where: { weddingEventId: eventId },
      update: data,
      create: {
        weddingEventId: eventId,
        ...data,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/gifts`);

    return { success: true, settings };
  } catch (error) {
    console.error("Error updating gift settings:", error);
    return { error: "Failed to update settings" };
  }
}

/**
 * Get event gifts
 */
export async function getEventGifts(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify access (owner or collaborator)
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { error: "Event not found" };
    }

    const gifts = await prisma.giftPayment.findMany({
      where: { weddingEventId: eventId },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const stats = {
      total: gifts.length,
      completed: gifts.filter((g) => g.status === "COMPLETED").length,
      pending: gifts.filter((g) => g.status === "PENDING" || g.status === "PROCESSING").length,
      failed: gifts.filter((g) => g.status === "FAILED").length,
      totalAmount: gifts
        .filter((g) => g.status === "COMPLETED")
        .reduce((sum, g) => sum + Number(g.amount), 0),
      totalFees: gifts
        .filter((g) => g.status === "COMPLETED")
        .reduce((sum, g) => sum + Number(g.serviceFee), 0),
    };

    // Convert decimals
    const normalizedGifts = gifts.map((g) => ({
      ...g,
      amount: Number(g.amount),
      serviceFee: Number(g.serviceFee),
      totalCharged: Number(g.totalCharged),
    }));

    return { success: true, gifts: normalizedGifts, stats };
  } catch (error) {
    console.error("Error fetching event gifts:", error);
    return { error: "Failed to fetch gifts" };
  }
}

/**
 * Add a manual (cash) gift
 */
export async function addManualGift(
  eventId: string,
  data: {
    guestId?: string;
    guestName: string;
    amount: number;
    greetingMessage?: string;
  }
) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Create manual gift (no service fee for cash)
    const gift = await prisma.giftPayment.create({
      data: {
        weddingEventId: eventId,
        guestId: data.guestId,
        guestName: data.guestName,
        amount: data.amount,
        serviceFee: 0,
        totalCharged: data.amount,
        status: "COMPLETED",
        greetingMessage: data.greetingMessage,
        isManual: true,
        paidAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/gifts`);

    return { success: true, gift };
  } catch (error) {
    console.error("Error adding manual gift:", error);
    return { error: "Failed to add gift" };
  }
}

/**
 * Delete a gift (only manual gifts)
 */
export async function deleteGift(giftId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const gift = await prisma.giftPayment.findUnique({
      where: { id: giftId },
      include: {
        weddingEvent: true,
      },
    });

    if (!gift || gift.weddingEvent.ownerId !== user.id) {
      return { error: "Gift not found" };
    }

    if (!gift.isManual) {
      return { error: "Only manual gifts can be deleted" };
    }

    const eventId = gift.weddingEventId;

    await prisma.giftPayment.delete({
      where: { id: giftId },
    });

    revalidatePath(`/dashboard/events/${eventId}/gifts`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting gift:", error);
    return { error: "Failed to delete gift" };
  }
}

// ============================================
// ADMIN - All Payments
// ============================================

/**
 * Get all payments (admin only)
 */
export async function getAdminPayments(options?: {
  status?: GiftPaymentStatus;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const payments = await prisma.giftPayment.findMany({
      where: options?.status ? { status: options.status } : {},
      include: {
        weddingEvent: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    // Calculate totals
    const stats = await prisma.giftPayment.aggregate({
      where: { status: "COMPLETED" },
      _sum: {
        amount: true,
        serviceFee: true,
        totalCharged: true,
      },
      _count: true,
    });

    // Convert decimals
    const normalizedPayments = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      serviceFee: Number(p.serviceFee),
      totalCharged: Number(p.totalCharged),
    }));

    return {
      success: true,
      payments: normalizedPayments,
      stats: {
        totalPayments: stats._count,
        totalAmount: Number(stats._sum.amount || 0),
        totalFees: Number(stats._sum.serviceFee || 0),
        totalCharged: Number(stats._sum.totalCharged || 0),
      },
    };
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return { error: "Failed to fetch payments" };
  }
}

/**
 * Export payments to CSV (admin only)
 */
export async function exportPaymentsCsv() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const payments = await prisma.giftPayment.findMany({
      include: {
        weddingEvent: {
          select: {
            title: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV
    const headers = [
      "ID",
      "Date",
      "Event",
      "Owner Email",
      "Guest Name",
      "Amount",
      "Service Fee",
      "Total",
      "Status",
      "Is Manual",
    ];

    const rows = payments.map((p) => [
      p.id,
      p.createdAt.toISOString(),
      p.weddingEvent.title,
      p.weddingEvent.owner.email,
      p.guestName,
      Number(p.amount).toFixed(2),
      Number(p.serviceFee).toFixed(2),
      Number(p.totalCharged).toFixed(2),
      p.status,
      p.isManual ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    return { success: true, csv };
  } catch (error) {
    console.error("Error exporting payments:", error);
    return { error: "Failed to export payments" };
  }
}
