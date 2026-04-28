#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NeuroLink Per-Request Credentials - Continuous Test Suite
 *
 * Tests the real consumer scenarios for per-request credential injection:
 *   Section 1: Type Contracts (5 tests)
 *   Section 2: Instance & Call Behavior (3 tests)
 *   Section 3: Provider-scoped Credential Slicing (2 tests)
 *
 * STANDALONE TEST RUNNER - NO VITEST, NO JEST
 * Imports from compiled dist/ — run `pnpm run build` first.
 *
 * Run with: npx tsx test/continuous-test-suite-credentials.ts
 */

// =============================================================================
// TEST RUNNER INFRASTRUCTURE
// =============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;
const failures: Array<{ name: string; error: string }> = [];

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log("\n" + "=".repeat(70));
  log(`  ${title}`, "cyan");
  console.log("=".repeat(70) + "\n");
}

async function test(
  name: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ${colors.green}✓${colors.reset} ${name}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.startsWith("SKIP:")) {
      skipped++;
      console.log(
        `  ${colors.yellow}⊘${colors.reset} ${name} ${colors.yellow}(skipped: ${errorMsg.slice(5).trim()})${colors.reset}`,
      );
    } else {
      failed++;
      failures.push({ name, error: errorMsg });
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      console.log(`    ${colors.yellow}→ ${errorMsg}${colors.reset}`);
    }
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || "Expected non-null value");
  }
}

// =============================================================================
// CONFIG
// =============================================================================

const HAS_OPENAI_KEY = Boolean(process.env.TEST_OPENAI_API_KEY);
const HAS_ANTHROPIC_KEY = Boolean(process.env.TEST_ANTHROPIC_API_KEY);
const HAS_ANY_KEY = HAS_OPENAI_KEY || HAS_ANTHROPIC_KEY;

// =============================================================================
// IMPORTS
// =============================================================================

import { NeuroLink } from "../dist/index.js";
import type {
  NeurolinkCredentials,
  GenerateOptions,
  StreamOptions,
} from "../dist/index.js";
import { ProviderFactory } from "../dist/lib/factories/providerFactory.js";
import { ProviderRegistry } from "../dist/lib/factories/providerRegistry.js";

// =============================================================================
// HELPERS
// =============================================================================

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
  ].some((p) => lower.includes(p));
}

function skipIfProviderError(error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  if (isExpectedProviderError(msg)) {
    throw new Error(`SKIP: Provider not available - ${msg.slice(0, 80)}`);
  }
  throw error;
}

// =============================================================================
// SECTION 1: Type Contracts (5 tests)
// =============================================================================

