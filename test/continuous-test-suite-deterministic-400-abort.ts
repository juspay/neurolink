#!/usr/bin/env tsx
/**
 * Continuous Test Suite: deterministic-400 fallback abort (pure, no API).
 *
 * The provider fallback orchestrator (directProviderGeneration) stops retrying
 * when isNonRetryableProviderError(error) is true. HTTP 400 is already in
 * NON_RETRYABLE_HTTP_STATUS_CODES, but that only helps when the status is a
 * structured `status`/`statusCode` field. Vertex/Gemini wrap a 400
 * INVALID_ARGUMENT inside the error MESSAGE string, so the object-level check
 * misses it and the orchestrator retries the identical malformed payload on
 * every other provider — they reject it the same way ("All providers failed").
 *
 * isDeterministicClientErrorMessage detects those embedded markers so the turn
 * aborts fast. This suite locks in that it matches the real Vertex 400 payloads
 * while NOT matching transient (5xx / 429 / network) errors that SHOULD retry.
 *
 * Run: npx tsx test/continuous-test-suite-deterministic-400-abort.ts
 */
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { isDeterministicClientErrorMessage } from "../src/lib/utils/retryability.js";

const { test, runSuite } = defineSuite("Deterministic-400 fallback abort");

// The actual production message (responseSchema rejection) — abbreviated but
// keeping the exact markers the detector keys on.
const VERTEX_RESPONSE_SCHEMA_400 =
  '[vertex] Google Vertex AI Invalid Request: {"error":{"message":"{\\n  ' +
  '\\"error\\": {\\n    \\"code\\": 400,\\n    \\"message\\": \\"Invalid JSON ' +
  'payload received. Unknown name \\\\\\"errorMessage\\\\\\" at ' +
  "'generation_config.response_schema.properties[1]...': Cannot find field.\\\"," +
  '\\n    \\"status\\": \\"INVALID_ARGUMENT\\"\\n  }\\n}\\n","code":400,' +
  '"status":"Bad Request"}}';

const VERTEX_TOOL_ENUM_400 =
  "[vertex] Google Vertex AI error: 400 Invalid value at " +
  "'tools[0].function_declarations[64].parameters' INVALID_ARGUMENT";

await test("matches the production responseSchema 400 (INVALID_ARGUMENT in message)", () => {
  assertEqual(
    isDeterministicClientErrorMessage(VERTEX_RESPONSE_SCHEMA_400),
    true,
    "wrapped Vertex 400 must be non-retryable",
  );
});

await test("matches a tool-schema INVALID_ARGUMENT 400", () => {
  assertEqual(
    isDeterministicClientErrorMessage(VERTEX_TOOL_ENUM_400),
    true,
    "tool-schema 400 must be non-retryable",
  );
});

await test('matches a bare "400 Bad Request"', () => {
  assertEqual(
    isDeterministicClientErrorMessage("Request failed: 400 Bad Request"),
    true,
    "bare 400 Bad Request is deterministic",
  );
});

await test('matches an embedded "code": 400', () => {
  assertEqual(
    isDeterministicClientErrorMessage('upstream said {"code": 400}'),
    true,
    '"code": 400 is deterministic',
  );
});

await test("does NOT match transient 5xx / 429 / network errors (these should still retry)", () => {
  const transient = [
    "[vertex] 503 Service Unavailable",
    "429 Too Many Requests: rate limit exceeded",
    "500 Internal Server Error",
    "ECONNRESET socket hang up",
    "fetch failed: network timeout after 30000ms",
    "UNAVAILABLE: backend overloaded",
  ];
  for (const msg of transient) {
    assertEqual(
      isDeterministicClientErrorMessage(msg),
      false,
      `transient error should remain retryable: ${msg}`,
    );
  }
});

await test("does NOT match a generic success-ish or empty message", () => {
  assertEqual(isDeterministicClientErrorMessage(""), false, "empty → false");
  assertEqual(
    isDeterministicClientErrorMessage("completed in 1200ms"),
    false,
    "unrelated message → false",
  );
});

await runSuite();
