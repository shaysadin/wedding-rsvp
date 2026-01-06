import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import puppeteer, { Browser } from "puppeteer";

import { requirePlatformOwner } from "@/lib/session";
import { uploadToR2, getPublicR2Url } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for processing
export const dynamic = "force-dynamic";

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Singleton browser instance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

/**
 * Convert PDF to PNG using Puppeteer + PDF.js
 */
async function pdfToPng(pdfBuffer: Buffer, scale: number = 2): Promise<Buffer> {
  // Get PDF dimensions
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("PDF has no pages");
  }

  const page = pages[0];
  const { width, height } = page.getSize();

  // Convert PDF buffer to base64
  const base64Pdf = pdfBuffer.toString("base64");

  // Use Puppeteer to render the PDF
  const browser = await getBrowser();
  const browserPage = await browser.newPage();

  try {
    const viewportWidth = Math.round(width * scale);
    const viewportHeight = Math.round(height * scale);

    await browserPage.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
    });

    // Create HTML page with PDF.js
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${viewportWidth}px;
              height: ${viewportHeight}px;
              overflow: hidden;
              background: white;
            }
            canvas { display: block; }
          </style>
        </head>
        <body>
          <canvas id="pdf-canvas"></canvas>
          <script type="module">
            const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

            try {
              const pdfData = atob('${base64Pdf}');
              const pdfArray = new Uint8Array(pdfData.length);
              for (let i = 0; i < pdfData.length; i++) {
                pdfArray[i] = pdfData.charCodeAt(i);
              }

              const loadingTask = pdfjsLib.getDocument({ data: pdfArray });
              const pdf = await loadingTask.promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: ${scale} });

              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;

              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              window.pdfRendered = true;
            } catch (error) {
              console.error('PDF rendering error:', error);
              window.pdfError = error.message;
            }
          </script>
        </body>
      </html>
    `;

    await browserPage.setContent(html, {
      waitUntil: ["load", "networkidle0"],
      timeout: 60000,
    });

    // Wait for PDF.js to finish rendering
    await browserPage.waitForFunction(
      () =>
        (window as unknown as { pdfRendered?: boolean; pdfError?: string }).pdfRendered === true ||
        (window as unknown as { pdfRendered?: boolean; pdfError?: string }).pdfError !== undefined,
      { timeout: 60000 }
    );

    // Check for errors
    const error = await browserPage.evaluate(
      () => (window as unknown as { pdfError?: string }).pdfError
    );
    if (error) {
      throw new Error(`PDF.js rendering error: ${error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const screenshot = await browserPage.screenshot({
      type: "png",
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: viewportHeight,
      },
    });

    return Buffer.from(screenshot);
  } finally {
    await browserPage.close();
  }
}

export async function POST(request: NextRequest) {
  console.log("[upload-template] Request received");

  try {
    // Check authentication
    const user = await requirePlatformOwner();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();

    let imageBuffer: Buffer;
    let imageUrl: string;
    let pdfUrl: string | undefined;

    // Check if it's a PDF or an image
    if (file.type === "application/pdf") {
      console.log("[upload-template] Processing PDF...");

      // Convert PDF to PNG
      imageBuffer = await pdfToPng(buffer, 2);

      // Upload both PDF and PNG
      const pdfKey = `invitation-templates/original-${timestamp}.pdf`;
      await uploadToR2(pdfKey, buffer, "application/pdf");
      pdfUrl = await getPublicR2Url(pdfKey);

      const pngKey = `invitation-templates/image-${timestamp}.png`;
      await uploadToR2(pngKey, imageBuffer, "image/png");
      imageUrl = await getPublicR2Url(pngKey);
    } else if (file.type.startsWith("image/")) {
      console.log("[upload-template] Processing image...");

      imageBuffer = buffer;

      const ext = file.type.split("/")[1] || "png";
      const imageKey = `invitation-templates/image-${timestamp}.${ext}`;
      await uploadToR2(imageKey, imageBuffer, file.type);
      imageUrl = await getPublicR2Url(imageKey);
    } else {
      return NextResponse.json(
        { error: "Invalid file type. Must be PDF or image (PNG, JPG)" },
        { status: 400 }
      );
    }

    console.log("[upload-template] Upload complete:", { imageUrl, pdfUrl });

    return NextResponse.json({
      success: true,
      imageUrl,
      pdfUrl,
      thumbnailUrl: imageUrl, // Use same image as thumbnail for now
    });
  } catch (error) {
    console.error("[upload-template] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload template" },
      { status: 500 }
    );
  }
}
