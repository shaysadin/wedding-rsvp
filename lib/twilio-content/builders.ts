/**
 * Twilio Content Request Builders
 *
 * Helper functions to build Twilio Content API request bodies for different template types.
 */

import type {
  CreateTwilioContentRequest,
  TwilioVariables,
  TwilioQuickReplyAction,
} from "./types";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

/**
 * Button configuration from database
 */
export interface ButtonConfig {
  id: string;
  titleHe: string;
  titleEn: string;
}

/**
 * Build template request - unified helper for single-language templates
 */
export function buildTemplateRequest(params: {
  friendlyName: string;
  language: string;
  body: string;
  buttons?: Array<{ id: string; title: string }>;
  variables?: TwilioVariables;
  isInteractive?: boolean;
}): CreateTwilioContentRequest {
  // If interactive and has buttons, use quick-reply
  if (params.isInteractive && params.buttons && params.buttons.length > 0) {
    // Validate button count
    if (params.buttons.length > 3) {
      throw new Error("Quick-reply templates must have 1-3 buttons");
    }

    const actions: TwilioQuickReplyAction[] = params.buttons.map((btn) => ({
      type: "QUICK_REPLY",
      id: btn.id,
      title: btn.title,
    }));

    return {
      friendly_name: params.friendlyName,
      language: params.language,
      variables: params.variables,
      types: {
        "twilio/quick-reply": {
          body: params.body,
          actions,
        },
      },
    };
  }

  // Otherwise, use simple text template
  return {
    friendly_name: params.friendlyName,
    language: params.language,
    variables: params.variables,
    types: {
      "twilio/text": {
        body: params.body,
      },
    },
  };
}

/**
 * Build text template content
 */
export function buildTextTemplate(params: {
  friendlyName: string;
  language: string;
  body: string;
  variables?: TwilioVariables;
}): CreateTwilioContentRequest {
  return {
    friendly_name: params.friendlyName,
    language: params.language,
    variables: params.variables,
    types: {
      "twilio/text": {
        body: params.body,
      },
    },
  };
}

/**
 * Build quick-reply template (interactive buttons)
 */
export function buildQuickReplyTemplate(params: {
  friendlyName: string;
  language: string;
  body: string;
  buttons: ButtonConfig[];
  variables?: TwilioVariables;
}): CreateTwilioContentRequest {
  // Validate button count (1-3 for quick-reply)
  if (params.buttons.length < 1 || params.buttons.length > 3) {
    throw new Error("Quick-reply templates must have 1-3 buttons");
  }

  // Convert buttons to Twilio format
  const actions: TwilioQuickReplyAction[] = params.buttons.map((btn) => ({
    type: "QUICK_REPLY",
    id: btn.id,
    title: params.language === "he" ? btn.titleHe : btn.titleEn,
  }));

  return {
    friendly_name: params.friendlyName,
    language: params.language,
    variables: params.variables,
    types: {
      "twilio/quick-reply": {
        body: params.body,
        actions,
      },
    },
  };
}

/**
 * Build media template (with image)
 */
export function buildMediaTemplate(params: {
  friendlyName: string;
  language: string;
  body?: string;
  mediaUrl: string;
  buttons?: ButtonConfig[];
  variables?: TwilioVariables;
}): CreateTwilioContentRequest {
  const request: CreateTwilioContentRequest = {
    friendly_name: params.friendlyName,
    language: params.language,
    variables: params.variables,
    types: {
      "twilio/media": {
        body: params.body,
        media: [params.mediaUrl],
      },
    },
  };

  // Add quick-reply buttons if provided
  if (params.buttons && params.buttons.length > 0) {
    const actions: TwilioQuickReplyAction[] = params.buttons.map((btn) => ({
      type: "QUICK_REPLY",
      id: btn.id,
      title: params.language === "he" ? btn.titleHe : btn.titleEn,
    }));

    request.types["twilio/quick-reply"] = {
      body: params.body || "",
      actions,
    };
  }

  return request;
}

/**
 * Build bilingual template (both Hebrew and English versions)
 *
 * Creates two separate Content resources - one for each language
 */
