# Config-Driven OpenAI-Compat Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the seven zero-quirk `OpenAIChatCompletionsProvider` subclasses (groq, xai, togetherAi, fireworks, perplexity, mistral, cloudflare) into one generic `ConfiguredOpenAICompatProvider` class driven by a plain-data catalog, so that adding the next wire-compatible provider becomes "add one object to an array" instead of "write, register, and test a new subclass file."

**Architecture:** A new `OpenAICompatCatalogEntry` type (in `src/lib/types/providers.ts`) captures everything that varies between the seven subclasses: credential env vars, base URL, default/fallback models, and error-classification rules. `OPENAI_COMPAT_CATALOG` (a new, statically-importable data module) holds one entry per provider. A single `ConfiguredOpenAICompatProvider` class (extends `OpenAIChatCompletionsProvider`, same base every existing subclass extends) reads its behavior entirely from the entry it is constructed with. `providerRegistry.ts`'s seven near-identical `registerProvider()` blocks become one `for` loop over the catalog. `OpenAICompatCatalogEntry` is a purpose-built table for this one family — it is _not_ the same thing as plan 04's `ProviderDescriptor` (a cross-cutting, all-30-providers identity record for CLI/health surfaces); the two may be unified in a later plan, but nothing in this plan requires that to happen first.

**Tech Stack:** TypeScript (strict), pnpm, tsx-run test suites (no vitest runner), the existing `OpenAIChatCompletionsProvider` template-method base class, `test/utils/mockFetch.ts` route-based fetch interception.

**Spec:**

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/10-openai-compat-family.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts` + `test:<name>` scripts.
- TEST HARNESS SKIP HAZARD: NEVER interpolate payloads into assertion messages; break-one-assertion sanity step for new suites.
- Repo rules: dynamic imports only in providerRegistry.ts factory closures (the catalog DATA module may be statically imported; the ConfiguredOpenAICompatProvider CLASS must still be dynamically imported in the registry); ALL types in src/lib/types/; no `interface`; unique type names; types barrel `export *` only; barrel-only internal type imports; no double assertions; named exports only. Public SDK API must not break (provider names, aliases, env vars, behavior all preserved).
- Conventional commits; commit per task; NEVER `git push`.

---

## Prerequisites (must already be on this branch)

This plan is **Wave 3** of the provider-redesign roadmap and depends on two plans landing first:

1. **Plan 07** must have already added, to the _existing_ `src/lib/types/errors.ts`, immediately after the existing `InvalidModelError` class:

   ```ts
   export type ProviderErrorContext = {
     error: unknown;
     message: string;
     statusCode: number | undefined;
     errorName: string | undefined;
     errorCode: string | undefined;
     provider: string;
     modelName: string | undefined;
   };

   export type ProviderErrorRule = {
     match: (ctx: ProviderErrorContext) => boolean;
     errorClass: new (message: string, provider?: string) => ProviderError;
     message: string | ((ctx: ProviderErrorContext) => string);
   };
   ```

   and, in a _new_ file `src/lib/utils/errorClassifier.ts`:

   ```ts
   export function classifyProviderError(
     error: unknown,
     rules: ProviderErrorRule[],
     provider: string,
     modelName?: string,
   ): Error;
   export const DEFAULT_ERROR_RULES: ProviderErrorRule[];
   ```

   Both `ProviderErrorContext` and `ProviderErrorRule` are barrelled via the existing `export * from "./errors.js"` in `src/lib/types/index.ts` — imported from the barrel per rule 13, never from `types/errors.js` directly.

   **Call shape is positional, not an options object**: `classifyProviderError(error, rules, provider, modelName?)` — no `{providerName, docsUrl}` object anywhere in the contract. `provider` is a plain string (the catalog entry's `providerName`); there is no `docsUrl` field on `ProviderErrorContext` at all, so any URL a rule's message needs must be inlined into that rule's own `message` string (see Task 4).

   `classifyProviderError` handles `TimeoutError` internally — `if (error instanceof TimeoutError) return new NetworkError(...)`, checked "ahead of any rule table" and explicitly not made overridable per plan 07's own doc comment — so callers must **not** duplicate a `TimeoutError` pre-check of their own; it's dead code once this function is delegated to (see Task 3).

   As of the research for this plan, **neither exists yet** on this branch until plan 07 lands — `src/lib/types/errors.ts` has the five `*Error` classes only, and `src/lib/utils/errorClassifier.ts` is absent from the tree. **Do not start Task 3 until both exist.** Task 3's contract test will fail to compile otherwise, which is the correct, fast signal that plan 07 hasn't landed — do not work around it by inlining a copy of `classifyProviderError`.
   - **First-match-wins, confirmed against plan 07's actual implementation** (not an assumption anymore — plan 07's `errorClassifier.ts` does `const rule = rules.find((r) => r.match(ctx))`, with an unconditional ``new ProviderError(`${provider} error: ${ctx.message}`, provider)`` fallback when no rule matches): rules are evaluated in array order, first `match` to return `true` wins, and a catalog entry does **not** need to supply its own always-true catch-all rule unless it wants custom wording for the fallback case (several of this plan's Task 4 entries do, to preserve each provider's original capitalized "X error: …" fallback text — see Task 4).

2. Plan 04's `ProviderDescriptor`/`PROVIDER_DESCRIPTORS`/`ProviderFactory.getDescriptor()` do **not** need to exist for this plan — nothing here reads or writes them. Confirmed via `ls src/lib/factories/providerDescriptors.ts` → does not exist on this branch as of this writing. If it lands first, no change to this plan is required.

---

## Design reference (read once, used by every task below)

### The verbatim-duplicated precedence block this plan extracts

Every one of the six non-Cloudflare subclasses (`groq.ts:47-59`, `xai.ts:49-61`, `togetherAi.ts:45-59`, `fireworks.ts`, `perplexity.ts`, `mistral.ts:57-68`) has this exact shape in its constructor, differing only in the provider name and env var:

```ts
const overrideApiKey = credentials?.apiKey?.trim();
const apiKey =
  overrideApiKey && overrideApiKey.length > 0
    ? overrideApiKey
    : getGroqApiKey(); // getXApiKey() = validateApiKey(createXConfig())
const baseURL =
  credentials?.baseURL?.trim() ||
  process.env.GROQ_BASE_URL?.trim() ||
  GROQ_DEFAULT_BASE_URL;
```

Cloudflare (`cloudflare.ts:57-82`) instead resolves an extra required field (`accountId`) and computes the base URL from it:

```ts
const overrideApiKey = credentials?.apiKey?.trim();
const apiKey =
  overrideApiKey && overrideApiKey.length > 0
    ? overrideApiKey
    : getCloudflareApiKey();
const accountId = (
  credentials?.accountId ??
  process.env.CLOUDFLARE_ACCOUNT_ID ??
  ""
).trim();
if (!accountId) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/",
  );
}
const baseURL = credentials?.baseURL ?? buildCloudflareBaseURL(accountId);
```

### Per-provider values this plan preserves exactly

| Provider    | `providerName`  | aliases                                 | credentials key | apiKey env           | baseURL env                 | default base URL                        |
| ----------- | --------------- | --------------------------------------- | --------------- | -------------------- | --------------------------- | --------------------------------------- |
| Groq        | `"groq"`        | `["groq"]`                              | `groq`          | `GROQ_API_KEY`       | `GROQ_BASE_URL`             | `https://api.groq.com/openai/v1`        |
| xAI         | `"xai"`         | `["xai", "grok"]`                       | `xai`           | `XAI_API_KEY`        | `XAI_BASE_URL`              | `https://api.x.ai/v1`                   |
| Together AI | `"together-ai"` | `["together-ai", "together"]`           | `together`      | `TOGETHER_API_KEY`   | `TOGETHER_BASE_URL`         | `https://api.together.xyz/v1`           |
| Fireworks   | `"fireworks"`   | `["fireworks"]`                         | `fireworks`     | `FIREWORKS_API_KEY`  | `FIREWORKS_BASE_URL`        | `https://api.fireworks.ai/inference/v1` |
| Perplexity  | `"perplexity"`  | `["perplexity", "pplx"]`                | `perplexity`    | `PERPLEXITY_API_KEY` | `PERPLEXITY_BASE_URL`       | `https://api.perplexity.ai`             |
| Mistral     | `"mistral"`     | `["mistral"]`                           | `mistral`       | `MISTRAL_API_KEY`    | `MISTRAL_BASE_URL`          | `https://api.mistral.ai/v1`             |
| Cloudflare  | `"cloudflare"`  | `["cloudflare", "workers-ai", "cf-ai"]` | `cloudflare`    | `CLOUDFLARE_API_KEY` | _(computed from accountId)_ | _(computed)_                            |

### The pre-existing Mistral registry-default quirk (discovered, preserved, not fixed)

`providerRegistry.ts` passes a `defaultModel` argument to `ProviderFactory.registerProvider()` that is used _before_ the provider is constructed. For six of the seven providers this argument **also** checks the same env var the class's own `getDefaultModel()` checks — e.g. xAI's registration passes `process.env.XAI_MODEL || XaiModels.GROK_3`, identical in effect to `XaiProvider.getDefaultModel()`. **Mistral is the one exception**: its registration passes the bare literal `MistralModels.MISTRAL_LARGE_LATEST` with no env-var check, while `MistralProvider.getDefaultModel()` returns `getProviderModel("MISTRAL_MODEL", MistralModels.MISTRAL_SMALL_2506)` (env-var-aware, different literal). This is a genuine, narrow, pre-existing inconsistency — not something this plan is authorized to fix (only Task 6 has a bug-fix mandate, and it's scoped to `adjustBodyAfter400`). It is preserved via two catalog-entry fields: `registryDefaultModel` (the literal to pass to `registerProvider()`) and `registryDefaultModelChecksEnvVar` (`true` for six providers, `false` only for Mistral — when `false`, the registration loop passes `entry.registryDefaultModel` unconditionally instead of checking `process.env[entry.modelEnvVar]` first). See **Risks & Rollback** for a possible follow-up.

---

### Task 1: Shared config-resolution helper (`resolveOpenAICompatConfig`)

**Files:**

- `src/lib/utils/providerConfig.ts` (append after line 1502, end of file) — implementation
- `test/continuous-test-suite-openai-compat-catalog.ts` (NEW file) — test suite
- `package.json` (add one script line near the other `test:*` entries, e.g. after `"test:providers-mocked"`)

**Interfaces:**

- Consumes: `ProviderConfigOptions` (existing, `src/lib/types/providers.ts:680-692`), `validateApiKey(config: ProviderConfigOptions): string` (existing, `providerConfig.ts`), `OpenAICompatCatalogEntry` and `OpenAICompatCredentials` (produced by Task 2 — **this task is written before Task 2 exists**, so its test file uses a hand-rolled minimal object shape matching the fields this function reads, not the real type import; Task 2 will make that object satisfy the real type with zero changes needed).
- Produces: `resolveOpenAICompatConfig(entry, credentials): { apiKey: string; baseURL: string }` in `src/lib/utils/providerConfig.ts`.

This task is written to land _before_ Task 2's type exists on disk, so its test file imports nothing from `types/providers.ts` for the entry shape — it constructs a plain object literal with the exact fields `resolveOpenAICompatConfig` will read. When Task 2 lands, that object literal is structurally assignable to the real `OpenAICompatCatalogEntry` with no changes (verified in Task 2's own step).

- [ ] **Step 1: Write the new test suite file with one failing test (happy-path apiKey/baseURL precedence)**

  Create `test/continuous-test-suite-openai-compat-catalog.ts`:

  ```ts
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
      expectEq(r1.apiKey, "override-key", "apiKey uses credentials override");
      expectEq(
        r1.baseURL,
        "https://override.example.com/v1",
        "baseURL uses credentials override",
      );

      // env wins over static default when no credentials override
      setEnv("TEST_CATALOG_BASE_URL", "https://env.example.com/v1");
      const r2 = resolveOpenAICompatConfig(fakeEntry, undefined);
      expectEq(r2.apiKey, "env-key-abc", "apiKey falls back to env var");
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
      expectEq(r4.apiKey, "env-key-abc", "blank apiKey override ignored");
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
  // Section: main
  // ───────────────────────────────────────────────────────────────────────

  async function main(): Promise<void> {
    console.log("=== OpenAI-Compat Catalog Suite ===");
    try {
      await testResolveConfigPrecedence();
      await testResolveConfigComputedBaseURL();
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
  ```

  Note: this file references `withMocks`, `openAIChatResponse` which are unused by Task 1's two tests — they're included now because Tasks 3 and 6 append tests to this same file later and need them. This is intentional (avoids a churn-y "add helper, then immediately use it two tasks later" diff) but do confirm `pnpm run lint` doesn't flag them as unused in the interim — if it does, remove them here and re-add in Task 3's step instead.

