/**
 * Model String Parser Tests
 *
 * Tests for parsing unified model string format (provider/model)
 *
 * @see src/lib/gateway/modelStringParser.ts
 */

import { describe, it, expect } from "vitest";
import {
  parseModelString,
  inferProvider,
  normalizeProviderName,
  normalizeModelName,
  hasProviderPrefix,
  createModelString,
  isKnownProvider,
  validateModelString,
} from "../../src/lib/gateway/modelStringParser.js";

describe("ModelStringParser", () => {
  describe("parseModelString", () => {
    it("should parse simple provider/model format", () => {
      const result = parseModelString("openai/gpt-4");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4");
    });

    it("should parse nested provider/org/model format", () => {
      const result = parseModelString("meta-llama/llama-3.1-70b-instruct");
      expect(result.provider).toBe("meta-llama");
      expect(result.modelName).toBe("llama-3.1-70b-instruct");
    });

    it("should handle model-only strings", () => {
      const result = parseModelString("gpt-4o");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should normalize provider names", () => {
      const result = parseModelString("Google/gemini-pro");
      expect(result.provider).toBe("google");
    });

    it("should trim whitespace", () => {
      const result = parseModelString("  openai/gpt-4  ");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4");
    });

    it("should handle empty strings", () => {
      const result = parseModelString("");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });
  });

  describe("provider inference", () => {
    it("should infer OpenAI from gpt-* models", () => {
      const result = inferProvider("gpt-4");
      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4");
    });

    it("should infer OpenAI from o1-* models", () => {
      const result = inferProvider("o1-preview");
      expect(result.provider).toBe("openai");
    });

    it("should infer OpenAI from o3-* models", () => {
      const result = inferProvider("o3-mini");
      expect(result.provider).toBe("openai");
    });

    it("should infer Anthropic from claude-* models", () => {
      const result = inferProvider("claude-3-5-sonnet");
      expect(result.provider).toBe("anthropic");
    });

    it("should infer Google from gemini-* models", () => {
      const result = inferProvider("gemini-pro");
      expect(result.provider).toBe("google");
    });

    it("should infer Mistral from mistral-* models", () => {
      const result = inferProvider("mistral-large");
      expect(result.provider).toBe("mistral");
    });

    it("should infer Mistral from mixtral-* models", () => {
      const result = inferProvider("mixtral-8x7b");
      expect(result.provider).toBe("mistral");
    });

    it("should infer meta-llama from llama-* models", () => {
      const result = inferProvider("llama-3-70b");
      expect(result.provider).toBe("meta-llama");
    });

    it("should default to openrouter for unknown patterns", () => {
      const result = inferProvider("unknown-model-xyz");
      expect(result.provider).toBe("openrouter");
    });
  });

  describe("formatModelString", () => {
    it("should format provider and model into string", () => {
      const result = createModelString("openai", "gpt-4");
      expect(result).toBe("openai/gpt-4");
    });

    it("should handle special characters", () => {
      const result = createModelString("meta-llama", "llama-3.1-70b");
      expect(result).toBe("meta-llama/llama-3.1-70b");
    });
  });

  describe("validateModelString", () => {
    it("should validate correct format", () => {
      const result = validateModelString("openai/gpt-4");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should reject invalid formats", () => {
      const result = validateModelString("");
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should provide helpful error messages", () => {
      const result = validateModelString("  spaces  ");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("whitespace"))).toBe(true);
    });
  });

  describe("isGatewayModelString", () => {
    it("should detect provider/model format", () => {
      expect(hasProviderPrefix("openai/gpt-4")).toBe(true);
      expect(hasProviderPrefix("anthropic/claude-3")).toBe(true);
    });

    it("should reject plain model names", () => {
      expect(hasProviderPrefix("gpt-4")).toBe(false);
      expect(hasProviderPrefix("claude-3")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(hasProviderPrefix("")).toBe(false);
      expect(hasProviderPrefix("/model")).toBe(true);
      expect(hasProviderPrefix("provider/")).toBe(true);
    });
  });
});
