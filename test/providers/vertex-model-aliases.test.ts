import { describe, it, expect } from "vitest";
import { VERTEX_MODEL_ALIASES } from "../../src/lib/providers/googleVertex.js";

describe("Vertex Model Aliases", () => {
  describe("Claude shorthand aliases", () => {
    it("should resolve claude-sonnet-4-5 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-sonnet-4-5"]).toBe(
        "claude-sonnet-4-5@20250929",
      );
    });

    it("should resolve claude-opus-4-5 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-opus-4-5"]).toBe(
        "claude-opus-4-5@20251124",
      );
    });

    it("should resolve claude-haiku-4-5 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-haiku-4-5"]).toBe(
        "claude-haiku-4-5@20251001",
      );
    });

    it("should resolve claude-sonnet-4 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-sonnet-4"]).toBe(
        "claude-sonnet-4@20250514",
      );
    });

    it("should resolve claude-opus-4 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-opus-4"]).toBe(
        "claude-opus-4@20250514",
      );
    });

    it("should resolve claude-opus-4-1 to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-opus-4-1"]).toBe(
        "claude-opus-4-1@20250805",
      );
    });

    it("should resolve claude-3-7-sonnet to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-7-sonnet"]).toBe(
        "claude-3-7-sonnet@20250219",
      );
    });

    it("should resolve claude-3-5-sonnet to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-5-sonnet"]).toBe(
        "claude-3-5-sonnet-20241022",
      );
    });

    it("should resolve claude-3-5-haiku to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-5-haiku"]).toBe(
        "claude-3-5-haiku-20241022",
      );
    });

    it("should resolve claude-3-opus to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-opus"]).toBe(
        "claude-3-opus-20240229",
      );
    });

    it("should resolve claude-3-sonnet to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-sonnet"]).toBe(
        "claude-3-sonnet-20240229",
      );
    });

    it("should resolve claude-3-haiku to versioned name", () => {
      expect(VERTEX_MODEL_ALIASES["claude-3-haiku"]).toBe(
        "claude-3-haiku-20240307",
      );
    });
  });

  describe("Gemini shorthand aliases", () => {
    it("should resolve gemini-3-pro to latest", () => {
      expect(VERTEX_MODEL_ALIASES["gemini-3-pro"]).toBe("gemini-3-pro-latest");
    });

    it("should resolve gemini-3-flash to latest", () => {
      expect(VERTEX_MODEL_ALIASES["gemini-3-flash"]).toBe(
        "gemini-3-flash-latest",
      );
    });
  });

  describe("already-qualified names", () => {
    it("should not have entries for already-versioned model names", () => {
      expect(
        VERTEX_MODEL_ALIASES["claude-sonnet-4-5@20250929"],
      ).toBeUndefined();
      expect(
        VERTEX_MODEL_ALIASES["claude-3-5-sonnet-20241022"],
      ).toBeUndefined();
      expect(VERTEX_MODEL_ALIASES["gemini-3-pro-latest"]).toBeUndefined();
    });

    it("should pass through unknown names when used with fallback", () => {
      const unknownModel = "some-future-model-v2@20260101";
      const resolved = VERTEX_MODEL_ALIASES[unknownModel] || unknownModel;
      expect(resolved).toBe(unknownModel);
    });
  });
});
