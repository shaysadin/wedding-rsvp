/**
 * Mock Payment Provider for Testing
 */

import {
  PaymentProvider,
  PaymentInitOptions,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookResult,
} from "../types";

// Simulated payment storage (in-memory for testing)
const mockPayments = new Map<
  string,
  {
    giftPaymentId: string;
    amount: number;
    status: "pending" | "completed" | "failed";
    createdAt: Date;
  }
>();

export class MockPaymentProvider implements PaymentProvider {
  name = "mock";

  /**
   * Create a simulated payment
   */
  async createPayment(options: PaymentInitOptions): Promise<PaymentInitResult> {
    const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the payment
    mockPayments.set(transactionId, {
      giftPaymentId: options.giftPaymentId,
      amount: options.amount,
      status: "pending",
      createdAt: new Date(),
    });

    // Return a mock payment URL that includes success URL with transaction ID
    const mockPaymentUrl = `${options.successUrl}?transactionId=${transactionId}&mock=true`;

    return {
      success: true,
      paymentUrl: mockPaymentUrl,
      transactionId,
      pageCode: "mock_page",
    };
  }

  /**
   * Verify a mock payment
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerifyResult> {
    const payment = mockPayments.get(transactionId);

    if (!payment) {
      return {
        success: false,
        status: "failed",
        error: "Payment not found",
      };
    }

    // Auto-complete payments after 2 seconds
    const elapsed = Date.now() - payment.createdAt.getTime();
    if (elapsed > 2000 && payment.status === "pending") {
      payment.status = "completed";
    }

    return {
      success: true,
      status: payment.status,
      transactionId,
      amount: payment.amount,
    };
  }

  /**
   * Handle mock webhook
   */
  async handleWebhook(payload: any): Promise<WebhookResult> {
    const { transactionId, status } = payload;

    const payment = mockPayments.get(transactionId);

    if (!payment) {
      return {
        success: false,
        error: "Payment not found",
      };
    }

    // Update payment status
    if (status) {
      payment.status = status;
    }

    return {
      success: true,
      giftPaymentId: payment.giftPaymentId,
      status: payment.status,
    };
  }

  /**
   * Manually complete a mock payment (for testing)
   */
  completePayment(transactionId: string): boolean {
    const payment = mockPayments.get(transactionId);
    if (payment) {
      payment.status = "completed";
      return true;
    }
    return false;
  }

  /**
   * Manually fail a mock payment (for testing)
   */
  failPayment(transactionId: string): boolean {
    const payment = mockPayments.get(transactionId);
    if (payment) {
      payment.status = "failed";
      return true;
    }
    return false;
  }

  /**
   * Clear all mock payments (for testing)
   */
  clearPayments(): void {
    mockPayments.clear();
  }
}

// Default instance
export const mockPaymentProvider = new MockPaymentProvider();
