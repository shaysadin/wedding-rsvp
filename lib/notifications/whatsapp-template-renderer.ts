/**
 * WhatsApp Template Renderer - 12 Variable System
 *
 * Handles rendering of WhatsApp templates with the 12-variable structure:
 * {{1}} = Guest Name
 * {{2}} = Event Title
 * {{3}} = Venue Name (ALWAYS venue name, not media URL)
 * {{4}} = Venue Address
 * {{5}} = Event Date
 * {{6}} = Event Time
 * {{7}} = Navigation URL (Waze link to venue) - USED IN ALL TEMPLATES
 * {{8}} = Table Number
 * {{9}} = Transportation Link (used in Style 3 transportation-focused templates)
 * {{10}} = Media URL (for media templates: IMAGE_INVITE, interactive with media header)
 * {{11}} = RSVP Link (for guest to confirm attendance) - ONLY USED IN INVITE/REMINDER
 * {{12}} = Gift Payment URL (credit card gift link - external or app URL)
 *
 * IMPORTANT:
 * - {{7}} is ALWAYS Navigation URL (short link to Waze/Google Maps)
 * - {{11}} is RSVP Link (only for INVITE/REMINDER where guests need to click to RSVP page)
 * - {{12}} is Gift URL (external provider if set, otherwise app's gift page)
 * - Interactive templates use {{7}} for navigation and buttons for RSVP (no {{11}} needed)
 */

import { Guest, WeddingEvent, GiftPaymentSettings } from "@prisma/client";
import { env } from "@/env.mjs";

export interface WhatsAppTemplateVariables {
  /** {{1}} - Guest Name */
  guestName: string;
  /** {{2}} - Event Title */
  eventTitle: string;
  /** {{3}} - Venue Name (ALWAYS venue name) */
  venueName?: string;
  /** {{4}} - Venue Address */
  venueAddress?: string;
  /** {{5}} - Event Date */
  eventDate?: string;
  /** {{6}} - Event Time */
  eventTime?: string;
  /** {{7}} - Navigation URL (Waze/Google Maps link - used in ALL templates) */
  navigationLink?: string;
  /** {{8}} - Table Number */
  tableNumber?: string;
  /** {{9}} - Transportation Link (unique per guest via transportationSlug) */
  transportationLink?: string;
  /** {{10}} - Media URL (for media templates only) */
  mediaUrl?: string;
  /** {{11}} - RSVP Link (for guest RSVP page - only INVITE/REMINDER) */
  rsvpLink?: string;
  /** {{12}} - Gift Payment URL (external or app URL based on settings) */
  giftUrl?: string;
}

/**
 * Build WhatsApp template variables from guest and event data
 * Provides all 12 variables for maximum flexibility
 */
