import { GoogleGenAI } from "@google/genai";

import { getAIPrompt } from "@/actions/ai-settings";

// Initialize Gemini client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Model IDs - Updated to latest Gemini models
export const GEMINI_MODELS = {
  // Gemini 2.5 Flash Image (Nano Banana) - Best for image editing/generation
  NANO_BANANA: "gemini-2.5-flash-image",
  // Gemini 3 Pro Image Preview (Nano Banana Pro) - Higher quality
  NANO_BANANA_PRO: "gemini-3-pro-image-preview",
} as const;

export interface InvitationField {
  fieldType: string;
  label: string;
  labelHe: string;
  originalValue: string; // The original text in the template
  newValue: string; // The new text to replace it with
}

export interface GenerateInvitationOptions {
  templateImageBase64: string;
  templateImageMimeType: string;
  fields: InvitationField[];
  imageSize?: "1K" | "2K" | "4K";
  aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
  useProModel?: boolean; // Use Nano Banana Pro for higher quality
}

export interface GenerateInvitationResult {
  success: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  error?: string;
}

/**
 * Generate a wedding invitation by editing text in a template image
 */
export async function generateInvitationWithAI(
  options: GenerateInvitationOptions
): Promise<GenerateInvitationResult> {
  const {
    templateImageBase64,
    templateImageMimeType,
    fields,
    imageSize = "2K",
    aspectRatio,
    useProModel = false,
  } = options;

  try {
    const client = getGeminiClient();

    // Build the text replacements in a clear format
    const fieldReplacements = fields
      .map((field) => `"${field.originalValue}" → "${field.newValue}"`)
      .join("\n");

    // Fetch the AI prompt from database (or use default)
    const { prompt: basePrompt } = await getAIPrompt();

    // Replace the placeholder with actual field replacements
    const prompt = basePrompt.replace("{{FIELD_REPLACEMENTS}}", fieldReplacements);

    // Select model based on quality preference
    const modelId = useProModel ? GEMINI_MODELS.NANO_BANANA_PRO : GEMINI_MODELS.NANO_BANANA;

    console.log(`[generateInvitationWithAI] Using model: ${modelId}, imageSize: ${imageSize}`);

    const response = await client.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: templateImageMimeType,
                data: templateImageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          imageSize: imageSize,
          ...(aspectRatio && { aspectRatio }),
        },
      },
    });

    // Extract the generated image from the response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log("[generateInvitationWithAI] Successfully generated image");
          return {
            success: true,
            imageBase64: part.inlineData.data,
            imageMimeType: part.inlineData.mimeType || "image/png",
          };
        }
      }

      // Log any text response for debugging
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log("[generateInvitationWithAI] Model response text:", part.text);
        }
      }
    }

    return {
      success: false,
      error: "No image was generated in the response",
    };
  } catch (error) {
    console.error("Error generating invitation with AI:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Test the Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const client = getGeminiClient();
    // Simple test to verify API key works
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say hello in one word",
    });
    return !!response.candidates?.[0]?.content;
  } catch (error) {
    console.error("Gemini connection test failed:", error);
    return false;
  }
}

/**
 * Scan invitation template image and suggest fields
 */
export interface SuggestedField {
  fieldType: string;
  label: string;
  labelHe: string;
  originalValue: string;
  confidence: "high" | "medium" | "low";
}

export interface ScanInvitationResult {
  success: boolean;
  fields?: SuggestedField[];
  error?: string;
}

const FIELD_TYPE_DESCRIPTIONS = `
Available field types (use these exact values):
- GUEST_NAME: Guest's name (e.g., "שם האורח", "Guest Name")
- COUPLE_NAMES: Both bride and groom names together
- COUPLE_NAMES_ENGLISH: Couple names in English (e.g., "SHAY & SAPIR")
- COUPLE_NAMES_HEBREW: Couple names in Hebrew (e.g., "שי וספיר")
- EVENT_DATE: Event date in numbers (e.g., "28.01.26", "January 28, 2026")
- EVENT_DATE_HEBREW: Hebrew date (e.g., "י' שבט ה'תשפ"ו")
- DAY_OF_WEEK: Day name (e.g., "יום רביעי", "Wednesday")
- EVENT_TIME: General event time
- RECEPTION_TIME: Reception time (e.g., "קבלת פנים 19:30")
- CEREMONY_TIME: Ceremony time (e.g., "חופה וקידושין 20:30")
- VENUE_NAME: Venue/hall name (e.g., "אולמי מאגיה")
- VENUE_ADDRESS: Full address
- STREET_ADDRESS: Street only
- CITY: City name
- BRIDE_PARENTS: Bride's parents names
- GROOM_PARENTS: Groom's parents names
- BRIDE_FAMILY: Bride's family name (e.g., "משפחת שוויץ")
- GROOM_FAMILY: Groom's family name
- EVENT_TYPE: Type of event (e.g., "חתונה", "טקס החינה")
- INVITATION_TEXT: Main invitation text/message
- BLESSING_QUOTE: Quote or blessing text
- CUSTOM: Any other custom text field
`;

export async function scanInvitationTemplate(
  imageBase64: string,
  imageMimeType: string
): Promise<ScanInvitationResult> {
  try {
    const client = getGeminiClient();

    const prompt = `You are an expert at analyzing wedding and event invitation images.
Analyze this invitation template image and identify ALL text elements that could be customizable fields.

${FIELD_TYPE_DESCRIPTIONS}

For each text element you find in the image, provide:
1. The exact text as it appears in the image (originalValue) - THIS IS CRITICAL, must be exact
2. The most appropriate fieldType from the list above
3. A label in English
4. A label in Hebrew (labelHe)
5. Confidence level: "high" if you're very sure, "medium" if somewhat sure, "low" if guessing

IMPORTANT RULES:
- Extract the EXACT text as it appears in the image for originalValue
- Include ALL visible text that could be personalized
- For Hebrew text, preserve the exact characters
- For dates, times, names - use the specific field types
- For decorative or fixed text that shouldn't change, skip it

Respond ONLY with a valid JSON array of objects, no markdown, no explanation:
[
  {
    "fieldType": "COUPLE_NAMES_HEBREW",
    "label": "Couple Names",
    "labelHe": "שמות הזוג",
    "originalValue": "שי וספיר",
    "confidence": "high"
  }
]

If no text fields are found, return an empty array: []`;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: imageMimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    // Extract the text response
    const textResponse = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.text
    )?.text;

    if (!textResponse) {
      return {
        success: false,
        error: "No response from AI model",
      };
    }

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = textResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      const fields = JSON.parse(cleanedResponse) as SuggestedField[];

      // Validate and filter fields
      const validFields = fields.filter(
        (field) =>
          field.fieldType &&
          field.originalValue &&
          field.originalValue.trim() !== ""
      );

      console.log(`[scanInvitationTemplate] Found ${validFields.length} fields`);

      return {
        success: true,
        fields: validFields,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", textResponse);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }
  } catch (error) {
    console.error("Error scanning invitation template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
