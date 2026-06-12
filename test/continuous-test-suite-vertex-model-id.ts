#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Vertex Claude model-ID normalization (pure, no API).
 *
 * The Anthropic API dates Claude models with a trailing dash segment
 * ("claude-haiku-4-5-20251001") while Vertex publisher IDs use "@"
 * ("claude-haiku-4-5@20251001"). Deployments that share one model-name config
 * across providers (e.g. TARA's Superposition flag) feed the dash form to the
 * native Vertex path, which 404s. toVertexAnthropicModelId() bridges the two.
 *
 * Live verification (us-east5, project with Anthropic integration):
 *   claude-haiku-4-5-20251001  → 404 NOT_FOUND
 *   claude-haiku-4-5@20251001  → 200
 *   claude-sonnet-4-6          → 200 (bare alias, Vertex resolves)
 *
 * Run: npx tsx test/continuous-test-suite-vertex-model-id.ts
 */
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { toVertexAnthropicModelId } from "../src/lib/utils/modelDetection.js";

const { test, runSuite } = defineSuite("Vertex Claude model-ID normalization");

// ── Dash-date → @-date conversion ───────────────────────────────────────────
await test("converts haiku 4.5 dash-date to @ form", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-haiku-4-5-20251001"),
    "claude-haiku-4-5@20251001",
    "haiku dash-date",
  );
});

await test("converts sonnet 4.5 dash-date to @ form", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-sonnet-4-5-20250929"),
    "claude-sonnet-4-5@20250929",
    "sonnet dash-date",
  );
});

await test("converts opus 4.1 dash-date to @ form", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-opus-4-1-20250805"),
    "claude-opus-4-1@20250805",
    "opus dash-date",
  );
});

await test("converts legacy 3.5 dash-date to @ form", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-3-5-haiku-20241022"),
    "claude-3-5-haiku@20241022",
    "legacy 3.5 dash-date",
  );
});

// ── Pass-through cases ──────────────────────────────────────────────────────
await test("leaves @-form IDs untouched", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-sonnet-4-5@20250929"),
    "claude-sonnet-4-5@20250929",
    "@ form unchanged",
  );
});

await test("leaves bare aliases untouched", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-sonnet-4-6"),
    "claude-sonnet-4-6",
    "bare alias unchanged",
  );
});

await test("leaves non-Claude models untouched", () => {
  assertEqual(
    toVertexAnthropicModelId("gemini-2.5-pro"),
    "gemini-2.5-pro",
    "gemini unchanged",
  );
});

await test("does not treat short trailing digits as a date", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-sonnet-4-5"),
    "claude-sonnet-4-5",
    "version digits are not a date",
  );
});

await test("does not convert digits longer than a date", () => {
  assertEqual(
    toVertexAnthropicModelId("claude-sonnet-4-5-202509290"),
    "claude-sonnet-4-5-202509290",
    "9-digit suffix unchanged",
  );
});

await runSuite();
