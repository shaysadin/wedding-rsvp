import { InvitationFieldType, TemplateType } from "@prisma/client";
import { htmlToPng } from "./html-to-png";

export interface FieldValue {
  fieldType: InvitationFieldType;
  value: string;
}

export interface TemplateField {
  fieldType: InvitationFieldType;
  cssClassName?: string | null;
  fontSize?: string | null;
  fontFamily?: string | null;
  fontWeight?: string | null;
  textColor?: string | null;
  textAlign?: string | null;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  top?: string | null;
  left?: string | null;
  right?: string | null;
  bottom?: string | null;
  width?: string | null;
  maxWidth?: string | null;
  defaultValue?: string | null;
}

export interface InvitationTemplate {
  id: string;
  templateType: TemplateType;
  htmlContent?: string | null;
  cssContent?: string | null;
  backgroundImageUrl?: string | null; // For PDF-based templates
  width: number;
  height: number;
  fields: TemplateField[];
}

export interface GenerateInvitationOptions {
  template: InvitationTemplate;
  fieldValues: FieldValue[];
}

/**
 * Replace placeholders in template with actual values
 */
function replacePlaceholders(template: string, values: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    // Replace {{key}} with value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  }

  return result;
}

/**
 * Build CSS styles for a field
 */
function buildFieldStyles(field: TemplateField): string {
  const styles: string[] = [];

  if (field.fontSize) styles.push(`font-size: ${field.fontSize}`);
  if (field.fontFamily) styles.push(`font-family: '${field.fontFamily}'`);
  if (field.fontWeight) styles.push(`font-weight: ${field.fontWeight}`);
  if (field.textColor) styles.push(`color: ${field.textColor}`);
  if (field.textAlign) styles.push(`text-align: ${field.textAlign}`);
  if (field.lineHeight) styles.push(`line-height: ${field.lineHeight}`);
  if (field.letterSpacing) styles.push(`letter-spacing: ${field.letterSpacing}`);
  if (field.top) styles.push(`top: ${field.top}`);
  if (field.left) styles.push(`left: ${field.left}`);
  if (field.right) styles.push(`right: ${field.right}`);
  if (field.bottom) styles.push(`bottom: ${field.bottom}`);
  if (field.width) styles.push(`width: ${field.width}`);
  if (field.maxWidth) styles.push(`max-width: ${field.maxWidth}`);

  // Add positioning for fields with position values
  if (field.top || field.left || field.right || field.bottom) {
    styles.push("position: absolute");
  }

  return styles.join("; ");
}

/**
 * Generate HTML for PDF-based templates
 */
function generatePdfBasedHtml(template: InvitationTemplate, values: Record<string, string>): string {
  const fields = template.fields.map((field) => {
    const value = values[field.fieldType] || field.defaultValue || "";
    const styles = buildFieldStyles(field);
    const className = field.cssClassName || `field-${field.fieldType.toLowerCase()}`;

    return `
      <div class="${className}" style="${styles}">
        ${value}
      </div>
    `;
  }).join("\n");

  return `
    <div class="invitation-container" style="
      position: relative;
      width: ${template.width}px;
      height: ${template.height}px;
      background-image: url('${template.backgroundImageUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    ">
      ${fields}
    </div>
  `;
}

/**
 * Generate HTML for HTML-based templates
 */
function generateHtmlBasedHtml(template: InvitationTemplate, values: Record<string, string>): string {
  if (!template.htmlContent) {
    throw new Error("HTML template has no content");
  }

  // Replace all placeholders in HTML
  return replacePlaceholders(template.htmlContent, values);
}

/**
 * Build value map from field values
 */
function buildValueMap(fieldValues: FieldValue[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const field of fieldValues) {
    // Map field type to placeholder name
    // Convert COUPLE_NAMES_ENGLISH -> coupleNamesEnglish
    const placeholderName = field.fieldType
      .split("_")
      .map((word, index) =>
        index === 0 ? word.toLowerCase() : word.charAt(0) + word.slice(1).toLowerCase()
      )
      .join("");

    map[placeholderName] = field.value;

    // Also support exact field type name for flexibility
    map[field.fieldType] = field.value;
  }

  return map;
}

/**
 * Generate invitation PNG from template and field values
 */
export async function generateInvitation(
  options: GenerateInvitationOptions
): Promise<Buffer> {
  try {
    const { template, fieldValues } = options;

    // Build value map
    const values = buildValueMap(fieldValues);

    // Generate HTML based on template type
    let html: string;
    let css = template.cssContent || "";

    if (template.templateType === "PDF") {
      // PDF-based: Use background image with positioned text fields
      html = generatePdfBasedHtml(template, values);
    } else {
      // HTML-based: Replace placeholders in HTML content
      html = generateHtmlBasedHtml(template, values);

      // Also replace placeholders in CSS
      css = replacePlaceholders(css, values);
    }

    // Convert HTML to PNG
    const pngBuffer = await htmlToPng(html, {
      width: template.width,
      height: template.height,
      css,
    });

    return pngBuffer;
  } catch (error) {
    console.error("Error generating invitation:", error);
    throw new Error(
      `Failed to generate invitation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate that all required fields have values
 */
export function validateFieldValues(
  template: InvitationTemplate,
  fieldValues: FieldValue[]
): { valid: boolean; missingFields: InvitationFieldType[] } {
  const requiredFields = template.fields
    .filter((f) => f.defaultValue === null || f.defaultValue === undefined)
    .map((f) => f.fieldType);

  const providedFields = fieldValues.map((f) => f.fieldType);
  const missingFields = requiredFields.filter((f) => !providedFields.includes(f));

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
