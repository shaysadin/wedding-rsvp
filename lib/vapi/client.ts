/**
 * VAPI API Client
 * Handles communication with the VAPI.ai API for voice agent functionality
 */

import { prisma } from "@/lib/db";
import type {
  VapiCallRequest,
  VapiCallResponse,
  VapiCall,
  VapiAssistantOverrides,
} from "./types";

export class VapiClient {
  private apiKey: string;
  private baseUrl = "https://api.vapi.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make a request to the VAPI API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new VapiApiError(
        `VAPI API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return response.json();
  }

  /**
   * Create an outbound phone call
   */
  async createCall(params: {
    phoneNumberId: string;
    assistantId: string;
    customerNumber: string;
    customerName?: string;
    assistantOverrides?: VapiAssistantOverrides;
    metadata?: Record<string, string>;
  }): Promise<VapiCallResponse> {
    const body: VapiCallRequest = {
      phoneNumberId: params.phoneNumberId,
      assistantId: params.assistantId,
      customer: {
        number: params.customerNumber,
        name: params.customerName,
      },
      assistantOverrides: params.assistantOverrides,
      metadata: params.metadata,
    };

    return this.request<VapiCallResponse>("/call", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get call details by ID
   */
  async getCall(callId: string): Promise<VapiCall> {
    return this.request<VapiCall>(`/call/${callId}`);
  }

  /**
   * List recent calls
   */
  async listCalls(params?: {
    limit?: number;
    createdAtGte?: string;
    createdAtLte?: string;
  }): Promise<VapiCall[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.createdAtGte)
      searchParams.set("createdAtGte", params.createdAtGte);
    if (params?.createdAtLte)
      searchParams.set("createdAtLte", params.createdAtLte);

    const query = searchParams.toString();
    const endpoint = query ? `/call?${query}` : "/call";

    return this.request<VapiCall[]>(endpoint);
  }

  /**
   * Cancel an ongoing call
   */
  async cancelCall(callId: string): Promise<void> {
    await this.request(`/call/${callId}`, {
      method: "DELETE",
    });
  }

  /**
   * Test connection to VAPI API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list calls with limit 1 to verify credentials
      await this.request("/call?limit=1");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get phone numbers
   */
  async getPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    return this.request<VapiPhoneNumber[]>("/phone-number");
  }

  /**
   * Get assistants
   */
  async getAssistants(): Promise<VapiAssistant[]> {
    return this.request<VapiAssistant[]>("/assistant");
  }
}

// ============ Types for additional endpoints ============

interface VapiPhoneNumber {
  id: string;
  orgId: string;
  number: string;
  provider: string;
  createdAt: string;
  name?: string;
}

interface VapiAssistant {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  model?: object;
  voice?: object;
}

// ============ Custom Error Class ============

export class VapiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "VapiApiError";
  }
}

// ============ Factory Functions ============

let cachedClient: VapiClient | null = null;
let lastCheck = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get a configured VAPI client using platform settings
 * Returns null if VAPI is not configured or disabled
 */
export async function getVapiClient(): Promise<VapiClient | null> {
  const now = Date.now();

  // Use cached client if valid
  if (cachedClient && now - lastCheck < CACHE_TTL) {
    return cachedClient;
  }

  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings?.vapiApiKey || !settings.vapiEnabled) {
    cachedClient = null;
    lastCheck = now;
    return null;
  }

  cachedClient = new VapiClient(settings.vapiApiKey);
  lastCheck = now;
  return cachedClient;
}

/**
 * Clear the cached VAPI client (call after settings update)
 */
export function clearVapiClientCache(): void {
  cachedClient = null;
  lastCheck = 0;
}

/**
 * Check if VAPI is enabled and configured
 */
export async function isVapiConfigured(): Promise<boolean> {
  const settings = await prisma.messagingProviderSettings.findFirst();
  return !!(
    settings?.vapiApiKey &&
    settings.vapiPhoneNumberId &&
    settings.vapiAssistantId &&
    settings.vapiEnabled
  );
}

/**
 * Get VAPI settings (masked for display)
 */
export async function getVapiSettings(): Promise<{
  isConfigured: boolean;
  isEnabled: boolean;
  phoneNumber?: string;
  assistantId?: string;
  voiceId?: string;
  hasApiKey: boolean;
  azureRegion?: string;
} | null> {
  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings) return null;

  return {
    isConfigured: !!(
      settings.vapiApiKey &&
      settings.vapiPhoneNumberId &&
      settings.vapiAssistantId
    ),
    isEnabled: settings.vapiEnabled,
    phoneNumber: settings.vapiPhoneNumber || undefined,
    assistantId: settings.vapiAssistantId || undefined,
    voiceId: settings.vapiDefaultVoiceId || undefined,
    hasApiKey: !!settings.vapiApiKey,
    azureRegion: settings.azureSpeechRegion || undefined,
  };
}
