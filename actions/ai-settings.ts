"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

// Default AI prompt for invitation generation
const DEFAULT_PROMPT = `You are an expert image editor. I need you to edit THIS EXACT invitation image.

YOUR TASK: Find and replace ONLY the text elements. Keep EVERYTHING else identical.

TEXT REPLACEMENTS:
{{FIELD_REPLACEMENTS}}

CRITICAL RULES:
- Output ONE image that looks EXACTLY like the input, with ONLY the text changed
- Preserve the exact same design, colors, borders, decorations, ornaments, and layout
- Match the EXACT font style, size, weight, and color of each text element
- Hebrew text must render correctly right-to-left (RTL)
- Do NOT generate multiple images or variations
- Do NOT change or interpret the design
- Do NOT add any new elements
- The output should be indistinguishable from the original except for the text content`;

// Settings key for the AI prompt
const AI_PROMPT_SETTING_KEY = "ai_invitation_prompt";

/**
 * Get the current AI prompt for invitation generation
 */
export async function getAIPrompt() {
  try {
    const user = await getCurrentUser();

    // Allow any authenticated user to read the prompt (for generation)
    if (!user) {
      return { prompt: DEFAULT_PROMPT };
    }

    // Try to get from database settings (using a simple key-value approach)
    const setting = await prisma.systemSetting.findUnique({
      where: { key: AI_PROMPT_SETTING_KEY },
    });

    return {
      prompt: setting?.value || DEFAULT_PROMPT,
      isDefault: !setting,
    };
  } catch (error) {
    console.error("Error fetching AI prompt:", error);
    // Return default if table doesn't exist yet
    return { prompt: DEFAULT_PROMPT, isDefault: true };
  }
}

/**
 * Update the AI prompt (admin only)
 */
export async function updateAIPrompt(newPrompt: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check for platform owner role
    const isAdmin = user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER) ||
                    user.role === UserRole.ROLE_PLATFORM_OWNER;

    if (!isAdmin) {
      return { error: "Unauthorized - Admin access required" };
    }

    // Validate prompt
    if (!newPrompt || typeof newPrompt !== "string") {
      return { error: "Invalid prompt" };
    }

    if (!newPrompt.includes("{{FIELD_REPLACEMENTS}}")) {
      return { error: "Prompt must include {{FIELD_REPLACEMENTS}} placeholder" };
    }

    // Upsert the setting
    await prisma.systemSetting.upsert({
      where: { key: AI_PROMPT_SETTING_KEY },
      update: { value: newPrompt, updatedAt: new Date() },
      create: { key: AI_PROMPT_SETTING_KEY, value: newPrompt },
    });

    revalidatePath("/[locale]/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating AI prompt:", error);
    return { error: "Failed to update prompt" };
  }
}

/**
 * Reset AI prompt to default
 */
export async function resetAIPromptToDefault() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const isAdmin = user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER) ||
                    user.role === UserRole.ROLE_PLATFORM_OWNER;

    if (!isAdmin) {
      return { error: "Unauthorized - Admin access required" };
    }

    // Delete the custom setting to use default
    await prisma.systemSetting.delete({
      where: { key: AI_PROMPT_SETTING_KEY },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    revalidatePath("/[locale]/admin/settings");
    return { success: true, prompt: DEFAULT_PROMPT };
  } catch (error) {
    console.error("Error resetting AI prompt:", error);
    return { error: "Failed to reset prompt" };
  }
}

/**
 * Get the default prompt (for display purposes)
 */
export async function getDefaultPrompt() {
  return DEFAULT_PROMPT;
}
