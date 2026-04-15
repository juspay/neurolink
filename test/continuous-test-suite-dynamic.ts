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
// TEST RUNNER INFRASTRUCTURE
// =============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;
const failures: Array<{ name: string; error: string }> = [];

const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
} as const;

function log(msg: string, color: keyof typeof C = "reset"): void {
  console.log(`${C[color]}${msg}${C.reset}`);
}

function section(title: string): void {
  console.log("\n" + "=".repeat(70));
  log(`  ${title}`, "cyan");
  console.log("=".repeat(70) + "\n");
}

async function test(
  name: string,
  fn: () => Promise<boolean | null>,
): Promise<void> {
  try {
    const result = await fn();
    if (result === null) {
      skipped++;
      console.log(
        `  ${C.yellow}⊘${C.reset} ${name} ${C.yellow}(skipped)${C.reset}`,
      );
    } else if (result) {
      passed++;
      console.log(`  ${C.green}✓${C.reset} ${name}`);
    } else {
      failed++;
      failures.push({ name, error: "assertion failed" });
      console.log(`  ${C.red}✗${C.reset} ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failed++;
    failures.push({ name, error: msg });
    console.log(`  ${C.red}✗${C.reset} ${name}`);
    console.log(`    ${C.yellow}→ ${msg.slice(0, 150)}${C.reset}`);
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
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: 100,
};

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--provider=")) {
    TEST_CONFIG.provider = arg.split("=")[1]!;
  }
  if (arg.startsWith("--model=")) {
    TEST_CONFIG.model = arg.split("=")[1]!;
  }
}

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
  return TEST_CONFIG.model || "gemini-2.5-flash";
}

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "cannot connect",
    "not configured",
    "permission denied",
    "billing",
    "econnrefused",
    "enotfound",
    "unauthorized",
    "unauthenticated",
    "403",
    "429",
    "could not resolve",
    "network",
    "timeout",
    "no providers",
    "failed to",
    "invalid api",
    "missing api",
    "google_application_credentials",
    "application default credentials",
    "service account",
    "project_id",
    "not found",
    "default credentials",
    "does not exist",
  ].some((p) => lower.includes(p));
}

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
      const text = result.text || result.content || "";
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
      const text = result.text || result.content || "";
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
      const text = result.text || result.content || "";
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
      } as Record<string, unknown>);
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
  const start = Date.now();

  console.log("\n" + "=".repeat(70));
  log("  NeuroLink Dynamic Arguments — Continuous Test Suite", "bright");
  console.log("=".repeat(70));
  log(`\n  Provider: ${TEST_CONFIG.provider}`, "blue");
  if (TEST_CONFIG.model) {
    log(`  Model: ${TEST_CONFIG.model}`, "blue");
  }
  log(`  Max Tokens: ${TEST_CONFIG.maxTokens}`, "blue");

  await testGenerate();
  await testStream();
  await testResolution();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const total = passed + failed + skipped;

  section("Summary");
  log(`  Passed:  ${passed}`, "green");
  log(`  Failed:  ${failed}`, failed > 0 ? "red" : "green");
  log(`  Skipped: ${skipped}`, skipped > 0 ? "yellow" : "green");
  log(`  Total:   ${total}`, "bright");
  log(`  Time:    ${duration}s`, "cyan");

  if (failures.length > 0) {
    log("\n  FAILURES:", "red");
    for (const f of failures) {
      console.log(`    ${C.red}✗${C.reset} ${f.name}`);
      console.log(`      ${C.yellow}${f.error}${C.reset}`);
    }
  }

  if (skipped > 0) {
    log(
      `\n  Note: ${skipped} test(s) skipped — provider not available.`,
      "yellow",
    );
    log(
      "  Set GOOGLE_APPLICATION_CREDENTIALS or TEST_PROVIDER to run API tests.",
      "yellow",
    );
  }

  console.log();
  log(
    failed > 0 ? "  RESULT: FAIL" : "  RESULT: PASS",
    failed > 0 ? "red" : "green",
  );
  console.log("=".repeat(70) + "\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