export function buildBilingualTemplates(params: {
  friendlyNamePrefix: string; // e.g., "wedinex_invite_style1"
  templateType: WhatsAppTemplateType;
  bodyHe: string;
  bodyEn: string;
  buttons?: ButtonConfig[];
  variables?: TwilioVariables;
}): {
  hebrew: CreateTwilioContentRequest;
  english: CreateTwilioContentRequest;
} {
  const isInteractive =
    params.templateType === "INTERACTIVE_INVITE" ||
    params.templateType === "INTERACTIVE_REMINDER" ||
    params.templateType === "IMAGE_INVITE";

  if (isInteractive && params.buttons) {
    // Build interactive templates with buttons
    return {
      hebrew: buildQuickReplyTemplate({
        friendlyName: `${params.friendlyNamePrefix}_he`,
        language: "he",
        body: params.bodyHe,
        buttons: params.buttons,
        variables: params.variables,
      }),
      english: buildQuickReplyTemplate({
        friendlyName: `${params.friendlyNamePrefix}_en`,
        language: "en",
        body: params.bodyEn,
        buttons: params.buttons,
        variables: params.variables,
      }),
    };
  }

  // Build text templates
  return {
    hebrew: buildTextTemplate({
      friendlyName: `${params.friendlyNamePrefix}_he`,
      language: "he",
      body: params.bodyHe,
      variables: params.variables,
    }),
    english: buildTextTemplate({
      friendlyName: `${params.friendlyNamePrefix}_en`,
      language: "en",
      body: params.bodyEn,
      variables: params.variables,
    }),
  };
}

/**
 * Get default variables for a template type
 */
export function getDefaultVariables(
  templateType: WhatsAppTemplateType
): TwilioVariables {
  const baseVars: TwilioVariables = {
    "1": "Guest Name",
    "2": "Event Title",
  };

  // Add template-specific variables
  switch (templateType) {
    case "INVITE":
    case "REMINDER":
      return {
        ...baseVars,
        "3": "RSVP Link",
      };

    case "TRANSPORTATION_INVITE":
      return {
        ...baseVars,
        "3": "RSVP Link",
        "4": "Transportation Link",
      };

    case "INTERACTIVE_INVITE":
    case "INTERACTIVE_REMINDER":
      return {
        ...baseVars,
        "4": "Transportation Link (optional)",
      };

    case "IMAGE_INVITE":
      return baseVars;

    case "CONFIRMATION":
      return {
        ...baseVars,
        "3": "RSVP Status",
      };

    case "EVENT_DAY":
      return {
        ...baseVars,
        "3": "Table Name",
        "4": "Venue Address",
        "5": "Navigation URL",
        "6": "Gift Link",
      };

    case "TABLE_ASSIGNMENT":
      return {
        ...baseVars,
        "3": "Table Name",
      };

    case "THANK_YOU":
      return baseVars;

    case "GUEST_COUNT_LIST":
      return baseVars;

    default:
      return baseVars;
  }
}

/**
 * Get default buttons for interactive templates
 * NOTE: NO EMOJIS IN BUTTONS - They cause WhatsApp rejection!
 */
export function getDefaultButtons(
  templateType: WhatsAppTemplateType
): ButtonConfig[] | null {
  if (
    templateType === "INTERACTIVE_INVITE" ||
    templateType === "INTERACTIVE_REMINDER" ||
    templateType === "IMAGE_INVITE"
  ) {
    return [
      {
        id: "yes",
        titleHe: "כן, אני אגיע",
        titleEn: "Yes, I'll come",
      },
      {
        id: "no",
        titleHe: "לא אגיע",
        titleEn: "Can't make it",
      },
      {
        id: "maybe",
        titleHe: "עדיין לא בטוח",
        titleEn: "Not sure yet",
      },
    ];
  }

  return null;
}

/**
 * Validate template body for WhatsApp restrictions
 */
export function validateTemplateBody(body: string): {
  valid: boolean;
  error?: string;
} {
  // Check character limit (1024 chars for body)
  if (body.length > 1024) {
    return {
      valid: false,
      error: `Body exceeds 1024 characters (current: ${body.length})`,
    };
  }

  // Check for valid variable syntax
  const variablePattern = /\{\{(\d+)\}\}/g;
  const matches = body.match(variablePattern);

  if (matches) {
    const variableNumbers = matches.map((match) => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });

    // Check for sequential variables (1, 2, 3, not 1, 3, 5)
    const sorted = [...new Set(variableNumbers)].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        return {
          valid: false,
          error: `Variables must be sequential starting from {{1}}. Found gap at {{${i + 1}}}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate button configuration
 */
export function validateButtons(buttons: ButtonConfig[]): {
  valid: boolean;
  error?: string;
} {
  if (buttons.length < 1 || buttons.length > 3) {
    return {
      valid: false,
      error: "Quick-reply templates must have 1-3 buttons",
    };
  }

  for (const button of buttons) {
    if (button.titleHe.length > 20) {
      return {
        valid: false,
        error: `Button "${button.titleHe}" exceeds 20 characters (Hebrew)`,
      };
    }
    if (button.titleEn.length > 20) {
      return {
        valid: false,
        error: `Button "${button.titleEn}" exceeds 20 characters (English)`,
      };
    }
    if (!button.id || button.id.length === 0) {
      return {
        valid: false,
        error: "Button must have an ID",
      };
    }
  }

  return { valid: true };
}
