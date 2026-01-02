/**
 * Meshulam Payment Provider Implementation
 * https://docs.meshulam.co.il/
 */

import {
  PaymentProvider,
  PaymentInitOptions,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookResult,
} from "../types";

// Meshulam API endpoints
const MESHULAM_API_URL =
  process.env.MESHULAM_API_URL || "https://sandbox.meshulam.co.il/api/light/server/1.0";

// Meshulam transaction status codes
const MESHULAM_STATUS = {
  SUCCESS: "000",
  PENDING: "001",
  FAILED: "002",
  CANCELLED: "003",
};

interface MeshulamConfig {
  apiKey: string;
  pageCode: string;
}

export class MeshulamProvider implements PaymentProvider {
  name = "meshulam";
  private config: MeshulamConfig;

  constructor(config?: Partial<MeshulamConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.MESHULAM_API_KEY || "",
      pageCode: config?.pageCode || process.env.MESHULAM_PAGE_CODE || "",
    };
  }

  /**
   * Create a payment and get the payment page URL
   */
  async createPayment(options: PaymentInitOptions): Promise<PaymentInitResult> {
    try {
      if (!this.config.apiKey || !this.config.pageCode) {
        return {
          success: false,
          error: "Meshulam credentials not configured",
          errorCode: "NO_CREDENTIALS",
        };
      }

      const payload = {
        pageCode: this.config.pageCode,
        apiKey: this.config.apiKey,
        sum: options.amount.toFixed(2),
        description: options.description || `Gift Payment - ${options.guestName}`,
        fullName: options.guestName,
        email: options.guestEmail || "",
        phone: options.guestPhone || "",
        successUrl: options.successUrl,
        cancelUrl: options.cancelUrl,
        // Custom fields for tracking
        cField1: options.giftPaymentId,
        cField2: options.metadata?.eventId || "",
        cField3: options.metadata?.guestId || "",
      };

      const response = await fetch(`${MESHULAM_API_URL}/createPaymentProcess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 1 && data.data?.url) {
        return {
          success: true,
          paymentUrl: data.data.url,
          transactionId: data.data.processId,
          pageCode: this.config.pageCode,
        };
      }

      return {
        success: false,
        error: data.err?.message || "Failed to create payment",
        errorCode: data.err?.id?.toString(),
      };
    } catch (error) {
      console.error("Meshulam createPayment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment creation failed",
        errorCode: "PROVIDER_ERROR",
      };
    }
  }

  /**
   * Verify a payment status
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerifyResult> {
    try {
      if (!this.config.apiKey || !this.config.pageCode) {
        return {
          success: false,
          status: "failed",
          error: "Meshulam credentials not configured",
        };
      }

      const payload = {
        pageCode: this.config.pageCode,
        apiKey: this.config.apiKey,
        processId: transactionId,
      };

      const response = await fetch(`${MESHULAM_API_URL}/getPaymentProcessInfo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 1 && data.data) {
        const status = this.mapMeshulamStatus(data.data.paymentStatus);
        return {
          success: true,
          status,
          transactionId: data.data.transactionId,
          amount: parseFloat(data.data.sum),
        };
      }

      return {
        success: false,
        status: "failed",
        error: data.err?.message || "Failed to verify payment",
      };
    } catch (error) {
      console.error("Meshulam verifyPayment error:", error);
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Payment verification failed",
      };
    }
  }

  /**
   * Handle webhook from Meshulam
   */
  async handleWebhook(payload: any): Promise<WebhookResult> {
    try {
      // Meshulam sends payment status updates via webhook
      const { processId, paymentStatus, cField1 } = payload;

      if (!processId) {
        return {
          success: false,
          error: "Missing processId in webhook payload",
        };
      }

      // cField1 contains our giftPaymentId
      const giftPaymentId = cField1;

      if (!giftPaymentId) {
        return {
          success: false,
          error: "Missing giftPaymentId in webhook payload",
        };
      }

      const status = this.mapMeshulamStatus(paymentStatus);

      return {
        success: true,
        giftPaymentId,
        status: status === "pending" ? "pending" : status === "completed" ? "completed" : "failed",
      };
    } catch (error) {
      console.error("Meshulam webhook handling error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      };
    }
  }

  /**
   * Map Meshulam status to our standard status
   */
  private mapMeshulamStatus(
    meshulamStatus: string
  ): "pending" | "completed" | "failed" | "refunded" {
    switch (meshulamStatus) {
      case MESHULAM_STATUS.SUCCESS:
        return "completed";
      case MESHULAM_STATUS.PENDING:
        return "pending";
      case MESHULAM_STATUS.CANCELLED:
      case MESHULAM_STATUS.FAILED:
      default:
        return "failed";
    }
  }

  /**
   * Validate webhook signature (if Meshulam provides one)
   */
  validateWebhookSignature(payload: any, signature?: string): boolean {
    // Meshulam may provide a signature for webhook validation
    // Implement if needed based on their documentation
    return true;
  }
}

// Default instance
export const meshulam = new MeshulamProvider();
