import { describe, expect, it } from "vitest";
import {
  getAvailableInputTokens,
  getContextWindowSize,
  getOutputReserve,
  MODEL_CONTEXT_WINDOWS,
} from "../../../src/lib/constants/contextWindows.js";

describe("Context Window Registry", () => {
  describe("MODEL_CONTEXT_WINDOWS", () => {
    it("should have entries for all major providers", () => {
      expect(MODEL_CONTEXT_WINDOWS.anthropic).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.openai).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS["google-ai"]).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.vertex).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.bedrock).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.azure).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.mistral).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.ollama).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS.litellm).toBeDefined();
    });
  });

  describe("getContextWindowSize", () => {
    it("should return correct context window for known models", () => {
      expect(
        getContextWindowSize("anthropic", "claude-sonnet-4-20250514"),
      ).toBe(200_000);
      expect(getContextWindowSize("openai", "gpt-4o")).toBe(128_000);
      expect(getContextWindowSize("google-ai", "gemini-2.5-flash")).toBe(
        1_048_576,
      );
    });

    it("should return provider default for unknown models", () => {
      expect(getContextWindowSize("anthropic", "unknown-model")).toBe(200_000);
      expect(getContextWindowSize("openai", "unknown-model")).toBe(128_000);
    });

    it("should return global default for unknown providers", () => {
      expect(
        getContextWindowSize("unknown-provider" as string, "unknown-model"),
      ).toBe(128_000);
    });
  });

  describe("getOutputReserve", () => {
    it("should reserve 35% of context when maxTokens not specified", () => {
      const reserve = getOutputReserve(200_000);
      expect(reserve).toBe(Math.min(64_000, Math.ceil(200_000 * 0.35)));
    });

    it("should use maxTokens when specified", () => {
      expect(getOutputReserve(200_000, 8192)).toBe(8192);
    });

    it("should cap default reserve at 64000", () => {
      const reserve = getOutputReserve(1_000_000);
      expect(reserve).toBe(64_000);
    });
  });

  describe("getAvailableInputTokens", () => {
    it("should calculate available input space", () => {
      const available = getAvailableInputTokens(
        "anthropic",
        "claude-sonnet-4-20250514",
      );
      // 200000 - reserve(min(64000, 200000*0.35)=64000) = 136000
      expect(available).toBe(136_000);
    });

    it("should account for custom maxTokens", () => {
      const available = getAvailableInputTokens(
        "anthropic",
        "claude-sonnet-4-20250514",
        8192,
      );
      // 200000 - 8192 = 191808
      expect(available).toBe(191_808);
    });
  });
});