export function buildWhatsAppTemplateVariables(
  guest: Guest,
  event: WeddingEvent,
  options?: {
    /** Include RSVP link in {{11}} (for INVITE/REMINDER templates only) */
    includeRsvpLink?: boolean;
    /** Transportation link for {{9}} (for Style 3 templates) */
    includeTransportationLink?: boolean;
    /** Table number for {{8}} */
    tableNumber?: string;
    /** Locale for date/time formatting */
    locale?: "he" | "en";
    /** Media URL for {{10}} (for media templates only) */
    mediaUrl?: string;
    /** Gift payment settings for {{12}} (EVENT_DAY templates) */
    giftSettings?: GiftPaymentSettings | null;
  }
): WhatsAppTemplateVariables {
  const locale = options?.locale || "he";
  const dateFormatLocale = locale === "en" ? "en-US" : "he-IL";

  // Format date and time
  const eventDate = event.dateTime.toLocaleDateString(dateFormatLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const eventTime = event.dateTime.toLocaleTimeString(dateFormatLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // {{7}} - Navigation URL (ALWAYS - for ALL templates)
  const navigationLink = getNavigationLink(event);

  // {{11}} - RSVP Link (ONLY for INVITE/REMINDER templates)
  const rsvpLink = options?.includeRsvpLink
    ? `${env.NEXT_PUBLIC_APP_URL}/rsvp/${guest.slug}`
    : undefined;

  // Transportation link ({{9}}) - only if requested
  // Uses guest's unique transportationSlug, not event ID
  const transportationLink = options?.includeTransportationLink && guest.transportationSlug
    ? `${env.NEXT_PUBLIC_APP_URL}/transportation/${guest.transportationSlug}`
    : undefined;

  // Media URL ({{10}}) - only if requested
  // Extract path from Cloudinary URL (remove https://res.cloudinary.com/ prefix)
  // because templates have the base URL hardcoded as https://res.cloudinary.com/{{10}}
  let mediaUrl = options?.mediaUrl;
  if (mediaUrl && mediaUrl.includes('res.cloudinary.com/')) {
    // Extract everything after "res.cloudinary.com/"
    const match = mediaUrl.match(/res\.cloudinary\.com\/(.+)$/);
    if (match) {
      mediaUrl = match[1];
    }
  }

  // {{3}} is ALWAYS venue name, {{4}} is ALWAYS venue address
  const venueName = event.venue || event.location || '';
  const venueAddress = event.location || '';

  // {{12}} - Gift Payment URL
  // Use external provider URL if configured, otherwise use app's gift page
  let giftUrl: string | undefined = undefined;
  if (options?.giftSettings?.isEnabled) {
    if (options.giftSettings.useExternalProvider && options.giftSettings.externalProviderUrl) {
      // Use external provider URL
      giftUrl = options.giftSettings.externalProviderUrl;
    } else {
      // Use app's own gift payment page
      giftUrl = `${env.NEXT_PUBLIC_APP_URL}/gift/${guest.slug}`;
    }
  }

  return {
    guestName: guest.name,
    eventTitle: event.title,
    venueName,
    venueAddress,
    eventDate,
    eventTime,
    navigationLink,
    tableNumber: options?.tableNumber,
    transportationLink,
    mediaUrl,
    rsvpLink,
    giftUrl,
  };
}

/**
 * Convert WhatsAppTemplateVariables to Twilio ContentSid variables format
 * Twilio expects an object with keys "1", "2", "3", etc.
 */
export function convertToTwilioVariables(
  variables: WhatsAppTemplateVariables
): Record<string, string> {
  const twilioVars: Record<string, string> = {
    "1": variables.guestName,
    "2": variables.eventTitle,
  };

  // Add optional variables only if they exist
  if (variables.venueName) {
    twilioVars["3"] = variables.venueName;
  }
  if (variables.venueAddress) {
    twilioVars["4"] = variables.venueAddress;
  }
  if (variables.eventDate) {
    twilioVars["5"] = variables.eventDate;
  }
  if (variables.eventTime) {
    twilioVars["6"] = variables.eventTime;
  }
  if (variables.navigationLink) {
    twilioVars["7"] = variables.navigationLink;
  }
  if (variables.tableNumber) {
    twilioVars["8"] = variables.tableNumber;
  }
  if (variables.transportationLink) {
    twilioVars["9"] = variables.transportationLink;
  }
  if (variables.mediaUrl) {
    twilioVars["10"] = variables.mediaUrl;
  }
  if (variables.rsvpLink) {
    twilioVars["11"] = variables.rsvpLink;
  }
  if (variables.giftUrl) {
    twilioVars["12"] = variables.giftUrl;
  }

  return twilioVars;
}

/**
 * Get navigation link for venue (short redirect to Waze)
 * Uses short navigationCode if available, falls back to event ID
 */
export function getNavigationLink(event: WeddingEvent & { navigationCode?: string | null }): string {
  const code = event.navigationCode || event.id;
  return `${env.NEXT_PUBLIC_APP_URL}/n/${code}`;
}

/**
 * Get table assignment link
 */
export function getTableAssignmentLink(eventId: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/he/events/${eventId}/seating`;
}

/**
 * Validate WhatsApp template before sending
 * Checks Twilio/WhatsApp guidelines
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWhatsAppTemplate(
  templateBody: string,
  variables: Record<string, string>,
  options?: {
    buttons?: Array<{ title: string }>;
    hasMedia?: boolean;
  }
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Render template with variables for validation
  let renderedTemplate = templateBody;
  Object.entries(variables).forEach(([key, value]) => {
    renderedTemplate = renderedTemplate.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value
    );
  });

  // Check character limit (1024 for body)
  if (renderedTemplate.length > 1024) {
    errors.push(
      `Template body exceeds 1024 character limit (${renderedTemplate.length} characters)`
    );
  }

  // Check if variables are at start or end (WhatsApp restriction)
  if (templateBody.trim().startsWith("{{")) {
    errors.push("Template cannot start with a variable");
  }
  if (templateBody.trim().endsWith("}}")) {
    errors.push("Template cannot end with a variable");
  }

  // Check button limits
  if (options?.buttons) {
    if (options.buttons.length > 3) {
      errors.push("Maximum 3 buttons allowed for quick-reply templates");
    }
    options.buttons.forEach((btn, idx) => {
      if (btn.title.length > 20) {
        errors.push(
          `Button ${idx + 1} "${btn.title}" exceeds 20 character limit (${btn.title.length} characters)`
        );
      }
    });
  }

  // Check for unused variables (warning only)
  const usedVars = new Set<string>();
  const varRegex = /\{\{(\d+)\}\}/g;
  let match;
  while ((match = varRegex.exec(templateBody)) !== null) {
    usedVars.add(match[1]);
  }

  // Check if variables are sequential
  const usedVarNumbers = Array.from(usedVars).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < usedVarNumbers.length; i++) {
    if (usedVarNumbers[i] !== i + 1) {
      warnings.push(
        `Variables should be sequential. Found {{${usedVarNumbers[i]}}} but expected {{${i + 1}}}`
      );
    }
  }

  // Check for required variables (1 and 2 should always be present)
  if (!usedVars.has("1")) {
    warnings.push("Variable {{1}} (Guest Name) is recommended for personalization");
  }
  if (!usedVars.has("2")) {
    warnings.push("Variable {{2}} (Event Title) is recommended for context");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Preview template with sample data (for testing/preview purposes)
 */
export function previewTemplate(
  templateBody: string,
  sampleData?: Partial<WhatsAppTemplateVariables>
): string {
  const defaultSample: WhatsAppTemplateVariables = {
    guestName: "דני ושרה",
    eventTitle: "חתונת דני ושרה",
    venueName: "אולם מאגיה",
    venueAddress: "רחוב החשמל 5, טבריה",
    eventDate: "יום שישי, 15 במרץ 2026",
    eventTime: "20:00",
    navigationLink: "https://wedinex.co/n/sample",
    tableNumber: "12",
    transportationLink: "https://wedinex.co/t/sample",
    rsvpLink: "https://wedinex.co/rsvp/sample",
    giftUrl: "https://wedinex.co/gift/sample",
  };

  const sample = { ...defaultSample, ...sampleData };
  const twilioVars = convertToTwilioVariables(sample);

  let preview = templateBody;
  Object.entries(twilioVars).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  });

  return preview;
}

/**
 * Shorten URL using a URL shortener (placeholder - implement with your preferred service)
 */
export async function shortenUrl(url: string): Promise<string> {
  // TODO: Implement with your preferred URL shortener (Bitly, TinyURL, etc.)
  // For now, return the original URL
  return url;
}

/**
 * Get example values for WhatsApp template approval
 * These are used by WhatsApp reviewers to preview the template
 *
 * Returns example values for all 12 variables:
 * {{1}} - Guest Name
 * {{2}} - Event Title
 * {{3}} - Venue Name
 * {{4}} - Venue Address
 * {{5}} - Event Date
 * {{6}} - Event Time
 * {{7}} - Navigation URL
 * {{8}} - Table Number
 * {{9}} - Transportation Link
 * {{10}} - Media URL
 * {{11}} - RSVP Link
 * {{12}} - Gift Payment URL
 */
export function getExampleVariables(): Record<string, string> {
  return {
    "1": "דני ושרה",
    "2": "חתונת יוסי ומרים",
    "3": "אולם מאגיה",
    "4": "רחוב החשמל 5, טבריה",
    "5": "יום שישי, 15 במרץ 2026",
    "6": "20:00",
    "7": "https://wedinex.co/n/sample",
    "8": "12",
    "9": "https://wedinex.co/t/sample-transport",
    "10": "demo/wedding_invite_sample.jpg",
    "11": "https://wedinex.co/rsvp/sample",
    "12": "https://wedinex.co/gift/sample",
  };
}

/**
 * Helper to get link type description for UI
 * Note: {{7}} is ALWAYS RSVP link, {{9}} is Transportation link (Style 3 only)
 */
export function getLinkTypeDescription(
  templateType: string,
  variableNumber: "7" | "9"
): string {
  // Variable 7 descriptions (RSVP and other primary links)
  if (variableNumber === "7") {
    const linkTypes: Record<string, string> = {
      INVITE: "RSVP Link",
      REMINDER: "RSVP Link",
      INTERACTIVE_INVITE: "Navigation Link", // Guests confirm via buttons
      INTERACTIVE_REMINDER: "Navigation Link", // Guests confirm via buttons
      IMAGE_INVITE: "RSVP Link",
      CONFIRMATION: "Navigation Link", // Send Waze link after confirmation
      EVENT_DAY: "Navigation Link",
      THANK_YOU: "Feedback Link",
      TABLE_ASSIGNMENT: "Navigation Link",
      GUEST_COUNT_LIST: "Guest Count Selection Link",
    };
    return linkTypes[templateType] || "RSVP Link";
  }

  // Variable 9 is always Transportation Link
  return "Transportation Link";
}
