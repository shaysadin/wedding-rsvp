/**
 * Payment Types for Gift Payment System
 */

// Service fee percentage (5%)
export const SERVICE_FEE_PERCENTAGE = 0.05;

export interface PaymentInitOptions {
  amount: number;
  currency: string;
  giftPaymentId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentInitResult {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  pageCode?: string;
  error?: string;
  errorCode?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  amount?: number;
  error?: string;
}

export interface WebhookPayload {
  transactionId: string;
  status: string;
  amount?: number;
  rawData: any;
}

export interface WebhookResult {
  success: boolean;
  giftPaymentId?: string;
  status?: "pending" | "completed" | "failed";
  error?: string;
}

/**
 * Payment Provider interface
 * Implement this interface for different payment gateways
 */
export interface PaymentProvider {
  /**
   * Provider name identifier
   */
  name: string;

  /**
   * Initialize a payment and get the payment page URL
   */
  createPayment(options: PaymentInitOptions): Promise<PaymentInitResult>;

  /**
   * Verify a payment status
   */
  verifyPayment(transactionId: string): Promise<PaymentVerifyResult>;

  /**
   * Handle incoming webhook from provider
   */
  handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
}

/**
 * Calculate service fee
 */
export function calculateServiceFee(amount: number): number {
  return Math.round(amount * SERVICE_FEE_PERCENTAGE * 100) / 100;
}

/**
 * Calculate total amount with fee
 */
export function calculateTotalWithFee(amount: number): {
  amount: number;
  serviceFee: number;
  total: number;
} {
  const serviceFee = calculateServiceFee(amount);
  return {
    amount,
    serviceFee,
    total: amount + serviceFee,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "ILS"): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