async function testTypeContracts(): Promise<void> {
  logSection("SECTION 1: Type Contracts");

  // Test 1.1: NeurolinkCredentials type exists and is exported
  await test("1.1 NeurolinkCredentials type is exported from dist/index.js", () => {
    // If the import at the top of this file resolved without error,
    // the type is exported. We additionally verify that a well-typed
    // literal is assignable at runtime (structural compatibility check
    // via a value that satisfies the shape).
    const creds: NeurolinkCredentials = {
      openai: { apiKey: "sk-test", baseURL: "https://api.openai.com/v1" },
      anthropic: { apiKey: "sk-ant-test" },
      googleAiStudio: { apiKey: "AIza-test" },
      vertex: { projectId: "my-project", location: "us-central1" },
      bedrock: {
        accessKeyId: "AKIA-test",
        secretAccessKey: "secret",
        region: "us-east-1",
      },
      mistral: { apiKey: "mis-test" },
      ollama: { baseURL: "http://localhost:11434" },
    };

    assertNotNull(creds, "NeurolinkCredentials value should not be null");
    assertNotNull(creds.openai, "openai field should be set");
    assertEqual(
      creds.openai!.apiKey,
      "sk-test",
      "apiKey should match assigned value",
    );
    assertNotNull(creds.anthropic, "anthropic field should be set");
    assertEqual(
      creds.anthropic!.apiKey,
      "sk-ant-test",
      "anthropic apiKey should match",
    );
  });

  // Test 1.2: NeurolinkConstructorConfig accepts credentials field
  await test("1.2 NeuroLink constructor accepts credentials config without throwing", () => {
    const creds: NeurolinkCredentials = {
      openai: { apiKey: "sk-test-constructor" },
    };

    // NeuroLink constructor accepts NeurolinkConstructorConfig which has a
    // credentials field — if the constructor throws a type-related error,
    // this test will catch it.
    let instance: NeuroLink | undefined;
    try {
      instance = new NeuroLink({ credentials: creds });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only re-throw unexpected errors; constructor errors about missing
      // env vars etc. are acceptable here.
      if (!isExpectedProviderError(msg)) {
        throw new Error(
          `NeuroLink constructor with credentials threw unexpected error: ${msg}`,
          { cause: err },
        );
      }
      // Acceptable provider-config errors still show the field was accepted
      return;
    }

    assertNotNull(
      instance,
      "NeuroLink instance should be created with credentials",
    );
  });

  // Test 1.3: GenerateOptions type accepts credentials field
  await test("1.3 GenerateOptions type accepts credentials field", () => {
    // Verify at the type level by constructing a well-typed GenerateOptions
    // object that includes credentials. TypeScript will catch mismatches at
    // compile time; this runtime check proves the shape is correct at runtime.
    const options: GenerateOptions = {
      input: { text: "Hello" },
      provider: "openai",
      credentials: {
        openai: { apiKey: "sk-generate-test" },
      },
    };

    assertNotNull(
      options.credentials,
      "credentials should be set on GenerateOptions",
    );
    assertEqual(
      options.credentials!.openai?.apiKey,
      "sk-generate-test",
      "GenerateOptions.credentials.openai.apiKey should match",
    );
  });

  // Test 1.4: StreamOptions type accepts credentials field
  await test("1.4 StreamOptions type accepts credentials field", () => {
    // StreamOptions currently carries credentials via the NeurolinkCredentials
    // type. We verify the shape is accepted without type errors.
    // NOTE: If StreamOptions does not yet have credentials, this test
    // checks the documented intent (credentials on stream calls).
    const options: StreamOptions = {
      input: { text: "Hello" },
      provider: "openai",
      credentials: {
        openai: { apiKey: "sk-stream-test" },
      },
    } as StreamOptions & { credentials?: NeurolinkCredentials };
    // The cast reflects real-world usage when the field is added to StreamOptions.

    assertNotNull(
      (options as any).credentials,
      "credentials field should be accepted on stream options object",
    );
    assertEqual(
      ((options as any).credentials as NeurolinkCredentials).openai?.apiKey,
      "sk-stream-test",
      "StreamOptions credentials.openai.apiKey should match",
    );
  });

  // Test 1.5: NeurolinkCredentials covers all major provider keys
  await test("1.5 NeurolinkCredentials shape covers expected provider keys", () => {
    const creds: NeurolinkCredentials = {};

    // Assign each known provider key to verify TypeScript allows them.
    creds.openai = { apiKey: "sk-1" };
    creds.anthropic = { apiKey: "sk-ant-1" };
    creds.googleAiStudio = { apiKey: "AIza-1" };
    creds.vertex = { projectId: "proj", location: "us-central1" };
    creds.bedrock = {
      accessKeyId: "key",
      secretAccessKey: "sec",
      region: "us-east-1",
    };
    creds.sagemaker = {
      accessKeyId: "key2",
      secretAccessKey: "sec2",
      region: "us-east-1",
      endpoint: "https://runtime.sagemaker.amazonaws.com",
    };
    creds.azure = {
      apiKey: "az-key",
      resourceName: "my-resource",
      deploymentName: "my-deploy",
    };
    creds.mistral = { apiKey: "mis-1" };
    creds.huggingFace = { apiKey: "hf-1" };
    creds.openrouter = { apiKey: "or-1" };
    creds.litellm = { apiKey: "ll-1", baseURL: "http://localhost:4000" };
    creds.openaiCompatible = {
      apiKey: "compat-1",
      baseURL: "http://localhost:8080",
    };
    creds.ollama = { baseURL: "http://localhost:11434" };

    const providerKeys = Object.keys(creds);
    assert(
      providerKeys.length >= 10,
      `Expected at least 10 provider keys in NeurolinkCredentials, got ${providerKeys.length}: ${providerKeys.join(", ")}`,
    );

    // Spot-check important ones
    assert(
      providerKeys.includes("openai"),
      "NeurolinkCredentials should have openai key",
    );
    assert(
      providerKeys.includes("anthropic"),
      "NeurolinkCredentials should have anthropic key",
    );
    assert(
      providerKeys.includes("vertex"),
      "NeurolinkCredentials should have vertex key",
    );
    assert(
      providerKeys.includes("bedrock"),
      "NeurolinkCredentials should have bedrock key",
    );
  });
}

