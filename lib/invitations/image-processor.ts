import sharp from "sharp";

export interface TextRegion {
  top: number; // pixels from top
  left: number; // pixels from left
  width: number; // width in pixels
  height: number; // height in pixels
}

/**
 * Erase text regions from an image by making them transparent
 * This creates a "clean background" for text overlay
 */
export async function eraseTextRegions(
  imageBuffer: Buffer,
  regions: TextRegion[]
): Promise<Buffer> {
  try {
    if (regions.length === 0) {
      // No regions to erase, return original
      return imageBuffer;
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 800, height = 1200 } = metadata;

    // Create SVG with transparent rectangles for each region
    const rectangles = regions
      .map(
        (region) =>
          `<rect x="${region.left}" y="${region.top}" width="${region.width}" height="${region.height}" fill="white" opacity="1"/>`
      )
      .join("\n");

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${rectangles}
      </svg>
    `;

    const svgBuffer = Buffer.from(svg);

    // Composite the white rectangles over the image
    const result = await sharp(imageBuffer)
      .composite([
        {
          input: svgBuffer,
          blend: "over", // Overlay white boxes
        },
      ])
      .png() // Ensure PNG output with transparency support
      .toBuffer();

    return result;
  } catch (error) {
    console.error("Error erasing text regions:", error);
    throw new Error(
      `Failed to erase text regions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Intelligently erase text regions by sampling background color
 * For better results on patterned backgrounds
 */
export async function smartEraseTextRegions(
  imageBuffer: Buffer,
  regions: TextRegion[]
): Promise<Buffer> {
  try {
    if (regions.length === 0) {
      return imageBuffer;
    }

    let processedImage = sharp(imageBuffer);

    // For each region, sample the background color around it and fill with that color
    for (const region of regions) {
      // Sample a pixel just outside the region to get background color
      const sampleX = Math.max(0, region.left - 5);
      const sampleY = Math.max(0, region.top - 5);

      try {
        // Extract a small region to sample color
        const { data, info } = await sharp(imageBuffer)
          .extract({
            left: sampleX,
            top: sampleY,
            width: Math.min(10, info.width - sampleX),
            height: Math.min(10, info.height - sampleY),
          })
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Get average color (simple approach)
        let r = 0,
          g = 0,
          b = 0;
        const pixelCount = data.length / info.channels;

        for (let i = 0; i < data.length; i += info.channels) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }

        r = Math.round(r / pixelCount);
        g = Math.round(g / pixelCount);
        b = Math.round(b / pixelCount);

        const fillColor = `rgb(${r},${g},${b})`;

        // Create SVG rectangle with sampled color
        const svg = `
          <svg width="${region.width}" height="${region.height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${region.width}" height="${region.height}" fill="${fillColor}"/>
          </svg>
        `;

        // Composite the rectangle
        processedImage = processedImage.composite([
          {
            input: Buffer.from(svg),
            top: region.top,
            left: region.left,
            blend: "over",
          },
        ]);
      } catch (err) {
        console.warn(`Failed to smart erase region at (${region.left}, ${region.top}), using white:`, err);
        // Fallback to white
        const svg = `
          <svg width="${region.width}" height="${region.height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${region.width}" height="${region.height}" fill="white"/>
          </svg>
        `;

        processedImage = processedImage.composite([
          {
            input: Buffer.from(svg),
            top: region.top,
            left: region.left,
            blend: "over",
          },
        ]);
      }
    }

    const result = await processedImage.png().toBuffer();
    return result;
  } catch (error) {
    console.error("Error smart erasing text regions:", error);
    throw new Error(
      `Failed to smart erase text regions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Resize image while maintaining aspect ratio
 */
export async function resizeImage(
  imageBuffer: Buffer,
  options: {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  }
): Promise<Buffer> {
  try {
    const result = await sharp(imageBuffer)
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit || "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error("Error resizing image:", error);
    throw new Error(`Failed to resize image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
