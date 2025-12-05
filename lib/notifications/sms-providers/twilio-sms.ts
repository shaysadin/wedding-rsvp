/**
 * Twilio SMS Provider
 *
 * Implements the SmsProvider interface for Twilio
 * Reference: https://www.twilio.com/docs/messaging/tutorials/how-to-send-sms-messages
 */

import Twilio from "twilio";
import {
  SmsProvider,
  SmsProviderConfig,
  SendSmsResult,
  TestConnectionResult,
} from "./types";

// Twilio error codes with user-friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  20003: "Invalid Account SID or Auth Token. Check your credentials.",
  21211: "Invalid 'To' phone number format. Use E.164 format (+1234567890).",
  21212: "Invalid 'From' phone number. Ensure your Twilio number is correct.",
  21219: "Trial accounts cannot send SMS to other Twilio numbers.",
  21408: "Permission denied. Your account may need verification.",
  21606: "The 'From' phone number is not owned by your account.",
  21608: "TRIAL ACCOUNT: This phone number is not verified.",
  21610: "Recipient has opted out of receiving messages from this number.",
  21611: "Maximum number of queued messages reached.",
  21614: "The 'To' number is not a valid mobile number.",
  21617: "The message body exceeds the maximum allowed length.",
  14107: "Rate limit exceeded. Too many requests.",
};

const TRIAL_ERROR_CODES = [21608, 21219];

export class TwilioSmsProvider implements SmsProvider {
  private client: ReturnType<typeof Twilio>;
  private config: SmsProviderConfig;

  constructor(config: SmsProviderConfig) {
    this.config = config;
    this.client = Twilio(config.authId, config.authToken);
  }

  getProviderName() {
    return "twilio" as const;
  }

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    try {
      // Use Messaging Service SID if available, otherwise use phone number or alpha sender ID
      const messageOptions: {
        body: string;
        to: string;
        from?: string;
        messagingServiceSid?: string;
      } = {
        body: message,
        to: to,
      };

      if (this.config.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.config.messagingServiceSid;
      } else if (this.config.alphaSenderId) {
        // Use Alpha Sender ID when available (for countries that support it)
        messageOptions.from = this.config.alphaSenderId;
      } else {
        messageOptions.from = this.config.phoneNumber;
      }

      const result = await this.client.messages.create(messageOptions);

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
      };
    } catch (error: any) {
      console.error("Twilio SMS error:", error);

      const errorMessage =
        error.code && ERROR_MESSAGES[error.code]
          ? ERROR_MESSAGES[error.code]
          : error.message || "Failed to send SMS";

      return {
        success: false,
        error: errorMessage,
        errorCode: error.code,
        isTrialError: TRIAL_ERROR_CODES.includes(error.code),
      };
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const account = await this.client.api
        .accounts(this.config.authId)
        .fetch();

      // If Messaging Service SID is provided, verify it exists
      if (this.config.messagingServiceSid) {
        try {
          const service = await this.client.messaging.v1
            .services(this.config.messagingServiceSid)
            .fetch();

          return {
            success: true,
            message: `Messaging Service "${service.friendlyName}" verified successfully`,
            accountInfo: {
              name: account.friendlyName,
              status: account.status,
              messagingService: service.friendlyName,
            },
          };
        } catch (serviceError: any) {
          return {
            success: false,
            message: `Messaging Service not found: ${this.config.messagingServiceSid}`,
            accountInfo: {
              name: account.friendlyName,
              status: account.status,
            },
          };
        }
      }

      // Verify the phone number exists in the account (fallback if no messaging service)
      if (this.config.phoneNumber) {
        try {
          const phoneNumbers = await this.client.incomingPhoneNumbers.list({
            phoneNumber: this.config.phoneNumber,
          });

          if (phoneNumbers.length === 0) {
            return {
              success: false,
              message: `Phone number ${this.config.phoneNumber} not found in your Twilio account`,
              accountInfo: {
                name: account.friendlyName,
                status: account.status,
              },
            };
          }
        } catch (phoneError: any) {
          console.warn("Could not verify phone number:", phoneError.message);
        }
      }

      return {
        success: true,
        message: "Twilio SMS connection verified successfully",
        accountInfo: {
          name: account.friendlyName,
          status: account.status,
        },
      };
    } catch (error: any) {
      if (error.code === 20003) {
        return {
          success: false,
          message: "Invalid Account SID or Auth Token",
        };
      }

      return {
        success: false,
        message: error.message || "Failed to connect to Twilio",
      };
    }
  }
}
