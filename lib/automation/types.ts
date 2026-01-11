import {
  AutomationTrigger,
  AutomationAction,
  AutomationFlowStatus,
  AutomationExecutionStatus,
  RsvpStatus,
} from "@prisma/client";

export interface AutomationContext {
  guestId: string;
  weddingEventId: string;
  guestName: string;
  guestPhone?: string | null;
  rsvpStatus?: RsvpStatus;
  tableName?: string | null;
  eventDate: Date;
  eventTime?: string;
  eventLocation: string; // Full address
  eventVenue?: string | null; // Venue name
  eventAddress?: string | null; // Street address
  guestCount?: number; // Number of guests confirmed
  customMessage?: string | null; // Custom message from the flow
  rsvpLink?: string; // RSVP link for the guest
  giftLink?: string | null; // Gift payment link
  navigationLink?: string | null; // Google Maps or Waze link
  coupleName?: string | null; // Couple names for thank you message
  templateStyle?: string | null; // WhatsApp template style: formal, friendly, short
}

export interface TriggerCheckResult {
  shouldTrigger: boolean;
  reason?: string;
  scheduledFor?: Date;
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
  errorCode?: string;
}

export interface FlowTemplateData {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  trigger: AutomationTrigger;
  action: AutomationAction;
}

export const FLOW_TEMPLATES: Omit<FlowTemplateData, "id">[] = [
  {
    name: "The Chaser",
    nameHe: "הרודף",
    description: "Automatically reminds guests who haven't responded within 24 hours",
    descriptionHe: "מזכיר אוטומטית לאורחים שלא הגיבו תוך 24 שעות",
    trigger: "NO_RESPONSE_24H",
    action: "SEND_WHATSAPP_TEMPLATE",
  },
  {
    name: "The Concierge",
    nameHe: "הקונסיירז'",
    description: "Sends table assignment and location on the morning of the event",
    descriptionHe: "שולח שיבוץ לשולחן ומיקום בבוקר יום האירוע",
    trigger: "EVENT_MORNING",
    action: "SEND_TABLE_ASSIGNMENT",
  },
  {
    name: "Thank You",
    nameHe: "תודה",
    description: "Sends a thank you message when a guest confirms attendance",
    descriptionHe: "שולח הודעת תודה כשאורח מאשר הגעה",
    trigger: "RSVP_CONFIRMED",
    action: "SEND_WHATSAPP_TEMPLATE",
  },
  {
    name: "Second Chance",
    nameHe: "הזדמנות שנייה",
    description: "Final reminder for guests who haven't responded within 48 hours",
    descriptionHe: "תזכורת אחרונה לאורחים שלא הגיבו תוך 48 שעות",
    trigger: "NO_RESPONSE_48H",
    action: "SEND_WHATSAPP_TEMPLATE",
  },
  {
    name: "Location Reminder",
    nameHe: "תזכורת מיקום",
    description: "Sends venue details 2 hours before the event",
    descriptionHe: "שולח פרטי מקום האירוע שעתיים לפני",
    trigger: "HOURS_BEFORE_EVENT_2",
    action: "SEND_WHATSAPP_TEMPLATE",
  },
];

export type TriggerType = AutomationTrigger;
export type ActionType = AutomationAction;
export type FlowStatus = AutomationFlowStatus;
export type ExecutionStatus = AutomationExecutionStatus;
