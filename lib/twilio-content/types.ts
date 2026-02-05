/**
 * Twilio Content API Types
 *
 * Type definitions for Twilio's Content API resources and responses.
 * Reference: https://www.twilio.com/docs/content/api
 */

export type TwilioContentType =
  | "twilio/text"
  | "twilio/media"
  | "twilio/quick-reply"
  | "twilio/card"
  | "whatsapp/card"
  | "twilio/list-picker"
  | "twilio/call-to-action";

export type TwilioContentStatus =
  | "approved"
  | "rejected"
  | "pending_review"
  | "paused"
  | "disabled";

/**
 * Variables definition for template placeholders
 * Example: { "1": "Guest Name", "2": "Event Title" }
 */
export type TwilioVariables = Record<string, string>;

/**
 * Text content type
 */
export interface TwilioTextContent {
  body: string;
}

/**
 * Media content type (with image/video)
 */
export interface TwilioMediaContent {
  body?: string;
  media: string[]; // URLs to media files
}

/**
 * Quick Reply button action
 */
export interface TwilioQuickReplyAction {
  type: string; // Action type (e.g., "QUICK_REPLY")
  title: string; // Button text (max 20 chars)
  id: string; // Unique identifier
}

/**
 * Quick Reply content type (up to 3 buttons)
 */
export interface TwilioQuickReplyContent {
  body: string;
  actions: TwilioQuickReplyAction[]; // 1-3 buttons
}

/**
 * Card content type (with optional header and buttons)
 */
export interface TwilioCardContent {
  body: string;
  header?: string; // Optional header text
  actions?: TwilioQuickReplyAction[]; // Optional buttons (1-3)
}

/**
 * WhatsApp Card content type (with optional header, media, and buttons)
 */
export interface WhatsAppCardContent {
  body: string;
  header?: string; // Optional header text
  media?: string[]; // Optional media URLs (image, video, document)
  actions?: TwilioQuickReplyAction[]; // Optional buttons (1-3)
}

/**
 * List Picker item
 */
export interface TwilioListPickerItem {
  id: string; // Unique identifier (max 200 chars)
  item: string; // Display text (max 24 chars)
  description?: string; // Item description (max 72 chars)
}

/**
 * List Picker content type (1-10 items)
 */
export interface TwilioListPickerContent {
  body: string; // Message text (max 1024 chars)
  button: string; // Button text to open list (max 20 chars)
  items: TwilioListPickerItem[]; // 1-10 items
}

/**
 * Call to Action button
 */
export interface TwilioCallToActionButton {
  title: string; // Button text
  url?: string; // URL for URL buttons
  phone_number?: string; // Phone number for call buttons
}

/**
 * Call to Action content type
 */
export interface TwilioCallToActionContent {
  body: string;
  actions: TwilioCallToActionButton[]; // 1-2 buttons
}

/**
 * Content types union
 */
export type TwilioContentBody =
  | TwilioTextContent
  | TwilioMediaContent
  | TwilioQuickReplyContent
  | TwilioCardContent
  | WhatsAppCardContent
  | TwilioListPickerContent
  | TwilioCallToActionContent;

/**
 * Content Variables with examples (for WhatsApp approval)
 * Example: { "1": "דני ושרה", "2": "חתונת יוסי ומרים" }
 */
export type TwilioContentVariables = Record<string, string>;

/**
 * Create Content Request
 */
export interface CreateTwilioContentRequest {
  friendly_name: string; // Unique identifier for this template
  language: string; // Language code (e.g., "he", "en")
  variables?: TwilioVariables; // Variable definitions (descriptions)
  content_variables?: TwilioContentVariables; // Example values for WhatsApp approval
  types: {
    [K in TwilioContentType]?: TwilioContentBody;
  };
}

/**
 * Twilio Content Resource (API Response)
 */
export interface TwilioContentResource {
  sid: string; // Content SID (starts with HX)
  account_sid: string;
  friendly_name: string;
  language: string;
  variables?: TwilioVariables;
  types: {
    [K in TwilioContentType]?: TwilioContentBody;
  };
  approval_requests?: {
    name: string; // e.g., "whatsapp"
    status: TwilioContentStatus;
  }[];
  links?: {
    approval_create?: string;
    approval_fetch?: string;
  };
  date_created: string;
  date_updated: string;
  url: string;
}

/**
 * Twilio API Error Response
 */
export interface TwilioErrorResponse {
  status: number;
  message: string;
  code: number;
  more_info: string;
}

/**
 * Template submission result
 */
export interface TemplateSubmissionResult {
  success: boolean;
  contentSid?: string;
  error?: string;
  errorCode?: number;
  status?: TwilioContentStatus;
}

/**
 * Template approval status check result
 */
export interface TemplateApprovalStatusResult {
  success: boolean;
  status?: TwilioContentStatus;
  contentSid?: string;
  rejectionReason?: string;
  error?: string;
}
