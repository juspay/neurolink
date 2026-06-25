#!/usr/bin/env tsx
/**
 * Continuous Test Suite: native-Anthropic tools policy (pure, no API).
 *
 * Two related provider-quirk gates for the native Anthropic Messages API
 * surface (provider "anthropic"/"bedrock", incl. via a proxy/base-URL override):
 *
 *  1. structured-output ↔ tools — experimental_output (JSON-schema enforcement)
 *     silently drops tool_use blocks when combined with tools on this surface
 *     (finishReason=tool-calls but zero parsed tool calls). isToolsSchema
 *     ExclusionInForce() must therefore disable structured output for it,
 *     mirroring the Gemini gate — while leaving Vertex+Claude untouched (a
 *     different transport that supports both simultaneously).
 *
 *  2. temperature deprecation — the newest models (e.g. claude-opus-4-8 with
 *     tools + advanced betas) reject `temperature` ("`temperature` is deprecated
 *     for this model.") in favour of reasoning-effort controls. isTemperature
 *     DeprecatedError() detects this so the call can be retried without it.
 *
 * Run: npx tsx test/continuous-test-suite-anthropic-tools-policy.ts
 */

import { defineSuite, assertEqual } from "./helpers/harness.js";
import {
  isNativeAnthropicProvider,
  isGeminiProvider,
  isToolsSchemaExclusionInForce,
  isTemperatureDeprecatedError,
} from "../src/lib/core/modules/structuredOutputPolicy.js";

const { test, runSuite } = defineSuite("Native-Anthropic tools policy");

await test("isNativeAnthropicProvider: anthropic + bedrock only", () => {
  assertEqual(isNativeAnthropicProvider("anthropic"), true, "anthropic → true");
  assertEqual(isNativeAnthropicProvider("bedrock"), true, "bedrock → true");
  assertEqual(isNativeAnthropicProvider("vertex"), false, "vertex → false");
  assertEqual(
    isNativeAnthropicProvider("google-ai"),
    false,
    "google-ai → false",
  );
});

await test("structured-output exclusion now covers native anthropic + tools", () => {
  assertEqual(
    isToolsSchemaExclusionInForce("anthropic", "claude-opus-4-8", true, 5),
    true,
    "anthropic + tools → exclude structured output",
  );
  assertEqual(
    isToolsSchemaExclusionInForce("bedrock", "claude-sonnet-4-6", true, 3),
    true,
    "bedrock + tools → exclude structured output",
  );
});

await test("Vertex+Claude is intentionally NOT excluded (different transport)", () => {
  assertEqual(
    isGeminiProvider("vertex", "claude-sonnet-4-6"),
    false,
    "vertex+claude is not a gemini provider",
  );
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "claude-sonnet-4-6", true, 9),
    false,
    "vertex+claude keeps strict structured output",
  );
});

await test("Gemini gate still in force", () => {
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "gemini-2.5-flash", true, 2),
    true,
    "vertex+gemini + tools → exclude",
  );
  assertEqual(
    isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 1),
    true,
    "google-ai + tools → exclude",
  );
});

await test("exclusion requires tools to actually be active", () => {
  assertEqual(
    isToolsSchemaExclusionInForce("anthropic", "claude-opus-4-8", true, 0),
    false,
    "no tools → no exclusion",
  );
  assertEqual(
    isToolsSchemaExclusionInForce("anthropic", "claude-opus-4-8", false, 5),
    false,
    "tools disabled → no exclusion",
  );
});

await test("isTemperatureDeprecatedError matches the real Anthropic 400", () => {
  assertEqual(
    isTemperatureDeprecatedError(
      new Error("`temperature` is deprecated for this model."),
    ),
    true,
    "production message → true",
  );
  assertEqual(
    isTemperatureDeprecatedError("temperature is not supported"),
    true,
    "not-supported phrasing → true",
  );
  assertEqual(
    isTemperatureDeprecatedError(
      new Error("temperature parameter not allowed"),
    ),
    true,
    "not-allowed phrasing → true",
  );
});

await test("isTemperatureDeprecatedError ignores unrelated errors", () => {
  assertEqual(
    isTemperatureDeprecatedError(new Error("rate limit exceeded (429)")),
    false,
    "rate limit → false",
  );
  assertEqual(
    isTemperatureDeprecatedError(new Error("max_tokens is too large")),
    false,
    "unrelated 400 → false",
  );
  assertEqual(isTemperatureDeprecatedError(""), false, "empty → false");
});

await runSuite();
