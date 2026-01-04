import puppeteer, { Browser } from "puppeteer";

// Singleton browser instance for better performance
let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance
 */
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
 * Convert HTML string to PNG buffer
 */
export async function htmlToPng(
  html: string,
  options: {
    width: number;
    height: number;
    css?: string; // Additional CSS to inject
  }
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport to exact dimensions
    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: 2, // Higher quality (2x resolution)
    });

    // Build complete HTML document
    const completeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: ${options.width}px;
              height: ${options.height}px;
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            ${options.css || ""}
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Set content and wait for any images/fonts to load
    await page.setContent(completeHtml, {
      waitUntil: ["load", "networkidle0"],
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: options.width,
        height: options.height,
      },
    });

    return Buffer.from(screenshot);
  } catch (error) {
    console.error("Error converting HTML to PNG:", error);
    throw new Error(`Failed to convert HTML to PNG: ${error instanceof Error ? error.message : "Unknown error"}`);
  } finally {
    await page.close();
  }
}

/**
 * Convert HTML with custom fonts to PNG
 * Fonts should be base64 encoded or hosted URLs
 */
export async function htmlWithFontsToPng(
  html: string,
  css: string,
  fonts: { family: string; url: string; weight?: string }[],
  dimensions: { width: number; height: number }
): Promise<Buffer> {
  // Build font-face declarations
  const fontFaces = fonts
    .map(
      (font) => `
      @font-face {
        font-family: '${font.family}';
        src: url('${font.url}');
        font-weight: ${font.weight || "normal"};
        font-display: block;
      }
    `
    )
    .join("\n");

  const completeCss = `${fontFaces}\n${css}`;

  return htmlToPng(html, {
    width: dimensions.width,
    height: dimensions.height,
    css: completeCss,
  });
}

/**
 * Cleanup browser instance (call on server shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