- [ ] **Step 2: Add the package.json script**

  In `package.json`, add (alphabetically near `"test:providers-mocked"`, matching the existing `"test:<name>": "npx tsx test/continuous-test-suite-<name>.ts"` convention):

  ```json
  "test:openai-compat-catalog": "npx tsx test/continuous-test-suite-openai-compat-catalog.ts",
  ```

- [ ] **Step 3: Run and verify the suite fails (resolveOpenAICompatConfig doesn't exist yet)**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: crash with `main().catch` firing — `resolveOpenAICompatConfig` is not exported from `dist/lib/utils/providerConfig.js`. Exit code 2. This confirms the test actually exercises new code (not a false-positive skip — per the Global Constraints skip hazard, this is a hard crash, not a soft skip, so there's no risk of it being misclassified).

- [ ] **Step 4: Implement `resolveOpenAICompatConfig` in `src/lib/utils/providerConfig.ts`**

  Append at the end of the file (after `describeAnthropicConfig`, i.e. after the current last line, line 1502):

  ```ts
  /**
   * Resolves the {apiKey, baseURL} pair for a config-driven OpenAI-compatible
   * catalog entry (see OpenAICompatCatalogEntry in types/providers.ts).
   *
   * Extracted from the identical 6-line precedence block that was copy-pasted
   * across groq.ts, xai.ts, togetherAi.ts, fireworks.ts, perplexity.ts, and
   * mistral.ts, plus Cloudflare's accountId-computed-baseURL variant.
   *
   * Precedence (matches every ported subclass's original behavior exactly):
   *   apiKey:  credentials.apiKey (trimmed, non-blank) > env var > throw
   *   baseURL: credentials.baseURL (trimmed, non-blank)
   *            > env var (if entry.baseURLEnvVar is set, trimmed, non-blank)
   *            > entry.defaultBaseURL
   *   baseURL (computedBaseURL entries, e.g. Cloudflare):
   *            credentials.baseURL > computedBaseURL.build(accountId), where
   *            accountId = credentials.accountId (trimmed) > env var (trimmed)
   *            > throw computedBaseURL.missingValueMessage
   */
  export function resolveOpenAICompatConfig(
    entry: OpenAICompatCatalogEntry,
    credentials?: OpenAICompatCredentials,
  ): { apiKey: string; baseURL: string } {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : validateApiKey(entry.configOptions);

    if (entry.computedBaseURL) {
      const { envVar, missingValueMessage, build } = entry.computedBaseURL;
      const extraValue = (
        credentials?.accountId ??
        process.env[envVar] ??
        ""
      ).trim();
      if (!extraValue) {
        throw new Error(missingValueMessage);
      }
      const baseURL = credentials?.baseURL ?? build(extraValue);
      return { apiKey, baseURL };
    }

    const overrideBaseURL = credentials?.baseURL?.trim();
    const envBaseURL = entry.baseURLEnvVar
      ? process.env[entry.baseURLEnvVar]?.trim()
      : undefined;
    const baseURL =
      (overrideBaseURL && overrideBaseURL.length > 0
        ? overrideBaseURL
        : undefined) ??
      (envBaseURL && envBaseURL.length > 0 ? envBaseURL : undefined) ??
      entry.defaultBaseURL ??
      "";
    return { apiKey, baseURL };
  }
  ```

  Add `OpenAICompatCatalogEntry` and `OpenAICompatCredentials` to the existing barrel-import block at the top of the file:

  ```ts
  import type {
    APIValidationResult,
    ProviderConfigOptions,
    AnthropicAuthMethod,
    ClaudeSubscriptionTier,
    AnthropicAuthConfig,
    OAuthToken,
    AnthropicAuthConfigResult,
    OpenAICompatCatalogEntry,
    OpenAICompatCredentials,
  } from "../types/index.js";
  ```

  (These two types don't exist yet — Task 2 adds them. This creates a temporary compile error between Step 4 and Task 2's Step 1, which is fine: Task 2 is the very next task and this file is not built/shipped in between. If your workflow requires green `pnpm run check` after every single step, do Task 2 before this Step 4 instead — the two tasks have no other ordering dependency.)

