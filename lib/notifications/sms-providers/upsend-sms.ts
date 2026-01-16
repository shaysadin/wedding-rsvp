/**
 * Upsend SMS Provider (Israeli SMS Provider)
 *
 * Implements the SmsProvider interface for upsend.co.il
 * Reference: https://documenter.getpostman.com/view/12791710/UVsJvmNp
 */

import {
  SmsProvider,
  SmsProviderConfig,
  SendSmsResult,
  TestConnectionResult,
} from "./types";

// Upsend API status codes with user-friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  1: "Success",
  "-1": "Failed to send message",
  "-2": "Bad username or password",
  "-6": "Recipients data not exists",
  "-9": "Message text not exists",
  "-13": "User quota exceeded",
  "-14": "Project quota exceeded",
  "-15": "Customer quota exceeded",
  "-16": "Wrong date/time format",
  "-17": "Wrong number parameter",
  "-18": "No valid recipients",
  "-21": "Invalid sender name",
  "-22": "User blocked",
  "-26": "User authentication error",
  "-90": "Invalid sender identification",
  "-94": "Sender ID is not in allow list",
};

// Quota-related error codes
const QUOTA_ERROR_CODES = [-13, -14, -15];

interface UpsendSendSmsResponse {
  StatusId: number;
  StatusDescription: string;
  DetailedDescription?: string;
  FunctionName: string;
  RequestId: string;
  Data?: {
    Recipients?: number;
    Errors?: string | null;
  };
}

interface UpsendGetQuotaResponse {
  StatusId: number;
  StatusDescription: string;
  DetailedDescription?: string;
  FunctionName: string;
  RequestId: string;
  Data?: {
    Level: string;
    LevelValue: number;
    List?: Array<{
      QuotaUsageType: string;
      QuotaType: string;
      RemainingQuota: number;
      WarningLevel: number;
    }>;
  };
}

export class UpsendSmsProvider implements SmsProvider {
  private config: SmsProviderConfig;
  private baseUrl = "https://capi.upsend.co.il/api/v2";

  constructor(config: SmsProviderConfig) {
    this.config = config;
  }

  getProviderName() {
    return "upsend" as const;
  }

  /**
   * Create Basic Auth header value
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.authId}:${this.config.authToken}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    return `Basic ${base64Credentials}`;
  }

  /**
   * Get sender ID - either alpha sender ID or phone number
   * Upsend allows max 11 characters for alpha sender or 14 digits for phone
   */
  private getSenderId(): string {
    if (this.config.alphaSenderId) {
      // Alpha sender ID - max 11 characters
      return this.config.alphaSenderId.slice(0, 11);
    }
    // Use phone number - strip any non-digit characters and format for Israeli numbers
    return this.config.phoneNumber.replace(/[^\d]/g, "").slice(0, 14);
  }

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    try {
      // Format phone number for Israeli format (remove +972 prefix if present, add 0)
      let formattedPhone = to.replace(/[^\d]/g, "");
      if (formattedPhone.startsWith("972")) {
        formattedPhone = "0" + formattedPhone.slice(3);
      } else if (formattedPhone.startsWith("+972")) {
        formattedPhone = "0" + formattedPhone.slice(4);
      } else if (!formattedPhone.startsWith("0") && formattedPhone.length === 9) {
        // Israeli mobile without leading 0
        formattedPhone = "0" + formattedPhone;
      }

      const requestBody = {
        Data: {
          Message: message,
          Recipients: [
            {
              Phone: formattedPhone,
            },
          ],
          Settings: {
            Sender: this.getSenderId(),
          },
        },
      };

      const response = await fetch(`${this.baseUrl}/SMS/SendSms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(requestBody),
      });

      const result: UpsendSendSmsResponse = await response.json();

      if (result.StatusId === 1) {
        return {
          success: true,
          messageId: result.RequestId,
          status: result.StatusDescription,
        };
      } else {
        const errorMessage =
          ERROR_MESSAGES[result.StatusId] ||
          result.DetailedDescription ||
          result.StatusDescription ||
          "Failed to send SMS";

        return {
          success: false,
          error: errorMessage,
          errorCode: result.StatusId,
          isTrialError: QUOTA_ERROR_CODES.includes(result.StatusId),
        };
      }
    } catch (error: any) {
      console.error("Upsend SMS error:", error);

      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Use GetQuota endpoint to verify credentials and get account info
      const requestBody = {
        Data: {
          QuotaUsageType: "SMS",
          Level: "User",
          LevelValue: "",
        },
      };

      const response = await fetch(`${this.baseUrl}/Admin/GetQuota`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(requestBody),
      });

      const result: UpsendGetQuotaResponse = await response.json();

      if (result.StatusId === 1) {
        // Find SMS quota from the list
        const smsQuota = result.Data?.List?.find(
          (item) => item.QuotaUsageType === "SMS"
        );

        return {
          success: true,
          message: "Upsend connection verified successfully",
          accountInfo: {
            name: `User ${result.Data?.LevelValue || "Unknown"}`,
            status: "active",
            messagingService: smsQuota
              ? `${smsQuota.RemainingQuota} SMS remaining`
              : undefined,
          },
        };
      } else {
        const errorMessage =
          ERROR_MESSAGES[result.StatusId] ||
          result.DetailedDescription ||
          result.StatusDescription ||
          "Connection test failed";

        // Check for auth errors
        if (result.StatusId === -2 || result.StatusId === -26) {
          return {
            success: false,
            message: "Invalid username or API token",
          };
        }

        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error: any) {
      console.error("Upsend connection test error:", error);

      return {
        success: false,
        message: error.message || "Failed to connect to Upsend",
      };
    }
  }
}
