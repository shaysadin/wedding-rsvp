/**
 * SMS Provider Abstraction Types
 *
 * This module defines the interface for SMS providers.
 * Supports: Twilio, Upsend (Israeli provider)
 */

export type SmsProviderType = "twilio" | "upsend";

export interface SmsProviderConfig {
  provider: SmsProviderType;
  authId: string;      // Account SID (Twilio) or Username (Upsend)
  authToken: string;   // Auth Token
  phoneNumber: string; // Sender phone number in E.164 format (fallback if no messaging service)
  messagingServiceSid?: string; // Twilio Messaging Service SID (takes priority over phoneNumber)
  alphaSenderId?: string; // Alpha Sender ID (max 11 chars, alphanumeric) - used as 'from' instead of phone number
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: string | number;
  isTrialError?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  accountInfo?: {
    name?: string;
    status?: string;
    messagingService?: string; // Twilio Messaging Service name if using one
  };
}

/**
 * SMS Provider Interface
 * All SMS providers must implement this interface
 */
export interface SmsProvider {
  /**
   * Send an SMS message
   */
  sendSms(to: string, message: string): Promise<SendSmsResult>;

  /**
   * Test the connection/credentials
   */
  testConnection(): Promise<TestConnectionResult>;

  /**
   * Get the provider name
   */
  getProviderName(): SmsProviderType;
}
