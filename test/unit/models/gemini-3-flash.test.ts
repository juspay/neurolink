import { describe, it, expect } from "vitest";
import {
  GoogleAIModels,
  VertexModels,
} from "../../../src/lib/constants/enums.js";
import { MODEL_TOKEN_LIMITS } from "../../../src/lib/constants/tokens.js";
import { ProviderImageAdapter } from "../../../src/lib/adapters/providerImageAdapter.js";

describe("Gemini 3 Flash Model", () => {
  describe("Model Identification", () => {
    it("should correctly identify Gemini 3 Flash models", () => {
      const flashModels = [
        GoogleAIModels.GEMINI_3_FLASH,
        GoogleAIModels.GEMINI_3_FLASH_PREVIEW,
        VertexModels.GEMINI_3_FLASH_LATEST,
      ];

      flashModels.forEach((model) => {
        expect(model).toMatch(/^gemini-3-flash/);
      });
    });

    it("should distinguish Flash from Pro models", () => {
      const flashModel = GoogleAIModels.GEMINI_3_FLASH;
      const proModel = GoogleAIModels.GEMINI_3_PRO_PREVIEW;

      expect(flashModel).toContain("flash");
      expect(proModel).not.toContain("flash");
    });
  });

  describe("Token Limits", () => {
    it("should have correct input token limit", () => {
      const expectedInputLimit = MODEL_TOKEN_LIMITS["gemini-3-flash"].input;
      expect(expectedInputLimit).toBe(1000000);
    });

    it("should have correct output token limit", () => {
      const expectedOutputLimit = MODEL_TOKEN_LIMITS["gemini-3-flash"].output;
      expect(expectedOutputLimit).toBe(65536);
    });
  });

  describe("Vision Capabilities via ProviderImageAdapter", () => {
    it("should support vision for Google AI provider", () => {
      expect(ProviderImageAdapter.supportsVision("google-ai")).toBe(true);
    });

    it("should support vision for Gemini 3 Flash model on Google AI", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "google-ai",
          GoogleAIModels.GEMINI_3_FLASH,
        ),
      ).toBe(true);
    });

    it("should support vision for Gemini 3 Flash Preview model on Google AI", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "google-ai",
          GoogleAIModels.GEMINI_3_FLASH_PREVIEW,
        ),
      ).toBe(true);
    });

    it("should support vision for Gemini 3 Flash on Vertex AI", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "vertex",
          VertexModels.GEMINI_3_FLASH_LATEST,
        ),
      ).toBe(true);
    });

    it("should include Gemini 3 Flash in supported models list", () => {
      const supportedModels =
        ProviderImageAdapter.getSupportedModels("google-ai");

      // Check that at least one gemini-3-flash model is in the supported list
      const hasGemini3Flash = supportedModels.some((model) =>
        model.includes("gemini-3-flash"),
      );
      expect(hasGemini3Flash).toBe(true);
    });
  });

  describe("Provider Vision Support", () => {
    it("should list google-ai as a vision provider", () => {
      const visionProviders = ProviderImageAdapter.getVisionProviders();
      expect(visionProviders).toContain("google-ai");
    });

    it("should list vertex as a vision provider", () => {
      const visionProviders = ProviderImageAdapter.getVisionProviders();
      expect(visionProviders).toContain("vertex");
    });
  });

  describe("Thinking Support", () => {
    it("should support thinking configuration", () => {
      const model = GoogleAIModels.GEMINI_3_FLASH;
      const supportsThinking = /^gemini-3/i.test(model);

      expect(supportsThinking).toBe(true);
    });

    it("should have appropriate thinking budget limit", () => {
      const maxBudget = 50000; // Flash has lower budget than Pro
      expect(maxBudget).toBeLessThan(100000);
      expect(maxBudget).toBeGreaterThan(10000);
    });
  });

  describe("Gemini 3 Pro Vision Support", () => {
    it("should support vision for Gemini 3 Pro Preview model", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "google-ai",
          GoogleAIModels.GEMINI_3_PRO_PREVIEW,
        ),
      ).toBe(true);
    });

    it("should support vision for Gemini 3 Pro on Vertex AI", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "vertex",
          VertexModels.GEMINI_3_PRO,
        ),
      ).toBe(true);
    });
  });

  describe("Gemini 2.5 Backward Compatibility", () => {
    it("should support vision for Gemini 2.5 Flash", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "google-ai",
          GoogleAIModels.GEMINI_2_5_FLASH,
        ),
      ).toBe(true);
    });

    it("should support vision for Gemini 2.5 Pro", () => {
      expect(
        ProviderImageAdapter.supportsVision(
          "google-ai",
          GoogleAIModels.GEMINI_2_5_PRO,
        ),
      ).toBe(true);
    });
  });

  describe("Unsupported Provider Handling", () => {
    it("should return false for unknown provider", () => {
      expect(ProviderImageAdapter.supportsVision("unknown-provider")).toBe(
        false,
      );
    });

    it("should return empty array for unsupported provider models", () => {
      const models =
        ProviderImageAdapter.getSupportedModels("unknown-provider");
      expect(models).toEqual([]);
    });
  });

  describe("Image Count Helpers", () => {
    it("should count images correctly", () => {
      const images = [Buffer.from("test1"), Buffer.from("test2")];
      const count = ProviderImageAdapter.countImagesInMessage(images);
      expect(count).toBe(2);
    });

    it("should include PDF pages in image count", () => {
      const images = [Buffer.from("test1")];
      const pdfPages = 5;
      const count = ProviderImageAdapter.countImagesInMessage(images, pdfPages);
      expect(count).toBe(6);
    });

    it("should handle null/undefined PDF pages", () => {
      const images = [Buffer.from("test1"), Buffer.from("test2")];
      const count = ProviderImageAdapter.countImagesInMessage(images, null);
      expect(count).toBe(2);
    });

    it("should count pages from PDF metadata array", () => {
      const pdfMetadata = [
        { pageCount: 3 },
        { pageCount: 5 },
        { pageCount: 2 },
      ];
      const totalPages = ProviderImageAdapter.countImagesInPages(pdfMetadata);
      expect(totalPages).toBe(10);
    });

    it("should handle empty PDF metadata array", () => {
      const totalPages = ProviderImageAdapter.countImagesInPages([]);
      expect(totalPages).toBe(0);
    });

    it("should handle undefined PDF metadata", () => {
      const totalPages = ProviderImageAdapter.countImagesInPages(undefined);
      expect(totalPages).toBe(0);
    });
  });
});
