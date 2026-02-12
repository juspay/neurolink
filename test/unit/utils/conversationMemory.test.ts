import { describe, expect, it } from "vitest";
import {
  calculateTokenThreshold,
  getEffectiveTokenThreshold,
} from "../../../src/lib/utils/conversationMemory.js";

describe("Token Threshold Calculation", () => {
  it("should use context window registry, not output limits", () => {
    const threshold = calculateTokenThreshold(
      "anthropic",
      "claude-sonnet-4-20250514",
    );
    // Should be ~80% of available input (200K - 64K reserve = 136K * 0.8 = 108800)
    expect(threshold).toBeGreaterThan(50_000);
    expect(threshold).toBeLessThanOrEqual(200_000);
  });

  it("should NOT use output token limits as proxy", () => {
    const threshold = calculateTokenThreshold(
      "anthropic",
      "claude-3-5-sonnet-20241022",
    );
    expect(threshold).toBeGreaterThan(10_000);
  });

  it("should handle Google AI models with 1M context", () => {
    const threshold = calculateTokenThreshold("google-ai", "gemini-2.5-flash");
    expect(threshold).toBeGreaterThan(100_000);
  });

  it("should return default-based threshold for unknown providers", () => {
    const threshold = calculateTokenThreshold(
      "unknown-provider",
      "unknown-model",
    );
    // Unknown providers use DEFAULT_CONTEXT_WINDOW (128K)
    // Available input: 128000 - 44800 (35% reserve) = 83200
    // Threshold: 83200 * 0.8 = 66560
    expect(threshold).toBe(66_560);
  });

  it("should return fallback when provider is undefined", () => {
    const threshold = calculateTokenThreshold(undefined, undefined);
    expect(threshold).toBe(50_000);
  });

  it("should respect session override", () => {
    const threshold = getEffectiveTokenThreshold(
      "anthropic",
      "claude-sonnet-4-20250514",
      undefined,
      30_000,
    );
    expect(threshold).toBe(30_000);
  });

  it("should respect env override", () => {
    const threshold = getEffectiveTokenThreshold(
      "anthropic",
      "claude-sonnet-4-20250514",
      50_000,
    );
    expect(threshold).toBe(50_000);
  });

  it("should calculate model-based threshold when no overrides", () => {
    const threshold = getEffectiveTokenThreshold(
      "anthropic",
      "claude-sonnet-4-20250514",
    );
    // 200000 - 64000 = 136000 * 0.8 = 108800
    expect(threshold).toBe(108_800);
  });
});
