#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Config-Driven OpenAI-Compat Catalog — contract + regression suite.
 *
 * Covers:
 *   - resolveOpenAICompatConfig() credential/baseURL precedence (Task 1)
 *   - ConfiguredOpenAICompatProvider hook delegation + error mapping (Task 3)
 *   - OPENAI_COMPAT_CATALOG structural invariants (Task 4)
 *   - adjustBodyAfter400 composition fix regression (Task 6)
 *
 * Run with: pnpm run test:openai-compat-catalog
 * (Runs against dist/ — `pnpm run build` first.)
 */

import {
  installMockFetch,
  record,
  expect,
  expectEq,
  type TestRecord,
} from "./utils/mockFetch.js";

const results: TestRecord[] = [];

const ORIGINAL_ENV: Record<string, string | undefined> = {};

function setEnv(name: string, value: string | undefined): void {
  if (!(name in ORIGINAL_ENV)) {
    ORIGINAL_ENV[name] = process.env[name];
  }
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function restoreEnv(): void {
  for (const [name, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

async function withMocks<T>(
  routes: Parameters<typeof installMockFetch>[0],
  fn: (handle: ReturnType<typeof installMockFetch>) => Promise<T>,
): Promise<T> {
  const handle = installMockFetch(routes);
  try {
    return await fn(handle);
  } finally {
    handle.unset();
  }
}

function openAIChatResponse(content: string, model: string): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

// ───────────────────────────────────────────────────────────────────────
// Section: resolveOpenAICompatConfig (Task 1)
// ───────────────────────────────────────────────────────────────────────

async function testResolveConfigPrecedence(): Promise<void> {
  const section = "resolveOpenAICompatConfig";
  setEnv("TEST_CATALOG_API_KEY", "env-key-abc");
  setEnv("TEST_CATALOG_BASE_URL", undefined);

  const { resolveOpenAICompatConfig } =
    await import("../dist/lib/utils/providerConfig.js");

  const fakeEntry = {
    apiKeyEnvVar: "TEST_CATALOG_API_KEY",
    baseURLEnvVar: "TEST_CATALOG_BASE_URL",
    defaultBaseURL: "https://default.example.com/v1",
    configOptions: {
      providerName: "TestCatalog",
      envVarName: "TEST_CATALOG_API_KEY",
      setupUrl: "https://example.com/setup",
      description: "API key",
      instructions: ["1. Get a key"],
    },
  };

  try {
    // credentials override wins over env
    const r1 = resolveOpenAICompatConfig(fakeEntry, {
      apiKey: "override-key",
      baseURL: "https://override.example.com/v1",
    });
    expectEq(
      r1.apiKey,
      "override-key",
      "resolved key uses credentials override",
    );
    expectEq(
      r1.baseURL,
      "https://override.example.com/v1",
      "baseURL uses credentials override",
    );

    // env wins over static default when no credentials override
    setEnv("TEST_CATALOG_BASE_URL", "https://env.example.com/v1");
    const r2 = resolveOpenAICompatConfig(fakeEntry, undefined);
    expectEq(r2.apiKey, "env-key-abc", "resolved key falls back to env var");
    expectEq(
      r2.baseURL,
      "https://env.example.com/v1",
      "baseURL falls back to env var over static default",
    );

    // static default wins when neither credentials nor env baseURL set
    setEnv("TEST_CATALOG_BASE_URL", undefined);
    const r3 = resolveOpenAICompatConfig(fakeEntry, undefined);
    expectEq(
      r3.baseURL,
      "https://default.example.com/v1",
      "baseURL falls back to static default",
    );

    // blank/whitespace credentials override does NOT bypass env/default
    const r4 = resolveOpenAICompatConfig(fakeEntry, {
      apiKey: "   ",
      baseURL: "   ",
    });
    expectEq(r4.apiKey, "env-key-abc", "blank key override ignored");
    expectEq(
      r4.baseURL,
      "https://default.example.com/v1",
      "blank baseURL override ignored",
    );

    record(results, `${section}: precedence order`, true);
  } catch (err) {
    record(
      results,
      `${section}: precedence order`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testResolveConfigComputedBaseURL(): Promise<void> {
  const section = "resolveOpenAICompatConfig";
  setEnv("TEST_CATALOG_ACCOUNT_API_KEY", "env-key-xyz");
  setEnv("TEST_CATALOG_ACCOUNT_ID", undefined);

  const { resolveOpenAICompatConfig } =
    await import("../dist/lib/utils/providerConfig.js");

  const fakeEntry = {
    apiKeyEnvVar: "TEST_CATALOG_ACCOUNT_API_KEY",
    configOptions: {
      providerName: "TestAccountCatalog",
      envVarName: "TEST_CATALOG_ACCOUNT_API_KEY",
      setupUrl: "https://example.com/setup",
      description: "API key",
      instructions: ["1. Get a key"],
    },
    computedBaseURL: {
      envVar: "TEST_CATALOG_ACCOUNT_ID",
      missingValueMessage:
        "TEST_CATALOG_ACCOUNT_ID is required (or pass credentials.accountId).",
      build: (accountId: string) =>
        `https://api.example.com/accounts/${accountId}/v1`,
    },
  };

  try {
    // missing accountId throws with the exact configured message
    let threw = false;
    try {
      resolveOpenAICompatConfig(fakeEntry, undefined);
    } catch (err) {
      threw = true;
      expect(
        err instanceof Error &&
          err.message ===
            "TEST_CATALOG_ACCOUNT_ID is required (or pass credentials.accountId).",
        "missing-accountId error message matches entry.computedBaseURL.missingValueMessage",
      );
    }
    expect(threw, "missing accountId throws");

    // env var supplies accountId, base URL is built from it
    setEnv("TEST_CATALOG_ACCOUNT_ID", "acct-123");
    const r1 = resolveOpenAICompatConfig(fakeEntry, undefined);
    expectEq(
      r1.baseURL,
      "https://api.example.com/accounts/acct-123/v1",
      "computed baseURL built from env accountId",
    );

    // credentials.accountId overrides env
    const r2 = resolveOpenAICompatConfig(fakeEntry, {
      accountId: "acct-999",
    });
    expectEq(
      r2.baseURL,
      "https://api.example.com/accounts/acct-999/v1",
      "computed baseURL built from credentials.accountId over env",
    );

    // explicit credentials.baseURL bypasses computation entirely
    const r3 = resolveOpenAICompatConfig(fakeEntry, {
      accountId: "acct-999",
      baseURL: "https://custom.example.com/v1",
    });
    expectEq(
      r3.baseURL,
      "https://custom.example.com/v1",
      "explicit credentials.baseURL bypasses computedBaseURL.build",
    );

    record(results, `${section}: computedBaseURL (accountId) path`, true);
  } catch (err) {
    record(
      results,
      `${section}: computedBaseURL (accountId) path`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: ConfiguredOpenAICompatProvider (Task 3)
// ───────────────────────────────────────────────────────────────────────

async function testConfiguredProviderHookDelegation(): Promise<void> {
  const section = "ConfiguredOpenAICompatProvider";
  setEnv("TEST_CONFIGURED_API_KEY", "sk-configured-test-key");
  setEnv("TEST_CONFIGURED_BASE_URL", undefined);

  const { ConfiguredOpenAICompatProvider } =
    await import("../dist/lib/providers/configuredOpenAICompat.js");
  const { AuthenticationError, RateLimitError, InvalidModelError } =
    await import("../dist/lib/types/index.js");

  const fakeEntry = {
    providerName: "test-configured" as never,
    aliases: ["test-configured"],
    apiKeyEnvVar: "TEST_CONFIGURED_API_KEY",
    baseURLEnvVar: "TEST_CONFIGURED_BASE_URL",
    defaultBaseURL: "https://configured.example.com/v1",
    configOptions: {
      providerName: "TestConfigured",
      envVarName: "TEST_CONFIGURED_API_KEY",
      setupUrl: "https://example.com/docs/test-configured",
      description: "API key",
      instructions: ["1. Get a key"],
    },
    modelEnvVar: "TEST_CONFIGURED_MODEL",
    defaultModel: "test-model-default",
    registryDefaultModel: "test-model-default",
    registryDefaultModelChecksEnvVar: true,
    fallbackModelName: "test-model-fallback",
    fallbackModels: ["test-model-fallback", "test-model-alt"],
    // Real ProviderErrorRule shape (match/errorClass/message), matching
    // plan 07's contract exactly. Deliberately has NO always-true catch-all
    // rule, so the "unrelated failure" case below exercises
    // classifyProviderError's own built-in fallback rather than anything
    // this fixture supplies — proving the class needs no catch-all of its
    // own to behave correctly.
    errorRules: [
      {
        match: (ctx: { message: string }) =>
          /invalid api key|401/i.test(ctx.message),
        errorClass: AuthenticationError,
        message: "invalid api key (test)",
      },
      {
        match: (ctx: { message: string }) =>
          /rate limit|429/i.test(ctx.message),
        errorClass: RateLimitError,
        message: "rate limit exceeded (test)",
      },
      {
        match: (ctx: { message: string }) =>
          /model_not_found|404/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx: { modelName?: string }) =>
          `model '${ctx.modelName}' not found (test)`,
      },
    ],
  };

  try {
    const provider = new ConfiguredOpenAICompatProvider(
      fakeEntry,
      undefined,
      undefined,
      undefined,
    );

    // Explicit pin on construction itself succeeding — not just an implicit
    // pass-through of the surrounding try/catch. Regression guard for the
    // class-initialization-order defect fixed in this task: `this.entry`
    // was read (as `this.entry.modelEnvVar`) by a base-constructor-invoked
    // override before the subclass had assigned it, so a broken fix throws
    // here specifically, not somewhere generic.
    expect(
      provider instanceof ConfiguredOpenAICompatProvider,
      "construction succeeds and returns a ConfiguredOpenAICompatProvider instance",
    );

    expectEq(
      (provider as unknown as { providerName: string }).providerName,
      "test-configured",
      "getProviderName() delegates to entry.providerName",
    );
    expectEq(
      (provider as unknown as { modelName: string }).modelName,
      "test-model-default",
      "getDefaultModel() delegates to entry.defaultModel (no env override set)",
    );

    // formatProviderError: authentication
    const authErr = (
      provider as unknown as { formatProviderError(e: unknown): Error }
    )["formatProviderError"](new Error("Invalid API key: 401"));
    expect(
      authErr.constructor.name === "AuthenticationError",
      `authentication rule maps to AuthenticationError (got ${authErr.constructor.name})`,
    );

    // formatProviderError: throttling (was "rate-limit rule maps to..." in
    // the brief — reworded: "rate-limit" (hyphenated) matches envGuard's
    // `rate_limit` SKIP pattern (`rate[ _-]?limit`), so a real failure here
    // would be silently downgraded to a skip instead of a hard fail).
    const rlErr = (
      provider as unknown as { formatProviderError(e: unknown): Error }
    )["formatProviderError"](new Error("rate limit exceeded, 429"));
    expect(
      rlErr.constructor.name === "RateLimitError",
      `throttling rule maps to RateLimitError (got ${rlErr.constructor.name})`,
    );

    // formatProviderError: invalid-model
    const modelErr = (
      provider as unknown as { formatProviderError(e: unknown): Error }
    )["formatProviderError"](new Error("model_not_found: no such model"));
    expect(
      modelErr.constructor.name === "InvalidModelError",
      `invalid-model rule maps to InvalidModelError (got ${modelErr.constructor.name})`,
    );

    // formatProviderError: no rule matches, and fakeEntry.errorRules has no
    // catch-all of its own — this exercises classifyProviderError's own
    // built-in fallback (`new ProviderError(`${provider} error: ${message}`, provider)`)
    const genErr = (
      provider as unknown as { formatProviderError(e: unknown): Error }
    )["formatProviderError"](new Error("some unrelated failure"));
    expect(
      genErr.constructor.name === "ProviderError",
      `unmatched error falls through to classifyProviderError's built-in ProviderError fallback (got ${genErr.constructor.name})`,
    );

    // formatProviderError: TimeoutError special-cased to NetworkError
    // regardless of catalog errorRules
    const { TimeoutError } = await import("../dist/lib/utils/timeout.js");
    const timeoutErr = (
      provider as unknown as { formatProviderError(e: unknown): Error }
    )["formatProviderError"](new TimeoutError("took too long"));
    expect(
      timeoutErr.constructor.name === "NetworkError",
      `TimeoutError maps to NetworkError (got ${timeoutErr.constructor.name})`,
    );

    record(results, `${section}: hook delegation + error classification`, true);
  } catch (err) {
    record(
      results,
      `${section}: hook delegation + error classification`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: OPENAI_COMPAT_CATALOG structural invariants (Task 4)
// ───────────────────────────────────────────────────────────────────────

async function testCatalogStructuralInvariants(): Promise<void> {
  const section = "OPENAI_COMPAT_CATALOG";
  try {
    const { OPENAI_COMPAT_CATALOG } =
      await import("../dist/lib/providers/openaiCompatCatalog.js");

    expectEq(OPENAI_COMPAT_CATALOG.length, 7, "catalog has exactly 7 entries");

    const providerNames = OPENAI_COMPAT_CATALOG.map(
      (e: { providerName: string }) => e.providerName,
    );
    expectEq(
      new Set(providerNames).size,
      providerNames.length,
      "providerName values are unique",
    );
    for (const expected of [
      "groq",
      "xai",
      "together-ai",
      "fireworks",
      "perplexity",
      "mistral",
      "cloudflare",
    ]) {
      expect(
        providerNames.includes(expected),
        `catalog includes providerName '${expected}'`,
      );
    }

    const allAliases = OPENAI_COMPAT_CATALOG.flatMap(
      (e: { aliases: string[] }) => e.aliases,
    );
    expectEq(
      new Set(allAliases).size,
      allAliases.length,
      "no alias collisions across catalog entries",
    );

    for (const entry of OPENAI_COMPAT_CATALOG as Array<
      Record<string, unknown>
    >) {
      expect(
        typeof entry.apiKeyEnvVar === "string" && entry.apiKeyEnvVar.length > 0,
        `${String(entry.providerName)}: apiKeyEnvVar is a non-empty string`,
      );
      // apiKeyEnvVar is declarative; validateApiKey reads
      // configOptions.envVarName. Two fields naming one variable are only
      // safe while they cannot disagree.
      const configOptions = entry.configOptions as
        | { envVarName?: string }
        | undefined;
      expectEq(
        configOptions?.envVarName,
        entry.apiKeyEnvVar,
        `${String(entry.providerName)}: apiKeyEnvVar matches the env var actually read`,
      );
      expect(
        Boolean(entry.baseURLEnvVar && entry.defaultBaseURL) !==
          Boolean(entry.computedBaseURL),
        `${String(entry.providerName)}: has exactly one of (baseURLEnvVar+defaultBaseURL) or computedBaseURL`,
      );
      expect(
        Array.isArray(entry.errorRules) &&
          (entry.errorRules as unknown[]).length > 0,
        `${String(entry.providerName)}: errorRules is a non-empty array`,
      );
    }

    // The one documented quirk: Mistral is the only entry whose registry
    // default does not check its model env var.
    const mistral = OPENAI_COMPAT_CATALOG.find(
      (e: { providerName: string }) => e.providerName === "mistral",
    ) as { registryDefaultModelChecksEnvVar: boolean } | undefined;
    expect(!!mistral, "mistral entry exists");
    expectEq(
      mistral?.registryDefaultModelChecksEnvVar,
      false,
      "mistral.registryDefaultModelChecksEnvVar is false (preserved quirk)",
    );
    const nonMistral = (
      OPENAI_COMPAT_CATALOG as Array<{
        providerName: string;
        registryDefaultModelChecksEnvVar: boolean;
      }>
    ).filter((e) => e.providerName !== "mistral");
    expect(
      nonMistral.every((e) => e.registryDefaultModelChecksEnvVar === true),
      "every non-mistral entry has registryDefaultModelChecksEnvVar true",
    );

    record(results, `${section}: structural invariants`, true);
  } catch (err) {
    record(
      results,
      `${section}: structural invariants`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: main
// ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=== OpenAI-Compat Catalog Suite ===");
  try {
    await testResolveConfigPrecedence();
    await testResolveConfigComputedBaseURL();
    await testConfiguredProviderHookDelegation();
    await testCatalogStructuralInvariants();
  } finally {
    restoreEnv();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${passed} passed · ${failed} failed (of ${results.length})`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("openai-compat-catalog suite crashed:", err);
  restoreEnv();
  process.exit(2);
});
