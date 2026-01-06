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
