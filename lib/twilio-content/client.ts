/**
 * Twilio Content API Client
 *
 * HTTP client for creating and managing WhatsApp templates via Twilio's Content API.
 * Handles authentication, request formatting, and error handling.
 */

import type {
  CreateTwilioContentRequest,
  TwilioContentResource,
  TwilioErrorResponse,
  TemplateSubmissionResult,
  TemplateApprovalStatusResult,
} from "./types";

const TWILIO_CONTENT_API_BASE = "https://content.twilio.com/v1";

/**
 * Twilio Content API Client
 */
export class TwilioContentClient {
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
  }

  /**
   * Get Basic Auth header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.accountSid}:${this.authToken}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  /**
   * Make HTTP request to Twilio Content API
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: any
  ): Promise<{ data?: T; error?: TwilioErrorResponse }> {
    try {
      const response = await fetch(`${TWILIO_CONTENT_API_BASE}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data as TwilioErrorResponse,
        };
      }

      return { data: data as T };
    } catch (error) {
      console.error("[TwilioContentClient] Request error:", error);
      return {
        error: {
          status: 500,
          message: error instanceof Error ? error.message : "Unknown error",
          code: 50000,
          more_info: "https://www.twilio.com/docs/api/errors",
        },
      };
    }
  }

  /**
   * Create a new Content resource (submit template)
   */
  async createContent(
    request: CreateTwilioContentRequest
  ): Promise<TemplateSubmissionResult> {
    const { data, error } = await this.request<TwilioContentResource>(
      "/Content",
      "POST",
      request
    );

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "No data returned from Twilio",
      };
    }

    // Check WhatsApp approval status
    const whatsappApproval = data.approval_requests?.find(
      (req) => req.name === "whatsapp"
    );

    return {
      success: true,
      contentSid: data.sid,
      status: whatsappApproval?.status,
    };
  }

  /**
   * Get Content resource by SID (check approval status)
   */
  async getContent(
    contentSid: string
  ): Promise<TemplateApprovalStatusResult & { contentType?: string }> {
    const { data, error } = await this.request<TwilioContentResource>(
      `/Content/${contentSid}`
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Content not found",
      };
    }

    // Check WhatsApp approval status
    const whatsappApproval = data.approval_requests?.find(
      (req) => req.name === "whatsapp"
    );

    const status = whatsappApproval?.status;

    // Extract actual content type from Twilio response
    // The types object has keys like "twilio/text", "twilio/quick-reply", etc.
    const contentType = Object.keys(data.types || {})[0];

    return {
      success: true,
      status,
      contentSid: data.sid,
      contentType,
      // Note: rejection_reason is not in the API response structure
      // WhatsApp typically doesn't provide detailed rejection reasons via API
    };
  }

  /**
   * Submit Content to WhatsApp for approval
   */
  async submitForWhatsAppApproval(
    contentSid: string,
    category: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create approval request for WhatsApp
      const { data, error } = await this.request(
        `/Content/${contentSid}/ApprovalRequests/whatsapp`,
        "POST",
        {
          category,
          name,
        }
      );

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete Content resource
   */
  async deleteContent(contentSid: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.request(`/Content/${contentSid}`, "DELETE");

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  }

  /**
   * List all Content resources (with pagination)
   */
  async listContents(pageSize: number = 20): Promise<{
    success: boolean;
    contents?: TwilioContentResource[];
    error?: string;
  }> {
    const { data, error } = await this.request<{
      contents: TwilioContentResource[];
      meta: {
        page: number;
        page_size: number;
        first_page_url: string;
        previous_page_url: string | null;
        next_page_url: string | null;
        url: string;
      };
    }>(`/Content?PageSize=${pageSize}`);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "No data returned",
      };
    }

    return {
      success: true,
      contents: data.contents,
    };
  }
}

/**
 * Create Twilio Content Client instance
 */
export function createTwilioContentClient(
  accountSid: string,
  authToken: string
): TwilioContentClient {
  return new TwilioContentClient(accountSid, authToken);
}
