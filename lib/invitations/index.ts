/**
 * Invitation Generation System
 *
 * This module provides utilities for creating custom wedding invitations
 * from PDF templates or HTML templates.
 *
 * Workflow:
 * 1. Platform owner uploads PDF template (complete design with sample text)
 * 2. System converts PDF to PNG and extracts dimensions
 * 3. Owner marks text regions that need to be replaced
 * 4. System erases those regions using smart background matching
 * 5. Wedding owners fill form with their data
 * 6. System overlays text on clean background with matching fonts
 * 7. Generates high-quality PNG for download
 */

// PDF Processing
export { pdfToPng, pdfUrlToPng, getPdfDimensions } from "./pdf-to-png";

// Image Processing
export { eraseTextRegions, smartEraseTextRegions, resizeImage } from "./image-processor";
export type { TextRegion } from "./image-processor";

// HTML to PNG Conversion
export { htmlToPng, htmlWithFontsToPng, closeBrowser } from "./html-to-png";

// Invitation Generation
export { generateInvitation, validateFieldValues } from "./generator";
export type {
  FieldValue,
  TemplateField,
  InvitationTemplate,
  GenerateInvitationOptions
} from "./generator";
