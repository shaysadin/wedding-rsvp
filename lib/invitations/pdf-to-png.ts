import { PDFDocument } from "pdf-lib";
import { createCanvas, Image } from "canvas";
import sharp from "sharp";

/**
 * Convert PDF buffer to PNG buffer
 * Uses pdf-lib to extract page and canvas to render
 */
export async function pdfToPng(
  pdfBuffer: Buffer,
  options: {
    pageIndex?: number; // Which page to convert (default: 0)
    scale?: number; // Resolution scale (default: 2 for high quality)
  } = {}
): Promise<Buffer> {
  const { pageIndex = 0, scale = 2 } = options;

  try {
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
      throw new Error("PDF has no pages");
    }

    if (pageIndex >= pages.length) {
      throw new Error(`Page index ${pageIndex} out of range (PDF has ${pages.length} pages)`);
    }

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // Create canvas with scaled dimensions for higher quality
    const canvas = createCanvas(width * scale, height * scale);
    const context = canvas.getContext("2d");

    // Scale context
    context.scale(scale, scale);

    // Set white background
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    // For now, we'll use a simpler approach:
    // Save the PDF page as an embedded image and render it
    // This is a workaround since canvas doesn't natively render PDFs

    // Get PDF as data URL by re-saving with just this page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
    singlePagePdf.addPage(copiedPage);
    const pdfBytes = await singlePagePdf.save();

    // Convert PDF bytes to PNG using Sharp
    // Sharp can handle PDF conversion directly
    const pngBuffer = await sharp(Buffer.from(pdfBytes), {
      density: 150 * scale, // DPI for PDF rendering
    })
      .png()
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    console.error("Error converting PDF to PNG:", error);
    throw new Error(`Failed to convert PDF to PNG: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Convert PDF file URL to PNG buffer
 */
export async function pdfUrlToPng(
  pdfUrl: string,
  options?: {
    pageIndex?: number;
    scale?: number;
  }
): Promise<Buffer> {
  try {
    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return pdfToPng(buffer, options);
  } catch (error) {
    console.error("Error converting PDF URL to PNG:", error);
    throw new Error(`Failed to convert PDF URL to PNG: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get PDF dimensions without full conversion
 */
export async function getPdfDimensions(pdfBuffer: Buffer, pageIndex: number = 0): Promise<{ width: number; height: number }> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    if (pageIndex >= pages.length) {
      throw new Error(`Page index out of range`);
    }

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    return { width, height };
  } catch (error) {
    console.error("Error getting PDF dimensions:", error);
    throw new Error(`Failed to get PDF dimensions: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
