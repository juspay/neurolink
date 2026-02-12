import { describe, it, expect } from "vitest";
import {
  isContextOverflowError,
  getContextOverflowProvider,
} from "../../../src/lib/context/errorDetection.js";

describe("Context Overflow Error Detection", () => {
  describe("isContextOverflowError", () => {
    it("should detect Anthropic overflow errors", () => {
      expect(
        isContextOverflowError(new Error("prompt is too long for this model")),
      ).toBe(true);
      expect(
        isContextOverflowError(new Error("too many tokens in the request")),
      ).toBe(true);
    });

    it("should detect OpenAI overflow errors", () => {
      expect(
        isContextOverflowError(
          new Error(
            "This model's maximum context length is 128000 tokens. However, your messages resulted in 150000 tokens.",
          ),
        ),
      ).toBe(true);
      expect(
        isContextOverflowError(
          new Error("Please reduce the length of the messages"),
        ),
      ).toBe(true);
    });

    it("should detect Google overflow errors", () => {
      expect(
        isContextOverflowError(
          new Error("exceeds the maximum number of tokens"),
        ),
      ).toBe(true);
      expect(
        isContextOverflowError(new Error("RESOURCE_EXHAUSTED: input too long")),
      ).toBe(true);
    });

    it("should detect Azure overflow errors", () => {
      expect(isContextOverflowError(new Error("content_length_exceeded"))).toBe(
        true,
      );
    });

    it("should detect Bedrock overflow errors", () => {
      expect(
        isContextOverflowError(new Error("Input is too long for the model")),
      ).toBe(true);
      expect(
        isContextOverflowError(
          new Error("ValidationException: too many token in request"),
        ),
      ).toBe(true);
    });

    it("should detect Mistral overflow errors", () => {
      expect(isContextOverflowError(new Error("context length exceeded"))).toBe(
        true,
      );
    });

    it("should return false for non-overflow errors", () => {
      expect(isContextOverflowError(new Error("rate limit exceeded"))).toBe(
        false,
      );
      expect(isContextOverflowError(new Error("authentication failed"))).toBe(
        false,
      );
      expect(isContextOverflowError(new Error("network error"))).toBe(false);
    });

    it("should handle null/undefined", () => {
      expect(isContextOverflowError(null)).toBe(false);
      expect(isContextOverflowError(undefined)).toBe(false);
    });

    it("should handle string errors", () => {
      expect(isContextOverflowError("maximum context length exceeded")).toBe(
        true,
      );
    });

    it("should handle error objects with message property", () => {
      expect(isContextOverflowError({ message: "too many tokens" })).toBe(true);
    });

    it("should handle nested error objects", () => {
      expect(
        isContextOverflowError({ error: { message: "prompt is too long" } }),
      ).toBe(true);
    });
  });

  describe("getContextOverflowProvider", () => {
    it("should identify Anthropic as the source", () => {
      expect(getContextOverflowProvider(new Error("prompt is too long"))).toBe(
        "anthropic",
      );
    });

    it("should identify OpenAI as the source", () => {
      expect(
        getContextOverflowProvider(
          new Error("This model's maximum context length is 128000"),
        ),
      ).toBe("openai");
    });

    it("should identify Google as the source", () => {
      expect(getContextOverflowProvider(new Error("RESOURCE_EXHAUSTED"))).toBe(
        "google",
      );
    });

    it("should return null for non-overflow errors", () => {
      expect(
        getContextOverflowProvider(new Error("some random error")),
      ).toBeNull();
    });
  });
});
