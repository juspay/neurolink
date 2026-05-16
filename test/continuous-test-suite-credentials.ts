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
// IMPORTS
// =============================================================================

import {
  defineSuite,
  Skip,
  log,
  logSection,
  assert,
  assertEqual,
  assertNotNull,
  isExpectedProviderError,
} from "./helpers/harness.js";

import { NeuroLink } from "../dist/index.js";
import type {
  NeurolinkCredentials,
  GenerateOptions,
  StreamOptions,
} from "../dist/index.js";
import { ProviderFactory } from "../dist/lib/factories/providerFactory.js";
import { ProviderRegistry } from "../dist/lib/factories/providerRegistry.js";

// =============================================================================
// CONFIG
// =============================================================================

const HAS_OPENAI_KEY = Boolean(process.env.TEST_OPENAI_API_KEY);
const HAS_ANTHROPIC_KEY = Boolean(process.env.TEST_ANTHROPIC_API_KEY);
const HAS_ANY_KEY = HAS_OPENAI_KEY || HAS_ANTHROPIC_KEY;

// =============================================================================
// SUITE
// =============================================================================

const { test, runSuite } = defineSuite("NeuroLink Per-Request Credentials");

/** Promote known provider/credential errors to SKIP. */
function skipIfProviderError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  if (isExpectedProviderError(msg)) {
    throw new Skip(`Provider not available - ${msg.slice(0, 80)}`);
  }
  throw error as Error;
}

/**
 * Auth-surface-preserving variant: returns true ONLY for transient
 * provider issues (network/outage/rate-limit/quota), not for auth
 * failures. Used by tests that pass a deliberately-invalid API key and
 * MUST observe the AuthenticationError surface — otherwise the broader
 * `isExpectedProviderError` would silently SKIP the very contract the
 * test exists to verify (e.g. "invalid_api_key", "401 Unauthorized",
 * "api key is blocked", etc. all fall under expected-provider-error in
 * other contexts).
 */
