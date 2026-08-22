#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Dynamic Arguments
 *
 * Tests that generate() and stream() correctly resolve function-valued
 * options with real API calls. Skips gracefully when provider is unavailable.
 *
 * Requires a build first: `pnpm run build` (produces dist/).
 *
 * Run: npx tsx test/continuous-test-suite-dynamic.ts
 * Run with provider: npx tsx test/continuous-test-suite-dynamic.ts --provider=vertex
 */

import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, "../dist/index.js");
if (!existsSync(distEntry)) {
  console.error(
    "\x1b[31mError: dist/ build not found. Run `pnpm run build` first.\x1b[0m",
  );
  process.exit(2);
}

import { NeuroLink } from "../dist/index.js";
import type { DynamicResolutionContext } from "../dist/index.js";

// =============================================================================
// TEST RUNNER (delegates to shared harness)
// =============================================================================

import {
  defineSuite,
  log,
  logSection as section,
  isExpectedProviderError as harnessIsExpectedError,
} from "./helpers/harness.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const {
  recordTest,
  runSuite,
  opts: suiteOpts,
} = defineSuite("Dynamic Arguments");

/**
 * Local adapter — preserves the existing `boolean | null` return shape of
 * tests in this file while plumbing into the harness's counters.
 */
async function test(
  name: string,
  fn: () => Promise<boolean | null>,
): Promise<void> {
  try {
    const result = await fn();
    if (result === null) {
      recordTest(name, false, true, "skipped");
    } else {
      recordTest(name, result, false, result ? undefined : "assertion failed");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    recordTest(name, false, false, msg);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/** Type-safe accessor for nested context values */
function ctx(c: DynamicResolutionContext): Record<string, unknown> {
  return c.requestContext;
}

const TEST_CONFIG = {
  provider: suiteOpts.provider ?? "vertex",
  model: suiteOpts.model,
  maxTokens: 100,
};

function buildBaseOptions(includeModel = true): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    provider: TEST_CONFIG.provider,
    maxTokens: TEST_CONFIG.maxTokens,
    disableTools: true,
  };
  if (includeModel && TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function getTestModel(): string {
  // Reviewer follow-up: previously hardcoded `gemini-2.5-flash` as the
  // fallback. Now matches the rest of the suite by reading TEST_MODEL,
  // VERTEX_MODEL, and ANTHROPIC_MODEL in turn — same precedence as
  // tool-reliability and tracing.
  return (
    TEST_CONFIG.model ||
    process.env.VERTEX_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "gemini-2.5-flash"
  );
}

const isExpectedProviderError = harnessIsExpectedError;

// =============================================================================
// SECTION 1: generate() with dynamic arguments (real API calls)
// =============================================================================

async function testGenerate(): Promise<void> {
  section("SECTION 1: generate() with Dynamic Arguments (Real API)");

  const sdk = new NeuroLink();

  await test("1.1 generate with dynamic model function", async () => {
    try {
      const result = await sdk.generate({
        input: { text: "Reply with exactly: DYNAMIC_TEST_OK" },
        model: () => getTestModel(),
        ...buildBaseOptions(false),
      });
      const text = result.content || "";
      return text.length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return isExpectedProviderError(msg)
        ? null
        : (() => {
            throw error;
          })();
    }
  });

  await test("1.2 generate with context-aware model", async () => {
    try {
      const result = await sdk.generate({
        input: { text: "Reply with exactly: CONTEXT_TEST_OK" },
        model: (c: DynamicResolutionContext) =>
          (ctx(c).tenant as { plan?: string })?.plan === "enterprise"
            ? getTestModel()
            : "gemini-2.5-flash",
        dynamicContext: { tenant: { id: "t1", plan: "enterprise" } },
        ...buildBaseOptions(false),
      } as Record<string, unknown>);
      const text = result.content || "";
      return text.length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return isExpectedProviderError(msg)
        ? null
        : (() => {
            throw error;
          })();
    }
  });

  await test("1.3 generate with dynamic systemPrompt", async () => {
    try {
      const result = await sdk.generate({
        input: { text: "Who are you speaking to?" },
        systemPrompt: (c: DynamicResolutionContext) =>
          `You are helping user ${(ctx(c).user as { id?: string })?.id}. Mention their ID.`,
        dynamicContext: { user: { id: "test-user" } },
        ...buildBaseOptions(),
      } as Record<string, unknown>);
      const text = result.content || "";
      return text.length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return isExpectedProviderError(msg)
        ? null
        : (() => {
            throw error;
          })();
    }
  });

  await sdk.dispose?.();
}

// =============================================================================
// SECTION 2: stream() with dynamic arguments (real API calls)
// =============================================================================

async function testStream(): Promise<void> {
  section("SECTION 2: stream() with Dynamic Arguments (Real API)");

  const sdk = new NeuroLink();

  await test("2.1 stream with dynamic model function", async () => {
    try {
      const streamResult = await sdk.stream({
        input: { text: "Count from 1 to 3." },
        model: () => getTestModel(),
        ...buildBaseOptions(false),
      });
      const chunks: string[] = [];
      for await (const chunk of streamResult.stream) {
        if ("content" in chunk) {
          chunks.push(chunk.content as string);
          if (chunks.length >= 20) {
            break;
          }
        }
      }
      return chunks.length > 0 && chunks.join("").length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return isExpectedProviderError(msg)
        ? null
        : (() => {
            throw error;
          })();
    }
  });

  await test("2.2 stream with context-aware model", async () => {
    try {
      const streamResult = await sdk.stream({
        input: { text: "Say hello." },
        model: (c: DynamicResolutionContext) =>
          (ctx(c).tier as string) === "pro"
            ? getTestModel()
            : "gemini-2.5-flash",
        dynamicContext: { tier: "pro" },
        ...buildBaseOptions(false),
      });
      const chunks: string[] = [];
      for await (const chunk of streamResult.stream) {
        if ("content" in chunk) {
          chunks.push(chunk.content as string);
          if (chunks.length >= 10) {
            break;
          }
        }
      }
      return chunks.length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return isExpectedProviderError(msg)
        ? null
        : (() => {
            throw error;
          })();
    }
  });

  await sdk.dispose?.();
}

// =============================================================================
// SECTION 3: Resolution wiring verification (no API needed)
// =============================================================================

type Internal = {
  resolveDynamicOptions: (o: Record<string, unknown>) => Promise<void>;
};

async function testResolution(): Promise<void> {
  section("SECTION 3: Resolution Wiring Verification (No API Needed)");

  const sdk = new NeuroLink();
  const priv = sdk as unknown as Internal;

  await test("3.1 resolves dynamic model + temperature", async () => {
    const o: Record<string, unknown> = {
      model: () => "resolved-model",
      temperature: () => 0.42,
    };
    await priv.resolveDynamicOptions(o);
    return o.model === "resolved-model" && o.temperature === 0.42;
  });

  await test("3.2 context-aware reads custom context", async () => {
    const o: Record<string, unknown> = {
      model: (c: DynamicResolutionContext) =>
        ctx(c).plan === "enterprise" ? "big" : "small",
      dynamicContext: { plan: "enterprise" },
    };
    await priv.resolveDynamicOptions(o);
    return o.model === "big";
  });

  await test("3.3 multi-tenant isolation", async () => {
    const fn = (c: DynamicResolutionContext) =>
      ctx(c).plan === "enterprise" ? "big" : "small";

    const o1: Record<string, unknown> = {
      model: fn,
      dynamicContext: { plan: "enterprise" },
    };
    await priv.resolveDynamicOptions(o1);

    const o2: Record<string, unknown> = {
      model: fn,
      dynamicContext: { plan: "free" },
    };
    await priv.resolveDynamicOptions(o2);

    return o1.model === "big" && o2.model === "small";
  });

  await test("3.4 static values pass through unchanged", async () => {
    const o: Record<string, unknown> = { model: "gpt-4o", temperature: 0.5 };
    const before = JSON.stringify(o);
    await priv.resolveDynamicOptions(o);
    return JSON.stringify(o) === before;
  });

  await test("3.5 tools function maps to enabledToolNames", async () => {
    const o: Record<string, unknown> = {
      tools: () => ["read", "write"],
    };
    await priv.resolveDynamicOptions(o);
    return (
      JSON.stringify(o.enabledToolNames) === '["read","write"]' &&
      o.tools === undefined
    );
  });

  await test("3.6 stream resolves disableTools + enableAnalytics", async () => {
    const o: Record<string, unknown> = {
      disableTools: () => false,
      enableAnalytics: () => true,
    };
    await priv.resolveDynamicOptions(o);
    return o.disableTools === false && o.enableAnalytics === true;
  });

  await sdk.dispose?.();
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  log(`  Max Tokens: ${TEST_CONFIG.maxTokens}`, "blue");
  await testGenerate();
  await testStream();
  await testResolution();
}

await runSuite(main);
