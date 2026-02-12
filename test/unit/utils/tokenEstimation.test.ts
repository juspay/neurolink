import { describe, expect, it } from "vitest";
import {
  CHARS_PER_TOKEN,
  estimateMessagesTokens,
  estimateMessageTokens,
  estimateTokens,
  getProviderMultiplier,
  TOKEN_SAFETY_MARGIN,
} from "../../../src/lib/utils/tokenEstimation.js";

describe("Token Estimation", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens for English text", () => {
      const text = "Hello, world!"; // 13 chars
      const tokens = estimateTokens(text);
      // 13 / 4 = 3.25, ceil = 4, then safety margin
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    it("should return 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("should apply provider multiplier", () => {
      const text = "Hello, world!";
      const base = estimateTokens(text);
      const anthropic = estimateTokens(text, "anthropic");
      expect(anthropic).toBeGreaterThan(base); // 1.23x multiplier
    });
  });

  describe("getProviderMultiplier", () => {
    it("should return correct multipliers", () => {
      expect(getProviderMultiplier("anthropic")).toBe(1.23);
      expect(getProviderMultiplier("google-ai")).toBe(1.18);
      expect(getProviderMultiplier("vertex")).toBe(1.18);
      expect(getProviderMultiplier("mistral")).toBe(1.26);
      expect(getProviderMultiplier("openai")).toBe(1.0);
    });

    it("should return 1.0 for unknown providers", () => {
      expect(getProviderMultiplier("unknown")).toBe(1.0);
    });
  });

  describe("estimateMessageTokens", () => {
    it("should estimate tokens for a ChatMessage", () => {
      const message = { role: "user" as const, content: "Hello, world!" };
      const tokens = estimateMessageTokens(message);
      expect(tokens).toBeGreaterThan(0);
    });

    it("should add message overhead", () => {
      const message = { role: "user" as const, content: "" };
      const tokens = estimateMessageTokens(message);
      // Even empty message has overhead
      expect(tokens).toBeGreaterThanOrEqual(3);
    });
  });

  describe("estimateMessagesTokens", () => {
    it("should sum tokens for multiple messages", () => {
      const messages: Array<{ role: string; content: string }> = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];
      const total = estimateMessagesTokens(messages);
      expect(total).toBeGreaterThan(0);
    });
  });
});