function isTransientNonAuthError(msg: string): boolean {
  if (!isExpectedProviderError(msg)) {
    return false;
  }
  const lower = msg.toLowerCase();
  const authIndicators: RegExp[] = [
    /(?:^|[^a-z0-9])api[ _-]?key(?=$|[^a-z0-9])/i,
    /\bauthentication\b/i,
    /\bunauthori[sz]ed\b/i,
    /\binvalid[ _\-\s]*key\b/i,
    /\bblocked\s+key\b/i,
    /\bkey\s+is\s+(?:invalid|blocked)\b/i,
    /\b401\b/,
    /\bUNAUTHENTICATED\b/,
    /\bPERMISSION_DENIED\b/,
    /\bUnrecognizedClientException\b/,
    /\bAccessDeniedException\b/,
    /\bInvalidClientTokenId\b/,
  ];
  return !authIndicators.some((re) => re.test(lower) || re.test(msg));
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
    // No cast: if StreamOptions ever drops `credentials`, this assignment
    // FAILs at compile time — which is exactly the regression this test
    // exists to catch. The earlier `as StreamOptions & { credentials?: ... }`
    // cast made the test pass even when the public contract broke.
    const options: StreamOptions = {
      input: { text: "Hello" },
      provider: "openai",
      credentials: {
        openai: { apiKey: "sk-stream-test" },
      },
    };

    assertNotNull(
      options.credentials,
      "credentials field should be accepted on stream options object",
    );
    assertEqual(
      options.credentials?.openai?.apiKey,
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
      throw new Skip("No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY set");
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
        // OpenAI requires maxTokens >= 16; keep this generous enough to
        // satisfy that floor while still being a near-empty response.
        maxTokens: 32,
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
      "xai",
      "groq",
      "cohere",
      "together-ai",
      "fireworks",
      "perplexity",
      "cloudflare",
      "voyage",
      "jina",
      "stability",
      "ideogram",
      "recraft",
      "replicate",
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
        `Got ${matchCount} matches. Available providers: ${availableNormalized.join(", ")}`,
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
      throw new Skip(
        "No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY set — cannot verify live credential isolation",
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
    // OpenAI requires maxTokens >= 16; use 32 to stay well above the floor.
    const validCallPromise = neurolink
      .generate({
        input: { text: "Reply with exactly: alpha" },
        provider,
        credentials: HAS_OPENAI_KEY
          ? { openai: { apiKey: validKey } }
          : { anthropic: { apiKey: validKey } },
        maxTokens: 32,
      })
      .catch((err: Error) => {
        // Auth-surface preservation: only swallow transient/quota/rate-limit
        // errors here. If the VALID key path surfaces an auth error, that
        // is cross-contamination from the parallel fake-key call — exactly
        // the regression this isolation test exists to verify. The earlier
        // `isExpectedProviderError(err.message)` predicate matched auth
        // framings too, hiding the bug.
        if (isTransientNonAuthError(err.message)) {
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
        maxTokens: 32,
      })
      .then(() => null as null) // should not reach here
      .catch((err: Error) => err); // capture the error object

    const [validResult, fakeResult] = await Promise.all([
      validCallPromise,
      fakeCallPromise,
    ]);

    // If the valid call returned null it means a transient quota/rate-limit
    // error (NOT an auth failure — those rethrow above to surface
    // cross-contamination). Treat as SKIP.
    if (validResult === null) {
      throw new Skip("Valid-key call hit a transient provider error");
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
    // A transient/quota/rate-limit failure on the fake-key call would
    // accidentally satisfy the isolation assertion without actually
    // exercising the auth surface. SKIP those rather than treating them
    // as a pass — only auth-flavoured rejections count.
    if (isTransientNonAuthError(fakeResult.message)) {
      throw new Skip(
        `Fake-key call hit a transient provider error — ${fakeResult.message.slice(0, 120)}`,
      );
    }
    // Otherwise require an auth-shaped framing. `isExpectedProviderError`
    // alone would accept any expected upstream error; pair it with a
    // narrow auth-surface regex so we know the fake key was actually
    // rejected (not e.g. swallowed by a model-availability 404).
    const looksLikeAuthSurface =
      /\bapi[_\s-]?key\b|\bauthentication\b|\bunauthori[sz]ed\b|\binvalid.*key\b|\b401\b/i.test(
        fakeResult.message,
      );
    if (!looksLikeAuthSurface) {
      throw fakeResult; // unexpected error type — re-throw
    }
  });
}

// =============================================================================
// SECTION 5: Regression — Issue #1 model access denied surface (Curator P1-1)
// =============================================================================
//
// LiteLLM 403 ("team not allowed to access model") regression and related
// public-API surface checks. Originally lived in
// continuous-test-suite-issue-01-model-access.ts. Tests assert that:
//   - typed `ModelAccessDeniedError` surfaces from LiteLLM denials
//   - rejection carries `.allowedModels[]` parsed from the LiteLLM body
//   - `sdk.checkCredentials({ provider })` exists on the public surface
//   - bad OpenAI key surfaces typed `AuthenticationError`, not raw 401

const DENIED_MODEL = process.env.CURATOR_LITELLM_DENIED_MODEL ?? "sonnet-4-5";

async function testIssue01ModelAccess(): Promise<void> {
  logSection("SECTION 5: Regression — Issue #1 model access denied surface");

  await test("5.1 LiteLLM 403 surfaces typed ModelAccessDeniedError", async () => {
    if (!process.env.LITELLM_BASE_URL || !process.env.LITELLM_API_KEY) {
      throw new Skip("LITELLM_BASE_URL / LITELLM_API_KEY not set");
    }
    const sdk = new NeuroLink();
    try {
      let captured: unknown = undefined;
      try {
        await sdk.generate({
          provider: "litellm",
          model: DENIED_MODEL,
          input: { text: "hi" },
          maxTokens: 32,
          disableTools: true,
        } as never);
        throw new Error("expected rejection on denied model — got success");
      } catch (err) {
        captured = err;
      }

      const ctorName =
        (captured as { constructor?: { name?: string } })?.constructor?.name ??
        "unknown";
      const msg =
        captured instanceof Error ? captured.message : String(captured);
      // Auth-surface preservation: denied-model signatures (constructor
      // name, LiteLLM's "can only access" body, generic 403/permission
      // framings) must NOT be swallowed by the transient-provider skip
      // path — those signatures are exactly what this regression test
      // exists to verify. Only transient/non-denied-model errors SKIP.
      const looksLikeDeniedModel =
        ctorName === "ModelAccessDeniedError" ||
        // Plain 403/Forbidden/permission-denied bodies must also stay
        // visible — a broken mapping that surfaces those instead of
        // ModelAccessDeniedError is still a regression, not an
        // environmental SKIP.
        /\b403\b/.test(msg) ||
        /\bforbidden\b/i.test(msg) ||
        /\bpermission\s+denied\b/i.test(msg) ||
        /\bcan only access\b/i.test(msg) ||
        /\bmodel\s+access\s+denied\b/i.test(msg) ||
        /\bnot\s+allowed\s+to\s+(?:use|access)\s+(?:the\s+)?model\b/i.test(msg);
      if (isExpectedProviderError(msg) && !looksLikeDeniedModel) {
        throw new Skip(msg.slice(0, 120));
      }
      assertEqual(
        ctorName,
        "ModelAccessDeniedError",
        `bug-confirmed: surfaced as ${ctorName}; msg="${msg.slice(0, 200)}"`,
      );
    } finally {
      try {
        await sdk.shutdown?.();
      } catch {
        // swallow shutdown errors so the real test failure remains salient
      }
    }
  });

  await test("5.2 allowedModels[] extracted from LiteLLM body onto rejection", async () => {
    if (!process.env.LITELLM_BASE_URL || !process.env.LITELLM_API_KEY) {
      throw new Skip("LITELLM_BASE_URL / LITELLM_API_KEY not set");
    }
    const sdk = new NeuroLink();
    try {
      let captured: unknown = undefined;
      try {
        await sdk.generate({
          provider: "litellm",
          model: DENIED_MODEL,
          input: { text: "hi" },
          maxTokens: 32,
          disableTools: true,
        } as never);
      } catch (err) {
        captured = err;
      }
      assertNotNull(captured, "no rejection captured");

      const e = captured as Record<string, unknown>;
      const allowedModels = e.allowedModels;
      const requestedModel = e.requestedModel;
      const msg = e instanceof Error ? e.message : String(captured);

      // Reviewer Finding #5: when a network/DNS/credential error fires
      // before the SDK can extract `allowedModels`, treat as SKIP. The
      // `!includes("can only access")` keeps team-denied bodies (which
      // do parse-as-bug) from being SKIPped.
      if (isExpectedProviderError(msg) && !msg.includes("can only access")) {
        throw new Skip(msg.slice(0, 120));
      }

      assert(
        Array.isArray(allowedModels) && allowedModels.length > 0,
        `bug-confirmed: rejection has no .allowedModels property. inline list: ${msg.includes("can only access") ? "yes" : "no"}; requestedModel=${requestedModel}`,
      );
    } finally {
      try {
        await sdk.shutdown?.();
      } catch {
        // swallow shutdown errors so the real test failure remains salient
      }
    }
  });

  await test("5.3 sdk.checkCredentials({ provider }) exists on public surface", async () => {
    const sdk = new NeuroLink();
    try {
      const fn = (sdk as unknown as Record<string, unknown>)[
        "checkCredentials"
      ];
      assertEqual(
        typeof fn,
        "function",
        `bug-confirmed: typeof sdk.checkCredentials === ${typeof fn}`,
      );
    } finally {
      try {
        await sdk.shutdown?.();
      } catch {
        // swallow shutdown errors so the real test failure remains salient
      }
    }
  });

  await test("5.4 Wrong OpenAI key surfaces typed AuthenticationError (not raw 401)", async () => {
    const sdk = new NeuroLink();
    try {
      let captured: unknown = undefined;
      try {
        await sdk.generate({
          provider: "openai",
          input: { text: "hi" },
          maxTokens: 32,
          disableTools: true,
          credentials: {
            openai: { apiKey: "sk-test-deliberately-invalid" },
          },
        } as never);
      } catch (err) {
        captured = err;
      }
      if (!captured) {
        // Deliberate-invalid-key succeeding IS the regression — the SDK
        // accepted a bogus key and returned without auth-error surface.
        // Skipping here would hide the very bug we're verifying.
        throw new Error(
          "bug-confirmed: deliberately invalid OpenAI key did not produce an error — auth surface bypassed",
        );
      }
      const ctorName =
        (captured as { constructor?: { name?: string } })?.constructor?.name ??
        "unknown";
      const msg =
        captured instanceof Error ? captured.message : String(captured);
      // Skip transient upstream issues (network/outage/rate-limit) ONLY,
      // never auth-flavoured ones — this test passes a deliberately invalid
      // API key and exists to verify the AuthenticationError surface, so
      // suppressing auth/401/unauthorized framings would silently SKIP the
      // very bug we're trying to catch.
      if (isTransientNonAuthError(msg)) {
        throw new Skip(`provider/outage error — ${msg.slice(0, 120)}`);
      }
      assertEqual(
        ctorName,
        "AuthenticationError",
        `bug-related: surfaced as ${ctorName}; msg="${msg.slice(0, 200)}"`,
      );
    } finally {
      try {
        await sdk.shutdown?.();
      } catch {
        // swallow shutdown errors so the real test failure remains salient
      }
    }
  });
}

// =============================================================================
// MAIN
// =============================================================================

if (HAS_OPENAI_KEY) {
  log("  TEST_OPENAI_API_KEY detected — live API tests will run.", "green");
} else if (HAS_ANTHROPIC_KEY) {
  log("  TEST_ANTHROPIC_API_KEY detected — live API tests will run.", "green");
} else {
  log(
    "  No TEST_OPENAI_API_KEY or TEST_ANTHROPIC_API_KEY — live tests will be skipped.",
    "yellow",
  );
}

await runSuite(async () => {
  await testTypeContracts();
  await testInstanceAndCallBehavior();
  await testProviderScopedCredentials();
  await testConcurrentCallsWithDifferentCredentials();
  await testIssue01ModelAccess();
});
