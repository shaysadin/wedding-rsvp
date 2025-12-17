/**
 * VAPI Voice Agent Types
 */

// ============ VAPI API Types ============

export interface VapiCallRequest {
  phoneNumberId: string;
  assistantId: string;
  customer: {
    number: string;
    name?: string;
  };
  assistantOverrides?: VapiAssistantOverrides;
  metadata?: Record<string, string>;
}

export interface VapiAssistantOverrides {
  firstMessage?: string;
  model?: {
    messages?: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
  };
  metadata?: Record<string, string>;
  // Variable values to inject into assistant prompts (replaces {{variableName}} placeholders)
  variableValues?: Record<string, string>;
}

export interface VapiCallResponse {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: "outboundPhoneCall" | "inboundPhoneCall" | "webCall";
  status: "queued" | "ringing" | "in-progress" | "forwarding" | "ended";
  endedReason?: string;
  phoneNumberId?: string;
  customer?: {
    number: string;
  };
  assistantId?: string;
  assistant?: object;
}

export interface VapiCall {
  id: string;
  orgId: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  endedReason?: string;
  transcript?: string;
  messages?: VapiMessage[];
  analysis?: VapiCallAnalysis;
  assistantId?: string;
  phoneNumberId?: string;
  customer?: {
    number: string;
    name?: string;
  };
  assistantOverrides?: VapiAssistantOverrides;
  artifact?: {
    messages?: VapiMessage[];
    transcript?: string;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
  };
}

export interface VapiMessage {
  role: "assistant" | "user" | "system" | "tool_calls" | "tool_result";
  message?: string;
  time?: number;
  endTime?: number;
  secondsFromStart?: number;
}

export interface VapiCallAnalysis {
  summary?: string;
  successEvaluation?: string;
}

// ============ Webhook Event Types ============

export type VapiWebhookEventType =
  | "call.started"
  | "call.ringing"
  | "call.connected"
  | "call.ended"
  | "speech.started"
  | "speech.stopped"
  | "transcript"
  | "tool-calls"
  | "assistant-request"
  | "hang";

export interface VapiWebhookEvent {
  type: VapiWebhookEventType;
  call: VapiWebhookCall;
  timestamp?: string;
}

export interface VapiWebhookCall {
  id: string;
  orgId: string;
  type: string;
  status: string;
  phoneNumberId?: string;
  customer?: {
    number: string;
  };
  assistantId?: string;
  assistantOverrides?: VapiAssistantOverrides;
  createdAt: string;
  endedAt?: string;
  endedReason?: string;
  transcript?: string;
  messages?: VapiMessage[];
}

export interface VapiToolCallEvent extends VapiWebhookEvent {
  type: "tool-calls";
  message: {
    toolCallList: VapiToolCall[];
  };
}

export interface VapiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface VapiToolResponse {
  results: Array<{
    toolCallId: string;
    result: string | object;
  }>;
}

// ============ Internal Types ============

export interface WeddingDetailsEmbedding {
  title: string;
  date: string;
  time: string;
  location: string;
  venue?: string;
  address?: string;
  googleMapsUrl?: string;
  wazeUrl?: string;
  coupleNames?: string;
}

export interface GuestSummaryEmbedding {
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
}

export interface VapiSettingsInput {
  vapiApiKey?: string;
  vapiPhoneNumberId?: string;
  vapiPhoneNumber?: string;
  vapiAssistantId?: string;
  vapiWebhookSecret?: string;
  vapiEnabled?: boolean;
  azureSpeechKey?: string;
  azureSpeechRegion?: string;
}

export interface VapiEventSettingsInput {
  isEnabled?: boolean;
  canUpdateRsvp?: boolean;
}

// ============ Call Status Types ============

export type VapiCallStatus =
  | "PENDING"
  | "CALLING"
  | "COMPLETED"
  | "FAILED"
  | "NO_ANSWER"
  | "BUSY"
  | "CANCELLED";

// ============ Call Status Mapping ============

export const VAPI_STATUS_MAP = {
  queued: "PENDING",
  ringing: "CALLING",
  "in-progress": "CALLING",
  forwarding: "CALLING",
  ended: "COMPLETED",
} as const;

export const VAPI_END_REASON_MAP = {
  "hangup-by-customer": "COMPLETED",
  "hangup-by-assistant": "COMPLETED",
  "no-answer": "NO_ANSWER",
  busy: "BUSY",
  failed: "FAILED",
  canceled: "CANCELLED",
} as const;

// ============ Azure Voice Options (Reference) ============
// Note: Voice configuration should be done in VAPI Dashboard

export const AZURE_HEBREW_VOICES = {
  MALE: "he-IL-AvriNeural",
  FEMALE: "he-IL-HilaNeural",
} as const;

export const AZURE_HEBREW_VOICE_OPTIONS = [
  {
    id: "he-IL-AvriNeural",
    name: "Avri",
    gender: "male" as const,
    locale: "he-IL",
  },
  {
    id: "he-IL-HilaNeural",
    name: "Hila",
    gender: "female" as const,
    locale: "he-IL",
  },
] as const;
