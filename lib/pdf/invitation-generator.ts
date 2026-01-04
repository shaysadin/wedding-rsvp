import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { InvitationFieldType } from "@prisma/client";
import {
  FieldPosition,
  FieldValue,
  GenerationOptions,
  GenerationResult,
  AVAILABLE_FONTS,
} from "./types";
import { reverseForRTL, containsRTL, calculateAlignedX } from "./rtl-utils";

// Font cache to avoid reloading
const fontCache: Map<string, ArrayBuffer> = new Map();

/**
 * Load a font file from URL or cache
 */
async function loadFont(fontPath: string): Promise<ArrayBuffer> {
  // Check cache first
  if (fontCache.has(fontPath)) {
    return fontCache.get(fontPath)!;
  }

  // Construct full URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fontUrl = fontPath.startsWith("http") ? fontPath : `${baseUrl}${fontPath}`;

  try {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.statusText}`);
    }
    const fontBytes = await response.arrayBuffer();
    fontCache.set(fontPath, fontBytes);
    return fontBytes;
  } catch (error) {
    console.error(`Error loading font from ${fontUrl}:`, error);
    throw error;
  }
}

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * Get value for a field type from the values array
 */
function getFieldValue(
  values: FieldValue[],
  fieldType: InvitationFieldType,
  defaultValue?: string | null
): string {
  const field = values.find((v) => v.fieldType === fieldType);
  return field?.value || defaultValue || "";
}

/**
 * Generate a PDF invitation from a template
 */
export async function generateInvitation(
  options: GenerationOptions
): Promise<GenerationResult> {
  try {
    // Load the template PDF
    const templateResponse = await fetch(options.templatePdfUrl);
    if (!templateResponse.ok) {
      throw new Error("Failed to load template PDF");
    }
    const templateBytes = await templateResponse.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Register fontkit for custom font embedding
    pdfDoc.registerFontkit(fontkit);

    // Get the first page
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error("Template PDF has no pages");
    }
    const page = pages[0];
    const { height } = page.getSize();

    // Load and embed fonts
    const embeddedFonts: Map<string, any> = new Map();

    for (const field of options.fields) {
      const fontConfig = AVAILABLE_FONTS[field.fontFamily];
      if (!fontConfig) continue;

      const fontKey = `${field.fontFamily}-${field.fontWeight}`;
      if (embeddedFonts.has(fontKey)) continue;

      try {
        const fontPath =
          field.fontWeight === "bold" && fontConfig.bold
            ? fontConfig.bold
            : fontConfig.regular;

        const fontBytes = await loadFont(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);
        embeddedFonts.set(fontKey, font);
      } catch (error) {
        console.warn(`Failed to load font ${fontKey}, using fallback`);
        // Fallback to Helvetica
        const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        embeddedFonts.set(fontKey, fallbackFont);
      }
    }

    // Draw text for each field
    for (const field of options.fields) {
      const value = getFieldValue(options.values, field.fieldType, field.defaultValue);
      if (!value) continue;

      const fontKey = `${field.fontFamily}-${field.fontWeight}`;
      const font = embeddedFonts.get(fontKey);
      if (!font) continue;

      const { r, g, b } = hexToRgb(field.textColor);

      // Process text for RTL if needed
      const textToRender = containsRTL(value) ? reverseForRTL(value) : value;

      // Calculate position (PDF coordinates are from bottom-left)
      const y = height - field.positionY - field.fontSize;

      // Calculate aligned X position
      const x = calculateAlignedX(
        value,
        font,
        field.fontSize,
        field.positionX,
        field.maxWidth ?? undefined,
        field.textAlign as "left" | "center" | "right"
      );

      // Draw the text
      page.drawText(textToRender, {
        x,
        y,
        size: field.fontSize,
        font,
        color: rgb(r, g, b),
      });
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    return {
      success: true,
      pdfBytes: new Uint8Array(pdfBytes),
    };
  } catch (error) {
    console.error("Error generating invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate invitation",
    };
  }
}

/**
 * Generate invitation with personalized guest name
 */
export async function generatePersonalizedInvitation(
  options: GenerationOptions,
  guestName: string
): Promise<GenerationResult> {
  // Add guest name to values if not present
  const values = [...options.values];
  const guestNameField = values.find((v) => v.fieldType === "GUEST_NAME");

  if (!guestNameField) {
    values.push({
      fieldType: "GUEST_NAME",
      value: guestName,
    });
  } else {
    guestNameField.value = guestName;
  }

  return generateInvitation({
    ...options,
    values,
  });
}

/**
 * Preview invitation with sample data
 */
export async function previewInvitation(
  templatePdfUrl: string,
  fields: FieldPosition[],
  locale: "en" | "he" = "he"
): Promise<GenerationResult> {
  const sampleValues: FieldValue[] = [
    {
      fieldType: "COUPLE_NAMES",
      value: locale === "he" ? "יוסי ומיכל" : "John & Jane",
    },
    {
      fieldType: "GUEST_NAME",
      value: locale === "he" ? "ישראל ישראלי" : "Sample Guest",
    },
    {
      fieldType: "EVENT_DATE",
      value: locale === "he" ? "15 במרץ 2025" : "March 15, 2025",
    },
    {
      fieldType: "EVENT_TIME",
      value: locale === "he" ? "19:00" : "7:00 PM",
    },
    {
      fieldType: "VENUE_NAME",
      value: locale === "he" ? "אולמי הגן, רחוב הפרחים 1, תל אביב" : "The Garden Hall, 123 Main St",
    },
    {
      fieldType: "CUSTOM",
      value: locale === "he" ? "טקסט מותאם אישית" : "Custom Text",
    },
  ];

  return generateInvitation({
    templatePdfUrl,
    fields,
    values: sampleValues,
    locale,
  });
}
