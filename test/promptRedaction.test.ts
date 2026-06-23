/**
 * Unit tests for prompt redaction utilities (src/lib/utils/promptRedaction.ts).
 *
 * Run:
 *   pnpm exec vitest run test/promptRedaction.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  redactPrompt,
  createSafeMask,
  redactForClassification,
  redactForRouting,
} from "../src/lib/utils/promptRedaction.js";

describe("redactPrompt", () => {
  it("keeps the prompt intact and appends the correct word count when within length limits", () => {
    const prompt = "Search database for user records";
    const result = redactPrompt(prompt, { showWordCount: true });
    expect(result).toBe("Search database for user records [5 words]");
  });

  it("keeps the prompt intact without word count when showWordCount is false", () => {
    const prompt = "Search database for user records";
    const result = redactPrompt(prompt, { showWordCount: false });
    expect(result).toBe("Search database for user records");
  });

  it("truncates a long prompt to maxLength and appends an ellipsis and word count when exceeding limit", () => {
    const prompt = "a".repeat(50) + " " + "b".repeat(50);
    const result = redactPrompt(prompt, { maxLength: 30, showWordCount: true });
    // Should truncate to 30 characters (27 'a's + "...") and append the original 2 words count
    expect(result).toBe("a".repeat(27) + "... [2 words]");
  });

  it("truncates a long prompt to maxLength and appends an ellipsis without word count when showWordCount is false", () => {
    const prompt = "a".repeat(50);
    const result = redactPrompt(prompt, {
      maxLength: 30,
      showWordCount: false,
    });
    expect(result).toBe("a".repeat(27) + "...");
  });

  it("returns a fallback indicator when the prompt is empty", () => {
    expect(redactPrompt("")).toBe("[INVALID_PROMPT]");
  });

  it("returns a fallback indicator when the prompt is null or undefined", () => {
    expect(redactPrompt(null as unknown as string)).toBe("[INVALID_PROMPT]");
    expect(redactPrompt(undefined as unknown as string)).toBe(
      "[INVALID_PROMPT]",
    );
  });

  it("returns a fallback indicator when the prompt is not a string", () => {
    expect(redactPrompt(123 as unknown as string)).toBe("[INVALID_PROMPT]");
    expect(redactPrompt({} as unknown as string)).toBe("[INVALID_PROMPT]");
  });

  it("does not truncate a prompt when its length is exactly equal to maxLength", () => {
    const prompt = "a".repeat(100);
    const result = redactPrompt(prompt, {
      maxLength: 100,
      showWordCount: false,
    });
    expect(result).toBe("a".repeat(100));
  });

  it("truncates a prompt when its length is exactly maxLength + 1", () => {
    const prompt = "a".repeat(101);
    const result = redactPrompt(prompt, {
      maxLength: 100,
      showWordCount: false,
    });
    expect(result).toBe("a".repeat(97) + "...");
  });
});

describe("createSafeMask", () => {
  it("redacts the prompt fully and returns a summary containing character and word counts", () => {
    const prompt = "a".repeat(50) + " " + "b".repeat(49); // 100 characters total
    const result = createSafeMask(prompt);
    expect(result).toBe("[REDACTED: 100 chars, 2 words]");
  });

  it("returns a fallback indicator when the prompt is null or undefined", () => {
    expect(createSafeMask(null as unknown as string)).toBe("[INVALID_PROMPT]");
    expect(createSafeMask(undefined as unknown as string)).toBe(
      "[INVALID_PROMPT]",
    );
  });

  it("returns a fallback indicator when the prompt is empty", () => {
    expect(createSafeMask("")).toBe("[INVALID_PROMPT]");
  });

  it("returns a fallback indicator when the prompt is not a string", () => {
    expect(createSafeMask(123 as unknown as string)).toBe("[INVALID_PROMPT]");
  });
});

describe("redactForClassification", () => {
  it("keeps the prompt intact when under the 100 character limit without word count", () => {
    const prompt = "classify query";
    const result = redactForClassification(prompt);
    expect(result).toBe("classify query");
  });

  it("redacts the prompt using default classification configuration (maxLength 100, no word count)", () => {
    const prompt = "a".repeat(105);
    const result = redactForClassification(prompt);
    expect(result).toBe("a".repeat(97) + "...");
  });
});

describe("redactForRouting", () => {
  it("keeps the prompt intact when under the 100 character limit and appends word count", () => {
    const prompt = "route query";
    const result = redactForRouting(prompt);
    expect(result).toBe("route query [2 words]");
  });

  it("redacts the prompt using default routing configuration (maxLength 100, with word count)", () => {
    const prompt = "a ".repeat(55); // 110 characters
    const result = redactForRouting(prompt);

    // Behavioral assertions verify correct output structure without complex string math in the test code
    expect(result).toContain("... [55 words]");
    const redactedPart = result.split(" [")[0];
    expect(redactedPart).toHaveLength(100);
    expect(redactedPart.endsWith("...")).toBe(true);
  });
});
