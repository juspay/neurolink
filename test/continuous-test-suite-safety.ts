#!/usr/bin/env tsx

/**
 * Continuous Test Suite: Safety Utilities
 *
 * Tests for the three standalone safety utilities wired into generate() and stream():
 *   - PII detection and redaction  (piiDetector.ts)
 *   - Response validation           (responseValidator.ts)
 *   - Tripwire evaluation           (tripwireEvaluator.ts)
 *
 * Includes regression tests for specific bug fixes:
 *   - C1:  Tripwire evaluate() must promote highest-severity action, not first-match
 *   - C3:  PII detection uses per-field scanning with field-local offsets
 *   - C5:  JSON schema validation rejects null as a valid object
 *   - C6:  Truncation clamps keepLength to 0 when suffix > maxLength
 *   - C10: Custom regex patterns are validated before execution
 *
 * Run: npx tsx test/continuous-test-suite-safety.ts
 */

import { detectAndRedactPII } from "../src/lib/utils/piiDetector.js";
import { validateResponse } from "../src/lib/utils/responseValidator.js";
import {
  TripwireEvaluator,
  createDefaultTripwireEvaluator,
  commonTripwires,
} from "../src/lib/utils/tripwireEvaluator.js";

// ============================================================================
// Types
// ============================================================================

type TestFunction = {
  name: string;
  fn: () => Promise<boolean | null>;
  category?: string;
};

type TestResult = {
  name: string;
  result: boolean | null;
  error: string | null;
};

type ColorName = "reset" | "bright" | "red" | "green" | "yellow" | "cyan";

// ============================================================================
// Helpers
// ============================================================================