- [ ] **Step 5: Run and verify the suite passes**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `2 passed · 0 failed (of 2)`, exit 0. (This will only fully compile once Task 2's types exist — see the note in Step 4. If running Task 1 and Task 2 strictly in order, `pnpm run build` fails until Task 2's Step 1 lands; that's expected and not a regression to chase down.)

- [ ] **Step 6: Sanity-check the skip hazard on this new suite**

  Per the Global Constraints, temporarily break one assertion (e.g. change `r1.apiKey` expected value to a wrong string) and confirm the suite reports `✗` and exits non-zero — not `⊘` skipped. Revert the break immediately after confirming.

- [ ] **Step 7: Commit**
  ```bash
  git add src/lib/utils/providerConfig.ts test/continuous-test-suite-openai-compat-catalog.ts package.json
  git commit -m "feat(providers): add resolveOpenAICompatConfig shared credential/baseURL helper"
  ```

---

### Task 2: `OpenAICompatCatalogEntry` + `OpenAICompatCredentials` types

**Files:**

- `src/lib/types/providers.ts` (insert after line 692, right after the `ProviderConfigOptions` type and before the `// CORE PROVIDER INTERFACES` section header)

**Interfaces:**

- Consumes: `AIProviderName` (existing, `src/lib/constants/enums.ts`), `ProviderConfigOptions` (existing, same file, lines 680-692), `ProviderErrorRule` (from plan 07, `src/lib/types/errors.ts` — prerequisite, see top of this plan).
- Produces: `type OpenAICompatCatalogEntry`, `type OpenAICompatCredentials` in `src/lib/types/providers.ts`.

This task has no runtime behavior — it's a pure type addition, verified by `pnpm run check` and by Task 1's test file (written before this type existed) now type-checking successfully against it.

- [ ] **Step 1: Add the two types**

  Insert immediately after line 692 (`};` closing `ProviderConfigOptions`) and before line 694 (`// ============...CORE PROVIDER INTERFACES`):

  ```ts
  /**
   * Minimal credential shape accepted by resolveOpenAICompatConfig() and
   * ConfiguredOpenAICompatProvider. A structural superset of every real
   * per-provider NeurolinkCredentials["<key>"] slice in this family (groq,
   * xai, together, fireworks, perplexity, mistral, cloudflare) — all fields
   * optional, so passing e.g. NeurolinkCredentials["groq"] (which has no
   * accountId) here is always structurally valid.
   */
  export type OpenAICompatCredentials = {
    apiKey?: string;
    baseURL?: string;
    accountId?: string;
  };

  /**
   * One row of the config-driven OpenAI-compatible provider catalog
   * (OPENAI_COMPAT_CATALOG, src/lib/providers/openaiCompatCatalog.ts).
   * Replaces a hand-written OpenAIChatCompletionsProvider subclass for
   * providers whose only differences from every sibling are credentials,
   * base URL, model defaults, and error-message classification.
   */
  export type OpenAICompatCatalogEntry = {
    /** Registry key / nl.generate({provider}) value, e.g. "groq". */
    providerName: AIProviderName;
    /** Registry aliases, e.g. ["together-ai", "together"]. */
    aliases: string[];
    /** Env var holding the API key, e.g. "GROQ_API_KEY". */
    apiKeyEnvVar: string;
    /**
     * Env var that can override the base URL, e.g. "GROQ_BASE_URL". Omit
     * for entries that use computedBaseURL instead (e.g. Cloudflare).
     */
    baseURLEnvVar?: string;
    /** Static default base URL. Omit for computedBaseURL entries. */
    defaultBaseURL?: string;
    /**
     * Present only for providers whose base URL is computed from an extra
     * required credential value instead of a static default (Cloudflare's
     * accountId). Deliberately narrow (accountId-shaped) rather than a
     * generic extra-field mechanism — Cloudflare is the only current user.
     */
    computedBaseURL?: {
      /** Env var fallback for the extra value, e.g. "CLOUDFLARE_ACCOUNT_ID". */
      envVar: string;
      /** Thrown when neither credentials.accountId nor envVar supply a value. */
      missingValueMessage: string;
      /** Builds the base URL from the resolved accountId. */
      build: (accountId: string) => string;
    };
    /** Setup/help metadata, passed to validateApiKey(). Not consumed by
     *  classifyProviderError() — that function's ProviderErrorContext has no
     *  docsUrl field; any URL a rule's message needs is inlined in the rule
     *  itself (see Task 4). */
    configOptions: ProviderConfigOptions;
    /** Env var for the default model, e.g. "GROQ_MODEL". */
    modelEnvVar: string;
    /** Default model when modelEnvVar is unset. */
    defaultModel: string;
    /**
     * The literal passed as ProviderFactory.registerProvider()'s defaultModel
     * argument (resolved before the provider is constructed). Preserves each
     * provider's exact pre-migration registry behavior.
     */
    registryDefaultModel: string;
    /**
     * True for every provider except Mistral: whether the registry-level
     * default also consults modelEnvVar before falling back to
     * registryDefaultModel. False is a pre-existing, intentionally-preserved
     * quirk unique to Mistral's registration (see plan's Design reference).
     */
    registryDefaultModelChecksEnvVar: boolean;
    /** Fallback model name (getFallbackModelName()). */
    fallbackModelName: string;
    /** Fallback model list (getFallbackModels()). */
    fallbackModels: string[];
    /**
     * Error-classification rules, consumed by classifyProviderError. Typed
     * as a mutable array — not readonly — because plan 07's
     * `classifyProviderError(error, rules: ProviderErrorRule[], provider, modelName?)`
     * declares `rules` as `ProviderErrorRule[]`; a `readonly` array here
     * would not be assignable to that parameter without a cast, which rule
     * 14 (no double assertions) and general hygiene both rule out. Each
     * entry's array is still constructed as a fresh literal per provider in
     * Task 4, so nothing actually mutates it at runtime.
     */
    errorRules: ProviderErrorRule[];
  };
  ```

- [ ] **Step 2: Verify Task 1's test file now type-checks against the real type**

  ```bash
  pnpm run check
  ```

  Expected: no errors. The hand-rolled object literals in `test/continuous-test-suite-openai-compat-catalog.ts` (`fakeEntry` in both tests) are structurally compatible with `OpenAICompatCatalogEntry` because every field they omit (`aliases`, `apiKeyEnvVar` is present but others like `registryDefaultModel`, `errorRules`, etc. are omitted) — wait, check this carefully: TypeScript structural typing requires object literals passed as a _typed_ argument to have all required fields, but the test file's `fakeEntry` is inferred as its own literal type (untyped `const fakeEntry = {...}`), then passed to `resolveOpenAICompatConfig(fakeEntry, ...)` whose parameter is typed `OpenAICompatCatalogEntry`. TypeScript will only accept this if `fakeEntry`'s properties are a superset (or exact match for required fields) of what `resolveOpenAICompatConfig` actually reads — since `resolveOpenAICompatConfig`'s signature declares its first parameter as the _full_ `OpenAICompatCatalogEntry` type, an object literal missing required fields (like `aliases`, `providerName`, `registryDefaultModel`, `errorRules`) will fail excess/missing-property checks.

  **This is a real gap to close, not a placeholder to leave**: fix it now by widening `resolveOpenAICompatConfig`'s parameter type to only the subset of fields it actually reads, instead of the full entry. Go back to `src/lib/utils/providerConfig.ts` and change the signature to accept a narrower, purpose-built pick:

  ```ts
  export type OpenAICompatConfigInput = Pick<
    OpenAICompatCatalogEntry,
    | "apiKeyEnvVar"
    | "baseURLEnvVar"
    | "defaultBaseURL"
    | "computedBaseURL"
    | "configOptions"
  >;

  export function resolveOpenAICompatConfig(
    entry: OpenAICompatConfigInput,
    credentials?: OpenAICompatCredentials,
  ): { apiKey: string; baseURL: string } {
    // body unchanged from Task 1 Step 4 — every field it reads
    // (entry.configOptions, entry.computedBaseURL, entry.baseURLEnvVar,
    // entry.defaultBaseURL) is present on OpenAICompatConfigInput.
  }
  ```

  `OpenAICompatConfigInput` is a _new_ exported type — since it's derived with `Pick<>` from a type in `src/lib/types/providers.ts`, and rule 2 says all type definitions go in `src/lib/types/`, this `Pick<>` alias itself must live in `types/providers.ts`, not be declared inline in `providerConfig.ts`. Add it directly below `OpenAICompatCatalogEntry` in `types/providers.ts`:

  ```ts
  /** The subset of OpenAICompatCatalogEntry that resolveOpenAICompatConfig()
   *  needs — lets call sites pass a minimal object without the full catalog
   *  entry (e.g. in tests, or a future non-catalog caller). */
  export type OpenAICompatConfigInput = Pick<
    OpenAICompatCatalogEntry,
    | "apiKeyEnvVar"
    | "baseURLEnvVar"
    | "defaultBaseURL"
    | "computedBaseURL"
    | "configOptions"
  >;
  ```

  Then in `providerConfig.ts`, import `OpenAICompatConfigInput` alongside the other two types and use it as `resolveOpenAICompatConfig`'s first parameter type in place of `OpenAICompatCatalogEntry`. Re-run `pnpm run check` — now `fakeEntry` in both Task 1 tests (which has exactly `apiKeyEnvVar`, `baseURLEnvVar`/`computedBaseURL`, `defaultBaseURL`, `configOptions`) type-checks cleanly, and Task 4's real catalog entries (a superset) will too, since a full `OpenAICompatCatalogEntry` is always assignable to `OpenAICompatConfigInput`.

- [ ] **Step 3: Re-run Task 1's suite to confirm no behavior changed**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `2 passed · 0 failed (of 2)`, exit 0.

- [ ] **Step 4: Lint check for the barrel/type rules**

  ```bash
  pnpm run lint
  ```

  Expected: clean. Confirms `neurolink/unique-type-names` (no collision with any existing type name — `OpenAICompatCatalogEntry`, `OpenAICompatCredentials`, `OpenAICompatConfigInput` are all new, globally-unique names) and `neurolink/no-interface`/`no-local-type-alias` pass.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/types/providers.ts src/lib/utils/providerConfig.ts
  git commit -m "feat(types): add OpenAICompatCatalogEntry, OpenAICompatCredentials, OpenAICompatConfigInput"
  ```

---

### Task 3: `ConfiguredOpenAICompatProvider` class

**Files:**

- `src/lib/providers/configuredOpenAICompat.ts` (NEW file)
- `test/continuous-test-suite-openai-compat-catalog.ts` (append a new section)

**Interfaces:**

- Consumes: `OpenAIChatCompletionsProvider` (existing base class, `src/lib/providers/openaiChatCompletionsBase.ts`), `resolveOpenAICompatConfig` (Task 1), `OpenAICompatCatalogEntry`/`OpenAICompatCredentials` (Task 2), `getProviderModel` (existing, `providerConfig.ts`), `classifyProviderError` (plan 07 — prerequisite, `src/lib/utils/errorClassifier.ts`), `logger` (existing, `utils/logger.ts`), `redactUrlCredentials` (existing, `utils/logSanitize.ts`).
- Produces: `class ConfiguredOpenAICompatProvider` in `src/lib/providers/configuredOpenAICompat.ts`.

**Design note on error-message fidelity:** `classifyProviderError`'s `ProviderErrorRule.message` field accepts a function of `ProviderErrorContext` (which includes `modelName`, threaded through from this class's `this.modelName`), so every bespoke string the 7 subclasses hand-roll today — Groq's `` `Groq model '${this.modelName}' was decommissioned...` ``, xAI's "insufficient quota — top up at console.x.ai" message, each provider's own auth/rate-limit/model-not-found wording — is preserved exactly. Fidelity lives in Task 4's catalog entries (each provider's `errorRules` array), not in this class: `ConfiguredOpenAICompatProvider.formatProviderError()` itself does nothing but delegate to `classifyProviderError`, so there is nothing generic or lossy about this step. `TimeoutError` handling is also **not** duplicated here — `classifyProviderError` checks `error instanceof TimeoutError` internally, ahead of any rule table, and always returns `NetworkError`; a local pre-check in this class would be dead code. One real, intentional behavior change survives: **all 7 providers' `TimeoutError` now maps to `NetworkError`**, whereas Groq alone previously mapped it to `ProviderError` — that's `classifyProviderError`'s own hard-coded, non-overridable behavior (plan 07), not a choice this plan makes; it's called out again in Risks & Rollback. The existing parity tests in `continuous-test-suite-providers-mocked.ts` already assert with loose regexes (e.g. `/groq|401|unauthor|api key/i`), not exact strings, so they remain valid regardless; Tasks 7-13 preserve that convention.

- [ ] **Step 1: Write a failing contract test for the class**

  Append to `test/continuous-test-suite-openai-compat-catalog.ts`, before the `main()` function:

  ```ts
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

      // formatProviderError: rate-limit
      const rlErr = (
        provider as unknown as { formatProviderError(e: unknown): Error }
      )["formatProviderError"](new Error("rate limit exceeded, 429"));
      expect(
        rlErr.constructor.name === "RateLimitError",
        `rate-limit rule maps to RateLimitError (got ${rlErr.constructor.name})`,
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

      record(
        results,
        `${section}: hook delegation + error classification`,
        true,
      );
    } catch (err) {
      record(
        results,
        `${section}: hook delegation + error classification`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

  Update `main()` to call it:

  ```ts
  await testResolveConfigPrecedence();
  await testResolveConfigComputedBaseURL();
  await testConfiguredProviderHookDelegation();
  ```

- [ ] **Step 2: Run and verify it fails**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: crash (module not found — `dist/lib/providers/configuredOpenAICompat.js` doesn't exist). Exit 2.

- [ ] **Step 3: Implement `ConfiguredOpenAICompatProvider`**

  Create `src/lib/providers/configuredOpenAICompat.ts`:

  ```ts
  import type { AIProviderName } from "../constants/enums.js";
  import type {
    OpenAICompatCatalogEntry,
    OpenAICompatCredentials,
  } from "../types/index.js";
  import { logger } from "../utils/logger.js";
  import { redactUrlCredentials } from "../utils/logSanitize.js";
  import {
    getProviderModel,
    resolveOpenAICompatConfig,
  } from "../utils/providerConfig.js";
  import { classifyProviderError } from "../utils/errorClassifier.js";
  import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

  /**
   * Generic OpenAI-compatible provider driven entirely by an
   * OpenAICompatCatalogEntry. Replaces a hand-written subclass for any
   * provider whose only differences from its siblings are credentials, base
   * URL, model defaults, and error-classification rules — see
   * OPENAI_COMPAT_CATALOG in openaiCompatCatalog.ts for the entries.
   *
   * If a provider needs a real hook override (adjustRequestBody,
   * adjustBodyAfter400, getChatCompletionsURL, getAuthHeaders,
   * suppressResponseFormatWithTools, ...) it does NOT belong in the catalog —
   * write a dedicated subclass instead (see deepseek.ts, azureOpenai.ts).
   */
  export class ConfiguredOpenAICompatProvider extends OpenAIChatCompletionsProvider {
    private readonly entry: OpenAICompatCatalogEntry;

    constructor(
      entry: OpenAICompatCatalogEntry,
      modelName?: string,
      sdk?: unknown,
      credentials?: OpenAICompatCredentials,
    ) {
      const { apiKey, baseURL } = resolveOpenAICompatConfig(entry, credentials);
      super(entry.providerName, modelName, sdk, { baseURL, apiKey });
      this.entry = entry;
      logger.debug(`${entry.configOptions.providerName} Provider initialized`, {
        modelName: this.modelName,
        providerName: this.providerName,
        baseURL: redactUrlCredentials(this.config.baseURL),
      });
    }

    protected getProviderName(): AIProviderName {
      return this.entry.providerName;
    }

    protected getDefaultModel(): string {
      return getProviderModel(this.entry.modelEnvVar, this.entry.defaultModel);
    }

    protected getFallbackModelName(): string {
      return this.entry.fallbackModelName;
    }

    protected getFallbackModels(): string[] {
      return this.entry.fallbackModels;
    }

    protected formatProviderError(error: unknown): Error {
      // classifyProviderError handles TimeoutError internally (always maps
      // to NetworkError, ahead of any rule table) — no local pre-check
      // needed or wanted here; see this task's design note.
      return classifyProviderError(
        error,
        this.entry.errorRules,
        this.entry.providerName,
        this.modelName,
      );
    }
  }
  ```

- [ ] **Step 4: Run and verify it passes**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `3 passed · 0 failed (of 3)`, exit 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/providers/configuredOpenAICompat.ts test/continuous-test-suite-openai-compat-catalog.ts
  git commit -m "feat(providers): add ConfiguredOpenAICompatProvider generic catalog-driven class"
  ```

---

### Task 4: `OPENAI_COMPAT_CATALOG` — all 7 entries

**Files:**

- `src/lib/providers/openaiCompatCatalog.ts` (NEW file)
- `test/continuous-test-suite-openai-compat-catalog.ts` (append a structural-validation section)

**Interfaces:**

- Consumes: `OpenAICompatCatalogEntry` (Task 2), `AIProviderName`, `GroqModels`/`XaiModels`/`TogetherAIModels`/`FireworksModels`/`PerplexityModels`/`MistralModels`/`CloudflareModels` (existing, `constants/enums.ts`), `createGroqConfig`/`createXaiConfig`/`createTogetherAIConfig`/`createFireworksConfig`/`createPerplexityConfig`/`createMistralConfig`/`createCloudflareConfig` (existing, `utils/providerConfig.ts`), `ProviderErrorRule`, `AuthenticationError`/`RateLimitError`/`InvalidModelError`/`ProviderError` (plan 07 — prerequisite, `src/lib/types/errors.ts` via the barrel).
- Produces: `OPENAI_COMPAT_CATALOG: readonly OpenAICompatCatalogEntry[]` in `src/lib/providers/openaiCompatCatalog.ts`.

**Design note on `errorRules` fidelity:** every entry below is a direct, mechanical translation of its subclass's original `formatProviderError` `if`/`else` ladder into a declarative `ProviderErrorRule[]` array — same `.includes()` conditions (now as `match` predicates), same messages verbatim (including model-name interpolation via `ctx.modelName`, which `ConfiguredOpenAICompatProvider` threads through as `classifyProviderError`'s 4th positional argument), same final fallback message and class, in the same order (first-match-wins reproduces the original `if`/`else-if` priority exactly). Nothing is generic or lossy here: xAI keeps its unique "insufficient quota — top up at console.x.ai" rule, Groq keeps its `model_decommissioned`-vs-`model_not_found` distinction, and every provider keeps its own auth/rate-limit/model-not-found wording. No entry spreads plan 07's `DEFAULT_ERROR_RULES` — that table's network/connection and 5xx-server rules would introduce classification behavior none of these 7 subclasses had before (everything past the three specific branches fell to each provider's own generic catch-all), and this task's parity goal (Tasks 7-13) is exact behavioral parity, not new behavior.

- [ ] **Step 1: Write a failing structural-invariants test**

  Append to `test/continuous-test-suite-openai-compat-catalog.ts`, before `main()`:

  ```ts
  // ───────────────────────────────────────────────────────────────────────
  // Section: OPENAI_COMPAT_CATALOG structural invariants (Task 4)
  // ───────────────────────────────────────────────────────────────────────

  async function testCatalogStructuralInvariants(): Promise<void> {
    const section = "OPENAI_COMPAT_CATALOG";
    try {
      const { OPENAI_COMPAT_CATALOG } =
        await import("../dist/lib/providers/openaiCompatCatalog.js");

      expectEq(
        OPENAI_COMPAT_CATALOG.length,
        7,
        "catalog has exactly 7 entries",
      );

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
          typeof entry.apiKeyEnvVar === "string" &&
            entry.apiKeyEnvVar.length > 0,
          `${String(entry.providerName)}: apiKeyEnvVar is a non-empty string`,
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
  ```

  Update `main()`:

  ```ts
  await testResolveConfigPrecedence();
  await testResolveConfigComputedBaseURL();
  await testConfiguredProviderHookDelegation();
  await testCatalogStructuralInvariants();
  ```

- [ ] **Step 2: Run and verify it fails**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: crash — `dist/lib/providers/openaiCompatCatalog.js` doesn't exist. Exit 2.

- [ ] **Step 3: Implement `OPENAI_COMPAT_CATALOG` with all 7 complete entries**

  Create `src/lib/providers/openaiCompatCatalog.ts`:

  ```ts
  import { AIProviderName } from "../constants/enums.js";
  import {
    CloudflareModels,
    FireworksModels,
    GroqModels,
    MistralModels,
    PerplexityModels,
    TogetherAIModels,
    XaiModels,
  } from "../constants/enums.js";
  import type { OpenAICompatCatalogEntry } from "../types/index.js";
  import {
    AuthenticationError,
    RateLimitError,
    InvalidModelError,
    ProviderError,
  } from "../types/index.js";
  import {
    createCloudflareConfig,
    createFireworksConfig,
    createGroqConfig,
    createMistralConfig,
    createPerplexityConfig,
    createTogetherAIConfig,
    createXaiConfig,
  } from "../utils/providerConfig.js";

  function buildCloudflareBaseURL(accountId: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
  }

  /**
   * Config-driven catalog of the 7 zero-quirk OpenAI-compatible providers.
   * Each entry fully replaces what used to be a hand-written
   * OpenAIChatCompletionsProvider subclass — see ConfiguredOpenAICompatProvider
   * for the class that reads these entries, and providerRegistry.ts for the
   * registration loop that consumes this array.
   *
   * To add a new zero-quirk OpenAI-compatible provider: add one entry here.
   * Do NOT add a provider here if it needs any hook override beyond the 3
   * mandatory ones (getProviderName/getDefaultModel/formatProviderError) —
   * write a dedicated subclass instead (see deepseek.ts, azureOpenai.ts, and
   * Task 14's docs task for the deciding criteria).
   */
  export const OPENAI_COMPAT_CATALOG: readonly OpenAICompatCatalogEntry[] = [
    {
      providerName: AIProviderName.GROQ,
      aliases: ["groq"],
      apiKeyEnvVar: "GROQ_API_KEY",
      baseURLEnvVar: "GROQ_BASE_URL",
      defaultBaseURL: "https://api.groq.com/openai/v1",
      configOptions: createGroqConfig(),
      modelEnvVar: "GROQ_MODEL",
      defaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
      registryDefaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
      registryDefaultModelChecksEnvVar: true,
      fallbackModelName: GroqModels.LLAMA_3_1_8B_INSTANT,
      fallbackModels: [
        GroqModels.LLAMA_3_3_70B_VERSATILE,
        GroqModels.LLAMA_3_1_8B_INSTANT,
        GroqModels.GEMMA_2_9B_IT,
        GroqModels.MIXTRAL_8X7B_32768,
        GroqModels.LLAMA_3_2_90B_VISION_PREVIEW,
        GroqModels.LLAMA_3_2_11B_VISION_PREVIEW,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401") ||
            ctx.message.includes("invalid_api_key"),
          errorClass: AuthenticationError,
          message:
            "Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message:
            "Groq rate limit exceeded. Free tier limits are tight; consider upgrading or backing off.",
        },
        {
          match: (ctx) => ctx.message.includes("model_decommissioned"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Groq model '${ctx.modelName}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`,
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Groq model '${ctx.modelName}' not found. See https://console.groq.com/docs/models for the current catalog.`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Groq error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.XAI,
      aliases: ["xai", "grok"],
      apiKeyEnvVar: "XAI_API_KEY",
      baseURLEnvVar: "XAI_BASE_URL",
      defaultBaseURL: "https://api.x.ai/v1",
      configOptions: createXaiConfig(),
      modelEnvVar: "XAI_MODEL",
      defaultModel: XaiModels.GROK_3,
      registryDefaultModel: XaiModels.GROK_3,
      registryDefaultModelChecksEnvVar: true,
      fallbackModelName: XaiModels.GROK_3_MINI,
      fallbackModels: [
        XaiModels.GROK_3,
        XaiModels.GROK_3_MINI,
        XaiModels.GROK_2_LATEST,
        XaiModels.GROK_2_VISION_LATEST,
        XaiModels.GROK_BETA,
      ],
      // xAI's original formatProviderError had a 5th branch — insufficient
      // quota — with bespoke "top up at console.x.ai" wording, checked after
      // model-not-found and before the generic catch-all. Preserved below in
      // the same position; ProviderErrorRule.message is a function of
      // context, so nothing here is generic.
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401") ||
            ctx.message.includes("invalid_api_key"),
          errorClass: AuthenticationError,
          message:
            "Invalid xAI API key. Please check your XAI_API_KEY environment variable. Get one at https://console.x.ai/",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message: "xAI rate limit exceeded. Back off and retry.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `xAI model '${ctx.modelName}' not found. Use grok-2-latest, grok-3, grok-3-mini, grok-2-vision-latest, or grok-beta.`,
        },
        {
          match: (ctx) =>
            ctx.message.includes("insufficient_quota") ||
            ctx.message.includes("quota exceeded"),
          errorClass: ProviderError,
          message:
            "xAI account has insufficient quota. Top up at https://console.x.ai/",
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `xAI error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.TOGETHER_AI,
      aliases: ["together-ai", "together"],
      apiKeyEnvVar: "TOGETHER_API_KEY",
      baseURLEnvVar: "TOGETHER_BASE_URL",
      defaultBaseURL: "https://api.together.xyz/v1",
      configOptions: createTogetherAIConfig(),
      modelEnvVar: "TOGETHER_MODEL",
      defaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      registryDefaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      registryDefaultModelChecksEnvVar: true,
      fallbackModelName: TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO,
      fallbackModels: [
        TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
        TogetherAIModels.LLAMA_3_1_405B_INSTRUCT_TURBO,
        TogetherAIModels.LLAMA_3_1_70B_INSTRUCT_TURBO,
        TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO,
        TogetherAIModels.MIXTRAL_8X22B_INSTRUCT,
        TogetherAIModels.QWEN_2_5_72B_INSTRUCT_TURBO,
        TogetherAIModels.DEEPSEEK_R1,
        TogetherAIModels.DEEPSEEK_V3,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401"),
          errorClass: AuthenticationError,
          message:
            "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message: "Together AI rate limit exceeded. Back off and retry.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Together AI model '${ctx.modelName}' not found. Browse the catalog at https://api.together.xyz/models`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Together AI error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.FIREWORKS,
      aliases: ["fireworks"],
      apiKeyEnvVar: "FIREWORKS_API_KEY",
      baseURLEnvVar: "FIREWORKS_BASE_URL",
      defaultBaseURL: "https://api.fireworks.ai/inference/v1",
      configOptions: createFireworksConfig(),
      modelEnvVar: "FIREWORKS_MODEL",
      defaultModel: FireworksModels.DEEPSEEK_V4_PRO,
      registryDefaultModel: FireworksModels.DEEPSEEK_V4_PRO,
      registryDefaultModelChecksEnvVar: true,
      fallbackModelName: FireworksModels.DEEPSEEK_V4_PRO,
      fallbackModels: [
        FireworksModels.DEEPSEEK_V4_PRO,
        FireworksModels.GLM_5P1,
        FireworksModels.GLM_5,
        FireworksModels.KIMI_K2P6,
        FireworksModels.KIMI_K2P5,
        FireworksModels.GPT_OSS_120B,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401"),
          errorClass: AuthenticationError,
          message:
            "Invalid Fireworks API key. Get one at https://fireworks.ai/account/api-keys",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message: "Fireworks rate limit exceeded. Back off and retry.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Fireworks model '${ctx.modelName}' not found. Browse https://fireworks.ai/models`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Fireworks error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.PERPLEXITY,
      aliases: ["perplexity", "pplx"],
      apiKeyEnvVar: "PERPLEXITY_API_KEY",
      baseURLEnvVar: "PERPLEXITY_BASE_URL",
      defaultBaseURL: "https://api.perplexity.ai",
      configOptions: createPerplexityConfig(),
      modelEnvVar: "PERPLEXITY_MODEL",
      defaultModel: PerplexityModels.SONAR,
      registryDefaultModel: PerplexityModels.SONAR,
      registryDefaultModelChecksEnvVar: true,
      // Perplexity's original class does NOT override getFallbackModelName()
      // — it inherits the base class default "gpt-3.5-turbo". Preserved here
      // verbatim, not "fixed" to a Perplexity model — that's a real,
      // pre-existing quirk this plan is not authorized to change.
      fallbackModelName: "gpt-3.5-turbo",
      fallbackModels: [
        PerplexityModels.SONAR,
        PerplexityModels.SONAR_PRO,
        PerplexityModels.SONAR_REASONING,
        PerplexityModels.SONAR_REASONING_PRO,
        PerplexityModels.SONAR_DEEP_RESEARCH,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401"),
          errorClass: AuthenticationError,
          message:
            "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message: "Perplexity rate limit exceeded. Back off and retry.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Perplexity model '${ctx.modelName}' not found. Use sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, or sonar-deep-research.`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Perplexity error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.MISTRAL,
      aliases: ["mistral"],
      apiKeyEnvVar: "MISTRAL_API_KEY",
      baseURLEnvVar: "MISTRAL_BASE_URL",
      defaultBaseURL: "https://api.mistral.ai/v1",
      configOptions: createMistralConfig(),
      modelEnvVar: "MISTRAL_MODEL",
      defaultModel: MistralModels.MISTRAL_SMALL_2506,
      // The one documented registry-vs-class default-model quirk (see this
      // plan's "Design reference" section): the registry historically passed
      // the bare literal MISTRAL_LARGE_LATEST with no env-var check, while
      // MistralProvider.getDefaultModel() checks MISTRAL_MODEL and defaults
      // to MISTRAL_SMALL_2506. Preserved exactly, not reconciled.
      registryDefaultModel: MistralModels.MISTRAL_LARGE_LATEST,
      registryDefaultModelChecksEnvVar: false,
      fallbackModelName: MistralModels.MISTRAL_SMALL_2506,
      fallbackModels: [
        MistralModels.MISTRAL_SMALL_2506,
        MistralModels.MISTRAL_LARGE_LATEST,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("API_KEY_INVALID") ||
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Unauthorized") ||
            ctx.message.includes("401"),
          errorClass: AuthenticationError,
          message:
            "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") ||
            ctx.message.includes("Rate limit") ||
            ctx.message.includes("429"),
          errorClass: RateLimitError,
          message: "Mistral rate limit exceeded",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) => `Mistral model '${ctx.modelName}' not found.`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Mistral error: ${ctx.message}`,
        },
      ],
    },
    {
      providerName: AIProviderName.CLOUDFLARE,
      aliases: ["cloudflare", "workers-ai", "cf-ai"],
      apiKeyEnvVar: "CLOUDFLARE_API_KEY",
      computedBaseURL: {
        envVar: "CLOUDFLARE_ACCOUNT_ID",
        missingValueMessage:
          "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/",
        build: buildCloudflareBaseURL,
      },
      configOptions: createCloudflareConfig(),
      modelEnvVar: "CLOUDFLARE_MODEL",
      defaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
      registryDefaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
      registryDefaultModelChecksEnvVar: true,
      fallbackModelName: CloudflareModels.LLAMA_3_1_8B_FAST,
      fallbackModels: [
        CloudflareModels.LLAMA_3_3_70B_FAST,
        CloudflareModels.LLAMA_3_1_70B_INSTRUCT,
        CloudflareModels.LLAMA_3_1_8B_FAST,
        CloudflareModels.LLAMA_3_2_11B_VISION,
        CloudflareModels.MISTRAL_7B_INSTRUCT_V0_2,
        CloudflareModels.QWEN_1P5_14B_CHAT_AWQ,
      ],
      errorRules: [
        {
          match: (ctx) =>
            ctx.message.includes("Invalid API key") ||
            ctx.message.includes("Authentication") ||
            ctx.message.includes("401"),
          errorClass: AuthenticationError,
          message:
            "Invalid Cloudflare API key. Use a token with Workers AI Read+Write scope. Get one at https://dash.cloudflare.com/profile/api-tokens",
        },
        {
          match: (ctx) =>
            ctx.message.includes("rate limit") || ctx.message.includes("429"),
          errorClass: RateLimitError,
          message:
            "Cloudflare Workers AI rate limit exceeded. Free-tier neurons reset daily.",
        },
        {
          match: (ctx) =>
            ctx.message.includes("model_not_found") ||
            ctx.message.includes("404"),
          errorClass: InvalidModelError,
          message: (ctx) =>
            `Cloudflare model '${ctx.modelName}' not found. Browse https://developers.cloudflare.com/workers-ai/models/`,
        },
        {
          match: () => true,
          errorClass: ProviderError,
          message: (ctx) => `Cloudflare Workers AI error: ${ctx.message}`,
        },
      ],
    },
  ];
  ```

- [ ] **Step 4: Run and verify it passes**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `4 passed · 0 failed (of 4)`, exit 0.

- [ ] **Step 5: Type + lint check**

  ```bash
  pnpm run check
  pnpm run lint
  ```

  Expected: clean. `openaiCompatCatalog.ts` statically imports `OpenAICompatCatalogEntry` as a type (barrel-only, satisfies rule 13) and statically imports the `createXConfig`/model enum runtime values (not gated by the dynamic-import rule — that rule targets `providerRegistry.ts`'s factory closures specifically, not general provider-adjacent data modules; see Global Constraints).

- [ ] **Step 6: Commit**
  ```bash
  git add src/lib/providers/openaiCompatCatalog.ts test/continuous-test-suite-openai-compat-catalog.ts
  git commit -m "feat(providers): add OPENAI_COMPAT_CATALOG with 7 zero-quirk provider entries"
  ```

---

### Task 5: Registry migration — replace 7 blocks with one loop

**Files:**

- `src/lib/factories/providerRegistry.ts`
  - Delete/replace lines 261-277 (Mistral comment + block)
  - Delete lines 470-504 (xAI comment + block, blank line, Groq comment + block)
  - Delete lines 524-622 (Together AI, Fireworks, Perplexity, Cloudflare comments + blocks)
  - Remove 7 now-dead named imports from the top import block: `MistralModels` (line 18), `XaiModels` (25), `GroqModels` (26), `TogetherAIModels` (28), `FireworksModels` (29), `PerplexityModels` (30), `CloudflareModels` (31)
  - Add a static import of `OPENAI_COMPAT_CATALOG`

**Interfaces:**

- Consumes: `OPENAI_COMPAT_CATALOG` (Task 4, statically imported — data, not the class), `ProviderFactory.registerProvider` (existing, unchanged signature), `ConfiguredOpenAICompatProvider` (Task 3, dynamically imported inside the loop's closure — satisfies the dynamic-import-only-in-registry-factories rule).
- Produces: nothing new — this task only changes registration wiring. No public API changes: same 7 `AIProviderName` values, same aliases, same env vars, same default-model resolution behavior (including the preserved Mistral quirk) end up registered.

This task is not TDD in the write-a-failing-test-first sense — the _existing_ `test/continuous-test-suite-providers-mocked.ts` already covers request/response/error-mapping parity for 6 of these 7 providers end-to-end (Mistral isn't in it yet; Task 11 adds it). Instead, this task's "test" is: run that existing suite before touching the registry (confirm baseline green), make the change, run it again (confirm still green with zero code changes to the suite itself) — the closest thing to a regression proof available before Tasks 7-13 extend coverage further.

- [ ] **Step 1: Run the existing parity suite to record the baseline**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: all tests pass (this suite predates this plan and already exercises xai/groq/together-ai/fireworks/perplexity/cloudflare's happy-path + 401 behavior against the _current_, pre-migration subclasses). Note the passed/failed counts.

- [ ] **Step 2: Add the static catalog import**

  In `src/lib/factories/providerRegistry.ts`'s import block, add:

  ```ts
  import { OPENAI_COMPAT_CATALOG } from "../providers/openaiCompatCatalog.js";
  import type { OpenAICompatCredentials } from "../types/index.js";
  ```

- [ ] **Step 3: Remove the 7 dead model-enum imports**

  In the same import block, delete these 7 lines (confirmed via grep to have no other use in this file): `MistralModels,` (line 18), `XaiModels,` (line 25), `GroqModels,` (line 26), `TogetherAIModels,` (line 28), `FireworksModels,` (line 29), `PerplexityModels,` (line 30), `CloudflareModels,` (line 31).

- [ ] **Step 4: Replace the Mistral block (lines 261-277) with the generic loop**

  Old code being removed:

  ```ts
  // Register Mistral AI provider
  ProviderFactory.registerProvider(
    AIProviderName.MISTRAL,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const mistralCreds = credentials as NeurolinkCredentials["mistral"];
      const { MistralProvider } = await import("../providers/mistral.js");
      return new MistralProvider(modelName, sdk, undefined, mistralCreds);
    },
    MistralModels.MISTRAL_LARGE_LATEST,
    ["mistral"],
  );
  ```

  New code:

  ```ts
  // Register the config-driven OpenAI-compatible catalog providers
  // (groq, xai, together-ai, fireworks, perplexity, mistral, cloudflare).
  // To add a new zero-quirk OpenAI-compatible provider, add one entry to
  // OPENAI_COMPAT_CATALOG (openaiCompatCatalog.ts) — not a new block here.
  for (const entry of OPENAI_COMPAT_CATALOG) {
    ProviderFactory.registerProvider(
      entry.providerName,
      async (
        modelName?: string,
        _providerName?: string,
        sdk?: NeuroLink,
        _region?: string,
        credentials?: UnknownRecord,
      ) => {
        const { ConfiguredOpenAICompatProvider } =
          await import("../providers/configuredOpenAICompat.js");
        return new ConfiguredOpenAICompatProvider(
          entry,
          modelName,
          sdk,
          credentials as OpenAICompatCredentials | undefined,
        );
      },
      entry.registryDefaultModelChecksEnvVar
        ? process.env[entry.modelEnvVar] || entry.registryDefaultModel
        : entry.registryDefaultModel,
      entry.aliases,
    );
  }
  ```

- [ ] **Step 5: Delete the xAI + Groq blocks (lines 470-504)**

  Delete this entire range verbatim (both comments, both `registerProvider` calls, and the blank line between them — the blank line before Cohere's comment at the old line 505 is preserved since it sits just outside this range):

  ```ts
  // Register xAI Grok provider
  ProviderFactory.registerProvider(
    AIProviderName.XAI,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const xaiCreds = credentials as NeurolinkCredentials["xai"];
      const { XaiProvider } = await import("../providers/xai.js");
      return new XaiProvider(modelName, sdk, undefined, xaiCreds);
    },
    process.env.XAI_MODEL || XaiModels.GROK_3,
    ["xai", "grok"],
  );

  // Register Groq provider
  ProviderFactory.registerProvider(
    AIProviderName.GROQ,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const groqCreds = credentials as NeurolinkCredentials["groq"];
      const { GroqProvider } = await import("../providers/groq.js");
      return new GroqProvider(modelName, sdk, undefined, groqCreds);
    },
    process.env.GROQ_MODEL || GroqModels.LLAMA_3_3_70B_VERSATILE,
    ["groq"],
  );
  ```

  After this deletion, LlamaCpp's closing `);` is directly followed by the blank line and Cohere's `// Register Cohere provider` comment — Cohere's own block (lines 506-522, out of scope for this plan) is untouched.

- [ ] **Step 6: Delete the Together AI, Fireworks, Perplexity, Cloudflare blocks (lines 524-622)**

  Delete this entire contiguous range verbatim (4 comments + 4 `registerProvider` calls + the blank lines between them):

  ```ts
  // Register Together AI provider
  ProviderFactory.registerProvider(
    AIProviderName.TOGETHER_AI,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const togetherCreds = credentials as NeurolinkCredentials["together"];
      const { TogetherAIProvider } = await import("../providers/togetherAi.js");
      return new TogetherAIProvider(modelName, sdk, undefined, togetherCreds);
    },
    process.env.TOGETHER_MODEL || TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
    ["together-ai", "together"],
  );

  // Register Fireworks AI provider
  ProviderFactory.registerProvider(
    AIProviderName.FIREWORKS,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const fireworksCreds = credentials as NeurolinkCredentials["fireworks"];
      const { FireworksProvider } = await import("../providers/fireworks.js");
      return new FireworksProvider(modelName, sdk, undefined, fireworksCreds);
    },
    process.env.FIREWORKS_MODEL || FireworksModels.DEEPSEEK_V4_PRO,
    ["fireworks"],
  );

  // Register Perplexity provider
  ProviderFactory.registerProvider(
    AIProviderName.PERPLEXITY,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const perplexityCreds = credentials as NeurolinkCredentials["perplexity"];
      const { PerplexityProvider } = await import("../providers/perplexity.js");
      return new PerplexityProvider(modelName, sdk, undefined, perplexityCreds);
    },
    process.env.PERPLEXITY_MODEL || PerplexityModels.SONAR,
    ["perplexity", "pplx"],
  );

  // Register Cloudflare Workers AI provider
  ProviderFactory.registerProvider(
    AIProviderName.CLOUDFLARE,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const cloudflareCreds = credentials as NeurolinkCredentials["cloudflare"];
      const { CloudflareProvider } = await import("../providers/cloudflare.js");
      return new CloudflareProvider(modelName, sdk, undefined, cloudflareCreds);
    },
    process.env.CLOUDFLARE_MODEL || CloudflareModels.LLAMA_3_3_70B_FAST,
    ["cloudflare", "workers-ai", "cf-ai"],
  );
  ```

  After this deletion, Cohere's closing `);` (old line 522) is directly followed by the blank line and `// Register Voyage AI embeddings provider` (old line 624) — Voyage's block onward is untouched.

- [ ] **Step 7: Type check, lint, build**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  ```

  Expected: clean. If `check`/`lint` flag any now-unused import that grep missed, remove it — do not leave a dead import to satisfy this checklist item.

- [ ] **Step 8: Re-run the parity suite and diff against the Step 1 baseline**

  ```bash
  pnpm run test:providers-mocked
  ```

  Expected: identical passed/failed counts to Step 1 — same tests, same providers, now running against `ConfiguredOpenAICompatProvider` instances instead of the 7 hand-written subclasses, with zero code changes to the test file itself. This is the actual regression proof for this task; Tasks 7-13 extend it further per-provider.

- [ ] **Step 9: Also confirm the catalog suite still passes (registry didn't break catalog wiring)**

  ```bash
  pnpm run test:openai-compat-catalog
  ```

  Expected: `4 passed · 0 failed (of 4)`, exit 0 (unchanged from Task 4).

- [ ] **Step 10: Commit**
  ```bash
  git add src/lib/factories/providerRegistry.ts
  git commit -m "refactor(providers): migrate groq/xai/together-ai/fireworks/perplexity/mistral/cloudflare registration to OPENAI_COMPAT_CATALOG loop"
  ```

---

### Task 6: Fix the `adjustBodyAfter400` single-slot composition bug

**Files:**

- `src/lib/providers/openaiChatCompletionsBase.ts:645-661` (non-streaming retry-body selection)
- `src/lib/providers/openaiChatCompletionsBase.ts:1288-1298` (streaming retry-body selection)
- `test/continuous-test-suite-openai-compat-catalog.ts` (append a regression-test section)

**Interfaces:**

- Consumes: `correctBodyAfterContextOverflow` (existing private method, `openaiChatCompletionsBase.ts:316-359`), `adjustBodyAfter400` (existing protected hook, default no-op at `:221-226`), `OpenAIChatCompletionsProvider` (existing base class — subclassed directly in the test, not via the catalog).
- Produces: no new exported symbols — this is a bug fix inside an existing method's body plus two new regression tests.

**The bug:** both retry-body-selection sites use `??` between the two candidate body-correction functions:

```ts
const retryBody =
  res.status === 400
    ? (correctBodyAfterContextOverflow(body, apiErr) ??
      adjustBodyAfter400(body, apiErr))
    : undefined;
```

`??` only evaluates the right side when the left side is `null`/`undefined`. If a 400 response is BOTH a context-overflow error AND something a subclass's `adjustBodyAfter400` would also want to fix (today, only NVIDIA NIM implements `adjustBodyAfter400`, stripping rejected fields like `chat_template`), `correctBodyAfterContextOverflow` returning a truthy corrected body means `adjustBodyAfter400` is **never called** — its fix is silently dropped, and the retried request still carries whatever field the server just rejected, likely 400ing again (or succeeding by luck if the field wasn't actually going to be re-rejected once resent). The fix is to **compose** both corrections — apply the overflow fix first (if any), then feed its output through `adjustBodyAfter400` (if the subclass has one), so a body that needs both fixes gets both:

```ts
const retryBody =
  res.status === 400
    ? (() => {
        const overflowCorrected = correctBodyAfterContextOverflow(body, apiErr);
        return (
          adjustBodyAfter400(overflowCorrected ?? body, apiErr) ??
          overflowCorrected
        );
      })()
    : undefined;
```

This must be applied **identically** at both sites (non-streaming `:645-661` and streaming `:1288-1298` — the streaming site calls `this.correctBodyAfterContextOverflow`/`this.adjustBodyAfter400` directly rather than through the bound-closure aliases the non-streaming path uses, but the fix shape is the same).

- [ ] **Step 1: Write a failing regression test (non-streaming path)**

  Append to `test/continuous-test-suite-openai-compat-catalog.ts`, before `main()`:

  ```ts
  // ───────────────────────────────────────────────────────────────────────
  // Section: adjustBodyAfter400 composition fix (Task 6)
  // ───────────────────────────────────────────────────────────────────────

  const OVERFLOW_TEST_MESSAGE =
    "This model's maximum context length is 8192 tokens. However, your " +
    "messages resulted in 6000 tokens. Additionally, unsupported argument: " +
    "`chat_template` is not supported for this model.";

  async function buildTestOverflowAndFieldStripProvider(
    baseURL: string,
  ): Promise<unknown> {
    const { OpenAIChatCompletionsProvider } =
      await import("../dist/lib/providers/openaiChatCompletionsBase.js");

    class TestOverflowAndFieldStripProvider extends (OpenAIChatCompletionsProvider as new (
      providerName: string,
      modelName: string | undefined,
      sdk: unknown,
      config: { baseURL: string; apiKey: string },
    ) => InstanceType<typeof OpenAIChatCompletionsProvider>) {
      constructor() {
        super("test-overflow-compose", "test-model", undefined, {
          baseURL,
          apiKey: "sk-mock-overflow-compose",
        });
      }
      protected getProviderName(): string {
        return "test-overflow-compose";
      }
      protected getDefaultModel(): string {
        return "test-model";
      }
      protected formatProviderError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
      }
      protected adjustRequestBody(
        body: Record<string, unknown>,
      ): Record<string, unknown> {
        return { ...body, chat_template: "test-template" };
      }
      protected adjustBodyAfter400(
        body: Record<string, unknown>,
        error: Error & { responseBody?: string },
      ): Record<string, unknown> | undefined {
        const responseBody = error.responseBody ?? "";
        if (
          !responseBody.includes("chat_template") ||
          !("chat_template" in body)
        ) {
          return undefined;
        }
        const next = { ...body };
        delete next.chat_template;
        return next;
      }
    }

    return new TestOverflowAndFieldStripProvider();
  }

  async function testAdjustBodyAfter400Composes(): Promise<void> {
    const section = "openai-compat base: 400-retry composition";
    const { ProviderFactory, NeuroLink } = await import("../dist/index.js");
    const baseURL = "https://test.overflow.compose/v1";

    let callCount = 0;
    ProviderFactory.registerProvider(
      "test-overflow-compose",
      async () => buildTestOverflowAndFieldStripProvider(baseURL),
      "test-model",
      [],
    );

    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "test.overflow.compose/v1/chat/completions",
            respond: () => {
              callCount += 1;
              if (callCount === 1) {
                return {
                  status: 400,
                  json: {
                    error: {
                      message: OVERFLOW_TEST_MESSAGE,
                      type: "invalid_request_error",
                    },
                  },
                };
              }
              return {
                status: 200,
                json: openAIChatResponse("pong", "test-model"),
              };
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.generate({
            provider: "test-overflow-compose",
            model: "test-model",
            input: { text: "ping" },
            maxTokens: 4096,
            disableTools: true,
          });

          expect(
            calls.length === 2,
            `expected exactly 2 fetch calls (initial 400 + one composed retry) — got ${calls.length}`,
          );
          const retried = calls[1].bodyJson as {
            max_tokens?: number;
            chat_template?: string;
          };
          expect(
            retried.max_tokens === 1682,
            "retried body's max_tokens was re-fit from the overflow error's own numbers (8192 - 6000 - 512)",
          );
          expect(
            !("chat_template" in retried),
            "retried body no longer carries the field the subclass's adjustBodyAfter400 rejected",
          );
          expect(
            (result.content ?? "").length > 0,
            "the composed retry ultimately succeeded",
          );
          record(results, `${section}: non-streaming both fixes apply`, true);
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: non-streaming both fixes apply`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async function testAdjustBodyAfter400ComposesStreaming(): Promise<void> {
    const section = "openai-compat base: 400-retry composition";
    const { ProviderFactory, NeuroLink } = await import("../dist/index.js");
    const baseURL = "https://test.overflow.compose.stream/v1";

    let callCount = 0;
    ProviderFactory.registerProvider(
      "test-overflow-compose-stream",
      async () => buildTestOverflowAndFieldStripProvider(baseURL),
      "test-model",
      [],
    );

    function sseChunk(content: string): string {
      return (
        `data: ${JSON.stringify({
          choices: [{ delta: { content }, finish_reason: null }],
        })}\n\n` + `data: [DONE]\n\n`
      );
    }

    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "test.overflow.compose.stream/v1/chat/completions",
            respond: () => {
              callCount += 1;
              if (callCount === 1) {
                return {
                  status: 400,
                  json: {
                    error: {
                      message: OVERFLOW_TEST_MESSAGE,
                      type: "invalid_request_error",
                    },
                  },
                };
              }
              return {
                status: 200,
                text: sseChunk("pong"),
                contentType: "text/event-stream",
              };
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const stream = await nl.stream({
            provider: "test-overflow-compose-stream",
            model: "test-model",
            input: { text: "ping" },
            maxTokens: 4096,
            disableTools: true,
          });
          let collected = "";
          for await (const chunk of stream.stream) {
            collected += chunk.content ?? "";
          }

          expect(
            calls.length === 2,
            `expected exactly 2 fetch calls on the streaming path (initial 400 + one composed retry) — got ${calls.length}`,
          );
          const retried = calls[1].bodyJson as {
            max_tokens?: number;
            chat_template?: string;
          };
          expect(
            retried.max_tokens === 1682,
            "streaming retried body's max_tokens was re-fit from overflow numbers",
          );
          expect(
            !("chat_template" in retried),
            "streaming retried body no longer carries the rejected field",
          );
          expect(
            collected.includes("pong"),
            "streamed retry ultimately succeeded",
          );
          record(results, `${section}: streaming both fixes apply`, true);
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: streaming both fixes apply`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

  Update `main()`:

  ```ts
  await testResolveConfigPrecedence();
  await testResolveConfigComputedBaseURL();
  await testConfiguredProviderHookDelegation();
  await testCatalogStructuralInvariants();
  await testAdjustBodyAfter400Composes();
  await testAdjustBodyAfter400ComposesStreaming();
  ```

  **Why `max_tokens === 1682` and `maxTokens: 4096`:** `resolveWireMaxTokens` (`openaiChatCompletionsBase.ts:245-297`) passes the caller-supplied `maxTokens` straight through unchanged (`return effective;` at line 296) whenever nothing has been runtime-discovered yet for a given provider+model — true here, since `test-overflow-compose` is a fresh synthetic provider on its first call. So the first request's wire body has `max_tokens: 4096`. `correctBodyAfterContextOverflow` (`:316-359`) parses `OVERFLOW_TEST_MESSAGE` via `parseProviderOverflowDetails` — the OpenAI-shaped regex pair `/resulted\s+in\s+(\d[\d,]{0,19})\s*tokens/i` and `/maximum\s+context\s+length\s+is\s+(\d[\d,]{0,19})/i` — extracting `actualTokens=6000`, `budgetTokens=8192`. `refit = budgetTokens - actualTokens - WINDOW_FIT_MARGIN_TOKENS = 8192 - 6000 - 512 = 1682`. Since `0 < refit(1682) < previousMaxTokens(4096)`, the correction applies and returns `{...body, max_tokens: 1682}` — with `chat_template` still present (a shallow spread preserves it). That corrected body is what must then reach `adjustBodyAfter400`, which strips `chat_template` because the crafted error's `responseBody` also contains the substring `"chat_template"`. The assertion on `calls[1].bodyJson` therefore proves **both** transformations landed on the same retried request — which is exactly what the buggy `??` chain prevents (today, only the overflow fix would apply — `chat_template` would still be present on the retry, and the test as written would fail against the pre-fix code specifically on the `!("chat_template" in retried)` assertion, not the `max_tokens` one).

- [ ] **Step 2: Run and verify these two tests fail against the current (buggy) code**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `4 passed · 2 failed (of 6)` — the two new tests fail specifically on the `!("chat_template" in retried)` assertion (the `max_tokens` assertion passes even pre-fix, since `correctBodyAfterContextOverflow` alone already applies and wins the `??`). Confirm the failure reason string mentions the `chat_template` assertion, not a crash or an unrelated error — that's the correct, specific red state.

- [ ] **Step 3: Apply the fix at the non-streaming site**

  In `src/lib/providers/openaiChatCompletionsBase.ts`, replace lines 645-661:

  ```ts
  const retryBody =
    res.status === 400
      ? (correctBodyAfterContextOverflow(
          body,
          apiErr as Error & { statusCode?: number; responseBody?: string },
        ) ??
        adjustBodyAfter400(
          body,
          apiErr as Error & { statusCode?: number; responseBody?: string },
        ))
      : undefined;
  ```

  with:

  ```ts
  const retryBody =
    res.status === 400
      ? (() => {
          const typedErr = apiErr as Error & {
            statusCode?: number;
            responseBody?: string;
          };
          const overflowCorrected = correctBodyAfterContextOverflow(
            body,
            typedErr,
          );
          return (
            adjustBodyAfter400(overflowCorrected ?? body, typedErr) ??
            overflowCorrected
          );
        })()
      : undefined;
  ```

- [ ] **Step 4: Apply the fix at the streaming site**

  In the same file, replace lines 1288-1298:

  ```ts
  const retryBody =
    res.status === 400
      ? (this.correctBodyAfterContextOverflow(
          body,
          apiErr as Error & { statusCode?: number; responseBody?: string },
        ) ??
        this.adjustBodyAfter400(
          body,
          apiErr as Error & { statusCode?: number; responseBody?: string },
        ))
      : undefined;
  ```

  with:

  ```ts
  const retryBody =
    res.status === 400
      ? (() => {
          const typedErr = apiErr as Error & {
            statusCode?: number;
            responseBody?: string;
          };
          const overflowCorrected = this.correctBodyAfterContextOverflow(
            body,
            typedErr,
          );
          return (
            this.adjustBodyAfter400(overflowCorrected ?? body, typedErr) ??
            overflowCorrected
          );
        })()
      : undefined;
  ```

- [ ] **Step 5: Run and verify all tests pass**

  ```bash
  pnpm run build
  pnpm run test:openai-compat-catalog
  ```

  Expected: `6 passed · 0 failed (of 6)`, exit 0.

- [ ] **Step 6: Confirm NVIDIA NIM's own existing behavior is unaffected**

  NVIDIA NIM is the only _current_ real subclass with a non-default `adjustBodyAfter400` (`nvidiaNim/client.ts:283-313`). Its 400-handling was previously reachable **only** when `correctBodyAfterContextOverflow` returned `undefined` (a non-overflow 400) — after this fix, it also runs (composed) on genuine overflow 400s that also need field-stripping, which is strictly more correct, never less. Confirm NIM's existing suite still passes:

  ```bash
  pnpm run test:providers
  ```

  (NVIDIA NIM is covered in the provider-specific suite per its integration; if it has a dedicated suite instead, run that one — check `package.json`'s `test:*` scripts for an `nvidia`/`nim`-named entry and use it if present.)

- [ ] **Step 7: Full regression sweep**

  ```bash
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: both green, no change in pass counts from before this task other than the 2 new tests now passing.

- [ ] **Step 8: Commit**
  ```bash
  git add src/lib/providers/openaiChatCompletionsBase.ts test/continuous-test-suite-openai-compat-catalog.ts
  git commit -m "fix(providers): compose context-overflow and subclass 400-retry body corrections instead of one winning via ??"
  ```

---

## Why Tasks 7-13 look the way they do

Scope item 4 (registry migration) is one atomic task (Task 5) — a `for` loop over a fully-populated array can't usefully be built incrementally per-provider without extra YAGNI-violating scaffolding (e.g. a partial-catalog flag), so all 7 providers move to the new class in a single commit. Scope item 5 (parity proof per provider) is still 7 separate tasks, but with the registry migration already done in Task 5, each one is now: **extend the existing parity suite with a rate-limit (429) case that didn't exist before, confirm it (and the existing happy-path/401 cases) pass against the already-migrated `ConfiguredOpenAICompatProvider`, delete the now-dead standalone subclass file, commit.** Each task is written in full below — no task says "repeat Task 7's pattern," because each provider's exact `authErrorMatch`/model/URL differs and the instructions must be copy-pasteable as-is.

Mistral is not in `OPENAI_COMPAT_PROVIDERS` yet (confirmed absent from the array read for this plan) — Task 12 adds a brand-new spec entry for it, not just a 429 case.

---

### Task 7: Parity proof — Groq

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `OpenAICompatSpec` type + `groq` entry + `runOpenAICompatProvider`)
- `src/lib/providers/groq.ts` (DELETE after parity confirmed)

**Interfaces:**

- Consumes: `OPENAI_COMPAT_PROVIDERS` array, `runOpenAICompatProvider(spec)` (both existing in `continuous-test-suite-providers-mocked.ts`), `withMocks`/`installMockFetch`/`record`/`expect`/`expectEq` (existing).
- Produces: nothing new exported — extends existing test data + deletes a dead file.

- [ ] **Step 1: Add the optional `rateLimitErrorMatch` field to `OpenAICompatSpec`**

  In `test/continuous-test-suite-providers-mocked.ts`, change:

  ```ts
  type OpenAICompatSpec = {
    provider: string;
    envVar: string;
    extraEnv?: Record<string, string>;
    urlMatch: string;
    authPrefix: string;
    model: string;
    authErrorMatch: RegExp;
  };
  ```

  to:

  ```ts
  type OpenAICompatSpec = {
    provider: string;
    envVar: string;
    extraEnv?: Record<string, string>;
    urlMatch: string;
    authPrefix: string;
    model: string;
    authErrorMatch: RegExp;
    /** Optional: when set, runs a 429 case asserting this pattern against
     *  the surfaced error message. Providers ported off a hand-written
     *  subclass in this plan set this; pre-existing entries left it unset
     *  (no regression — the case is skipped, not failed, when absent). */
    rateLimitErrorMatch?: RegExp;
  };
  ```

- [ ] **Step 2: Add `rateLimitErrorMatch` to the groq entry**

  Change:

  ```ts
    {
      provider: "groq",
      envVar: "GROQ_API_KEY",
      urlMatch: "api.groq.com/openai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "llama-3.3-70b-versatile",
      authErrorMatch: /groq|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "groq",
      envVar: "GROQ_API_KEY",
      urlMatch: "api.groq.com/openai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "llama-3.3-70b-versatile",
      authErrorMatch: /groq|401|unauthor|api key/i,
      rateLimitErrorMatch: /groq|rate.?limit|429/i,
    },
  ```

- [ ] **Step 3: Extend `runOpenAICompatProvider` to run the 429 case when `rateLimitErrorMatch` is set**

  This is the failing-test step: after the existing 401 block (currently the last block in the function, ending the function body), add:

  ```ts
  // ── 429 (only for specs that opt in) ───────────────────────────────
  if (spec.rateLimitErrorMatch) {
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: spec.urlMatch,
            respond: {
              status: 429,
              json: {
                error: {
                  message: "Rate limit exceeded",
                  type: "rate_limit_error",
                },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: spec.provider,
              model: spec.model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 429 surfaces friendly error`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 429 surfaces friendly error`,
              spec.rateLimitErrorMatch!.test(msg),
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 429 surfaces friendly error`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] **Step 4: Run and verify the new groq 429 case passes against the already-migrated code**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by exactly 1 versus Task 5 Step 8's baseline (groq's new 429 case), all still green. (This is "run and verify fail-then-pass" collapsed into one step because Task 5 already migrated the registry — there is no pre-migration code left to fail against; the meaningful verification is that it passes against `ConfiguredOpenAICompatProvider`, which is what makes this a parity proof rather than a no-op.)

- [ ] **Step 5: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/groq.ts
  ```

  Confirm nothing else in `src/` still imports it:

  ```bash
  grep -rn "providers/groq" src/ --include="*.ts"
  ```

  Expected: no output (Task 5 already removed `providerRegistry.ts`'s import of it).

- [ ] **Step 6: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 7: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/groq.ts
  git commit -m "test(providers): confirm Groq parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 8: Parity proof — xAI

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `xai` entry)
- `src/lib/providers/xai.ts` (DELETE after parity confirmed)

**Interfaces:** same as Task 7, applied to the `xai` entry.

- [ ] **Step 1: Add `rateLimitErrorMatch` to the xai entry**

  Change:

  ```ts
    {
      provider: "xai",
      envVar: "XAI_API_KEY",
      urlMatch: "api.x.ai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "grok-3",
      authErrorMatch: /xai|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "xai",
      envVar: "XAI_API_KEY",
      urlMatch: "api.x.ai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "grok-3",
      authErrorMatch: /xai|401|unauthor|api key/i,
      rateLimitErrorMatch: /xai|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the new xAI 429 case passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 1 versus Task 7's post-commit baseline, all green.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/xai.ts
  grep -rn "providers/xai" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/xai.ts
  git commit -m "test(providers): confirm xAI parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 9: Parity proof — Together AI

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `together-ai` entry)
- `src/lib/providers/togetherAi.ts` (DELETE after parity confirmed)

**Interfaces:** same as Task 7, applied to the `together-ai` entry.

- [ ] **Step 1: Add `rateLimitErrorMatch` to the together-ai entry**

  Change:

  ```ts
    {
      provider: "together-ai",
      envVar: "TOGETHER_API_KEY",
      urlMatch: "api.together.xyz/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      authErrorMatch: /together|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "together-ai",
      envVar: "TOGETHER_API_KEY",
      urlMatch: "api.together.xyz/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      authErrorMatch: /together|401|unauthor|api key/i,
      rateLimitErrorMatch: /together|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the new Together AI 429 case passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 1, all green.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/togetherAi.ts
  grep -rn "providers/togetherAi" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/togetherAi.ts
  git commit -m "test(providers): confirm Together AI parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 10: Parity proof — Fireworks

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `fireworks` entry)
- `src/lib/providers/fireworks.ts` (DELETE after parity confirmed)

**Interfaces:** same as Task 7, applied to the `fireworks` entry.

- [ ] **Step 1: Add `rateLimitErrorMatch` to the fireworks entry**

  Change:

  ```ts
    {
      provider: "fireworks",
      envVar: "FIREWORKS_API_KEY",
      urlMatch: "api.fireworks.ai/inference/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      authErrorMatch: /fireworks|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "fireworks",
      envVar: "FIREWORKS_API_KEY",
      urlMatch: "api.fireworks.ai/inference/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      authErrorMatch: /fireworks|401|unauthor|api key/i,
      rateLimitErrorMatch: /fireworks|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the new Fireworks 429 case passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 1, all green.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/fireworks.ts
  grep -rn "providers/fireworks" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/fireworks.ts
  git commit -m "test(providers): confirm Fireworks parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 11: Parity proof — Perplexity

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `perplexity` entry)
- `src/lib/providers/perplexity.ts` (DELETE after parity confirmed)

**Interfaces:** same as Task 7, applied to the `perplexity` entry.

- [ ] **Step 1: Add `rateLimitErrorMatch` to the perplexity entry**

  Change:

  ```ts
    {
      provider: "perplexity",
      envVar: "PERPLEXITY_API_KEY",
      urlMatch: "api.perplexity.ai",
      authPrefix: "Bearer ",
      model: "sonar",
      authErrorMatch: /perplex|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "perplexity",
      envVar: "PERPLEXITY_API_KEY",
      urlMatch: "api.perplexity.ai",
      authPrefix: "Bearer ",
      model: "sonar",
      authErrorMatch: /perplex|401|unauthor|api key/i,
      rateLimitErrorMatch: /perplex|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the new Perplexity 429 case passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 1, all green.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/perplexity.ts
  grep -rn "providers/perplexity" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/perplexity.ts
  git commit -m "test(providers): confirm Perplexity parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 12: Parity proof — Mistral (new spec entry, not just a 429 addition)

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (add a brand-new `mistral` entry to `OPENAI_COMPAT_PROVIDERS` — confirmed absent from the array today)
- `src/lib/providers/mistral.ts` (DELETE after parity confirmed)

**Interfaces:** same shape as the other 6, but this is a net-new entry rather than an extension of an existing one.

- [ ] **Step 1: Add the mistral entry to `OPENAI_COMPAT_PROVIDERS`**

  Add, after the `cloudflare` entry (last in the array today):

  ```ts
    {
      provider: "mistral",
      envVar: "MISTRAL_API_KEY",
      urlMatch: "api.mistral.ai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "mistral-small-2506",
      authErrorMatch: /mistral|401|unauthor|api key/i,
      rateLimitErrorMatch: /mistral|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the whole mistral case set (happy-path, 401, 429) passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 3 (happy-path + 401 + 429, all new for mistral), all green. This is the true "first run against the migrated code" verification for this provider, since it never had contract-test coverage in this suite before.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/mistral.ts
  grep -rn "providers/mistral" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/mistral.ts
  git commit -m "test(providers): add Mistral to the mocked contract suite, confirm parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 13: Parity proof — Cloudflare

**Files:**

- `test/continuous-test-suite-providers-mocked.ts` (extend `cloudflare` entry)
- `src/lib/providers/cloudflare.ts` (DELETE after parity confirmed)

**Interfaces:** same as Task 7, applied to the `cloudflare` entry. Cloudflare's happy-path/401 tests already exercise the `computedBaseURL`/accountId path via its existing `extraEnv: { CLOUDFLARE_ACCOUNT_ID: "mock-account-id-1234" }` — this task only adds the 429 case.

- [ ] **Step 1: Add `rateLimitErrorMatch` to the cloudflare entry**

  Change:

  ```ts
    {
      provider: "cloudflare",
      envVar: "CLOUDFLARE_API_KEY",
      extraEnv: { CLOUDFLARE_ACCOUNT_ID: "mock-account-id-1234" },
      urlMatch:
        "api.cloudflare.com/client/v4/accounts/mock-account-id-1234/ai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      authErrorMatch: /cloudflare|401|unauthor|api key/i,
    },
  ```

  to:

  ```ts
    {
      provider: "cloudflare",
      envVar: "CLOUDFLARE_API_KEY",
      extraEnv: { CLOUDFLARE_ACCOUNT_ID: "mock-account-id-1234" },
      urlMatch:
        "api.cloudflare.com/client/v4/accounts/mock-account-id-1234/ai/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      authErrorMatch: /cloudflare|401|unauthor|api key/i,
      rateLimitErrorMatch: /cloudflare|rate.?limit|429/i,
    },
  ```

- [ ] **Step 2: Run and verify the new Cloudflare 429 case passes**

  ```bash
  pnpm run build
  pnpm run test:providers-mocked
  ```

  Expected: passed count increases by 1, all green.

- [ ] **Step 3: Delete the dead subclass file**

  ```bash
  rm src/lib/providers/cloudflare.ts
  grep -rn "providers/cloudflare" src/ --include="*.ts"
  ```

  Expected: no output.

- [ ] **Step 4: Full rebuild + both suites**

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run build
  pnpm run test:providers-mocked
  pnpm run test:openai-compat-catalog
  ```

  Expected: all clean/green.

- [ ] **Step 5: Commit**
  ```bash
  git add test/continuous-test-suite-providers-mocked.ts
  git add -u src/lib/providers/cloudflare.ts
  git commit -m "test(providers): confirm Cloudflare parity on ConfiguredOpenAICompatProvider, delete dead subclass"
  ```

---

### Task 14: Keep-as-subclass documentation (deepseek, azureOpenai)

**Files:**

- `docs/provider-integration/` — check whether this directory exists; if it does, add/update a file there (e.g. `docs/provider-integration/openai-compat-catalog.md`); if it does not exist, create `docs/providers/openai-compat-catalog.md` instead (match whichever docs root the repo actually has — verify with `ls docs/` before deciding, do not assume).

**Interfaces:** none — documentation only, no code symbols produced or consumed.

- [ ] **Step 1: Locate the correct docs directory**

  ```bash
  ls docs/
  ls docs/provider-integration/ 2>/dev/null || echo "no provider-integration dir"
  ls docs/providers/ 2>/dev/null || echo "no providers dir"
  ```

  Use whichever exists; if neither exists, create `docs/providers/openai-compat-catalog.md`.

- [ ] **Step 2: Write the doc**

  Content (adjust the opening path reference if Step 1 found a different directory):

  ```markdown
  # OpenAI-Compatible Provider Catalog

  Seven OpenAI-compatible providers — Groq, xAI, Together AI, Fireworks,
  Perplexity, Mistral, Cloudflare Workers AI — are registered from a single
  data table, `OPENAI_COMPAT_CATALOG` (`src/lib/providers/openaiCompatCatalog.ts`),
  read by one generic class, `ConfiguredOpenAICompatProvider`
  (`src/lib/providers/configuredOpenAICompat.ts`). Adding another provider to
  this family means adding one entry to the catalog array — not writing a new
  subclass file, not touching the registry.

  ## When a provider belongs in the catalog

  A provider belongs in `OPENAI_COMPAT_CATALOG` if it needs **only**:

  - a credential (API key, optionally an extra field like Cloudflare's account id)
  - a base URL (static default + optional env override, or computed from an
    extra credential field)
  - a default/fallback model
  - error-message classification (auth / rate-limit / invalid-model / generic)

  ## When a provider needs a dedicated subclass instead

  Two providers in this family are deliberately **not** in the catalog because
  they override real request-shaping behavior that a flat data table can't
  express:

  - **DeepSeek** (`src/lib/providers/deepseek.ts`) overrides
    `adjustResponseFormat`: DeepSeek 400s on `json_schema` structured-output
    requests, so the subclass downgrades to `json_object` before sending.
  - **Azure OpenAI** (`src/lib/providers/azureOpenai.ts`) overrides four hooks:
    `getChatCompletionsURL` (deployment-name URL routing across two Azure
    endpoint schemes), `getAuthHeaders` (Azure's `api-key` header instead of
    `Authorization: Bearer`), `adjustRequestBody` (renames `max_tokens` to
    `max_completion_tokens` for o-series/gpt-5+ deployments), and
    `suppressResponseFormatWithTools` (Azure supports both at once).

  If a future provider needs any hook beyond the 3 mandatory ones
  (`getProviderName`, `getDefaultModel`, `formatProviderError`) or the 2
  purely-declarative optional ones (`getFallbackModelName`,
  `getFallbackModels`), it needs a dedicated subclass — follow the DeepSeek or
  Azure OpenAI pattern, not the catalog.

  ## Error-message fidelity

  Each catalog entry's `errorRules` is a direct, order-preserving translation
  of its original subclass's `formatProviderError` `if`/`else` ladder into a
  `ProviderErrorRule[]` array, classified via `classifyProviderError()`
  (`src/lib/utils/errorClassifier.ts`). Every bespoke message string is
  preserved verbatim — including xAI's "top up your account" quota URL and
  Groq's decommissioned-vs-not-found distinction — via each rule's own
  `message` field (`string | ((ctx) => string)`), with model-name
  interpolation carried through `ctx.modelName`. There is no message-wording
  regression here. One class-level change did happen during migration: all 7
  providers' `TimeoutError` now maps to `NetworkError`; previously, 6 of the 7
  did (Groq alone mapped it to `ProviderError`). This is not a choice made by
  this catalog — `classifyProviderError` hard-codes `TimeoutError →
  NetworkError` unconditionally, ahead of any rule table, so it is not
  overridable per-provider.

  ## Known pre-existing quirk this migration preserved (not fixed)

  Mistral's provider registration passes a `defaultModel` value to
  `ProviderFactory.registerProvider()` that does **not** check `MISTRAL_MODEL`
  (`MistralModels.MISTRAL_LARGE_LATEST`, a bare literal), while
  `ConfiguredOpenAICompatProvider.getDefaultModel()` for Mistral **does**
  check `MISTRAL_MODEL` (falling back to `MistralModels.MISTRAL_SMALL_2506`).
  Every other catalog provider's registry default and class default agree.
  This is expressed via `OpenAICompatCatalogEntry.registryDefaultModelChecksEnvVar`
  (`false` only for Mistral) and preserved exactly as it was before this
  migration — reconciling it is out of scope here (see the openai-compat
  catalog plan's Risks & Rollback for a possible follow-up).
  ```

- [ ] **Step 3: Lint the doc (if the repo lints markdown)**

  ```bash
  pnpm run lint
  ```

  Expected: clean (if markdown isn't linted by this command, this step is a no-op — confirm either way, don't skip the check).

- [ ] **Step 4: Commit**
  ```bash
  git add docs/
  git commit -m "docs(providers): document the OpenAI-compat catalog vs keep-as-subclass criteria"
  ```

---

## Verification Checklist

- [ ] `pnpm run check` passes with zero errors.
- [ ] `pnpm run lint` passes with zero errors (including `neurolink/no-local-type-alias`, `no-interface`, `no-types-suffix-filename`, `unique-type-names`, `types-barrel-exports-only`, `no-local-types-folder`, `no-type-export-outside-types`, `barrel-type-imports`, and the `no-restricted-syntax` double-assertion rule — all touched by this plan's new type/provider files).
- [ ] `pnpm run build` succeeds.
- [ ] `pnpm run test:openai-compat-catalog` passes (6 tests: config precedence x2, hook delegation, catalog invariants, 400-compose non-streaming, 400-compose streaming).
- [ ] `pnpm run test:providers-mocked` passes, with mistral now included (was previously absent) and all 7 catalog providers carrying a 429 case (previously none did).
- [ ] `pnpm run test:ci` (or at minimum `pnpm test` + `pnpm run test:client`) passes — confirms nothing outside this plan's direct test files broke.
- [ ] `pnpm run test:providers` and `pnpm run test:matrix` pass — confirms the 7 migrated providers still work through the full capability-sweep path, not just the mocked-fetch contract path.
- [ ] All 7 dead subclass files are deleted: `src/lib/providers/groq.ts`, `xai.ts`, `togetherAi.ts`, `fireworks.ts`, `perplexity.ts`, `mistral.ts`, `cloudflare.ts`.
- [ ] `grep -rn "providers/groq\|providers/xai\|providers/togetherAi\|providers/fireworks\|providers/perplexity\|providers/mistral\|providers/cloudflare" src/` returns no matches (confirms no stray import survived the deletions).
- [ ] `src/lib/factories/providerRegistry.ts` has exactly one `for (const entry of OPENAI_COMPAT_CATALOG)` loop and zero remaining per-provider `registerProvider` blocks for these 7 providers.
- [ ] Every public-facing identity is unchanged: provider name strings (`groq`, `xai`, `together-ai`, `fireworks`, `perplexity`, `mistral`, `cloudflare`), every alias (`grok`, `together`, `pplx`, `workers-ai`, `cf-ai`), every env var name (`GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, and the equivalent triads for the other 6, plus `CLOUDFLARE_ACCOUNT_ID`).
- [ ] `docs/provider-integration/` (or wherever Task 14 landed) documents the catalog-vs-subclass decision criteria and both accepted trade-offs (error-message fidelity, Groq TimeoutError normalization).
- [ ] 14 commits exist on the branch for this plan (one per task), each a conventional-commit message, none pushed without being asked.

## Risks & Rollback

- **Mistral registry-default quirk, preserved not fixed.** `registryDefaultModelChecksEnvVar: false` on the Mistral catalog entry is a faithful reproduction of a pre-existing inconsistency (registry passes `MISTRAL_LARGE_LATEST` unconditionally; the class's own `getDefaultModel()` checks `MISTRAL_MODEL` and defaults to `MISTRAL_SMALL_2506`). This plan does not have a mandate to fix it (only the `adjustBodyAfter400` bug, Task 6, is in scope as a fix). **Suggested follow-up:** a small, separate plan that either (a) makes the registry default check `MISTRAL_MODEL` like the other 6, or (b) changes `MistralProvider`'s class default to match the registry's `MISTRAL_LARGE_LATEST` — needs a product decision on which value is actually "correct" for Mistral's default, which is outside this plan's scope to make.
- **Groq's TimeoutError classification is silently normalized.** Pre-migration, Groq alone mapped `TimeoutError` to `ProviderError`; the other 6 (and the new `ConfiguredOpenAICompatProvider`, for all 7) map it to `NetworkError`. This is not this plan's own design choice — plan 07's `classifyProviderError` hard-codes `TimeoutError → NetworkError` unconditionally, "ahead of any rule table" and explicitly not made overridable, so every provider that delegates to it (not just this catalog's 7) gets this normalization; `ConfiguredOpenAICompatProvider.formatProviderError` has no `TimeoutError` branch of its own to change. If any caller pattern-matches on `error.constructor.name === "ProviderError"` specifically for Groq timeouts, that code now sees `NetworkError` instead. No such caller was found in this codebase during research, but this plan did not — and could not — exhaustively grep every consumer of NeuroLink as a library. **Rollback if this surfaces in practice:** this would need to change at the shared `classifyProviderError` level (plan 07), not here — a provider-local override is not available given that function's contract.
- **Error-message wording is fully preserved, not generic.** Every one of Task 4's 7 catalog entries is a direct, mechanical translation of its subclass's original `formatProviderError` `if`/`else` ladder into a `ProviderErrorRule[]` array: same `.includes()` conditions as `match` predicates, same auth/rate-limit/model-not-found strings verbatim (via each rule's `message` field, which plan 07's `ProviderErrorRule` supports as `string | ((ctx) => string)`), same model-name interpolation (via `ctx.modelName`, threaded through from `this.modelName`), xAI's unique quota rule and Groq's `model_decommissioned`-vs-`model_not_found` distinction both intact, and the same final fallback message/class in the same priority order. Nothing here is a behavior change for message text; only the selection mechanism changed, from an imperative `if`/`else-if` chain to a declarative first-match-wins array.
- **`adjustBodyAfter400` compose-order assumption.** This plan's fix applies the overflow-correction body as the INPUT to `adjustBodyAfter400`, then falls back to the overflow-only body if the subclass hook returns `undefined`. This means a subclass's field-strip logic must be written to work against an already-`max_tokens`-adjusted body (it already does, for NVIDIA NIM — it only inspects the response body / a specific field name, never `max_tokens`). A future subclass whose `adjustBodyAfter400` logic depended on inspecting the ORIGINAL (pre-overflow-fix) `max_tokens` value would need to be aware of this order. Documented in the method's own updated inline comment structure (the fix itself, Task 6) — no such subclass exists today.
- **Rollback path for the whole plan:** every task is a separate, small commit; reverting is `git revert` of the relevant range, in reverse task order, since later tasks (7-13) depend on Task 5's migration and Task 6's fix being in place, and Task 5 depends on Tasks 1-4's new files existing. The 7 deleted subclass files are fully recoverable from git history (`git show <sha>:src/lib/providers/groq.ts`, etc.) if any single provider needs to be un-migrated in isolation without reverting the whole plan.
- **Prerequisite risk:** if plan 07 has NOT actually landed when this plan is implemented (despite the roadmap's wave ordering), Task 3 fails to compile immediately and loudly — that's the correct behavior, not a plan defect. Do not work around it by hand-writing a local `classifyProviderError` shim; that creates exactly the kind of drift plan 07 exists to prevent.

## Out of Scope

- **Non-wire-compatible providers** (Cohere, Replicate, embeddings/image-gen providers, and anything with a genuinely different request/response shape) — covered by **plan 08**.
- **Descriptor-derived CLI/health lists** (deriving `commandFactory.ts`'s `--provider` choices, health-check lists, or any other cross-cutting provider-identity surface from a shared descriptor) — covered by **plan 04** (`ProviderDescriptor`/`PROVIDER_DESCRIPTORS`). This plan's `OpenAICompatCatalogEntry` is intentionally a separate, narrower table; unifying the two is a possible future plan, not a requirement here.
- **Extending the catalog to future/new providers** beyond the 7 ported here — covered by **plan 10** (the onboarding playbook for adding a new provider going forward).
- **Reconciling the Mistral registry-vs-class default-model quirk** — flagged above in Risks & Rollback as a candidate for a small standalone follow-up plan, not attempted here.
- **DeepSeek and Azure OpenAI subclass changes** — explicitly kept as dedicated subclasses (Task 14 documents why); no behavioral changes to either in this plan.
- **NVIDIA NIM, LiteLLM, OpenAI, OpenRouter, Ollama, HuggingFace, llama.cpp, LM Studio, openaiCompatible** — the remaining 9 of the 19 total `OpenAIChatCompletionsProvider` subclasses. None are zero-quirk (each overrides at least one real hook), so none are candidates for this catalog; out of scope for this plan entirely (not assigned to a specific other plan in this roadmap as of this writing).
