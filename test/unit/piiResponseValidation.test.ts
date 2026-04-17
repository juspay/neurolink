/**
 * Unit tests for the new PII detection and response validation utilities
 * that are wired directly into generate() and stream().
 */

import { describe, it, expect } from "vitest";
import { detectAndRedactPII } from "../../src/lib/utils/piiDetector.js";
import { validateResponse } from "../../src/lib/utils/responseValidator.js";
import {
  TripwireEvaluator,
  createDefaultTripwireEvaluator,
  commonTripwires,
} from "../../src/lib/utils/tripwireEvaluator.js";

describe("PII Detector", () => {
  it("detects and redacts email addresses", async () => {
    const result = await detectAndRedactPII(
      "Contact me at john.doe@example.com for details",
      { action: "redact", detectTypes: ["email"] },
    );
    expect(result.action).toBe("continue");
    expect(result.text).not.toContain("john.doe@example.com");
    expect(result.text).toContain("[REDACTED]");
    expect(result.detectedPII).toHaveLength(1);
    expect(result.detectedPII[0].type).toBe("email");
  });

  it("aborts when action is abort and PII is found", async () => {
    const result = await detectAndRedactPII("My SSN is 123-45-6789", {
      action: "abort",
      detectTypes: ["ssn"],
    });
    expect(result.action).toBe("abort");
    expect(result.detectedPII).toHaveLength(1);
    expect(result.detectedPII[0].type).toBe("ssn");
  });

  it("returns continue with original text when no PII found", async () => {
    const result = await detectAndRedactPII(
      "Just a plain sentence with no sensitive data",
      { action: "redact", detectTypes: ["email", "ssn"] },
    );
    expect(result.action).toBe("continue");
    expect(result.detectedPII).toHaveLength(0);
  });

  it("skips PII types in allowList", async () => {
    // allowList contains PII types to skip detection for entirely
    const result = await detectAndRedactPII("Contact me at john@example.com", {
      action: "redact",
      detectTypes: ["email"],
      allowList: ["email"], // skip detecting emails
    });
    expect(result.detectedPII).toHaveLength(0);
    expect(result.text).toContain("john@example.com");
  });

  it("skips non-RegExp custom patterns safely (bug C10 fix)", async () => {
    const result = await detectAndRedactPII("Some text with CUSTOM-123", {
      action: "redact",
      customPatterns: ["not-a-regex" as unknown as RegExp, /CUSTOM-\d+/g],
    });
    // Should not crash; valid regex still works
    expect(result.action).toBe("continue");
    expect(result.detectedPII.some((p) => p.type === "custom")).toBe(true);
  });
});

describe("Response Validator", () => {
  it("accepts response within length bounds", () => {
    const result = validateResponse("This is a valid response", {
      minLength: 5,
      maxLength: 100,
    });
    expect(result.action).toBe("continue");
    expect(result.issues).toHaveLength(0);
  });

  it("aborts on response too short", () => {
    const result = validateResponse("Hi", { minLength: 50 });
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("truncates response exceeding maxLength with suffix", () => {
    const longText = "A".repeat(200);
    const result = validateResponse(longText, {
      maxLength: 50,
      truncationAction: "truncate",
      truncationSuffix: "...",
    });
    expect(result.action).toBe("continue");
    expect(result.text.length).toBe(50);
    expect(result.text).toMatch(/\.\.\.$/);
  });

  it("handles maxLength smaller than suffix (bug C6 fix)", () => {
    const result = validateResponse("A".repeat(20), {
      maxLength: 2,
      truncationAction: "truncate",
      truncationSuffix: "...",
    });
    // Must not exceed maxLength even when suffix > maxLength
    expect(result.text.length).toBeLessThanOrEqual(2);
  });

  it("signals retry when truncationAction is retry", () => {
    const result = validateResponse("A".repeat(200), {
      maxLength: 50,
      truncationAction: "retry",
    });
    expect(result.action).toBe("retry");
    expect(result.feedback).toContain("shorten");
  });

  it("rejects null as valid JSON object (bug C5 fix)", () => {
    const result = validateResponse("null", {
      jsonSchema: { type: "object" },
    });
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("validates required phrases", () => {
    const result = validateResponse("This is my conclusion.", {
      requiredPhrases: ["conclusion"],
    });
    expect(result.action).toBe("continue");
    expect(result.issues).toHaveLength(0);
  });

  it("flags forbidden phrases", () => {
    const result = validateResponse("I cannot help you with that.", {
      forbiddenPhrases: ["I cannot"],
    });
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
  });
});

describe("Tripwire Evaluator", () => {
  it("returns no result when nothing triggers", () => {
    const evaluator = createDefaultTripwireEvaluator();
    const result = evaluator.evaluate({
      responseText: "A valid response",
      latencyMs: 1000,
    });
    expect(result.triggered).toBe(false);
  });

  it("triggers on empty response", () => {
    const evaluator = createDefaultTripwireEvaluator();
    const result = evaluator.evaluate({ responseText: "   " });
    expect(result.triggered).toBe(true);
    expect(result.tripwire?.id).toBe("empty-response");
  });

  it("triggers on max tokens hit", () => {
    const evaluator = createDefaultTripwireEvaluator();
    const result = evaluator.evaluate({
      responseText: "partial response",
      finishReason: "length",
    });
    expect(result.triggered).toBe(true);
    expect(result.tripwire?.id).toBe("max-tokens");
  });

  it("does not short-circuit warnings masking aborts (bug C1 fix)", () => {
    const evaluator = new TripwireEvaluator();
    // Register a warning first
    evaluator.register({
      id: "warn-1",
      name: "Warning",
      description: "Some warning",
      action: "warn",
      condition: () => true,
    });
    // Register an abort AFTER the warning
    evaluator.register({
      id: "abort-1",
      name: "Abort",
      description: "Some abort",
      action: "abort",
      condition: () => true,
    });

    const result = evaluator.evaluate({ responseText: "test" });
    // The abort must win, not the earlier-registered warning
    expect(result.triggered).toBe(true);
    expect(result.action).toBe("abort");
    expect(result.tripwire?.id).toBe("abort-1");
  });

  it("has all 7 common tripwires", () => {
    const ids = commonTripwires.map((t) => t.id);
    expect(ids).toContain("max-tokens");
    expect(ids).toContain("empty-response");
    expect(ids).toContain("repetition-loop");
    expect(ids).toContain("input-too-long");
    expect(ids).toContain("too-many-messages");
    expect(ids).toContain("response-too-long");
    expect(ids).toContain("high-latency");
    expect(ids).toHaveLength(7);
  });
});
