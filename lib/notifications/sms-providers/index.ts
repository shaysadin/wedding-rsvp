/**
 * SMS Provider Factory
 *
 * Creates the appropriate SMS provider based on configuration.
 * Supports: Twilio, Upsend (Israeli provider)
 */

export * from "./types";
export { TwilioSmsProvider } from "./twilio-sms";
export { UpsendSmsProvider } from "./upsend-sms";

import { SmsProvider, SmsProviderConfig, SmsProviderType } from "./types";
import { TwilioSmsProvider } from "./twilio-sms";
import { UpsendSmsProvider } from "./upsend-sms";

/**
 * Creates an SMS provider instance based on the configuration
 */
export function createSmsProvider(config: SmsProviderConfig): SmsProvider {
  switch (config.provider) {
    case "twilio":
      return new TwilioSmsProvider(config);
    case "upsend":
      return new UpsendSmsProvider(config);
    default:
      // Default to Twilio
      return new TwilioSmsProvider({ ...config, provider: "twilio" });
  }
}

/**
 * Provider info for admin UI
 */
export const SMS_PROVIDER_INFO: Record<
  SmsProviderType,
  {
    name: string;
    description: string;
    pricePerSmsIsrael: string;
    website: string;
    features: string[];
  }
> = {
  twilio: {
    name: "Twilio",
    description: "Industry-leading cloud communications platform",
    pricePerSmsIsrael: "~$0.26",
    website: "https://www.twilio.com",
    features: [
      "Global reach",
      "Detailed delivery reports",
      "WhatsApp integration",
      "Two-way messaging",
    ],
  },
  upsend: {
    name: "Upsend",
    description: "Israeli SMS provider with competitive local pricing",
    pricePerSmsIsrael: "~₪0.07",
    website: "https://upsend.co.il",
    features: [
      "Local Israeli pricing",
      "Hebrew support",
      "Delivery notifications",
      "Bulk messaging",
    ],
  },
};