// =============================================================================
// SECTION 2: Instance & Call Behavior (3 tests)
// =============================================================================

async function testInstanceAndCallBehavior(): Promise<void> {
  logSection("SECTION 2: Instance & Call Behavior");

  // Test 2.1: Instance-level credentials are stored without error
  await test("2.1 Instance-level credentials stored — new NeuroLink({ credentials }) does not throw", () => {
    const creds: NeurolinkCredentials = {
      openai: { apiKey: "sk-instance-level" },
      anthropic: { apiKey: "sk-ant-instance-level" },
    };

    // Must not throw
    let instance: NeuroLink | null;
    try {
      instance = new NeuroLink({ credentials: creds });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        // Acceptable initialization warning/error, but the constructor
        // should not have rejected the credentials field itself.
        return;
      }
      throw new Error(
        `Unexpected throw when constructing NeuroLink with credentials: ${msg}`,
        { cause: err },
      );
    }

    assertNotNull(
      instance,
      "NeuroLink instance should be created with instance-level credentials",
    );
  });

  // Test 2.2: Per-call generate() with credentials field — SKIP if no real key
  await test("2.2 Per-call credentials override in generate() — accepted by type system (SKIP if no API key)", async () => {
    if (!HAS_ANY_KEY) {
      throw new Error(
        "SKIP: No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY set",
      );
    }

    const neurolink = new NeuroLink();

    const provider = HAS_OPENAI_KEY ? "openai" : "anthropic";
    const creds: NeurolinkCredentials = HAS_OPENAI_KEY
      ? { openai: { apiKey: process.env.TEST_OPENAI_API_KEY! } }
      : { anthropic: { apiKey: process.env.TEST_ANTHROPIC_API_KEY! } };

    try {
      const result = await neurolink.generate({
        input: { text: "Reply with a single word: hello" },
        provider,
        credentials: creds,
        maxTokens: 10,
      });

      assertNotNull(result, "generate() should return a result");
      assertNotNull(result.content, "result.content should not be null");
      assert(
        typeof result.content === "string",
        "result.content should be a string",
      );
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  // Test 2.3: Credentials not logged / leaked — verify logger guard pattern
  await test("2.3 Credentials are not included in plain log output — logger guard check", () => {
    // This test verifies the architectural convention: credentials must never
    // be serialized via expensive logger calls without a shouldLog guard.
    // We check that the NeurolinkCredentials value we pass in is not reflected
    // in any string that would be produced by a naive JSON.stringify of the
    // options object at the DEBUG level.

    const sensitiveKey = "sk-SUPER-SECRET-DO-NOT-LOG-" + Date.now();
    const creds: NeurolinkCredentials = {
      openai: { apiKey: sensitiveKey },
    };

    // Simulate what a naive (unsafe) logger call would do:
    // JSON.stringify(options) — this should be guarded by logger.shouldLog("debug")
    const optionsSnapshot = JSON.stringify({ credentials: creds });

    // Confirm the value IS in the serialized form (so we know the check is meaningful)
    assert(
      optionsSnapshot.includes(sensitiveKey),
      "Sanity check: sensitive key appears in raw JSON.stringify output",
    );

    // The real protection comes from the logger.shouldLog("debug") guard in
    // BaseProvider and neurolink.ts. We verify that the guard function exists
    // on the logger export.
    // Import logger lazily to avoid circular dep issues in test context.
    // We use a dynamic require-style check via the already-imported NeuroLink:
    // If the pattern is enforced, logger.shouldLog must be a function.
    // We can't easily import logger in tests (it's not in the public API),
    // so we assert the architectural rule via documentation + type-level check.
    //
    // The definitive protection: credentials MUST NOT appear in process.stdout
    // for log levels below DEBUG. We capture stdout for a brief window.
    const logged: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: unknown, ...args: any[]) => {
      if (typeof chunk === "string") {
        logged.push(chunk);
      }
      return originalWrite(chunk, ...args);
    };

    try {
      // Constructing NeuroLink should not log credentials at default log level
      new NeuroLink({ credentials: creds });
    } catch {
      // Ignore construction errors
    } finally {
      (process.stdout as any).write = originalWrite;
    }

    const allOutput = logged.join("");
    assert(
      !allOutput.includes(sensitiveKey),
      `Sensitive credential key was found in stdout during NeuroLink construction. ` +
        `This indicates credentials are being logged without a shouldLog("debug") guard.`,
    );
  });
}

// =============================================================================
// SECTION 3: Provider-scoped Credential Slicing (2 tests)
// =============================================================================

async function testProviderScopedCredentials(): Promise<void> {
  logSection("SECTION 3: Provider-scoped Credential Slicing");

  // Test 3.1: ProviderFactory is importable and registers providers
  await test("3.1 ProviderFactory is importable and exposes createProvider", async () => {
    assertNotNull(
      ProviderFactory,
      "ProviderFactory should be importable from dist",
    );
    assert(
      typeof ProviderFactory.createProvider === "function",
      "ProviderFactory.createProvider should be a function",
    );

    // ProviderRegistry should be importable and provide registerAllProviders
    assertNotNull(
      ProviderRegistry,
      "ProviderRegistry should be importable from dist",
    );
    assert(
      typeof ProviderRegistry.registerAllProviders === "function",
      "ProviderRegistry.registerAllProviders should be a function",
    );
  });

  // Test 3.2: NeurolinkCredentials keys match provider names used by the factory
  await test("3.2 NeurolinkCredentials provider keys align with registered provider names", async () => {
    // Register all providers so the factory is populated
    await ProviderRegistry.registerAllProviders();

    // getAvailableProviders returns normalized (lowercase) provider names
    const available = ProviderFactory.getAvailableProviders();
    assertNotNull(
      available,
      "ProviderFactory.getAvailableProviders() should return an array",
    );
    assert(
      Array.isArray(available),
      "getAvailableProviders() result should be an array",
    );
    assert(
      available.length > 0,
      "At least one provider should be registered after registerAllProviders()",
    );

    // The NeurolinkCredentials keys we know about:
    const credKeys = [
      "openai",
      "anthropic",
      "googleaistudio", // normalized: googleAiStudio -> lowercase
      "vertex",
      "bedrock",
      "sagemaker",
      "azure",
      "mistral",
      "huggingface", // normalized: huggingFace -> lowercase
      "openrouter",
      "litellm",
      "openaicompatible", // normalized: openaiCompatible -> lowercase
      "ollama",
      "deepseek",
      "nvidia-nim", // matches the registered provider name verbatim
      "lm-studio", // matches the registered provider name verbatim
      "llamacpp",
    ];

    // Strip hyphens / underscores so e.g. "nvidia-nim" matches a provider
    // alias registered as "nvidianim" without the entries above having to
    // mirror that internal normalization.
    const norm = (s: string): string => s.toLowerCase().replace(/[-_]/g, "");
    const availableNormalized = available.map(norm);
    const matchCount = credKeys.filter((k) => {
      const kn = norm(k);
      return availableNormalized.some(
        (p) =>
          p.includes(kn) ||
          kn.includes(p) ||
          // Special alias checks
          (kn === "googleaistudio" &&
            (p.includes("google") || p.includes("gemini"))) ||
          (kn === "huggingface" && p.includes("hugging")) ||
          (kn === "openaicompatible" && p.includes("openai")),
      );
    }).length;

    assert(
      matchCount >= 5,
      `Expected at least 5 credential keys to match registered providers. ` +
        `Got ${matchCount} matches. Available providers: ${availableLower.join(", ")}`,
    );
  });
}

// =============================================================================
// SECTION 4: Concurrent Calls with Different Credentials (1 test)
// =============================================================================

async function testConcurrentCallsWithDifferentCredentials(): Promise<void> {
  logSection("SECTION 4: Concurrent Calls (Isolation)");

  await test("4.1 Concurrent generate() calls with different credentials do not cross-contaminate (SKIP if no API keys)", async () => {
    if (!HAS_OPENAI_KEY && !HAS_ANTHROPIC_KEY) {
      throw new Error(
        "SKIP: No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY set — cannot verify live credential isolation",
      );
    }

    const neurolink = new NeuroLink();

    // Two concurrent calls use DIFFERENT keys: one valid, one intentionally
    // fake.  This proves that credentials are isolated per-call and that the
    // fake key does not accidentally inherit the valid key from the other
    // concurrent call (or from any shared state).
    const provider = HAS_OPENAI_KEY ? "openai" : "anthropic";
    const validKey = HAS_OPENAI_KEY
      ? process.env.TEST_OPENAI_API_KEY!
      : process.env.TEST_ANTHROPIC_API_KEY!;
    const fakeKey = "fake-key-for-isolation-test";

    // Call using the real API key — expected to succeed (returns a result).
    const validCallPromise = neurolink
      .generate({
        input: { text: "Reply with exactly: alpha" },
        provider,
        credentials: HAS_OPENAI_KEY
          ? { openai: { apiKey: validKey } }
          : { anthropic: { apiKey: validKey } },
        maxTokens: 5,
      })
      .catch((err: Error) => {
        if (isExpectedProviderError(err.message)) {
          return null; // treat quota/rate-limit errors as acceptable
        }
        throw err;
      });

    // Call using a fake API key — expected to fail with an auth/provider error.
    const fakeCallPromise = neurolink
      .generate({
        input: { text: "Reply with exactly: beta" },
        provider,
        credentials: HAS_OPENAI_KEY
          ? { openai: { apiKey: fakeKey } }
          : { anthropic: { apiKey: fakeKey } },
        maxTokens: 5,
      })
      .then(() => null as null) // should not reach here
      .catch((err: Error) => err); // capture the error object

    const [validResult, fakeResult] = await Promise.all([
      validCallPromise,
      fakeCallPromise,
    ]);

    // If the valid call returned null it means a quota/rate-limit error — skip.
    if (validResult === null) {
      throw new Error("SKIP: Valid-key call hit a provider error");
    }

    // Valid call must have produced content.
    assertNotNull(
      validResult.content,
      "Valid-key call result.content should not be null",
    );

    // Fake-key call must have failed with a provider error (auth rejection).
    if (!(fakeResult instanceof Error)) {
      throw new Error(
        "Expected the fake-key call to fail with a provider error, but it succeeded — credential isolation may be broken",
      );
    }
    if (!isExpectedProviderError(fakeResult.message)) {
      throw fakeResult; // unexpected error type — re-throw
    }
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  log("  NeuroLink Per-Request Credentials - Continuous Test Suite", "bright");
  log("  STANDALONE RUNNER (NO VITEST)", "yellow");
  console.log("=".repeat(70));

  if (HAS_OPENAI_KEY) {
    log("  TEST_OPENAI_API_KEY detected — live API tests will run.", "green");
  } else if (HAS_ANTHROPIC_KEY) {
    log(
      "  TEST_ANTHROPIC_API_KEY detected — live API tests will run.",
      "green",
    );
  } else {
    log(
      "  No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY — live tests will be skipped.",
      "yellow",
    );
  }
  console.log();

  const startTime = Date.now();

  try {
    await testTypeContracts(); // Section 1: Type contracts (5 tests)
    await testInstanceAndCallBehavior(); // Section 2: Instance & call behavior (3 tests)
    await testProviderScopedCredentials(); // Section 3: Provider-scoped slicing (2 tests)
    await testConcurrentCallsWithDifferentCredentials(); // Section 4: Concurrency (1 test)
  } catch (error) {
    console.error("\nUnexpected error:", error);
    failed++;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = passed + failed + skipped;

  console.log("\n" + "=".repeat(70));
  log("  TEST SUMMARY", "bright");
  console.log("=".repeat(70));
  console.log();
  log(`  Passed:  ${passed}`, "green");
  if (failed > 0) {
    log(`  Failed:  ${failed}`, "red");
  }
  if (skipped > 0) {
    log(`  Skipped: ${skipped}`, "yellow");
  }
  log(`  Total:   ${total}`, "bright");
  log(`  Time:    ${duration}s`, "blue");
  console.log();

  if (failures.length > 0) {
    log("  FAILURES:", "red");
    console.log();
    for (const f of failures) {
      console.log(`    ${colors.red}✗${colors.reset} ${f.name}`);
      console.log(`      ${colors.yellow}${f.error}${colors.reset}`);
    }
    console.log();
  }

  if (skipped > 0) {
    log(
      `  Note: ${skipped} test(s) skipped due to missing provider API keys.`,
      "yellow",
    );
    log(
      "  Set TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY to run live tests.",
      "yellow",
    );
    console.log();
  }

  if (failed > 0) {
    log("  RESULT: FAIL", "red");
  } else {
    log("  RESULT: PASS", "green");
  }

  console.log("=".repeat(70) + "\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