const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(title, "cyan");
  log("=".repeat(60), "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP",
  details = "",
): void {
  const color: ColorName =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(`[${status}] ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ============================================================================
// Tests
// ============================================================================

const tests: TestFunction[] = [
  // ---------- PII Detector ----------
  {
    name: "piiDetector: redacts email addresses",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII(
        "Contact me at john.doe@example.com for details",
        { action: "redact", detectTypes: ["email"] },
      );
      return (
        result.action === "continue" &&
        !result.text.includes("john.doe@example.com") &&
        result.text.includes("[REDACTED]") &&
        result.detectedPII.length === 1 &&
        result.detectedPII[0].type === "email"
      );
    },
  },
  {
    name: "piiDetector: aborts when action is abort and PII is found",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("My SSN is 123-45-6789", {
        action: "abort",
        detectTypes: ["ssn"],
      });
      return (
        result.action === "abort" &&
        result.detectedPII.length === 1 &&
        result.detectedPII[0].type === "ssn"
      );
    },
  },
  {
    name: "piiDetector: returns continue with no PII found",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII(
        "Just a plain sentence with no sensitive data",
        { action: "redact", detectTypes: ["email", "ssn"] },
      );
      return result.action === "continue" && result.detectedPII.length === 0;
    },
  },
  {
    name: "piiDetector: skips PII types in allowList",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII(
        "Contact me at john@example.com",
        { action: "redact", detectTypes: ["email"], allowList: ["email"] },
      );
      return (
        result.detectedPII.length === 0 &&
        result.text.includes("john@example.com")
      );
    },
  },
  {
    name: "piiDetector: warns without redacting when action is warn",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("My SSN is 123-45-6789", {
        action: "warn",
        detectTypes: ["ssn"],
      });
      return (
        result.action === "continue" &&
        result.text.includes("123-45-6789") &&
        result.detectedPII.length === 1 &&
        result.feedback !== undefined &&
        result.feedback.includes("not redacted")
      );
    },
  },
  {
    name: "piiDetector: handles empty text without crashing",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("", {
        action: "redact",
        detectTypes: ["email"],
      });
      return (
        result.action === "continue" &&
        result.text === "" &&
        result.detectedPII.length === 0
      );
    },
  },
  {
    name: "piiDetector: detects multiple PII types in single text",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII(
        "Email: john@example.com, SSN: 123-45-6789, Card: 4111 1111 1111 1111",
        { action: "redact", detectTypes: ["email", "ssn", "creditCard"] },
      );
      const types = result.detectedPII.map((d) => d.type);
      return (
        result.detectedPII.length >= 3 &&
        types.includes("email") &&
        types.includes("ssn") &&
        types.includes("creditCard") &&
        !result.text.includes("john@example.com") &&
        !result.text.includes("123-45-6789")
      );
    },
  },
  {
    name: "piiDetector: uses custom redaction text",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("Email: john@example.com", {
        action: "redact",
        detectTypes: ["email"],
        redactionText: "***",
      });
      return result.text.includes("***") && !result.text.includes("[REDACTED]");
    },
  },
  {
    name: "piiDetector: skips non-RegExp custom patterns safely (bug C10)",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("Some text with CUSTOM-123", {
        action: "redact",
        customPatterns: ["not-a-regex" as unknown as RegExp, /CUSTOM-\d+/g],
      });
      return (
        result.action === "continue" &&
        result.detectedPII.some((p) => p.type === "custom")
      );
    },
  },
  {
    name: "piiDetector: custom patterns detect matches",
    category: "pii-detector",
    fn: async () => {
      const result = await detectAndRedactPII("Order ID: ORD-2026-0042", {
        action: "redact",
        customPatterns: [/ORD-\d{4}-\d{4}/g],
      });
      return (
        result.detectedPII.length === 1 &&
        result.detectedPII[0].type === "custom" &&
        result.detectedPII[0].value === "ORD-2026-0042" &&
        !result.text.includes("ORD-2026-0042")
      );
    },
  },

  // ---------- Response Validator ----------
  {
    name: "responseValidator: accepts response within length bounds",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("This is a valid response", {
        minLength: 5,
        maxLength: 100,
      });
      return result.action === "continue" && result.issues.length === 0;
    },
  },
  {
    name: "responseValidator: flags response below minLength as error",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("Hi", { minLength: 50 });
      return (
        result.issues.some(
          (i) => i.severity === "error" && i.category === "length",
        ) && result.issues[0].message.includes("below required minimum")
      );
    },
  },
  {
    name: "responseValidator: truncates response exceeding maxLength with suffix",
    category: "response-validator",
    fn: async () => {
      const longText = "A".repeat(200);
      const result = validateResponse(longText, {
        maxLength: 50,
        truncationAction: "truncate",
        truncationSuffix: "...",
      });
      return (
        result.action === "continue" &&
        result.text.length === 50 &&
        result.text.endsWith("...")
      );
    },
  },
  {
    name: "responseValidator: clamps keepLength to 0 when suffix > maxLength (bug C6)",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("A".repeat(20), {
        maxLength: 2,
        truncationAction: "truncate",
        truncationSuffix: "...",
      });
      return result.text.length <= 2;
    },
  },
  {
    name: "responseValidator: abort action on maxLength exceeded",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("A".repeat(200), {
        maxLength: 50,
        truncationAction: "abort",
      });
      return result.action === "abort" && result.feedback !== undefined;
    },
  },
  {
    name: "responseValidator: retry action on maxLength exceeded",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("A".repeat(200), {
        maxLength: 50,
        truncationAction: "retry",
      });
      return (
        result.action === "retry" &&
        result.feedback !== undefined &&
        result.feedback.includes("shorten")
      );
    },
  },
  {
    name: "responseValidator: warn action logs but does not mutate text",
    category: "response-validator",
    fn: async () => {
      const original = "A".repeat(200);
      const result = validateResponse(original, {
        maxLength: 50,
        truncationAction: "warn",
      });
      return (
        result.action === "continue" &&
        result.text === original &&
        result.issues.some((i) => i.severity === "warning")
      );
    },
  },
  {
    name: "responseValidator: rejects null as valid JSON object (bug C5)",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("null", {
        jsonSchema: { type: "object" },
      });
      return result.issues.some(
        (i) =>
          i.severity === "error" &&
          i.category === "json_schema" &&
          i.message.includes("got null"),
      );
    },
  },
  {
    name: "responseValidator: validates JSON schema with required properties",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse('{"name":"Alice"}', {
        jsonSchema: {
          type: "object",
          required: ["name", "age"],
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      });
      return result.issues.some(
        (i) =>
          i.severity === "error" &&
          i.message.includes('Required property "age"'),
      );
    },
  },
  {
    name: "responseValidator: validates JSON schema with nested types",
    category: "response-validator",
    fn: async () => {
      const valid = validateResponse('{"name":"Alice","age":30}', {
        jsonSchema: {
          type: "object",
          required: ["name", "age"],
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      });
      const invalid = validateResponse('{"name":"Alice","age":"thirty"}', {
        jsonSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      });
      return (
        valid.action === "continue" &&
        valid.issues.length === 0 &&
        invalid.issues.some((i) => i.severity === "error")
      );
    },
  },
  {
    name: "responseValidator: rejects invalid JSON when jsonSchema is set",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("not json at all", {
        jsonSchema: { type: "object" },
      });
      return result.issues.some(
        (i) => i.severity === "error" && i.message.includes("not valid JSON"),
      );
    },
  },
  {
    name: "responseValidator: validates required phrases (case-insensitive)",
    category: "response-validator",
    fn: async () => {
      const pass = validateResponse("This is my CONCLUSION.", {
        requiredPhrases: ["conclusion"],
      });
      const fail = validateResponse("This is my summary.", {
        requiredPhrases: ["conclusion"],
      });
      return (
        pass.action === "continue" &&
        pass.issues.length === 0 &&
        fail.issues.some(
          (i) => i.severity === "error" && i.category === "phrase",
        )
      );
    },
  },
  {
    name: "responseValidator: flags forbidden phrases",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("I cannot help you with that.", {
        forbiddenPhrases: ["I cannot"],
      });
      return result.issues.some(
        (i) =>
          i.severity === "error" &&
          i.category === "phrase" &&
          i.message.includes("Forbidden"),
      );
    },
  },
  {
    name: "responseValidator: custom validator function",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("Hello world", {
        customValidator: (text) =>
          text.includes("world")
            ? {
                category: "custom",
                severity: "error",
                message: "No world allowed",
              }
            : null,
      });
      return result.issues.some(
        (i) => i.category === "custom" && i.message === "No world allowed",
      );
    },
  },
  {
    name: "responseValidator: retryOnFailure returns retry action on errors",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("Hi", {
        minLength: 100,
        retryOnFailure: true,
      });
      return (
        result.action === "retry" &&
        result.feedback !== undefined &&
        result.feedback.includes("failed validation")
      );
    },
  },
  {
    name: "responseValidator: retryCount is echoed back",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse("Hello", { minLength: 3 }, 5);
      return result.retryCount === 5;
    },
  },
  {
    name: "responseValidator: JSON schema array items validation",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse('[1, "two", 3]', {
        jsonSchema: {
          type: "array",
          items: { type: "number" },
        },
      });
      return result.issues.some(
        (i) =>
          i.severity === "error" &&
          i.message.includes("Expected type") &&
          i.message.includes("[1]"),
      );
    },
  },
  {
    name: "responseValidator: JSON schema number min/max constraints",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse('{"score": 150}', {
        jsonSchema: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
          },
        },
      });
      return result.issues.some(
        (i) => i.severity === "error" && i.message.includes("exceeds maximum"),
      );
    },
  },
  {
    name: "responseValidator: JSON schema enum constraint",
    category: "response-validator",
    fn: async () => {
      const result = validateResponse('"purple"', {
        jsonSchema: { type: "string", enum: ["red", "green", "blue"] },
      });
      return result.issues.some(
        (i) => i.severity === "error" && i.message.includes("must be one of"),
      );
    },
  },

  // ---------- Tripwire Evaluator ----------
  {
    name: "tripwireEvaluator: returns not-triggered when nothing fires",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({
        responseText: "A valid response",
        latencyMs: 1000,
      });
      return result.triggered === false;
    },
  },
  {
    name: "tripwireEvaluator: triggers on empty response",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({ responseText: "   " });
      return (
        result.triggered === true && result.tripwire?.id === "empty-response"
      );
    },
  },
  {
    name: "tripwireEvaluator: triggers on max tokens hit (finishReason=length)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({
        responseText: "partial response",
        finishReason: "length",
      });
      return result.triggered === true && result.tripwire?.id === "max-tokens";
    },
  },
  {
    name: "tripwireEvaluator: triggers on high latency (>30s)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({
        responseText: "ok",
        latencyMs: 45_000,
      });
      return (
        result.triggered === true &&
        result.tripwire?.id === "high-latency" &&
        result.action === "warn"
      );
    },
  },
  {
    name: "tripwireEvaluator: triggers on input too long (>100K chars)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({
        inputText: "x".repeat(100_001),
      });
      return (
        result.triggered === true &&
        result.tripwire?.id === "input-too-long" &&
        result.action === "abort"
      );
    },
  },
  {
    name: "tripwireEvaluator: triggers on too many messages (>100)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({ messageCount: 150 });
      return (
        result.triggered === true &&
        result.tripwire?.id === "too-many-messages" &&
        result.action === "warn"
      );
    },
  },
  {
    name: "tripwireEvaluator: triggers on response too long (>50K chars)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({
        responseText: "x".repeat(50_001),
      });
      return (
        result.triggered === true &&
        result.tripwire?.id === "response-too-long" &&
        result.action === "warn"
      );
    },
  },
  {
    name: "tripwireEvaluator: abort beats warn regardless of registration order (bug C1)",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = new TripwireEvaluator();
      evaluator.register({
        id: "warn-1",
        name: "Warning",
        description: "A warning tripwire",
        action: "warn",
        condition: () => true,
      });
      evaluator.register({
        id: "abort-1",
        name: "Abort",
        description: "An abort tripwire",
        action: "abort",
        condition: () => true,
      });

      const result = evaluator.evaluate({ responseText: "test" });
      return (
        result.triggered === true &&
        result.action === "abort" &&
        result.tripwire?.id === "abort-1"
      );
    },
  },
  {
    name: "tripwireEvaluator: evaluateAll returns all triggered results",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const results = evaluator.evaluateAll({
        responseText: "",
        latencyMs: 45_000,
        finishReason: "length",
      });
      const ids = results.map((r) => r.tripwire?.id);
      return (
        results.length >= 3 &&
        ids.includes("empty-response") &&
        ids.includes("max-tokens") &&
        ids.includes("high-latency")
      );
    },
  },
  {
    name: "tripwireEvaluator: register replaces existing tripwire with same id",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = new TripwireEvaluator();
      evaluator.register({
        id: "test-1",
        name: "Original",
        description: "Original tripwire",
        action: "warn",
        condition: () => true,
      });
      evaluator.register({
        id: "test-1",
        name: "Replaced",
        description: "Replaced tripwire",
        action: "abort",
        condition: () => true,
      });
      const tripwires = evaluator.getTripwires();
      return (
        tripwires.length === 1 &&
        tripwires[0].name === "Replaced" &&
        tripwires[0].action === "abort"
      );
    },
  },
  {
    name: "tripwireEvaluator: unregister removes a tripwire by id",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = new TripwireEvaluator();
      evaluator.register({
        id: "test-1",
        name: "Test",
        description: "Test",
        action: "warn",
        condition: () => true,
      });
      const removed = evaluator.unregister("test-1");
      const notFound = evaluator.unregister("nonexistent");
      return (
        removed === true &&
        notFound === false &&
        evaluator.getTripwires().length === 0
      );
    },
  },
  {
    name: "tripwireEvaluator: skips tripwires whose condition throws",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = new TripwireEvaluator();
      evaluator.register({
        id: "throws",
        name: "Throws",
        description: "Will throw",
        action: "abort",
        condition: () => {
          throw new Error("boom");
        },
      });
      evaluator.register({
        id: "ok",
        name: "OK",
        description: "Will pass",
        action: "warn",
        condition: () => true,
        message: "ok",
      });
      const result = evaluator.evaluate({ responseText: "test" });
      return result.triggered === true && result.tripwire?.id === "ok";
    },
  },
  {
    name: "tripwireEvaluator: dynamic message function receives data",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = new TripwireEvaluator();
      evaluator.register({
        id: "dynamic",
        name: "Dynamic",
        description: "Dynamic message",
        action: "warn",
        condition: (data) => (data.latencyMs ?? 0) > 100,
        message: (data) => `Latency was ${data.latencyMs}ms`,
      });
      const result = evaluator.evaluate({ latencyMs: 500 });
      return (
        result.triggered === true && result.message === "Latency was 500ms"
      );
    },
  },
  {
    name: "tripwireEvaluator: commonTripwires has all 7 built-in tripwires",
    category: "tripwire-evaluator",
    fn: async () => {
      const ids = commonTripwires.map((t) => t.id);
      const expected = [
        "max-tokens",
        "empty-response",
        "repetition-loop",
        "input-too-long",
        "too-many-messages",
        "response-too-long",
        "high-latency",
      ];
      return (
        commonTripwires.length === 7 && expected.every((id) => ids.includes(id))
      );
    },
  },
  {
    name: "tripwireEvaluator: repetition loop detects repeated content",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const repeated = Array(50)
        .fill("the quick brown fox jumps over")
        .join(" ");
      const result = evaluator.evaluate({ responseText: repeated });
      return (
        result.triggered === true && result.tripwire?.id === "repetition-loop"
      );
    },
  },
  {
    name: "tripwireEvaluator: repetition loop does not trigger on short text",
    category: "tripwire-evaluator",
    fn: async () => {
      const evaluator = createDefaultTripwireEvaluator();
      const result = evaluator.evaluate({ responseText: "short text" });
      return result.triggered === false;
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

async function runTests(): Promise<void> {
  logSection("Safety Utilities Test Suite");
  log(`Running ${tests.length} tests...\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        logTest(test.name, "SKIP");
        results.push({ name: test.name, result: null, error: null });
        skipped++;
      } else if (result) {
        logTest(test.name, "PASS");
        results.push({ name: test.name, result: true, error: null });
        passed++;
      } else {
        logTest(test.name, "FAIL");
        results.push({
          name: test.name,
          result: false,
          error: "assertion failed",
        });
        failed++;
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      logTest(test.name, "FAIL", msg);
      results.push({ name: test.name, result: false, error: msg });
      failed++;
    }
  }

  logSection("Results");
  log(
    `Total: ${tests.length}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`,
  );

  if (failed > 0) {
    log("\nFailed tests:", "red");
    for (const r of results) {
      if (r.result === false) {
        log(`  - ${r.name}: ${r.error}`, "red");
      }
    }
    process.exit(1);
  } else {
    log("\nAll tests passed!", "green");
    process.exit(0);
  }
}

runTests().catch((error) => {
  log(`\nFatal error: ${getErrorMessage(error)}`, "red");
  process.exit(1);
});
