import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderImageAdapter } from "../../../src/lib/adapters/providerImageAdapter.js";
import { logger } from "../../../src/lib/utils/logger.js";

// Mock the logger to capture warnings
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock ImageProcessor to avoid actual image processing
vi.mock("../../../src/lib/utils/imageProcessor.js", () => ({
  ImageProcessor: {
    processImageForOpenAI: (image: Buffer | string) =>
      `data:image/png;base64,${typeof image === "string" ? image : "mock"}`,
    processImageForGoogle: (image: Buffer | string) => ({
      mimeType: "image/png",
      data: typeof image === "string" ? image : "mock-data",
    }),
    processImageForAnthropic: (image: Buffer | string) => ({
      mediaType: "image/png" as const,
      data: typeof image === "string" ? image : "mock-data",
    }),
    detectImageType: () => "image/png",
  },
}));

describe("LiteLLM Vision Support (Production Code Path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("supportsVision — proxy provider bypass", () => {
    it("should return true for a known vision model (gpt-4o)", () => {
      expect(ProviderImageAdapter.supportsVision("litellm", "gpt-4o")).toBe(
        true,
      );
    });

    it("should return true for an unknown model (proxy bypass)", () => {
      // LiteLLM is a proxy provider — unknown models should pass through
      // rather than being rejected, so the underlying provider can decide
      expect(
        ProviderImageAdapter.supportsVision("litellm", "some-unknown-model"),
      ).toBe(true);
    });

    it("should return true when no model is specified", () => {
      expect(ProviderImageAdapter.supportsVision("litellm")).toBe(true);
    });

    it("should return true for anthropic models routed through LiteLLM", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "litellm",
          "anthropic/claude-sonnet-4-5-20250929",
        ),
      ).toBe(true);
    });

    it("should return true for vertex/gemini models routed through LiteLLM", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "litellm",
          "vertex_ai/gemini-2.5-pro",
        ),
      ).toBe(true);
    });
  });

  describe("PROXY_PROVIDERS membership", () => {
    it("should list litellm as a vision-capable provider", () => {
      const providers = ProviderImageAdapter.getVisionProviders();
      expect(providers).toContain("litellm");
    });

    it("should return known LiteLLM vision models from getSupportedModels", () => {
      const models = ProviderImageAdapter.getSupportedModels("litellm");
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("gpt-4o");
      expect(models).toContain("gemini-2.5-pro");
      expect(models).toContain("anthropic/claude-sonnet-4-5-20250929");
    });
  });

  describe("validateImageCount — production code path", () => {
    it("should allow exactly 10 images (the limit)", () => {
      expect(() => {
        ProviderImageAdapter.validateImageCount(10, "litellm");
      }).not.toThrow();
    });

    it("should throw when image count exceeds limit (11 > 10)", () => {
      expect(() => {
        ProviderImageAdapter.validateImageCount(11, "litellm");
      }).toThrow(
        "Image count (11) exceeds the maximum limit for litellm. Maximum allowed: 10.",
      );
    });

    it("should allow 1 image without warning", () => {
      expect(() => {
        ProviderImageAdapter.validateImageCount(1, "litellm");
      }).not.toThrow();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should warn at 80% threshold (8 images)", () => {
      ProviderImageAdapter.validateImageCount(8, "litellm");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Image count (8) is approaching the limit for litellm",
        ),
      );
    });

    it("should not warn below the 80% threshold (7 images)", () => {
      ProviderImageAdapter.validateImageCount(7, "litellm");
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should allow zero images", () => {
      expect(() => {
        ProviderImageAdapter.validateImageCount(0, "litellm");
      }).not.toThrow();
    });
  });

  describe("Image formatting — Vercel AI SDK ImagePart format", () => {
    it("should produce ImagePart entries with type 'image' for buffer inputs", async () => {
      // Import the production function that the SDK actually uses
      // We test convertSimpleImagesToProviderFormat indirectly through the
      // exported buildMessages / buildUserContent helpers, but the core
      // formatting logic can be verified by checking convertToContent output
      const buffer = Buffer.from("fake-image-data");
      const content = ProviderImageAdapter.convertToContent("describe this", [
        buffer,
      ]);

      expect(content).toHaveLength(2);
      expect(content[0]).toEqual({ type: "text", text: "describe this" });
      expect(content[1]).toMatchObject({
        type: "image",
        data: buffer,
        mediaType: "image/png",
      });
    });

    it("should produce ImagePart entries for string inputs", () => {
      const content = ProviderImageAdapter.convertToContent("describe this", [
        "base64-image-string",
      ]);

      expect(content).toHaveLength(2);
      expect(content[0]).toEqual({ type: "text", text: "describe this" });
      expect(content[1]).toMatchObject({
        type: "image",
        data: "base64-image-string",
        mediaType: "image/png",
      });
    });

    it("should handle images with alt text", () => {
      const imageWithAlt = {
        data: Buffer.from("image-data"),
        altText: "A chart showing revenue growth",
      };
      const content = ProviderImageAdapter.convertToContent("analyze", [
        imageWithAlt,
      ]);

      expect(content).toHaveLength(2);
      expect(content[1]).toMatchObject({
        type: "image",
        data: imageWithAlt.data,
        altText: "A chart showing revenue growth",
        mediaType: "image/png",
      });
    });

    it("should handle multiple images in sequence", () => {
      const images = [
        Buffer.from("img1"),
        Buffer.from("img2"),
        Buffer.from("img3"),
      ];
      const content = ProviderImageAdapter.convertToContent(
        "compare these",
        images,
      );

      // 1 text part + 3 image parts
      expect(content).toHaveLength(4);
      expect(content[0]).toEqual({ type: "text", text: "compare these" });
      for (let i = 1; i <= 3; i++) {
        expect(content[i]).toMatchObject({
          type: "image",
          mediaType: "image/png",
        });
      }
    });

    it("should handle empty images array", () => {
      const content = ProviderImageAdapter.convertToContent("just text", []);
      expect(content).toHaveLength(1);
      expect(content[0]).toEqual({ type: "text", text: "just text" });
    });
  });

  describe("countImagesInMessage — LiteLLM context", () => {
    it("should count images for limit validation before sending to LiteLLM", () => {
      const images = Array.from({ length: 8 }, (_, i) =>
        Buffer.from(`img-${i}`),
      );
      const count = ProviderImageAdapter.countImagesInMessage(images);
      expect(count).toBe(8);

      // Verify this count would pass validation
      expect(() => {
        ProviderImageAdapter.validateImageCount(count, "litellm");
      }).not.toThrow();
    });

    it("should count images + PDF pages for combined limit check", () => {
      const images = Array.from({ length: 5 }, (_, i) =>
        Buffer.from(`img-${i}`),
      );
      const pdfPages = 6;
      const count = ProviderImageAdapter.countImagesInMessage(images, pdfPages);
      expect(count).toBe(11);

      // Verify this combined count would exceed the LiteLLM limit
      expect(() => {
        ProviderImageAdapter.validateImageCount(count, "litellm");
      }).toThrow("Image count (11) exceeds the maximum limit for litellm");
    });
  });
});
