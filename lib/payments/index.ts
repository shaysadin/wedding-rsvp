// Gift Payment System Module
// Handles payment processing for wedding gifts with 8% service fee

export * from "./types";
export { MeshulamProvider, meshulam } from "./providers/meshulam";
export { MockPaymentProvider, mockPaymentProvider } from "./providers/mock";

import { PaymentProvider } from "./types";
import { meshulam } from "./providers/meshulam";
import { mockPaymentProvider } from "./providers/mock";

/**
 * Get the configured payment provider
 */
export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER || "mock";

  switch (providerName.toLowerCase()) {
    case "meshulam":
      return meshulam;
    case "mock":
    default:
      return mockPaymentProvider;
  }
}
