import { describe, expect, it } from "vitest";
import {
  createModelString,
  getProviderConfig,
  hasProviderPrefix,
  inferProvider,
  isKnownProvider,
  normalizeModelName,
  normalizeProviderName,
  parseModelString,
  validateModelString,
} from "../../../src/lib/gateway/modelStringParser.js";

describe("modelStringParser", () => {
  describe("parseModelString", () => {
    it("should parse valid provider/model strings", () => {
      const result = parseModelString("openai/gpt-4o");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should parse anthropic provider correctly", () => {
      const result = parseModelString("anthropic/claude-3-5-sonnet");
      expect(result.provider).toBe("anthropic");
      expect(result.modelName).toBe("claude-3-5-sonnet");
    });

    it("should parse google provider correctly", () => {
      const result = parseModelString("google/gemini-2.0-flash");
      expect(result.provider).toBe("google");
      expect(result.modelName).toBe("gemini-2.0-flash");
    });

    it("should parse strings with multiple slashes", () => {
      const result = parseModelString("meta-llama/llama-3.1-70b-instruct");
      expect(result.provider).toBe("meta-llama");
      expect(result.modelName).toBe("llama-3.1-70b-instruct");
    });

    it("should infer provider for model-only strings", () => {
      const result = parseModelString("gpt-4o");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should infer anthropic for claude models", () => {
      const result = parseModelString("claude-3-5-sonnet");
      expect(result.provider).toBe("anthropic");
      expect(result.modelName).toBe("claude-3-5-sonnet");
    });

    it("should infer google for gemini models", () => {
      const result = parseModelString("gemini-2.0-flash");
      expect(result.provider).toBe("google");
      expect(result.modelName).toBe("gemini-2.0-flash");
    });

    it("should trim whitespace", () => {
      const result = parseModelString("  openai/gpt-4o  ");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should return default for empty string", () => {
      const result = parseModelString("");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should return default for whitespace-only string", () => {
      const result = parseModelString("   ");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });
  });

  describe("inferProvider", () => {
    it("should infer openai for gpt models", () => {
      expect(inferProvider("gpt-4o").provider).toBe("openai");
      expect(inferProvider("gpt-4-turbo").provider).toBe("openai");
      expect(inferProvider("gpt-3.5-turbo").provider).toBe("openai");
    });

    it("should infer openai for o1/o3/o4 models", () => {
      expect(inferProvider("o1-preview").provider).toBe("openai");
      expect(inferProvider("o3-mini").provider).toBe("openai");
      expect(inferProvider("o4-mini").provider).toBe("openai");
    });

    it("should infer anthropic for claude models", () => {
      expect(inferProvider("claude-3-5-sonnet").provider).toBe("anthropic");
      expect(inferProvider("claude-3-opus").provider).toBe("anthropic");
    });

    it("should infer google for gemini/gemma models", () => {
      expect(inferProvider("gemini-2.0-flash").provider).toBe("google");
      expect(inferProvider("gemma-2-9b").provider).toBe("google");
    });

    it("should infer mistral for mistral/mixtral models", () => {
      expect(inferProvider("mistral-large").provider).toBe("mistral");
      expect(inferProvider("mixtral-8x7b").provider).toBe("mistral");
      expect(inferProvider("codestral-latest").provider).toBe("mistral");
    });

    it("should infer meta-llama for llama models", () => {
      expect(inferProvider("llama-3.1-70b").provider).toBe("meta-llama");
    });

    it("should infer deepseek for deepseek models", () => {
      expect(inferProvider("deepseek-coder").provider).toBe("deepseek");
    });

    it("should default to openrouter for unknown models", () => {
      expect(inferProvider("unknown-model-xyz").provider).toBe("openrouter");
    });
  });

  describe("normalizeProviderName", () => {
    it("should normalize known providers", () => {
      expect(normalizeProviderName("openai")).toBe("openai");
      expect(normalizeProviderName("anthropic")).toBe("anthropic");
      expect(normalizeProviderName("google")).toBe("google");
    });

    it("should handle common aliases", () => {
      expect(normalizeProviderName("gpt")).toBe("openai");
      expect(normalizeProviderName("chatgpt")).toBe("openai");
      expect(normalizeProviderName("claude")).toBe("anthropic");
      expect(normalizeProviderName("gemini")).toBe("google");
    });

    it("should be case insensitive", () => {
      expect(normalizeProviderName("OpenAI")).toBe("openai");
      expect(normalizeProviderName("ANTHROPIC")).toBe("anthropic");
      expect(normalizeProviderName("Google")).toBe("google");
    });

    it("should handle meta aliases", () => {
      expect(normalizeProviderName("meta")).toBe("meta-llama");
      expect(normalizeProviderName("llama")).toBe("meta-llama");
      expect(normalizeProviderName("meta-ai")).toBe("meta-llama");
    });

    it("should handle xAI aliases", () => {
      expect(normalizeProviderName("grok")).toBe("x");
      expect(normalizeProviderName("xai")).toBe("x");
    });

    it("should return lowercase for unknown providers", () => {
      expect(normalizeProviderName("UNKNOWN")).toBe("unknown");
    });

    it("should trim whitespace", () => {
      expect(normalizeProviderName("  openai  ")).toBe("openai");
    });
  });

  describe("normalizeModelName", () => {
    it("should preserve original casing", () => {
      expect(normalizeModelName("GPT-4o")).toBe("GPT-4o");
      expect(normalizeModelName("Claude-3-Opus")).toBe("Claude-3-Opus");
    });

    it("should trim whitespace", () => {
      expect(normalizeModelName("  gpt-4o  ")).toBe("gpt-4o");
    });
  });

  describe("hasProviderPrefix", () => {
    it("should return true for strings with provider prefix", () => {
      expect(hasProviderPrefix("openai/gpt-4o")).toBe(true);
      expect(hasProviderPrefix("anthropic/claude-3-5-sonnet")).toBe(true);
    });

    it("should return false for strings without provider prefix", () => {
      expect(hasProviderPrefix("gpt-4o")).toBe(false);
      expect(hasProviderPrefix("claude-3-5-sonnet")).toBe(false);
    });
  });

  describe("createModelString", () => {
    it("should create valid model strings", () => {
      expect(createModelString("openai", "gpt-4o")).toBe("openai/gpt-4o");
      expect(createModelString("anthropic", "claude-3-5-sonnet")).toBe(
        "anthropic/claude-3-5-sonnet",
      );
    });

    it("should normalize provider name", () => {
      expect(createModelString("GPT", "gpt-4o")).toBe("openai/gpt-4o");
      expect(createModelString("Claude", "claude-3-5-sonnet")).toBe(
        "anthropic/claude-3-5-sonnet",
      );
    });
  });

  describe("isKnownProvider", () => {
    it("should return true for known providers", () => {
      expect(isKnownProvider("openai")).toBe(true);
      expect(isKnownProvider("anthropic")).toBe(true);
      expect(isKnownProvider("google")).toBe(true);
      expect(isKnownProvider("mistral")).toBe(true);
    });

    it("should return true for gateway-only providers", () => {
      expect(isKnownProvider("groq")).toBe(true);
      expect(isKnownProvider("deepseek")).toBe(true);
      expect(isKnownProvider("perplexity")).toBe(true);
    });

    it("should return false for unknown providers", () => {
      expect(isKnownProvider("unknown-provider")).toBe(false);
    });

    it("should handle aliases", () => {
      expect(isKnownProvider("gpt")).toBe(true);
      expect(isKnownProvider("claude")).toBe(true);
    });
  });

  describe("getProviderConfig", () => {
    it("should return config for known providers", () => {
      const openaiConfig = getProviderConfig("openai");
      expect(openaiConfig).toBeDefined();
      expect(openaiConfig?.id).toBe("openai");
      expect(openaiConfig?.name).toBe("OpenAI");
    });

    it("should return undefined for unknown providers", () => {
      expect(getProviderConfig("unknown-provider")).toBeUndefined();
    });

    it("should handle aliases", () => {
      const config = getProviderConfig("gpt");
      expect(config).toBeDefined();
      expect(config?.id).toBe("openai");
    });
  });

  describe("validateModelString", () => {
    it("should validate correct model strings", () => {
      const result = validateModelString("openai/gpt-4o");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect empty strings", () => {
      const result = validateModelString("");
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        "Model string must be a non-empty string",
      );
    });

    it("should detect whitespace-only strings", () => {
      const result = validateModelString("   ");
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Model string is empty");
    });

    it("should warn about leading/trailing whitespace", () => {
      const result = validateModelString("  openai/gpt-4o  ");
      expect(result.issues).toContain(
        "Model string has leading/trailing whitespace",
      );
    });

    it("should allow multiple slashes for nested models", () => {
      const result = validateModelString(
        "meta-llama/llama-3.1-70b-instruct/chat",
      );
      // Multiple slashes are allowed, just logged as debug
      expect(result.valid).toBe(true);
    });
  });
});
