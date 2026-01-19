import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { meshulam } from "@/lib/payments/providers/meshulam";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { meshulamWebhookSchema } from "@/lib/validations/webhooks";

export async function POST(req: NextRequest) {
  // Rate limit webhook requests
  const rateLimitResult = withRateLimit(req, RATE_LIMIT_PRESETS.webhook);
  if (rateLimitResult) return rateLimitResult;

  try {
    const payload = await req.json();

    // Validate payload schema
    const validation = meshulamWebhookSchema.safeParse(payload);
    if (!validation.success) {
      console.error("Invalid Meshulam webhook payload:", validation.error);
      return NextResponse.json(
        { error: "Invalid webhook payload", details: validation.error.issues },
        { status: 400 }
      );
    }

    console.log("Meshulam webhook received:", payload);

    // Handle webhook with provider
    const result = await meshulam.handleWebhook(payload);

    if (!result.success || !result.giftPaymentId) {
      console.error("Webhook processing failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to process webhook" },
        { status: 400 }
      );
    }

    // Update payment status
    const newStatus =
      result.status === "completed"
        ? "COMPLETED"
        : result.status === "failed"
        ? "FAILED"
        : "PROCESSING";

    await prisma.giftPayment.update({
      where: { id: result.giftPaymentId },
      data: {
        status: newStatus,
        paidAt: newStatus === "COMPLETED" ? new Date() : undefined,
      },
    });

    // Update transaction record
    await prisma.paymentTransaction.updateMany({
      where: { giftPaymentId: result.giftPaymentId },
      data: {
        status: result.status,
        providerResponse: payload,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Some providers use GET for webhooks
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const payload: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  // Convert to POST handler
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    })
  );
}
