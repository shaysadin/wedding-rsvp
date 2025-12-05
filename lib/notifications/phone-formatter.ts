/**
 * Phone Number Formatter for E.164 Format
 *
 * Twilio requires phone numbers in E.164 format: +[country code][number]
 * Examples:
 * - US: +14155551234
 * - Israel: +972584003578
 * - UK: +447911123456
 *
 * This module handles various input formats and converts them to E.164:
 * - With country code: "+972 58 400 3578" -> "+972584003578"
 * - Local Israeli format: "058-400-3578" -> "+972584003578"
 * - With leading zero: "0584003578" -> "+972584003578"
 * - Already E.164: "+972584003578" -> "+972584003578"
 */

// Country code mappings for common countries
const COUNTRY_CODES: Record<string, { code: string; localPrefix: string; localLength: number }> = {
  IL: { code: "972", localPrefix: "0", localLength: 10 }, // Israel: 05X-XXX-XXXX
  US: { code: "1", localPrefix: "1", localLength: 10 },   // US: (XXX) XXX-XXXX
  UK: { code: "44", localPrefix: "0", localLength: 11 },  // UK: 07XXX XXXXXX
};

// Default country for the app (Israel)
const DEFAULT_COUNTRY = "IL";

/**
 * Clean a phone number by removing all non-numeric characters except leading +
 */
function cleanPhoneNumber(phone: string): string {
  // Preserve the + at the start if present
  const hasPlus = phone.trim().startsWith("+");
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  return hasPlus ? `+${cleaned}` : cleaned;
}

/**
 * Check if a phone number is already in E.164 format
 */
function isE164(phone: string): boolean {
  // E.164: starts with +, followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Format a phone number to E.164 format
 *
 * @param phone - The phone number in any format
 * @param countryCode - The country code to use for local numbers (default: IL for Israel)
 * @returns The phone number in E.164 format
 */
export function formatToE164(phone: string, countryCode: string = DEFAULT_COUNTRY): string {
  if (!phone) {
    return "";
  }

  // Clean the phone number
  let cleaned = cleanPhoneNumber(phone);

  // If already in E.164 format, return as is
  if (isE164(cleaned)) {
    return cleaned;
  }

  // Get country config
  const country = COUNTRY_CODES[countryCode] || COUNTRY_CODES[DEFAULT_COUNTRY];

  // If starts with + but not valid E.164, try to fix it
  if (cleaned.startsWith("+")) {
    // Remove + and re-add it properly
    cleaned = cleaned.substring(1);
  }

  // Check if starts with country code already (without +)
  if (cleaned.startsWith(country.code)) {
    return `+${cleaned}`;
  }

  // Check if starts with local prefix (e.g., 0 for Israel)
  if (cleaned.startsWith(country.localPrefix) && country.localPrefix === "0") {
    // Remove leading 0 and add country code
    cleaned = cleaned.substring(1);
    return `+${country.code}${cleaned}`;
  }

  // For Israel specifically, handle various formats
  if (countryCode === "IL") {
    // If it's a 9-digit number (without leading 0), add country code
    if (cleaned.length === 9 && cleaned.startsWith("5")) {
      return `+972${cleaned}`;
    }
    // If it's a 10-digit number starting with 05, remove 0 and add country code
    if (cleaned.length === 10 && cleaned.startsWith("05")) {
      return `+972${cleaned.substring(1)}`;
    }
  }

  // For US numbers
  if (countryCode === "US") {
    // If it's a 10-digit number, add country code
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    // If it's an 11-digit number starting with 1, just add +
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
  }

  // If we can't determine the format, try to make a best guess
  // Assume it's a local number for the default country
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    // Try to add country code
    const result = `+${country.code}${cleaned}`;
    if (isE164(result)) {
      return result;
    }
  }

  // Last resort: just add + if the number looks reasonable
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  // Return the cleaned number with + (might still be invalid, but Twilio will give a better error)
  return `+${cleaned}`;
}

/**
 * Validate that a phone number is in E.164 format
 */
export function isValidE164(phone: string): boolean {
  return isE164(phone);
}

/**
 * Get the country code from a phone number in E.164 format
 */
export function getCountryFromE164(phone: string): string | null {
  if (!isE164(phone)) {
    return null;
  }

  const number = phone.substring(1); // Remove +

  // Check against known country codes (longest match first)
  if (number.startsWith("972")) return "IL";
  if (number.startsWith("44")) return "UK";
  if (number.startsWith("1")) return "US";

  return null;
}

/**
 * Format a phone number for display (with spaces)
 */
export function formatForDisplay(phone: string): string {
  const e164 = formatToE164(phone);

  if (!e164) return phone;

  // Format based on country
  const country = getCountryFromE164(e164);

  if (country === "IL") {
    // +972 58 400 3578
    const match = e164.match(/^\+972(\d{2})(\d{3})(\d{4})$/);
    if (match) {
      return `+972 ${match[1]} ${match[2]} ${match[3]}`;
    }
  }

  if (country === "US") {
    // +1 (415) 555-1234
    const match = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
  }

  // Default: just return E.164
  return e164;
}
