/**
 * Comprehensive Image Generation, Editing & PDF Test Suite
 * Tests both gemini-2.5-flash-image and gemini-3-pro-image-preview models
 *
 * Test Matrix:
 * 1. Image Generation - gemini-2.5-flash-image
 * 2. Image Generation - gemini-3-pro-image-preview
 * 3. Image Editing with gemini-2.5-flash-image (using generated image)
 * 4. Image Editing with gemini-3-pro-image-preview (using generated image)
 * 5. PDF-to-Image Generation - gemini-2.5-flash-image (PDF→Images fallback)
 * 6. PDF-to-Image Generation - gemini-3-pro-image-preview (native PDF support)
 *
 * Run with: pnpm test test/multimodal/image-generation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { NeuroLink } from "../../src/lib/neurolink.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Models to test
const MODELS = {
  FLASH_25: "gemini-2.5-flash-image",
  PRO_3: "gemini-3-pro-image-preview",
};

// Test PDF file path
const PDF_PATH = path.join(
  __dirname,
  "..",
  "..",
  "test-data",
  "sample-prompt.pdf",
);
const hasPdfFixture = fs.existsSync(PDF_PATH);

// Output directory
const OUTPUT_DIR = path.join(__dirname, "..", "..", "test-output");

// Store generated images for editing tests
const generatedImages: Record<string, string | null> = {
  [MODELS.FLASH_25]: null,
  [MODELS.PRO_3]: null,
};

// NeuroLink instance
let neurolink: NeuroLink;

/**
 * Get timestamp for filenames
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Save image buffer to file
 */
function saveImage(base64Data: string, prefix: string): string {
  const buffer = Buffer.from(base64Data, "base64");
  const filename = `${prefix}-${getTimestamp()}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Get image from result (handles both response formats)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getImageFromResult(result: any): string | null {
  if (result?.imageOutput?.base64) {
    return result.imageOutput.base64;
  }
  if (result?.imageContent?.data) {
    return result.imageContent.data;
  }
  return null;
}

/**
 * Check if required environment variables are set
 */
function hasRequiredEnvVars(): boolean {
  const projectId = process.env.GOOGLE_VERTEX_PROJECT;
  const hasCredentials = !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
  return !!projectId && hasCredentials;
}

describe("Image Generation Test Suite", () => {
  beforeAll(async () => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Initialize NeuroLink
    neurolink = new NeuroLink();
  });

  afterAll(async () => {
    if (neurolink) {
      await neurolink.dispose();
    }
  });

  describe("Image Generation", () => {
    it.skipIf(!hasRequiredEnvVars())(
      "should generate an image with gemini-2.5-flash-image",
      async () => {
        const result = await neurolink.generate({
          input: {
            text: "A beautiful sunset over mountains with golden clouds",
          },
          provider: "vertex",
          model: MODELS.FLASH_25,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          generatedImages[MODELS.FLASH_25] = imageData;
          const filepath = saveImage(imageData, "gen-flash-25");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );

    it.skipIf(!hasRequiredEnvVars())(
      "should generate an image with gemini-3-pro-image-preview",
      async () => {
        const result = await neurolink.generate({
          input: {
            text: "A futuristic cityscape with flying cars and neon lights",
          },
          provider: "vertex",
          model: MODELS.PRO_3,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          generatedImages[MODELS.PRO_3] = imageData;
          const filepath = saveImage(imageData, "gen-pro-3");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );
  });

  describe("Image Editing", () => {
    it.skipIf(!hasRequiredEnvVars())(
      "should edit an image with gemini-2.5-flash-image",
      async () => {
        // Use generated image or skip if unavailable
        const imageToEdit = generatedImages[MODELS.FLASH_25];
        if (!imageToEdit) {
          console.log(
            "Skipping: No source image available (generation test must run first)",
          );
          return;
        }

        const result = await neurolink.generate({
          input: {
            text: "Add a rainbow arching across the sky",
            images: [imageToEdit],
          },
          provider: "vertex",
          model: MODELS.FLASH_25,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          const filepath = saveImage(imageData, "edit-flash-25");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );

    it.skipIf(!hasRequiredEnvVars())(
      "should edit an image with gemini-3-pro-image-preview",
      async () => {
        // Use generated image or skip if unavailable
        const imageToEdit = generatedImages[MODELS.PRO_3];
        if (!imageToEdit) {
          console.log(
            "Skipping: No source image available (generation test must run first)",
          );
          return;
        }

        const result = await neurolink.generate({
          input: {
            text: "Transform this into a watercolor painting style",
            images: [imageToEdit],
          },
          provider: "vertex",
          model: MODELS.PRO_3,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          const filepath = saveImage(imageData, "edit-pro-3");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );
  });

  describe("PDF-to-Image Generation", () => {
    it.skipIf(!hasRequiredEnvVars() || !hasPdfFixture)(
      "should generate an image from PDF with gemini-2.5-flash-image (fallback)",
      async () => {
        const pdfBuffer = fs.readFileSync(PDF_PATH);

        const result = await neurolink.generate({
          input: {
            text: "Generate an illustration based on the content of this PDF",
            pdfFiles: [pdfBuffer],
          },
          provider: "vertex",
          model: MODELS.FLASH_25,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          const filepath = saveImage(imageData, "pdf-flash-25");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );

    it.skipIf(!hasRequiredEnvVars() || !hasPdfFixture)(
      "should generate an image from PDF with gemini-3-pro-image-preview (native)",
      async () => {
        const pdfBuffer = fs.readFileSync(PDF_PATH);

        const result = await neurolink.generate({
          input: {
            text: "Create a visual representation based on this PDF content",
            pdfFiles: [pdfBuffer],
          },
          provider: "vertex",
          model: MODELS.PRO_3,
          temperature: 0.8,
          timeout: 180000,
          disableTools: true,
        });

        const imageData = getImageFromResult(result);
        expect(imageData).toBeTruthy();

        if (imageData) {
          const filepath = saveImage(imageData, "pdf-pro-3");
          expect(fs.existsSync(filepath)).toBe(true);
        }
      },
      200000,
    );
  });
});
