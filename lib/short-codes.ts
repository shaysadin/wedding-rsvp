/**
 * Short Code Generator
 * Generates URL-safe short codes for navigation and transportation links
 */

/**
 * Generate a random short code (6 characters, URL-safe)
 * Format: lowercase letters and numbers only (no confusing chars like 0, O, l, 1)
 */
export function generateShortCode(length: number = 6): string {
  // Use only unambiguous characters
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Generate a unique short code by checking against existing codes
 */
export async function generateUniqueShortCode<T>(
  checkExists: (code: string) => Promise<T | null>,
  length: number = 6,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShortCode(length);
    const exists = await checkExists(code);

    if (!exists) {
      return code;
    }
  }

  // If we couldn't find a unique code in maxAttempts, try with longer code
  return generateShortCode(length + 1);
}
