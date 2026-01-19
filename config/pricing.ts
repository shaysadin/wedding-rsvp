/**
 * Provider Pricing Configuration
 * All costs in USD for consistency
 *
 * Update these values based on your actual provider contracts
 */

// Twilio Pricing (as of 2025)
export const TWILIO_PRICING = {
  // WhatsApp pricing varies by country and template type
  whatsapp: {
    // Israel rates
    israel: {
      marketing: 0.0165, // Marketing templates (per message)
      utility: 0.0055,   // Utility templates (per message)
      authentication: 0.0045, // Authentication templates (per message)
      service: 0.008,    // Service conversations (per message)
    },
    // US rates (fallback)
    us: {
      marketing: 0.0250,
      utility: 0.0100,
      authentication: 0.0050,
      service: 0.0150,
    },
    // Default rate (average utility rate)
    default: 0.0055,
  },

  // SMS pricing
  sms: {
    israel: 0.0741,  // ~₪0.26 per SMS to Israeli numbers
    us: 0.0079,      // US domestic SMS
    default: 0.0741, // Default to Israel (primary market)
  },
} as const;

// Upsend Pricing (Israeli SMS Provider)
export const UPSEND_PRICING = {
  sms: {
    israel: 0.0200,  // ~₪0.07 per SMS (~70% cheaper than Twilio)
    default: 0.0200,
  },
} as const;

// VAPI Pricing (Voice AI)
export const VAPI_PRICING = {
  call: {
    perMinute: 0.10,     // Per minute of call
    connection: 0.02,    // Per call connection attempt
    default: 0.10,       // Default per-minute rate
  },
} as const;

// Cost calculation helpers
export function calculateWhatsAppCost(messageCount: number, country: 'israel' | 'us' = 'israel'): number {
  // Use utility rate as default (most common for wedding invites/reminders)
  const rate = TWILIO_PRICING.whatsapp[country]?.utility || TWILIO_PRICING.whatsapp.default;
  return messageCount * rate;
}

export function calculateSmsCost(
  messageCount: number,
  provider: 'twilio' | 'upsend' = 'twilio',
  country: 'israel' | 'us' = 'israel'
): number {
  if (provider === 'upsend') {
    return messageCount * UPSEND_PRICING.sms.israel;
  }
  const rate = TWILIO_PRICING.sms[country] || TWILIO_PRICING.sms.default;
  return messageCount * rate;
}

export function calculateVoiceCallCost(durationMinutes: number): number {
  return (durationMinutes * VAPI_PRICING.call.perMinute) + VAPI_PRICING.call.connection;
}

// Pricing summary for display
export const PRICING_INFO = {
  whatsapp: {
    provider: 'Twilio',
    costPer: 'message',
    israelRate: TWILIO_PRICING.whatsapp.israel.utility,
    currency: 'USD',
    notes: 'Utility template rate (most common)',
  },
  sms: {
    twilio: {
      provider: 'Twilio',
      costPer: 'message',
      israelRate: TWILIO_PRICING.sms.israel,
      currency: 'USD',
      notes: 'Premium rate, reliable delivery',
    },
    upsend: {
      provider: 'Upsend',
      costPer: 'message',
      israelRate: UPSEND_PRICING.sms.israel,
      currency: 'USD',
      notes: '~70% cheaper than Twilio for Israeli numbers',
    },
  },
  voice: {
    provider: 'VAPI',
    costPer: 'minute',
    rate: VAPI_PRICING.call.perMinute,
    connectionFee: VAPI_PRICING.call.connection,
    currency: 'USD',
    notes: 'Per-minute rate + connection fee',
  },
} as const;
