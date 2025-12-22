/**
 * ModelNameNormalizer Unit Tests
 * Tests for PC-010: Model Name Normalization Missing
 *
 * Tests include:
 * - Alias resolution for all providers
 * - Separator normalization
 * - LiteLLM prefix validation
 * - Provider-specific validation
 * - Error messages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelNameNormalizer } from "../../../src/lib/utils/modelNameNormalizer.js";
import { AIProviderName } from "../../../src/lib/constants/enums.js";
import { logger } from "../../../src/lib/utils/logger.js";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ModelNameNormalizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalize()", () => {
    describe("OpenAI provider", () => {
      it("should normalize gpt4 to gpt-4", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt4",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4");
      });

      it("should normalize gpt4o to gpt-4o", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt4o",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4o");
      });

      it("should normalize chatgpt to gpt-3.5-turbo", () => {
        const result = ModelNameNormalizer.normalize(
          "chatgpt",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-3.5-turbo");
      });

      it("should normalize gpt-4-mini to gpt-4o-mini", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt-4-mini",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4o-mini");
      });

      it("should normalize underscores to hyphens", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt_4o",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4o");
      });

      it("should handle already normalized names", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt-4o",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4o");
      });

      it("should normalize o1 variants", () => {
        expect(ModelNameNormalizer.normalize("o1", AIProviderName.OPENAI)).toBe(
          "o1",
        );
        expect(
          ModelNameNormalizer.normalize("o1-mini", AIProviderName.OPENAI),
        ).toBe("o1-mini");
        expect(
          ModelNameNormalizer.normalize("o1-preview", AIProviderName.OPENAI),
        ).toBe("o1-preview");
      });

      it("should normalize GPT-5 series", () => {
        expect(
          ModelNameNormalizer.normalize("gpt5", AIProviderName.OPENAI),
        ).toBe("gpt-5");
        expect(
          ModelNameNormalizer.normalize("gpt52", AIProviderName.OPENAI),
        ).toBe("gpt-5.2");
      });
    });

    describe("Anthropic provider", () => {
      it("should normalize claude to latest sonnet", () => {
        const result = ModelNameNormalizer.normalize(
          "claude",
          AIProviderName.ANTHROPIC,
        );
        expect(result).toBe("claude-3-5-sonnet-20241022");
      });

      it("should normalize claude-sonnet to latest sonnet", () => {
        const result = ModelNameNormalizer.normalize(
          "claude-sonnet",
          AIProviderName.ANTHROPIC,
        );
        expect(result).toBe("claude-3-5-sonnet-20241022");
      });

      it("should normalize claude-opus to latest opus", () => {
        const result = ModelNameNormalizer.normalize(
          "claude-opus",
          AIProviderName.ANTHROPIC,
        );
        expect(result).toBe("claude-opus-4-5-20251124");
      });

      it("should normalize claude-haiku to latest haiku", () => {
        const result = ModelNameNormalizer.normalize(
          "claude-haiku",
          AIProviderName.ANTHROPIC,
        );
        expect(result).toBe("claude-3-5-haiku-20241022");
      });

      it("should normalize underscores to hyphens", () => {
        const result = ModelNameNormalizer.normalize(
          "claude_3_5_sonnet_20241022",
          AIProviderName.ANTHROPIC,
        );
        expect(result).toBe("claude-3-5-sonnet-20241022");
      });
    });

    describe("Google AI provider", () => {
      it("should normalize gemini to gemini-2.5-flash", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini",
          AIProviderName.GOOGLE_AI,
        );
        expect(result).toBe("gemini-2.5-flash");
      });

      it("should normalize gemini-1-5-pro to gemini-1.5-pro", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini-1-5-pro",
          AIProviderName.GOOGLE_AI,
        );
        expect(result).toBe("gemini-1.5-pro");
      });

      it("should normalize gemini-2-5-flash to gemini-2.5-flash", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini-2-5-flash",
          AIProviderName.GOOGLE_AI,
        );
        expect(result).toBe("gemini-2.5-flash");
      });

      it("should handle already normalized names", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini-2.5-pro",
          AIProviderName.GOOGLE_AI,
        );
        expect(result).toBe("gemini-2.5-pro");
      });
    });

    describe("Vertex AI provider", () => {
      it("should normalize gemini-1-5-pro to gemini-1.5-pro", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini-1-5-pro",
          AIProviderName.VERTEX,
        );
        expect(result).toBe("gemini-1.5-pro");
      });

      it("should normalize gemini to gemini-2.5-flash", () => {
        const result = ModelNameNormalizer.normalize(
          "gemini",
          AIProviderName.VERTEX,
        );
        expect(result).toBe("gemini-2.5-flash");
      });
    });

    describe("Mistral provider", () => {
      it("should normalize mistral to mistral-large-latest", () => {
        const result = ModelNameNormalizer.normalize(
          "mistral",
          AIProviderName.MISTRAL,
        );
        expect(result).toBe("mistral-large-latest");
      });

      it("should normalize mistral-large to mistral-large-latest", () => {
        const result = ModelNameNormalizer.normalize(
          "mistral-large",
          AIProviderName.MISTRAL,
        );
        expect(result).toBe("mistral-large-latest");
      });

      it("should normalize codestral to codestral-latest", () => {
        const result = ModelNameNormalizer.normalize(
          "codestral",
          AIProviderName.MISTRAL,
        );
        expect(result).toBe("codestral-latest");
      });

      it("should normalize pixtral to pixtral-large-latest", () => {
        const result = ModelNameNormalizer.normalize(
          "pixtral",
          AIProviderName.MISTRAL,
        );
        expect(result).toBe("pixtral-large-latest");
      });
    });

    describe("Bedrock provider", () => {
      it("should normalize claude to Bedrock Claude Sonnet", () => {
        const result = ModelNameNormalizer.normalize(
          "claude",
          AIProviderName.BEDROCK,
        );
        expect(result).toBe("anthropic.claude-3-5-sonnet-20241022-v1:0");
      });

      it("should normalize nova to nova-pro", () => {
        const result = ModelNameNormalizer.normalize(
          "nova",
          AIProviderName.BEDROCK,
        );
        expect(result).toBe("amazon.nova-pro-v1:0");
      });

      it("should normalize llama4 to Bedrock Llama4", () => {
        const result = ModelNameNormalizer.normalize(
          "llama4",
          AIProviderName.BEDROCK,
        );
        expect(result).toBe("meta.llama4-maverick-17b-instruct-v1:0");
      });
    });

    describe("Azure provider", () => {
      it("should normalize gpt4 to gpt-4", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt4",
          AIProviderName.AZURE,
        );
        expect(result).toBe("gpt-4");
      });

      it("should normalize gpt-3.5-turbo to gpt-35-turbo", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt-3.5-turbo",
          AIProviderName.AZURE,
        );
        expect(result).toBe("gpt-35-turbo");
      });
    });

    describe("Ollama provider", () => {
      it("should normalize llama to llama3.2", () => {
        const result = ModelNameNormalizer.normalize(
          "llama",
          AIProviderName.OLLAMA,
        );
        expect(result).toBe("llama3.2:latest");
      });

      it("should add :latest tag if missing", () => {
        const result = ModelNameNormalizer.normalize(
          "llama3.2",
          AIProviderName.OLLAMA,
        );
        expect(result).toBe("llama3.2:latest");
      });

      it("should preserve existing tags", () => {
        const result = ModelNameNormalizer.normalize(
          "llama3.2:7b",
          AIProviderName.OLLAMA,
        );
        expect(result).toBe("llama3.2:7b");
      });

      it("should normalize deepseek-r1 to deepseek-r1:70b", () => {
        const result = ModelNameNormalizer.normalize(
          "deepseek-r1",
          AIProviderName.OLLAMA,
        );
        expect(result).toBe("deepseek-r1:70b");
      });
    });

    describe("LiteLLM provider", () => {
      it("should add openai/ prefix if missing", () => {
        const result = ModelNameNormalizer.normalize(
          "gpt-4o",
          AIProviderName.LITELLM,
        );
        expect(result).toBe("openai/gpt-4o");
      });

      it("should preserve provider prefix if present", () => {
        const result = ModelNameNormalizer.normalize(
          "anthropic/claude-3-5-sonnet",
          AIProviderName.LITELLM,
        );
        expect(result).toBe("anthropic/claude-3-5-sonnet");
      });

      it("should warn when adding prefix", () => {
        ModelNameNormalizer.normalize("gpt-4o", AIProviderName.LITELLM);
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    describe("Edge cases", () => {
      it("should handle empty string", () => {
        const result = ModelNameNormalizer.normalize("", AIProviderName.OPENAI);
        expect(result).toBe("");
      });

      it("should handle whitespace", () => {
        const result = ModelNameNormalizer.normalize(
          "  gpt-4o  ",
          AIProviderName.OPENAI,
        );
        expect(result).toBe("gpt-4o");
      });

      it("should handle unknown provider", () => {
        const result = ModelNameNormalizer.normalize("model-name", "unknown");
        expect(result).toBe("model-name");
      });

      it("should be case-insensitive", () => {
        const result1 = ModelNameNormalizer.normalize(
          "GPT-4O",
          AIProviderName.OPENAI,
        );
        const result2 = ModelNameNormalizer.normalize(
          "gpt-4o",
          AIProviderName.OPENAI,
        );
        expect(result1).toBe(result2);
      });
    });
  });

  describe("validate()", () => {
    it("should validate LiteLLM provider/model format", () => {
      expect(
        ModelNameNormalizer.validate("openai/gpt-4o", AIProviderName.LITELLM),
      ).toBe(true);
      expect(
        ModelNameNormalizer.validate("gpt-4o", AIProviderName.LITELLM),
      ).toBe(false);
    });

    it("should validate Bedrock vendor prefix", () => {
      expect(
        ModelNameNormalizer.validate(
          "anthropic.claude-3-5-sonnet-20241022-v1:0",
          AIProviderName.BEDROCK,
        ),
      ).toBe(true);
      expect(
        ModelNameNormalizer.validate("invalid-model", AIProviderName.BEDROCK),
      ).toBe(false);
    });

    it("should accept all models for providers without validators", () => {
      expect(
        ModelNameNormalizer.validate("any-model", AIProviderName.OPENAI),
      ).toBe(true);
      expect(
        ModelNameNormalizer.validate("any-model", AIProviderName.ANTHROPIC),
      ).toBe(true);
    });

    it("should return false for empty model name", () => {
      expect(ModelNameNormalizer.validate("", AIProviderName.OPENAI)).toBe(
        false,
      );
    });
  });

  describe("getErrorMessage()", () => {
    it("should provide helpful message for LiteLLM", () => {
      const message = ModelNameNormalizer.getErrorMessage(
        "gpt-4o",
        AIProviderName.LITELLM,
      );
      expect(message).toContain("provider/model");
      expect(message).toContain("openai/gpt-4o");
    });

    it("should provide helpful message for Bedrock", () => {
      const message = ModelNameNormalizer.getErrorMessage(
        "invalid",
        AIProviderName.BEDROCK,
      );
      expect(message).toContain("vendor prefix");
      expect(message).toContain("anthropic.");
    });

    it("should provide helpful message for Azure", () => {
      const message = ModelNameNormalizer.getErrorMessage(
        "invalid",
        AIProviderName.AZURE,
      );
      expect(message).toContain("deployment names");
    });

    it("should suggest aliases for other providers", () => {
      const message = ModelNameNormalizer.getErrorMessage(
        "invalid",
        AIProviderName.OPENAI,
      );
      expect(message).toContain("aliases");
    });
  });

  describe("getAliases()", () => {
    it("should return aliases for OpenAI", () => {
      const aliases = ModelNameNormalizer.getAliases(AIProviderName.OPENAI);
      expect(aliases).toHaveProperty("gpt4");
      expect(aliases).toHaveProperty("chatgpt");
      expect(aliases.gpt4).toBe("gpt-4");
    });

    it("should return empty object for provider without aliases", () => {
      const aliases = ModelNameNormalizer.getAliases(AIProviderName.SAGEMAKER);
      expect(aliases).toEqual({});
    });
  });

  describe("suggestModels()", () => {
    it("should suggest models based on partial name for OpenAI", () => {
      const suggestions = ModelNameNormalizer.suggestModels(
        "gpt4",
        AIProviderName.OPENAI,
      );
      expect(suggestions).toContain("gpt-4");
      expect(suggestions).toContain("gpt-4o");
    });

    it("should suggest Claude models for Anthropic", () => {
      const suggestions = ModelNameNormalizer.suggestModels(
        "claude",
        AIProviderName.ANTHROPIC,
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes("claude"))).toBe(true);
    });

    it("should return empty array for no matches", () => {
      const suggestions = ModelNameNormalizer.suggestModels(
        "nonexistent",
        AIProviderName.OPENAI,
      );
      expect(suggestions).toEqual([]);
    });

    it("should return unique suggestions", () => {
      const suggestions = ModelNameNormalizer.suggestModels(
        "gpt",
        AIProviderName.OPENAI,
      );
      const uniqueSuggestions = [...new Set(suggestions)];
      expect(suggestions).toEqual(uniqueSuggestions);
    });
  });
});
