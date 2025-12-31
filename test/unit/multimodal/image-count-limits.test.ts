import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderImageAdapter } from "../../../src/lib/adapters/providerImageAdapter.js";
import { logger } from "../../../src/lib/utils/logger.js";
import { GoogleAIModels } from "../../../src/lib/constants/enums.js";

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

describe("Provider Image Count Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create mock images
  const createMockImages = (count: number): Buffer[] => {
    return Array.from({ length: count }, (_, i) =>
      Buffer.from(`image-${i + 1}`),
    );
  };

  describe("OpenAI provider limits", () => {
    const provider = "openai";
    const model = "gpt-4o";

    it("should allow image count at the limit (10)", async () => {
      const images = createMockImages(10);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (11)", async () => {
      const images = createMockImages(11);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (11) exceeds the maximum limit for openai. Maximum allowed: 10.",
      );
    });

    it("should warn at 80% threshold (8 images)", async () => {
      const images = createMockImages(8);
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        provider,
        model,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Image count (8) is approaching the limit for openai",
        ),
      );
    });

    it("should not warn below 80% threshold (7 images)", async () => {
      const images = createMockImages(7);
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        provider,
        model,
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("Anthropic provider limits", () => {
    const provider = "anthropic";
    const model = "claude-3-5-sonnet";

    it("should allow image count at the limit (20)", async () => {
      const images = createMockImages(20);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (21)", async () => {
      const images = createMockImages(21);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (21) exceeds the maximum limit for anthropic. Maximum allowed: 20.",
      );
    });

    it("should warn at 80% threshold (16 images)", async () => {
      const images = createMockImages(16);
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        provider,
        model,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Image count (16) is approaching the limit for anthropic",
        ),
      );
    });
  });

  describe("Google AI provider limits", () => {
    const provider = "google-ai";
    const model = GoogleAIModels.GEMINI_2_5_FLASH;

    it("should allow image count at the limit (16)", async () => {
      const images = createMockImages(16);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (17)", async () => {
      const images = createMockImages(17);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (17) exceeds the maximum limit for google-ai. Maximum allowed: 16.",
      );
    });

    it("should warn at 80% threshold (12 images)", async () => {
      const images = createMockImages(12);
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        provider,
        model,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Image count (12) is approaching the limit for google-ai",
        ),
      );
    });
  });

  describe("Azure provider limits", () => {
    const provider = "azure";
    const model = "gpt-4o";

    it("should allow image count at the limit (10)", async () => {
      const images = createMockImages(10);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (11)", async () => {
      const images = createMockImages(11);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (11) exceeds the maximum limit for azure. Maximum allowed: 10.",
      );
    });
  });

  describe("Vertex AI provider with model-specific limits", () => {
    describe("Claude models on Vertex (limit: 20)", () => {
      const provider = "vertex";
      const model = "claude-3-5-sonnet@20241022";

      it("should allow image count at Claude limit (20)", async () => {
        const images = createMockImages(20);
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            images,
            provider,
            model,
          ),
        ).resolves.toBeDefined();
      });

      it("should reject image count over Claude limit (21)", async () => {
        const images = createMockImages(21);
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            images,
            provider,
            model,
          ),
        ).rejects.toThrow(
          "Image count (21) exceeds the maximum limit for vertex. Maximum allowed: 20.",
        );
      });

      it("should warn at 80% of Claude limit (16 images)", async () => {
        const images = createMockImages(16);
        await ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          provider,
          model,
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            "Image count (16) is approaching the limit for vertex",
          ),
        );
      });
    });

    describe("Gemini models on Vertex (limit: 16)", () => {
      const provider = "vertex";
      const model = GoogleAIModels.GEMINI_2_5_FLASH;

      it("should allow image count at Gemini limit (16)", async () => {
        const images = createMockImages(16);
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            images,
            provider,
            model,
          ),
        ).resolves.toBeDefined();
      });

      it("should reject image count over Gemini limit (17)", async () => {
        const images = createMockImages(17);
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            images,
            provider,
            model,
          ),
        ).rejects.toThrow(
          "Image count (17) exceeds the maximum limit for vertex. Maximum allowed: 16.",
        );
      });

      it("should warn at 80% of Gemini limit (12 images)", async () => {
        const images = createMockImages(12);
        await ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          provider,
          model,
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            "Image count (12) is approaching the limit for vertex",
          ),
        );
      });
    });
  });

  describe("Ollama provider limits", () => {
    const provider = "ollama";
    const model = "llama3.2-vision";

    it("should allow image count at the limit (10)", async () => {
      const images = createMockImages(10);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (11)", async () => {
      const images = createMockImages(11);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (11) exceeds the maximum limit for ollama. Maximum allowed: 10.",
      );
    });
  });

  describe("Mistral provider limits", () => {
    const provider = "mistral";
    const model = "mistral-small";

    it("should allow image count at the limit (10)", async () => {
      const images = createMockImages(10);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (11)", async () => {
      const images = createMockImages(11);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (11) exceeds the maximum limit for mistral. Maximum allowed: 10. Please reduce the number of images.",
      );
    });
  });

  describe("LiteLLM provider limits", () => {
    const provider = "litellm";
    const model = "gpt-4o";

    it("should allow image count at the limit (10)", async () => {
      const images = createMockImages(10);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (11)", async () => {
      const images = createMockImages(11);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (11) exceeds the maximum limit for litellm. Maximum allowed: 10. Please reduce the number of images.",
      );
    });
  });

  describe("Bedrock provider limits", () => {
    const provider = "bedrock";
    const model = "anthropic.claude-3-5-sonnet";

    it("should allow image count at the limit (20)", async () => {
      const images = createMockImages(20);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).resolves.toBeDefined();
    });

    it("should reject image count over the limit (21)", async () => {
      const images = createMockImages(21);
      await expect(
        ProviderImageAdapter.adaptForProvider("test", images, provider, model),
      ).rejects.toThrow(
        "Image count (21) exceeds the maximum limit for bedrock. Maximum allowed: 20. Please reduce the number of images.",
      );
    });
  });

  describe("Provider-specific consistency", () => {
    it("should use correct limits for each provider", async () => {
      const testCases = [
        { provider: "openai", model: "gpt-4o", limit: 10 },
        { provider: "azure", model: "gpt-4o", limit: 10 },
        { provider: "anthropic", model: "claude-3-5-sonnet", limit: 20 },
        {
          provider: "google-ai",
          model: GoogleAIModels.GEMINI_2_5_FLASH,
          limit: 16,
        },
        { provider: "ollama", model: "llama3.2-vision", limit: 10 },
      ];

      for (const { provider, model, limit } of testCases) {
        const atLimitImages = createMockImages(limit);
        const overLimitImages = createMockImages(limit + 1);

        // Should succeed at limit
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            atLimitImages,
            provider,
            model,
          ),
        ).resolves.toBeDefined();

        // Should fail over limit
        await expect(
          ProviderImageAdapter.adaptForProvider(
            "test",
            overLimitImages,
            provider,
            model,
          ),
        ).rejects.toThrow(`Image count (${limit + 1}) exceeds the maximum`);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle single image (below all limits)", async () => {
      const images = createMockImages(1);
      await expect(
        ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          "openai",
          "gpt-4o",
        ),
      ).resolves.toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should handle zero images gracefully", async () => {
      const images: Buffer[] = [];
      await expect(
        ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          "openai",
          "gpt-4o",
        ),
      ).resolves.toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should provide helpful error messages with provider and limit info", async () => {
      const images = createMockImages(25);
      try {
        await ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          "anthropic",
          "claude-3-5-sonnet",
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("Image count (25)");
        expect((error as Error).message).toContain("anthropic");
        expect((error as Error).message).toContain("Maximum allowed: 20");
      }
    });
  });

  describe("Warning threshold behavior", () => {
    it("should warn exactly at 80% threshold", async () => {
      // Test multiple providers at their 80% threshold
      const testCases = [
        { provider: "openai", model: "gpt-4o", threshold: 8 }, // 80% of 10
        { provider: "anthropic", model: "claude-3-5-sonnet", threshold: 16 }, // 80% of 20
        {
          provider: "google-ai",
          model: GoogleAIModels.GEMINI_2_5_FLASH,
          threshold: 12,
        }, // 80% of 16 (rounded down: Math.floor(16 * 0.8) = 12)
      ];

      for (const { provider, model, threshold } of testCases) {
        vi.clearAllMocks();
        const images = createMockImages(threshold);
        await ProviderImageAdapter.adaptForProvider(
          "test",
          images,
          provider,
          model,
        );
        expect(logger.warn).toHaveBeenCalledTimes(1);
      }
    });

    it("should not warn at 79% threshold (just below)", async () => {
      const images = createMockImages(7); // 70% of 10
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        "openai",
        "gpt-4o",
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should not warn above threshold (only warns at exact threshold)", async () => {
      const images = createMockImages(9); // 90% of 10, above threshold but below limit
      await ProviderImageAdapter.adaptForProvider(
        "test",
        images,
        "openai",
        "gpt-4o",
      );
      // Should not warn at 9 because we only warn at exactly the threshold (8)
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("PDF page counting", () => {
    describe("countImagesInMessage", () => {
      it("should count only images when no PDF pages provided", () => {
        const images = createMockImages(3);
        const count = ProviderImageAdapter.countImagesInMessage(images);
        expect(count).toBe(3);
      });

      it("should count only images when pdfPages is null", () => {
        const images = createMockImages(2);
        const count = ProviderImageAdapter.countImagesInMessage(images, null);
        expect(count).toBe(2);
      });

      it("should count only images when pdfPages is undefined", () => {
        const images = createMockImages(4);
        const count = ProviderImageAdapter.countImagesInMessage(
          images,
          undefined,
        );
        expect(count).toBe(4);
      });

      it("should count images plus PDF pages", () => {
        const images = createMockImages(2);
        const count = ProviderImageAdapter.countImagesInMessage(images, 3);
        expect(count).toBe(5); // 2 images + 3 PDF pages
      });

      it("should count only PDF pages when no images", () => {
        const images: Buffer[] = [];
        const count = ProviderImageAdapter.countImagesInMessage(images, 5);
        expect(count).toBe(5);
      });

      it("should return 0 when no images and no PDF pages", () => {
        const images: Buffer[] = [];
        const count = ProviderImageAdapter.countImagesInMessage(images);
        expect(count).toBe(0);
      });

      it("should handle large numbers correctly", () => {
        const images = createMockImages(10);
        const count = ProviderImageAdapter.countImagesInMessage(images, 15);
        expect(count).toBe(25); // 10 images + 15 PDF pages
      });
    });

    describe("countImagesInPages", () => {
      it("should count pages from single PDF", () => {
        const pdfMetadata = [{ pageCount: 5 }];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(5);
      });

      it("should count pages from multiple PDFs", () => {
        const pdfMetadata = [{ pageCount: 3 }, { pageCount: 2 }];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(5); // 3 + 2 = 5
      });

      it("should handle empty array", () => {
        const count = ProviderImageAdapter.countImagesInPages([]);
        expect(count).toBe(0);
      });

      it("should handle undefined input", () => {
        const count = ProviderImageAdapter.countImagesInPages(undefined);
        expect(count).toBe(0);
      });

      it("should handle null pageCount", () => {
        const pdfMetadata = [{ pageCount: null }];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(0);
      });

      it("should handle undefined pageCount", () => {
        const pdfMetadata = [{ pageCount: undefined }];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(0);
      });

      it("should handle mixed valid and null pageCounts", () => {
        const pdfMetadata = [
          { pageCount: 3 },
          { pageCount: null },
          { pageCount: 2 },
        ];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(5); // 3 + 0 + 2 = 5
      });

      it("should handle multiple PDFs with various page counts", () => {
        const pdfMetadata = [
          { pageCount: 10 },
          { pageCount: 5 },
          { pageCount: 3 },
          { pageCount: 7 },
        ];
        const count = ProviderImageAdapter.countImagesInPages(pdfMetadata);
        expect(count).toBe(25); // 10 + 5 + 3 + 7 = 25
      });
    });
  });
});
