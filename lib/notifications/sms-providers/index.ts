/**
 * SMS Provider Factory
 *
 * Creates the appropriate SMS provider based on configuration.
 * Currently supports Twilio only.
 */

export * from "./types";
export { TwilioSmsProvider } from "./twilio-sms";

import { SmsProvider, SmsProviderConfig } from "./types";
import { TwilioSmsProvider } from "./twilio-sms";

/**
 * Creates an SMS provider instance based on the configuration
 */
export function createSmsProvider(config: SmsProviderConfig): SmsProvider {
  switch (config.provider) {
    case "twilio":
      return new TwilioSmsProvider(config);
    default:
      // Default to Twilio
      return new TwilioSmsProvider({ ...config, provider: "twilio" });
  }
}

/**
 * Provider info for admin UI
 */
export const SMS_PROVIDER_INFO = {
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
};
