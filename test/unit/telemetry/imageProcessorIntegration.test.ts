import { describe, it, expect, beforeEach } from "vitest";
import { ImageProcessor } from "../../../src/lib/utils/imageProcessor.js";
import { ProcessorTelemetryRegistry } from "../../../src/lib/telemetry/processorTelemetry.js";

/**
 * Helper function to create a minimal PNG buffer for testing
 * Uses a valid 1x1 pixel PNG encoded as base64
 */
function createTestPngBuffer(): Buffer {
  // Minimal 1x1 pixel PNG (smallest valid PNG)
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
}

describe("ImageProcessor with Generic Telemetry Integration", () => {
  beforeEach(() => {
    // Reset the image processor telemetry before each test
    ProcessorTelemetryRegistry.getInstance("image").reset();
  });

  describe("process method", () => {
    it("should track telemetry for image processing", async () => {
      const pngBuffer = createTestPngBuffer();

      await ImageProcessor.process(pngBuffer);

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.operationBreakdown.process).toBeGreaterThan(0);
    });
  });

  describe("processImageForOpenAI", () => {
    it("should track telemetry for OpenAI processing with Buffer", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      ImageProcessor.processImageForOpenAI(imageBuffer);

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.operationBreakdown.processForOpenAI).toBeGreaterThan(0);
      expect(stats.providerBreakdown["openai"]).toBeGreaterThan(0);
    });

    it("should track telemetry for OpenAI processing with URL", () => {
      const url = "https://example.com/image.png";
      const result = ImageProcessor.processImageForOpenAI(url);

      expect(result).toBe(url);
      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.operationBreakdown.processForOpenAI).toBeGreaterThan(0);
    });

    it("should track telemetry for OpenAI processing with data URI", () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgo=";
      const result = ImageProcessor.processImageForOpenAI(dataUri);

      expect(result).toBe(dataUri);
      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.operationBreakdown.processForOpenAI).toBeGreaterThan(0);
    });
  });

  describe("processImageForGoogle", () => {
    it("should track telemetry for Google processing", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const result = ImageProcessor.processImageForGoogle(imageBuffer);

      expect(result.mimeType).toBe("image/jpeg");
      expect(result.data).toBeTruthy();

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.operationBreakdown.processForGoogle).toBeGreaterThan(0);
      expect(stats.providerBreakdown["google-ai"]).toBeGreaterThan(0);
    });

    it("should extract mime type from data URI", () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgo=";
      const result = ImageProcessor.processImageForGoogle(dataUri);

      expect(result.mimeType).toBe("image/png");
      expect(result.data).toBe("iVBORw0KGgo=");
    });
  });

  describe("processImageForAnthropic", () => {
    it("should track telemetry for Anthropic processing", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const result = ImageProcessor.processImageForAnthropic(imageBuffer);

      expect(result.mediaType).toBe("image/jpeg");
      expect(result.data).toBeTruthy();

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.operationBreakdown.processForAnthropic).toBeGreaterThan(0);
      expect(stats.providerBreakdown["anthropic"]).toBeGreaterThan(0);
    });
  });

  describe("processImageForVertex", () => {
    it("should track telemetry for Vertex processing with Gemini model", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      ImageProcessor.processImageForVertex(imageBuffer, "gemini-1.5-pro");

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.operationBreakdown.processForVertex).toBeGreaterThan(0);
      expect(stats.providerBreakdown["vertex"]).toBeGreaterThan(0);
    });

    it("should track telemetry for Vertex processing with Claude model", () => {
      const imageBuffer = Buffer.from("fake-image-data");
      ImageProcessor.processImageForVertex(imageBuffer, "claude-3-opus");

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();
      expect(stats.providerBreakdown["vertex"]).toBeGreaterThan(0);
    });
  });

  describe("detectImageType", () => {
    it("should detect PNG from magic bytes", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const result = ImageProcessor.detectImageType(pngBuffer);
      expect(result).toBe("image/png");
    });

    it("should detect JPEG from magic bytes", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = ImageProcessor.detectImageType(jpegBuffer);
      expect(result).toBe("image/jpeg");
    });

    it("should detect GIF from magic bytes", () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const result = ImageProcessor.detectImageType(gifBuffer);
      expect(result).toBe("image/gif");
    });

    it("should detect type from data URI", () => {
      const result = ImageProcessor.detectImageType(
        "data:image/webp;base64,xxx",
      );
      expect(result).toBe("image/webp");
    });

    it("should detect type from filename extension", () => {
      const result = ImageProcessor.detectImageType("image.png");
      expect(result).toBe("image/png");
    });
  });

  describe("multiple operations", () => {
    it("should accurately track multiple operations", () => {
      const buffer = Buffer.from("test");

      // Call multiple processing methods
      ImageProcessor.processImageForOpenAI(buffer);
      ImageProcessor.processImageForGoogle(buffer);
      ImageProcessor.processImageForAnthropic(buffer);
      // Note: processImageForVertex calls processImageForGoogle or processImageForAnthropic internally
      ImageProcessor.processImageForVertex(buffer, "gemini-pro");

      const stats = ProcessorTelemetryRegistry.getInstance("image").getStats();

      // processForVertex with gemini routes to processForGoogle, so we expect 5 operations:
      // 1. processForOpenAI
      // 2. processForGoogle
      // 3. processForAnthropic
      // 4. processForVertex
      // 5. processForGoogle (called by processForVertex)
      expect(stats.totalProcessed).toBe(5);
      expect(stats.successCount).toBe(5);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });
});
