/**
 * RTL (Right-to-Left) text utilities for Hebrew support in PDFs
 */

// Hebrew character range
const HEBREW_RANGE = /[\u0590-\u05FF]/;

// Arabic character range (for potential future support)
const ARABIC_RANGE = /[\u0600-\u06FF]/;

/**
 * Check if text contains RTL characters (Hebrew or Arabic)
 */
export function containsRTL(text: string): boolean {
  return HEBREW_RANGE.test(text) || ARABIC_RANGE.test(text);
}

/**
 * Check if text is primarily Hebrew
 */
export function isHebrew(text: string): boolean {
  return HEBREW_RANGE.test(text);
}

/**
 * Reverse text for RTL rendering
 * PDF-lib doesn't natively support RTL, so we need to reverse the character order
 */
export function reverseForRTL(text: string): string {
  if (!containsRTL(text)) {
    return text;
  }

  // For mixed content (Hebrew + numbers/English), we need smart handling
  return reverseMixedContent(text);
}

/**
 * Handle mixed RTL/LTR content
 * Reverses RTL runs while keeping LTR runs in order
 */
function reverseMixedContent(text: string): string {
  // Split into segments: Hebrew runs vs Latin/Number runs
  const segments: Array<{ text: string; isRTL: boolean }> = [];
  let currentSegment = "";
  let currentIsRTL: boolean | null = null;

  for (const char of text) {
    const charIsRTL = HEBREW_RANGE.test(char);
    const charIsNeutral = /[\s\d.,!?'"()-]/.test(char);

    // If neutral, assign to current segment direction
    const effectiveIsRTL = charIsNeutral ? currentIsRTL : charIsRTL;

    if (currentIsRTL === null) {
      currentIsRTL = effectiveIsRTL ?? charIsRTL;
    }

    if (effectiveIsRTL === currentIsRTL || charIsNeutral) {
      currentSegment += char;
    } else {
      if (currentSegment) {
        segments.push({ text: currentSegment, isRTL: currentIsRTL ?? false });
      }
      currentSegment = char;
      currentIsRTL = charIsRTL;
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    segments.push({ text: currentSegment, isRTL: currentIsRTL ?? false });
  }

  // If the primary direction is RTL, reverse the segment order
  const primaryIsRTL = segments.length > 0 && segments[0].isRTL;

  if (primaryIsRTL) {
    // Reverse segment order for RTL primary direction
    segments.reverse();
  }

  // Process each segment
  return segments
    .map((seg) => {
      if (seg.isRTL) {
        // Reverse RTL text characters
        return [...seg.text].reverse().join("");
      }
      return seg.text;
    })
    .join("");
}

/**
 * Calculate text width considering RTL
 */
export function getTextWidth(
  text: string,
  font: any,
  fontSize: number
): number {
  const processedText = reverseForRTL(text);
  return font.widthOfTextAtSize(processedText, fontSize);
}

/**
 * Calculate X position for aligned text
 */
export function calculateAlignedX(
  text: string,
  font: any,
  fontSize: number,
  x: number,
  maxWidth: number | undefined,
  textAlign: "left" | "center" | "right"
): number {
  const textWidth = getTextWidth(text, font, fontSize);
  const containerWidth = maxWidth || textWidth;

  switch (textAlign) {
    case "center":
      return x + (containerWidth - textWidth) / 2;
    case "right":
      return x + containerWidth - textWidth;
    case "left":
    default:
      return x;
  }
}

/**
 * Format Hebrew date
 */
export function formatHebrewDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatter.format(date);
}

/**
 * Format Hebrew time
 */
export function formatHebrewTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Hebrew month names
 */
export const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/**
 * Hebrew day names
 */
export const HEBREW_DAYS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];
