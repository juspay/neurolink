# Error & Retry Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~30 hand-rolled `formatProviderError` bodies (each a copy-pasted `TimeoutError` check → `.includes()` chain → `new XError(...)`) with one declarative classifier — `classifyProviderError()` driven by `ProviderErrorRule[]` tables — collapse the four independent retry-helper implementations down to the ones that are genuinely load-bearing, deduplicate the two competing `NetworkError`/`TimeoutError` definitions, close the streaming-path retry gap (only the non-streaming path gets 429/5xx backoff today), and fix a real inconsistency in how Google AI Studio decides tools-vs-JSON-schema exclusion between its `generate()` and `stream()` orchestrators.

**Architecture:** A single classification function, `classifyProviderError(error, rules, provider, modelName?)`, takes the raw thrown value plus an ordered `ProviderErrorRule[]` and returns the first matching rule's `errorClass` constructed with either a static or context-derived message. `DEFAULT_ERROR_RULES` covers the common shape (401/429/404/network/5xx) that most OpenAI-compatible providers already hand-roll identically; providers with genuinely provider-specific behavior (env-var-specific auth messages, dynamic retry-delay scraping, model-suggestion lists, AWS SDK exception-name matching) prepend their own small rule array and fall through to `DEFAULT_ERROR_RULES` for the rest, or build a fully custom array when the shape diverges completely (Vertex, Bedrock). `formatProviderError` in every migrated provider shrinks to a one-to-ten-line call into this classifier — the abstract contract (`protected formatProviderError(error: unknown): Error`, must return not throw) is unchanged, so `handleProviderError()`'s existing generic statusCode/isRetryable/retryAfterMs passthrough (`src/lib/core/baseProvider.ts:2115-2153`) keeps working untouched; `classifyProviderError` does not duplicate that stamping. Retry-helper sprawl is triaged, not blanket-merged: the one genuinely dead duplicate (`fileDetector.ts`'s private `withRetry`) migrates onto the existing canonical exponential implementation (`core/infrastructure/retry.ts`); the three others with real, distinct contracts stay separate with the reasoning recorded so nobody "fixes" them again by accident. Two streaming loops (OpenAI-compat `streamOneStep`, Anthropic's native `for` loop) gain the same `withProviderRetry` 429/5xx backoff the non-streaming path already has, using the existing duck-typed error shape with zero adaptation.

**Tech Stack:** TypeScript, tsx (test suites run directly via `npx tsx`, no build step, no vitest despite `vitest.config.ts` existing), pnpm.

**Spec:**

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/10-openai-compat-family.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/03-native-sdk-provider-family-anthropic-openai-google.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/09-cross-cutting-provider-concerns-tools-mcp-injectio.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/gap1-ci-cd-automated-testing-coverage-for-ai-provider-c.md`

## Global Constraints

- Package manager: pnpm ONLY (repo pins version via `packageManager` field). Build: `pnpm run build`. Typecheck: `pnpm run check`. Lint+format check: `pnpm run lint`. Auto-format: `pnpm run format`.
- Tests run via tsx, NOT vitest (`vitest.config.ts` exists but is unused): `npx tsx test/continuous-test-suite-<name>.ts`. New suites need a matching `test:<name>` script in `package.json`, following the exact existing pattern (`"test:foo": "npx tsx test/continuous-test-suite-foo.ts"`).
- TEST HARNESS SKIP HAZARD: `defineSuite`'s `test()` classifies a thrown error as SKIP (not FAIL) when the message matches `isExpectedProviderError()` — so NEVER interpolate raw payloads/actual values into assertion messages (describe the discrepancy, e.g. "mismatch at `<keyPath>`", not `` `got ${JSON.stringify(actual)}` ``). When adding a suite, include a step to deliberately break one assertion and confirm it reports `✗` and exits non-zero, then restore.
- Repo critical rules (ESLint-enforced): (1) dynamic imports only in `providerRegistry.ts` factory closures — never static-import provider classes there; (2) ALL type definitions go in `src/lib/types/` — never create local `types/` dirs or inline shared types; (6) `formatProviderError` must RETURN the error object, never throw; (7) zero `interface` — always `type X = { ... }`, intersection (`&`) not `extends`; (8) no "Types" suffix in type filenames; (9) globally unique exported type names across `src/lib/types/` (use domain prefixes — none needed here, `ProviderErrorRule`/`ProviderErrorContext` are already unique); (10) types barrel `src/lib/types/index.ts` contains only `export *` lines; (12) no type re-exports from non-type files; (13) code outside `src/lib/types/` imports internal types from the barrel (`../types` or `../types/index.js`), never from specific type files; (14) no double type assertions (`x as unknown as T`) in `src/`.
- Named exports only. No `export default`.
- Backward compatibility: the public SDK API must not break existing callers. Error **classes** thrown to callers (`AuthenticationError`, `RateLimitError`, `InvalidModelError`, `NetworkError`, `ProviderError`) must not change identity for any provider — only the code that _picks_ which class/message to construct is being refactored. Message _text_ is allowed to become more consistent/generic across providers where this plan's tasks say so explicitly (see Task 2/3's message-text note) — no test in this plan or any sibling plan asserts exact provider error message strings; only class identity, `statusCode`, and retry metadata are asserted.
- Conventional commits (feat:/fix:/refactor:/test:/docs:/chore:). Commit at the end of every task. NEVER `git push`.
- Workflow per change: edit → `pnpm run check` → `pnpm run lint` → targeted test suite(s) → commit.

**Plan-specific constraints:**

- **This plan has no hard dependency on any other plan** (per the roadmap's dependency table, Plan 07 depends on `—`). It is a Wave 2 "keystone" plan alongside Plan 04 — it must land before Wave 3 (Plans 05, 06, 08, 09) starts, because Plan 05's `ConfiguredOpenAICompatProvider` and Plan 08's agentic loop engine both reference `classifyProviderError`/`ProviderErrorRule`/`DEFAULT_ERROR_RULES` by the exact names and locations this plan produces. Do not rename or relocate these three symbols once Task 1 lands — downstream plans' Interfaces blocks cite them by exact path.
- **Contract this plan produces** (verbatim from the roadmap's "Cross-plan contracts" section): `ProviderErrorRule` (type, `src/lib/types/errors.ts`), `classifyProviderError()` + `DEFAULT_ERROR_RULES` (`src/lib/utils/errorClassifier.ts`).
- **Scope boundary on retry-helper consolidation (Task 7):** "consolidate the retry helpers" does NOT mean routing every retry-shaped call through `withProviderRetry` (`src/lib/utils/providerRetry.ts`) — that primitive's retry predicate (`isRetryableProviderError`) is deliberately tuned for AI-SDK/provider-shaped errors (429/5xx + Retry-After), not generic operations like file downloads or health-check pings. `withProviderRetry` is extended into two _new_ call sites (Tasks 8-9, both real un-retried provider API calls) but the four _other_ `withRetry`-shaped helpers are triaged individually in Task 7, each with a keep-or-merge decision and why.
- **Message-text tradeoff, stated once:** `DEFAULT_ERROR_RULES`'s rate-limit/model-not-found/network/5xx messages use a generic `${ctx.provider} rate limit exceeded...`-style template instead of each provider's original hand-written phrasing. Every migrated provider keeps its own **auth-error** message verbatim (it names the exact env var, which is genuine self-serve UX value) by prepending a one-rule override before falling through to `DEFAULT_ERROR_RULES`. The other four categories' wording becomes marginally more generic/consistent across providers as an accepted, explicitly-scoped side effect of consolidation — no existing test suite asserts exact non-auth message text (confirmed by grep in Task 2's first step), so this is a documentation note, not a behavior change requiring extra migration work.

---

### Task 1: Core contract — `ProviderErrorRule`, `ProviderErrorContext`, `classifyProviderError`, `DEFAULT_ERROR_RULES`

**Files:**

- Edit: `src/lib/types/errors.ts` (add `ProviderErrorContext`, `ProviderErrorRule` types — already barrelled via `src/lib/types/index.ts`'s `export * from "./errors.js"`, confirmed present, no barrel edit needed)
- Create: `src/lib/utils/errorClassifier.ts`
- Create: `test/continuous-test-suite-error-classifier.ts`
- Edit: `package.json` (add `test:error-classifier` script)

**Interfaces:**

- Produces (this is the contract Plans 05 and 08 consume by exact name/path):

  ```typescript
  // src/lib/types/errors.ts
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

  // src/lib/utils/errorClassifier.ts
  export function classifyProviderError(
    error: unknown,
    rules: ProviderErrorRule[],
    provider: string,
    modelName?: string,
  ): Error;
  export const DEFAULT_ERROR_RULES: ProviderErrorRule[];
  ```

- Consumes: `ProviderError`, `AuthenticationError`, `RateLimitError`, `InvalidModelError`, `NetworkError` (all existing, `src/lib/types/errors.ts`), `TimeoutError` (existing, `src/lib/utils/timeout.ts`), `duckTypedStatusCode` (existing, `src/lib/utils/providerRetry.ts`).
- Does NOT stamp `statusCode`/`isRetryable`/`retryAfterMs` onto the returned error — `handleProviderError()` (`src/lib/core/baseProvider.ts:2115-2153`) already copies those generically from the raw error onto whatever `formatProviderError` returns, for every provider, migrated or not. Duplicating that here would be redundant and risks the two copies disagreeing.

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-error-classifier.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — classifyProviderError / DEFAULT_ERROR_RULES (Plan 07)
   *
   * Pure-function suite, no API keys, no network, no LLM. Verifies the
   * shared classifier contract that every migrated provider's
   * formatProviderError() delegates to: rule-array precedence, the
   * TimeoutError fast path, static vs. function-valued messages, and the
   * generic 5-category DEFAULT_ERROR_RULES fallback table.
   *
   * Run: npx tsx test/continuous-test-suite-error-classifier.ts
   *      pnpm run test:error-classifier
   */

  import {
    classifyProviderError,
    DEFAULT_ERROR_RULES,
  } from "../src/lib/utils/errorClassifier.js";
  import {
    AuthenticationError,
    RateLimitError,
    InvalidModelError,
    NetworkError,
    ProviderError,
  } from "../src/lib/types/index.js";
  import type { ProviderErrorRule } from "../src/lib/types/index.js";
  import { TimeoutError } from "../src/lib/utils/timeout.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite("Error classifier (Plan 07)");

  void runSuite(async () => {
    section("TimeoutError fast path");

    await test("TimeoutError is classified as NetworkError regardless of rules", () => {
      const err = new TimeoutError("op timed out", 5000, "acme", "generate");
      const result = classifyProviderError(err, [], "acme");
      assert(
        result instanceof NetworkError,
        "TimeoutError did not classify to NetworkError",
      );
      assert(!(result instanceof AuthenticationError), "wrong subclass");
    });

    section("DEFAULT_ERROR_RULES — statusCode-driven matches");

    await test("401 statusCode classifies as AuthenticationError", () => {
      const err = Object.assign(new Error("denied"), { statusCode: 401 });
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(
        result instanceof AuthenticationError,
        "expected AuthenticationError",
      );
    });

    await test("429 statusCode classifies as RateLimitError", () => {
      const err = Object.assign(new Error("slow down"), { statusCode: 429 });
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(result instanceof RateLimitError, "expected RateLimitError");
    });

    await test("404 statusCode classifies as InvalidModelError", () => {
      const err = Object.assign(new Error("nope"), { statusCode: 404 });
      const result = classifyProviderError(
        err,
        DEFAULT_ERROR_RULES,
        "acme",
        "acme-large",
      );
      assert(result instanceof InvalidModelError, "expected InvalidModelError");
      assert(
        result.message.includes("acme-large"),
        "model name was not interpolated into the message",
      );
    });

    await test("5xx statusCode classifies as generic ProviderError (not a subclass)", () => {
      const err = Object.assign(new Error("boom"), { statusCode: 503 });
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(result instanceof ProviderError, "expected ProviderError");
      assert(
        !(result instanceof AuthenticationError) &&
          !(result instanceof RateLimitError) &&
          !(result instanceof InvalidModelError) &&
          !(result instanceof NetworkError),
        "5xx incorrectly matched a more specific subclass",
      );
    });

    section("DEFAULT_ERROR_RULES — message-substring-driven matches");

    await test("rate-limit substring without statusCode still matches", () => {
      const err = new Error("upstream said: rate limit exceeded, slow down");
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(result instanceof RateLimitError, "substring match failed");
    });

    await test("ECONNRESET substring classifies as NetworkError", () => {
      const err = new Error("connect ECONNRESET 127.0.0.1:443");
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(result instanceof NetworkError, "expected NetworkError");
    });

    await test("unmatched error falls through to generic ProviderError", () => {
      const err = new Error("something totally unrecognized happened");
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
      assert(
        result instanceof ProviderError,
        "expected generic ProviderError fallback",
      );
      assert(
        !(result instanceof AuthenticationError) &&
          !(result instanceof RateLimitError) &&
          !(result instanceof InvalidModelError) &&
          !(result instanceof NetworkError),
        "unmatched error incorrectly matched a specific rule",
      );
    });

    section("Rule precedence and provider-specific overrides");

    await test("first matching rule wins over later-matching rules", () => {
      const rules: ProviderErrorRule[] = [
        {
          match: () => true,
          errorClass: AuthenticationError,
          message: "first",
        },
        { match: () => true, errorClass: RateLimitError, message: "second" },
      ];
      const result = classifyProviderError(new Error("x"), rules, "acme");
      assert(result instanceof AuthenticationError, "first rule did not win");
      assert(result.message.includes("first"), "wrong message won");
    });

    await test("provider-specific rule overrides DEFAULT_ERROR_RULES via prepend", () => {
      const rules: ProviderErrorRule[] = [
        {
          match: (ctx) => /invalid api key/i.test(ctx.message),
          errorClass: AuthenticationError,
          message: "Invalid Acme API key. Check ACME_API_KEY.",
        },
        ...DEFAULT_ERROR_RULES,
      ];
      const result = classifyProviderError(
        new Error("Invalid API key supplied"),
        rules,
        "acme",
      );
      assert(
        result instanceof AuthenticationError,
        "expected AuthenticationError",
      );
      assert(
        result.message.includes("ACME_API_KEY"),
        "provider-specific env-var message was not used",
      );
    });

    section("Function-valued messages and context fields");

    await test("function-valued message receives full context", () => {
      const rules: ProviderErrorRule[] = [
        {
          match: (ctx) => ctx.errorCode === "ThrottlingException",
          errorClass: RateLimitError,
          message: (ctx) =>
            `${ctx.provider} throttled (code=${ctx.errorCode}, name=${ctx.errorName})`,
        },
      ];
      const err = Object.assign(new Error("slow down"), {
        code: "ThrottlingException",
        name: "ThrottlingException",
      });
      const result = classifyProviderError(err, rules, "bedrock");
      assert(
        result.message.includes("code=ThrottlingException"),
        "errorCode was not threaded into the context",
      );
      assert(
        result.message.includes("bedrock"),
        "provider was not threaded into the context",
      );
    });

    await test("provider bracket prefix is applied by the constructed error class", () => {
      const err = Object.assign(new Error("denied"), { statusCode: 401 });
      const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "mistral");
      assert(
        result.message.startsWith("[mistral]"),
        "ProviderError subclass did not prefix the provider bracket",
      );
    });
  });
  ```

- [ ] **Step 2: Run and verify the test fails** (module doesn't exist yet):

  ```bash
  npx tsx test/continuous-test-suite-error-classifier.ts
  ```

  Expected: fails immediately with a module-resolution error (`Cannot find module '../src/lib/utils/errorClassifier.js'`).

- [ ] **Step 3: Implement.** Add to `src/lib/types/errors.ts`, immediately after the existing `InvalidModelError` class (keeps all provider-error-family types adjacent):

  ```typescript
  /**
   * Everything a ProviderErrorRule's `match`/`message` functions can inspect
   * about a raw thrown error, pre-extracted once so every rule doesn't
   * re-derive the same duck-typed fields.
   */
  export type ProviderErrorContext = {
    /** The raw thrown value, for rules that need custom inspection beyond the extracted fields. */
    error: unknown;
    /** `.message` off the raw error, or "Unknown error" if absent/non-string. */
    message: string;
    /** HTTP status code, duck-typed from `.statusCode` / `.status`. */
    statusCode: number | undefined;
    /** `.name` off the raw error (e.g. AWS SDK exception names like "ThrottlingException"). */
    errorName: string | undefined;
    /** `.code` off the raw error (e.g. AWS SDK / Node network error codes). */
    errorCode: string | undefined;
    /** Provider key passed to classifyProviderError (e.g. "mistral", "vertex"). */
    provider: string;
    /** Model name in effect for this call, when the caller has one available. */
    modelName: string | undefined;
  };

  /**
   * One row of a provider's error-classification table. Rules are tried in
   * array order; the first `match` to return true wins. `errorClass` must be
   * `ProviderError` or one of its subclasses (AuthenticationError,
   * RateLimitError, InvalidModelError, NetworkError, ...) sharing its
   * `(message, provider?)` constructor shape. `message` can be a static
   * string or a function of the context, for providers that need to
   * interpolate a model name, a scraped retry-delay, or an AWS error code.
   */
  export type ProviderErrorRule = {
    match: (ctx: ProviderErrorContext) => boolean;
    errorClass: new (message: string, provider?: string) => ProviderError;
    message: string | ((ctx: ProviderErrorContext) => string);
  };
  ```

  Create `src/lib/utils/errorClassifier.ts`:

  ```typescript
  /**
   * Shared provider-error classification. Every provider's
   * `formatProviderError(error)` delegates here instead of hand-rolling its
   * own TimeoutError-check → .includes()-chain → `new XError(...)` ladder.
   *
   * `classifyProviderError` picks the Error subclass + message; it does NOT
   * stamp statusCode/isRetryable/retryAfterMs onto the result — that
   * passthrough already happens generically in
   * `BaseProvider.handleProviderError()` (src/lib/core/baseProvider.ts) for
   * every provider's returned error, migrated or not, so duplicating it here
   * would risk the two copies disagreeing.
   */

  import {
    ProviderError,
    AuthenticationError,
    RateLimitError,
    InvalidModelError,
    NetworkError,
    type ProviderErrorContext,
    type ProviderErrorRule,
  } from "../types/index.js";
  import { TimeoutError } from "./timeout.js";
  import { duckTypedStatusCode } from "./providerRetry.js";

  function buildErrorContext(
    error: unknown,
    provider: string,
    modelName?: string,
  ): ProviderErrorContext {
    const record =
      error && typeof error === "object"
        ? (error as Record<string, unknown>)
        : undefined;
    const message =
      typeof record?.message === "string"
        ? record.message
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return {
      error,
      message,
      statusCode: duckTypedStatusCode(error),
      errorName: typeof record?.name === "string" ? record.name : undefined,
      errorCode: typeof record?.code === "string" ? record.code : undefined,
      provider,
      modelName,
    };
  }

  /**
   * Classify a raw provider error into a NeuroLink `ProviderError` subclass.
   * `rules` are tried in order; the first match wins. `TimeoutError` is
   * always handled first, ahead of any rule table — every provider treated
   * it identically before this change, so it is not made overridable.
   */
  export function classifyProviderError(
    error: unknown,
    rules: ProviderErrorRule[],
    provider: string,
    modelName?: string,
  ): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, provider);
    }
    const ctx = buildErrorContext(error, provider, modelName);
    const rule = rules.find((r) => r.match(ctx));
    if (!rule) {
      return new ProviderError(`${provider} error: ${ctx.message}`, provider);
    }
    const message =
      typeof rule.message === "function" ? rule.message(ctx) : rule.message;
    return new rule.errorClass(message, provider);
  }

  /**
   * Generic fallback rule table covering the five categories every
   * OpenAI-compatible provider already hand-rolled near-identically:
   * auth (401), rate limit (429), model-not-found (404), network/connection
   * errors, and 5xx server errors. Providers with a provider-specific auth
   * message (naming the exact env var) prepend one override rule and spread
   * this table after it — see errorClassifier usage in any migrated
   * provider's formatProviderError for the pattern.
   */
  export const DEFAULT_ERROR_RULES: ProviderErrorRule[] = [
    {
      match: (ctx) =>
        ctx.statusCode === 401 ||
        /API_KEY_INVALID|Invalid API key|Unauthorized|invalid_api_key/i.test(
          ctx.message,
        ),
      errorClass: AuthenticationError,
      message: (ctx) =>
        `Invalid ${ctx.provider} API key. Please check your credentials.`,
    },
    {
      match: (ctx) => ctx.statusCode === 429 || /rate limit/i.test(ctx.message),
      errorClass: RateLimitError,
      message: (ctx) =>
        `${ctx.provider} rate limit exceeded. Please try again later.`,
    },
    {
      match: (ctx) =>
        ctx.statusCode === 404 ||
        /model_not_found|model not found/i.test(ctx.message),
      errorClass: InvalidModelError,
      message: (ctx) =>
        ctx.modelName
          ? `${ctx.provider} model '${ctx.modelName}' not found.`
          : `${ctx.provider} model not found.`,
    },
    {
      match: (ctx) =>
        /ECONNRESET|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|connection/i.test(
          ctx.message,
        ),
      errorClass: NetworkError,
      message: (ctx) => `Connection error: ${ctx.message}`,
    },
    {
      match: (ctx) =>
        (ctx.statusCode !== undefined && ctx.statusCode >= 500) ||
        /\b5\d\d\b|server error/i.test(ctx.message),
      errorClass: ProviderError,
      message: (ctx) => `${ctx.provider} server error: ${ctx.message}`,
    },
  ];
  ```

  Add the script to `package.json`, alongside the other no-API suites (e.g. next to `"test:anthropic-guard"`):

  ```json
  "test:error-classifier": "npx tsx test/continuous-test-suite-error-classifier.ts",
  ```

- [ ] **Step 4: Run and verify the test passes:**

  ```bash
  pnpm run test:error-classifier
  ```

  Expected: all 12 tests pass (`✓`), 0 failed, 0 skipped.

  Then confirm the harness actually distinguishes FAIL from SKIP by breaking one assertion on purpose (per Global Constraints' skip-hazard rule): temporarily change the "5xx statusCode classifies as generic ProviderError" test's expected class to `AuthenticationError`, rerun, confirm it reports `✗` and the process exits non-zero (`echo $?`), then revert.

- [ ] **Step 5: Typecheck, lint, commit.**

  ```bash
  pnpm run check && pnpm run lint
  git add src/lib/types/errors.ts src/lib/utils/errorClassifier.ts test/continuous-test-suite-error-classifier.ts package.json
  git commit -m "feat(errors): add classifyProviderError + DEFAULT_ERROR_RULES core contract"
  ```

---

### Task 2: Migrate Wave (a) — the 8 zero-quirk OpenAI-compatible providers

**Files:**

- Edit: `src/lib/providers/mistral.ts`, `src/lib/providers/groq.ts`, `src/lib/providers/xai.ts`, `src/lib/providers/togetherAi.ts`, `src/lib/providers/fireworks.ts`, `src/lib/providers/perplexity.ts`, `src/lib/providers/cloudflare.ts`, `src/lib/providers/openaiCompatible/client.ts`
- Create: `test/continuous-test-suite-error-classifier-openai-compat.ts`
- Edit: `package.json` (add `test:error-classifier-openai-compat` script)

**Interfaces:**

- Consumes: `classifyProviderError`, `DEFAULT_ERROR_RULES` (Task 1, `src/lib/utils/errorClassifier.js`).
- Each provider's `formatProviderError(error: unknown): Error` signature is unchanged (still satisfies `OpenAIChatCompletionsProvider`'s abstract hook).

Before touching code, confirm no test currently asserts exact non-auth message text (the Global Constraints message-text tradeoff depends on this):

- [ ] **Step 0: Grep for existing message-text assertions.**

  ```bash
  grep -rn "rate limit exceeded\|Server error:\|Connection error:" test/*.ts | grep -v "continuous-test-suite-error-classifier"
  ```

  Expected: no hits asserting exact provider error strings (only the classifier's own new suite references this phrasing). If any hit appears, read it before proceeding — it would mean a provider's exact message text is load-bearing and that provider needs a full rule-array override, not the `DEFAULT_ERROR_RULES` fallback.

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-error-classifier-openai-compat.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — formatProviderError parity for the 8 zero-quirk
   * OpenAI-compatible providers (Plan 07, Task 2).
   *
   * Instantiates each provider (no API key required — the base class does
   * not validate credentials at construction time) and calls its
   * formatProviderError() directly with synthetic errors, asserting the
   * SAME error-class outcomes the pre-migration hand-rolled bodies produced
   * (per-provider auth message text is asserted verbatim; other categories
   * are asserted by class only — see this plan's message-text tradeoff).
   *
   * No API keys, no network, no LLM.
   *
   * Run: npx tsx test/continuous-test-suite-error-classifier-openai-compat.ts
   *      pnpm run test:error-classifier-openai-compat
   */

  import { MistralProvider } from "../src/lib/providers/mistral.js";
  import { GroqProvider } from "../src/lib/providers/groq.js";
  import { XAIProvider } from "../src/lib/providers/xai.js";
  import { TogetherAIProvider } from "../src/lib/providers/togetherAi.js";
  import { FireworksProvider } from "../src/lib/providers/fireworks.js";
  import { PerplexityProvider } from "../src/lib/providers/perplexity.js";
  import { CloudflareProvider } from "../src/lib/providers/cloudflare.js";
  import { OpenAICompatibleProvider } from "../src/lib/providers/openaiCompatible/client.js";
  import {
    AuthenticationError,
    RateLimitError,
    InvalidModelError,
    NetworkError,
  } from "../src/lib/types/index.js";
  import { TimeoutError } from "../src/lib/utils/timeout.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite(
    "Error classifier parity — OpenAI-compat wave (a)",
  );

  // (provider instance, exact env var expected in the auth message)
  const providers: Array<{
    name: string;
    instance: { formatProviderError(error: unknown): Error };
    authEnvVar: string;
  }> = [
    {
      name: "mistral",
      instance: new MistralProvider(),
      authEnvVar: "MISTRAL_API_KEY",
    },
    { name: "groq", instance: new GroqProvider(), authEnvVar: "GROQ_API_KEY" },
    { name: "xai", instance: new XAIProvider(), authEnvVar: "XAI_API_KEY" },
    {
      name: "together-ai",
      instance: new TogetherAIProvider(),
      authEnvVar: "TOGETHER_AI_API_KEY",
    },
    {
      name: "fireworks",
      instance: new FireworksProvider(),
      authEnvVar: "FIREWORKS_API_KEY",
    },
    {
      name: "perplexity",
      instance: new PerplexityProvider(),
      authEnvVar: "PERPLEXITY_API_KEY",
    },
    {
      name: "cloudflare",
      instance: new CloudflareProvider(),
      authEnvVar: "CLOUDFLARE_API_KEY",
    },
    {
      name: "openai-compatible",
      instance: new OpenAICompatibleProvider(),
      authEnvVar: "OPENAI_COMPATIBLE_API_KEY",
    },
  ];

  void runSuite(async () => {
    for (const { name, instance, authEnvVar } of providers) {
      section(name);

      await test(`${name}: TimeoutError -> NetworkError`, () => {
        const err = new TimeoutError("timed out", 3000, name, "generate");
        const result = instance.formatProviderError(err);
        assert(
          result instanceof NetworkError,
          `${name} did not map TimeoutError to NetworkError`,
        );
      });

      await test(`${name}: 401/invalid key -> AuthenticationError naming its env var`, () => {
        const err = new Error("Invalid API key");
        const result = instance.formatProviderError(err);
        assert(
          result instanceof AuthenticationError,
          `${name} did not map auth error to AuthenticationError`,
        );
        assert(
          result.message.includes(authEnvVar),
          `${name}'s auth message no longer names ${authEnvVar}`,
        );
      });

      await test(`${name}: rate limit -> RateLimitError`, () => {
        const err = new Error("rate limit exceeded, try later");
        const result = instance.formatProviderError(err);
        assert(
          result instanceof RateLimitError,
          `${name} did not map to RateLimitError`,
        );
      });

      await test(`${name}: model_not_found -> InvalidModelError`, () => {
        const err = new Error("model_not_found: no such model");
        const result = instance.formatProviderError(err);
        assert(
          result instanceof InvalidModelError,
          `${name} did not map to InvalidModelError`,
        );
      });

      await test(`${name}: unrecognized error -> generic ProviderError (not misclassified)`, () => {
        const err = new Error("totally unrecognized upstream failure");
        const result = instance.formatProviderError(err);
        assert(
          !(result instanceof AuthenticationError) &&
            !(result instanceof RateLimitError) &&
            !(result instanceof InvalidModelError),
          `${name} misclassified an unrecognized error as a specific subclass`,
        );
      });
    }
  });
  ```

  Note: `TogetherAIProvider`/`XAIProvider`/etc. class names above must match each file's actual exported class name — verify with `grep -n "^export class" src/lib/providers/<file>.ts` before running; adjust the import if a name differs (this plan verified the file locations and formatProviderError bodies, not every exported class identifier).

- [ ] **Step 2: Run and verify the test fails** (or rather, passes against the OLD hand-rolled bodies first — this is a characterization test):

  ```bash
  npx tsx test/continuous-test-suite-error-classifier-openai-compat.ts
  ```

  Expected: passes against the current (pre-migration) code, since it characterizes existing behavior. This confirms the test is well-formed before the refactor; it stays green through Step 4 by construction — the real regression check is that it STAYS green after Step 3's rewrite.

- [ ] **Step 3: Implement.** Replace each provider's `formatProviderError` body. All 8 follow the identical shape: a provider-specific auth-message override rule, then `...DEFAULT_ERROR_RULES`.

  `src/lib/providers/mistral.ts`:

  ```typescript
  import { classifyProviderError, DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
  import type { ProviderErrorRule } from "../types/index.js";

  // ... inside class MistralProvider ...
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key|Unauthorized/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "mistral", this.modelName);
  }
  ```

  `src/lib/providers/groq.ts` (also keeps the `model_decommissioned` special case, since it changes the message text but not the class):

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
      },
      {
        match: (ctx) => /model_decommissioned/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx) =>
          `Groq model '${ctx.modelName}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "groq", this.modelName);
  }
  ```

  `src/lib/providers/xai.ts`, `togetherAi.ts`, `fireworks.ts`, `perplexity.ts`, `cloudflare.ts` follow the exact same recipe as `mistral.ts` — one auth-override rule (message copied verbatim from the current `.includes()` branch's string literal) spread with `...DEFAULT_ERROR_RULES`:

  ```typescript
  // xai.ts
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid xAI API key. Please check your XAI_API_KEY environment variable. Get one at https://console.x.ai/",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "xai", this.modelName);
  }

  // togetherAi.ts
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "together-ai", this.modelName);
  }

  // fireworks.ts
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Fireworks API key. Get one at https://fireworks.ai/account/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "fireworks", this.modelName);
  }

  // perplexity.ts
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "perplexity", this.modelName);
  }

  // cloudflare.ts
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Cloudflare API key. Use a token with Workers AI Read+Write scope. Get one at https://dash.cloudflare.com/profile/api-tokens",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "cloudflare", this.modelName);
  }
  ```

  `src/lib/providers/openaiCompatible/client.ts` needs one extra rule ahead of the auth override — its `ECONNREFUSED`/"Failed to fetch" branch returns a `NetworkError` naming the configured base URL, which `DEFAULT_ERROR_RULES`' generic network rule cannot reproduce (it doesn't know `this.config.baseURL`):

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /ECONNREFUSED|Failed to fetch/i.test(ctx.message),
        errorClass: NetworkError,
        message: () =>
          `OpenAI Compatible endpoint not available. Please check your OPENAI_COMPATIBLE_BASE_URL: ${redactUrlCredentials(this.config.baseURL)}`,
      },
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key|Unauthorized/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid OpenAI Compatible API key. Please check your OPENAI_COMPATIBLE_API_KEY environment variable.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "openai-compatible", this.modelName);
  }
  ```

  Each file needs its `import` block updated: drop now-unused direct imports of `AuthenticationError`/`RateLimitError`/`InvalidModelError`/`NetworkError`/`ProviderError`/`TimeoutError`/`UnknownRecord` that were only used inside the deleted `.includes()` ladder (keep whichever are still referenced — every file above still uses `AuthenticationError` and `NetworkError` in its own rule array, and `ProviderErrorRule` as a type-only import from the barrel per Rule 13); add `import { classifyProviderError, DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";` (path is `"../../utils/errorClassifier.js"` from `openaiCompatible/client.ts`, one directory deeper).

- [ ] **Step 4: Run and verify the test still passes** after the rewrite:

  ```bash
  pnpm run test:error-classifier-openai-compat
  ```

  Expected: same 40 tests (8 providers × 5 checks) still pass — this is the parity proof that the rewrite didn't change classification behavior.

- [ ] **Step 5: Typecheck, lint, full test, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:error-classifier-openai-compat
  git add src/lib/providers/mistral.ts src/lib/providers/groq.ts src/lib/providers/xai.ts src/lib/providers/togetherAi.ts src/lib/providers/fireworks.ts src/lib/providers/perplexity.ts src/lib/providers/cloudflare.ts src/lib/providers/openaiCompatible/client.ts test/continuous-test-suite-error-classifier-openai-compat.ts package.json
  git commit -m "refactor(providers): migrate 8 zero-quirk OpenAI-compat providers to classifyProviderError"
  ```

---

### Task 3: Migrate Wave (b) — the remaining OpenAI-compatible family + native-shape variety

**Files:**

- Edit (fully worked in this task): `src/lib/providers/openAI/client.ts`, `src/lib/providers/deepseek.ts`, `src/lib/providers/azureOpenai.ts`
- Edit (apply the identical recipe, verified via `grep -n "formatProviderError" <file>` before editing): `src/lib/providers/litellm/client.ts`, `src/lib/providers/nvidiaNim/client.ts`, `src/lib/providers/openRouter/client.ts`, `src/lib/providers/ollama/client.ts`, `src/lib/providers/huggingFace/client.ts`, `src/lib/providers/llamaCpp.ts`, `src/lib/providers/lmStudio.ts`, `src/lib/providers/cohere.ts`
- Edit: `test/continuous-test-suite-error-classifier-openai-compat.ts` (extend with all 11 providers)

**Interfaces:**

- Same as Task 2 — `classifyProviderError`/`DEFAULT_ERROR_RULES` from Task 1.

This wave's providers were read individually because their `formatProviderError` bodies genuinely diverge in shape (not just message text), unlike wave (a)'s identical 4-branch ladder:

- `openAI/client.ts` duck-types both `.status` AND `.statusCode`, checks an `errorType` field (`invalid_api_key`, `rate_limit_error`), and — per an existing code comment citing a prior curator finding — deliberately does NOT treat every `invalid_request_error` as an auth failure, only explicit auth markers. This nuance must survive the migration.
- `deepseek.ts` has a 4th category (HTTP 402 / "Insufficient Balance") that the other providers don't: it maps to a plain `ProviderError`, not a new subclass.
- `azureOpenai.ts` is the thinnest in the whole family — it only checks for `"401"` in the message; everything else, including rate limits and 5xx, falls through to one generic `ProviderError`. Migrating it to `DEFAULT_ERROR_RULES` wholesale would be a **behavior change** (Azure errors that were previously always `ProviderError` would start returning `RateLimitError`/`InvalidModelError`/`NetworkError` for matching text) — decide deliberately whether that's a wanted fix or an unwanted scope change (this plan treats it as a wanted fix, since a caller checking `error instanceof RateLimitError` to decide whether to back off currently can never get `true` for Azure no matter what Azure returns, which is very likely an existing latent bug rather than an intentional Azure-specific design choice).

- [ ] **Step 1: Write the failing test additions.** Extend `test/continuous-test-suite-error-classifier-openai-compat.ts`'s `providers` array (Task 2's file) with the 3 fully-worked instances, keeping the existing 5 per-provider checks:

  ```typescript
  import { OpenAIProvider } from "../src/lib/providers/openAI/client.js";
  import { DeepSeekProvider } from "../src/lib/providers/deepseek.js";
  import { AzureOpenAIProvider } from "../src/lib/providers/azureOpenai.js";

  // append to `providers`:
  { name: "openai", instance: new OpenAIProvider(), authEnvVar: "OPENAI_API_KEY" },
  { name: "deepseek", instance: new DeepSeekProvider(), authEnvVar: "DEEPSEEK_API_KEY" },
  ```

  `azureOpenai.ts` needs its own dedicated section (its auth message doesn't name an env var the same way, and it needs the "previously-generic-now-specific" behavior-change check made explicit), added as a new `section`/`test` block after the shared loop:

  ```typescript
  section(
    "azureOpenai (behavior-change check: 5xx/429 now classify instead of falling through)",
  );

  const azure = new AzureOpenAIProvider();

  await test("azureOpenai: 401 -> AuthenticationError (unchanged)", () => {
    const result = azure.formatProviderError(
      new Error("request failed with 401"),
    );
    assert(
      result instanceof AuthenticationError,
      "azure 401 no longer maps to AuthenticationError",
    );
  });

  await test("azureOpenai: 429 -> RateLimitError (previously fell through to generic ProviderError)", () => {
    const result = azure.formatProviderError(
      Object.assign(new Error("rate limit exceeded"), { statusCode: 429 }),
    );
    assert(
      result instanceof RateLimitError,
      "azure 429 did not classify as RateLimitError post-migration",
    );
  });

  section("deepseek (402 insufficient-balance special case)");

  const deepseek = new DeepSeekProvider();

  await test("deepseek: 402/insufficient balance -> generic ProviderError, not misclassified", () => {
    const result = deepseek.formatProviderError(
      new Error("Insufficient Balance: top up your account"),
    );
    assert(
      !(result instanceof AuthenticationError) &&
        !(result instanceof RateLimitError) &&
        !(result instanceof InvalidModelError),
      "deepseek 402 balance error was misclassified as a specific subclass",
    );
    assert(
      result.message.includes("platform.deepseek.com"),
      "deepseek's balance top-up URL was dropped",
    );
  });

  section(
    "openAI (statusCode duck-typing + errorType field + auth-marker precision)",
  );

  const openai = new OpenAIProvider();

  await test("openai: statusCode 401 -> AuthenticationError", () => {
    const result = openai.formatProviderError(
      Object.assign(new Error("nope"), { status: 401 }),
    );
    assert(
      result instanceof AuthenticationError,
      "openai .status duck-typing broke",
    );
  });

  await test("openai: invalid_request_error is NOT auto-classified as auth (precision preserved)", () => {
    const result = openai.formatProviderError(
      Object.assign(new Error("unsupported parameter: foo"), {
        type: "invalid_request_error",
      }),
    );
    assert(
      !(result instanceof AuthenticationError),
      "openai over-matched invalid_request_error as an auth failure — the exact regression the original curator fix prevented",
    );
  });
  ```

- [ ] **Step 2: Run and verify the new assertions fail** (classes not yet migrated, so this just re-confirms the characterization is accurate against current code):

  ```bash
  npx tsx test/continuous-test-suite-error-classifier-openai-compat.ts
  ```

  Expected: passes against current code (characterization), confirming the test is well-formed before rewriting.

- [ ] **Step 3: Implement.**

  `src/lib/providers/openAI/client.ts` — preserve the `errorType`/dual-statusCode nuance and the invalid_request_error precision fix via `match` predicates that read `ctx.error` directly for the `type` field (not currently part of `ProviderErrorContext`, so read it off `ctx.error` inline):

  ```typescript
  public formatProviderError(error: unknown): Error {
    const errorType =
      error && typeof error === "object" && "type" in error && typeof (error as { type?: unknown }).type === "string"
        ? (error as { type: string }).type
        : undefined;
    const rules: ProviderErrorRule[] = [
      {
        // Curator P1-1 / Reviewer Finding #4: only explicit auth markers map
        // to AuthenticationError. Every invalid_request_error is OpenAI's
        // catch-all for ANY bad request (unsupported parameter, malformed
        // JSON, etc.) — treating it as "invalid API key" mislabels it.
        match: (ctx) =>
          ctx.statusCode === 401 ||
          errorType === "invalid_api_key" ||
          /API_KEY_INVALID|Invalid API key|Incorrect API key|invalid_api_key/i.test(
            ctx.message,
          ),
        errorClass: AuthenticationError,
        message: (ctx) =>
          /Incorrect API key|Invalid API key/i.test(ctx.message)
            ? ctx.message
            : "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
      },
      {
        match: (ctx) => ctx.statusCode === 429 || errorType === "rate_limit_error",
        errorClass: RateLimitError,
        message: "OpenAI rate limit exceeded. Please try again later.",
      },
      {
        match: (ctx) => /model_not_found/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx) => `Model not found: ${ctx.modelName}`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, this.providerName, this.modelName);
  }
  ```

  Note the `statusCode` used above comes from `ProviderErrorContext.statusCode`, which is `duckTypedStatusCode(error)` (Task 1) — confirm it already checks both `.status` and `.statusCode` (it does, per `providerRetry.ts`'s existing implementation) so this migration needs no extra duck-typing beyond what `errorType` requires.

  `src/lib/providers/deepseek.ts`:

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
      },
      {
        match: (ctx) =>
          ctx.statusCode === 402 ||
          /Insufficient Balance|insufficient_balance/i.test(ctx.message),
        errorClass: ProviderError,
        message:
          "DeepSeek account has insufficient balance. Top up at https://platform.deepseek.com/usage",
      },
      {
        match: (ctx) => /model_not_found/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx) =>
          `DeepSeek model '${ctx.modelName}' not found. Use 'deepseek-chat' or 'deepseek-reasoner'.`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "deepseek", this.modelName);
  }
  ```

  `src/lib/providers/azureOpenai.ts` (the deliberate behavior-change: previously only 401 was special-cased, everything else fell through to a generic `ProviderError`; now 429/404/network/5xx get properly classified via `DEFAULT_ERROR_RULES` too — recorded as Risk 1 in this plan's Risks & Rollback):

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /401/.test(ctx.message),
        errorClass: AuthenticationError,
        message: "Invalid Azure OpenAI API key or endpoint.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "azure", this.modelName);
  }
  ```

  For the remaining 8 providers (`litellm`, `nvidiaNim`, `openRouter`, `ollama`, `huggingFace`, `llamaCpp`, `lmStudio`, `cohere`): read each file's current `formatProviderError` body with `grep -n "formatProviderError" -A 40 src/lib/providers/<path>` first, then apply the identical recipe demonstrated above — one auth-override rule preserving the exact existing message text/env-var name, any provider-specific extra branch kept as its own rule (in the exact position it currently occupies relative to auth, e.g. before or after), then `...DEFAULT_ERROR_RULES`. Do not guess message text — copy it verbatim from the file being edited.

- [ ] **Step 4: Run and verify all assertions pass**, including the two `azureOpenai` behavior-change tests:

  ```bash
  pnpm run test:error-classifier-openai-compat
  ```

- [ ] **Step 5: Typecheck, lint, full test, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:error-classifier-openai-compat
  git add src/lib/providers/openAI/client.ts src/lib/providers/deepseek.ts src/lib/providers/azureOpenai.ts src/lib/providers/litellm/client.ts src/lib/providers/nvidiaNim/client.ts src/lib/providers/openRouter/client.ts src/lib/providers/ollama/client.ts src/lib/providers/huggingFace/client.ts src/lib/providers/llamaCpp.ts src/lib/providers/lmStudio.ts src/lib/providers/cohere.ts test/continuous-test-suite-error-classifier-openai-compat.ts
  git commit -m "refactor(providers): migrate remaining OpenAI-compat family to classifyProviderError"
  ```

---

### Task 4: Migrate Wave (c) — native SDK providers (Anthropic, Vertex, Bedrock)

**Files:**

- Edit: `src/lib/providers/anthropic/client.ts`, `src/lib/providers/googleVertex/client.ts`, `src/lib/providers/amazonBedrock/client.ts`
- Create: `test/continuous-test-suite-error-classifier-native.ts`
- Edit: `package.json`

**Interfaces:**

- Consumes: `classifyProviderError` (Task 1). These three do NOT use `DEFAULT_ERROR_RULES` as a base spread — their message text is too provider-specific (dynamic retry-delay scraping, model suggestions, AWS exception-name/code matching) to benefit from the generic fallback; each builds its own full `ProviderErrorRule[]` closing with a final `{ match: () => true, ... }` catch-all rule instead.

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-error-classifier-native.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — formatProviderError parity for the native-SDK
   * providers (Anthropic, Vertex, Bedrock) after migrating to
   * classifyProviderError with fully custom (non-DEFAULT_ERROR_RULES) tables.
   *
   * No API keys, no network, no LLM.
   *
   * Run: npx tsx test/continuous-test-suite-error-classifier-native.ts
   *      pnpm run test:error-classifier-native
   */

  import { AnthropicProvider } from "../src/lib/providers/anthropic/client.js";
  import { GoogleVertexProvider } from "../src/lib/providers/googleVertex/client.js";
  import { AmazonBedrockProvider } from "../src/lib/providers/amazonBedrock/client.js";
  import {
    AuthenticationError,
    RateLimitError,
    InvalidModelError,
    NetworkError,
    ProviderError,
  } from "../src/lib/types/index.js";
  import { TimeoutError } from "../src/lib/utils/timeout.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite(
    "Error classifier parity — native SDK providers",
  );

  void runSuite(async () => {
    section("anthropic");
    const anthropic = new AnthropicProvider();

    await test("anthropic: TimeoutError -> NetworkError", () => {
      const result = anthropic.formatProviderError(
        new TimeoutError("timed out", 3000, "anthropic", "stream"),
      );
      assert(result instanceof NetworkError, "expected NetworkError");
    });

    await test("anthropic: API_KEY_INVALID -> AuthenticationError", () => {
      const result = anthropic.formatProviderError(
        new Error("API_KEY_INVALID"),
      );
      assert(
        result instanceof AuthenticationError,
        "expected AuthenticationError",
      );
    });

    await test("anthropic: SDK-style '401 <msg>' (no API_KEY_INVALID text) -> AuthenticationError", () => {
      // Regression pin for plan 02's documented gap: the Anthropic SDK's
      // real error shape is a bare "401 <msg>" string with no
      // "API_KEY_INVALID"/"Invalid API key" substring — this must be caught
      // via ctx.statusCode, not the message regex alone.
      const err = Object.assign(
        new Error(
          '401 {"type":"authentication_error","message":"invalid x-api-key"}',
        ),
        { status: 401 },
      );
      const result = anthropic.formatProviderError(err);
      assert(
        result instanceof AuthenticationError,
        "the SDK-style '401 <msg>' shape was not classified as AuthenticationError — statusCode fallback missing",
      );
    });

    await test("anthropic: 429/too_many_requests -> RateLimitError", () => {
      const result = anthropic.formatProviderError(
        new Error("too_many_requests"),
      );
      assert(result instanceof RateLimitError, "expected RateLimitError");
    });

    await test("anthropic: SDK-style statusCode 429 (no rate-limit text) -> RateLimitError", () => {
      const err = Object.assign(new Error("429 too many requests"), {
        status: 429,
      });
      const result = anthropic.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "statusCode 429 fallback missing symmetry with the auth rule's statusCode 401 fallback",
      );
    });

    await test("anthropic: ECONNRESET -> NetworkError", () => {
      const result = anthropic.formatProviderError(new Error("ECONNRESET"));
      assert(result instanceof NetworkError, "expected NetworkError");
    });

    await test("anthropic: 5xx -> generic ProviderError", () => {
      const result = anthropic.formatProviderError(
        new Error("502 bad gateway"),
      );
      assert(
        result instanceof ProviderError && !(result instanceof NetworkError),
        "expected generic ProviderError, not NetworkError",
      );
    });

    section("googleVertex");
    const vertex = new GoogleVertexProvider();

    await test("vertex: PERMISSION_DENIED -> AuthenticationError", () => {
      const result = vertex.formatProviderError(
        new Error("PERMISSION_DENIED: no access"),
      );
      assert(
        result instanceof AuthenticationError,
        "expected AuthenticationError",
      );
    });

    await test("vertex: NOT_FOUND -> InvalidModelError with model suggestions", () => {
      const result = vertex.formatProviderError(
        new Error("NOT_FOUND: model not found"),
      );
      assert(result instanceof InvalidModelError, "expected InvalidModelError");
    });

    await test("vertex: 429 RESOURCE_EXHAUSTED with retryDelay -> RateLimitError mentioning the delay", () => {
      const result = vertex.formatProviderError(
        new Error('429 RESOURCE_EXHAUSTED {"retryDelay":"12s"}'),
      );
      assert(result instanceof RateLimitError, "expected RateLimitError");
      assert(
        result.message.includes("12s"),
        "vertex's scraped retryDelay was dropped after migration",
      );
    });

    await test("vertex: overloaded -> RateLimitError (regex-detected, not substring)", () => {
      const result = vertex.formatProviderError(
        new Error("model is overloaded, try again"),
      );
      assert(
        result instanceof RateLimitError,
        "overloaded regex match was lost",
      );
    });

    section("amazonBedrock");
    const bedrock = new AmazonBedrockProvider();

    await test("bedrock: AccessDeniedException -> AuthenticationError", () => {
      const result = bedrock.formatProviderError(
        new Error("AccessDeniedException: denied"),
      );
      assert(
        result instanceof AuthenticationError,
        "expected AuthenticationError",
      );
    });

    await test("bedrock: ValidationException -> generic ProviderError (not misclassified)", () => {
      const result = bedrock.formatProviderError(
        new Error("ValidationException: bad input"),
      );
      assert(
        result instanceof ProviderError && !(result instanceof RateLimitError),
        "ValidationException should not be treated as a rate limit",
      );
    });

    await test("bedrock: ThrottlingException by .name (not just message) -> RateLimitError", () => {
      const err = Object.assign(new Error("throttled"), {
        name: "ThrottlingException",
      });
      const result = bedrock.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "bedrock's name-based ThrottlingException match was lost",
      );
    });

    await test("bedrock: ThrottlingException by .code (not just .name) -> RateLimitError", () => {
      const err = Object.assign(new Error("throttled"), {
        code: "ThrottlingException",
      });
      const result = bedrock.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "bedrock's code-based ThrottlingException match was lost",
      );
    });

    await test("bedrock: ThrottlingException checked BEFORE the ValidationException generic path", () => {
      // A validation-shaped message that ALSO carries the throttling name must
      // still classify as RateLimitError — order matters, this pins it.
      const err = Object.assign(
        new Error("ValidationException-shaped but actually throttled"),
        { name: "ThrottlingException" },
      );
      const result = bedrock.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "throttling-by-name lost precedence over message text",
      );
    });
  });
  ```

- [ ] **Step 2: Run and verify against current code (characterization):**

  ```bash
  npx tsx test/continuous-test-suite-error-classifier-native.ts
  ```

  Expected: passes against the pre-migration hand-rolled bodies.

- [ ] **Step 3: Implement.**

  `src/lib/providers/anthropic/client.ts`:

  ```typescript
  import { classifyProviderError } from "../../utils/errorClassifier.js";
  import type { ProviderErrorRule } from "../../types/index.js";

  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        // Plan 02's mocked-contract work documented a pre-existing gap: the
        // Anthropic SDK formats auth failures as a bare "401 <msg>" string,
        // which the message-text regex alone does not catch — mirrors
        // Vertex's statusCode === 401 fallback in this same task.
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
      },
      {
        match: (ctx) =>
          ctx.statusCode === 429 ||
          /rate limit|too_many_requests|429/i.test(ctx.message),
        errorClass: RateLimitError,
        message: "Anthropic rate limit exceeded. Please try again later.",
      },
      {
        match: (ctx) =>
          /ECONNRESET|ENOTFOUND|ECONNREFUSED|network|connection/i.test(ctx.message),
        errorClass: NetworkError,
        message: (ctx) => `Connection error: ${ctx.message}`,
      },
      {
        match: (ctx) => /500|502|503|504|server error/i.test(ctx.message),
        errorClass: ProviderError,
        message: (ctx) => `Server error: ${ctx.message}`,
      },
      {
        match: () => true,
        errorClass: ProviderError,
        message: (ctx) => `Anthropic error: ${ctx.message}`,
      },
    ];
    return classifyProviderError(error, rules, this.providerName, this.modelName);
  }
  ```

  `src/lib/providers/googleVertex/client.ts` — the model-suggestion and retry-delay logic stay as closures over `this`/`error`, since they need instance methods (`this.getModelSuggestions`) and raw-error regex scraping that a static rule table cannot express; the `errorClass`/`message` split still applies, just with richer message closures:

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const errorRecord = error as UnknownRecord;
    const statusCode =
      typeof errorRecord?.status === "number"
        ? errorRecord.status
        : typeof errorRecord?.statusCode === "number"
          ? errorRecord.statusCode
          : undefined;

    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          /PERMISSION_DENIED|UNAUTHENTICATED|Invalid API key/i.test(ctx.message) ||
          statusCode === 401 ||
          statusCode === 403,
        errorClass: AuthenticationError,
        message: () =>
          "Google Vertex AI Permission Denied. Check your service account credentials and IAM roles.",
      },
      {
        match: (ctx) =>
          /NOT_FOUND|model not found|Model not found/i.test(ctx.message) ||
          statusCode === 404,
        errorClass: InvalidModelError,
        message: () => {
          const modelSuggestions = this.getModelSuggestions(this.modelName);
          return `Model '${this.modelName}' is not available in region ${this.location}. Suggested alternatives: ${modelSuggestions}.`;
        },
      },
      {
        match: (ctx) =>
          /QUOTA_EXCEEDED|RATE_LIMIT_EXCEEDED|rate limit|429/i.test(ctx.message) ||
          statusCode === 429 ||
          statusCode === 529 ||
          /overloaded/i.test(ctx.message),
        errorClass: RateLimitError,
        message: (ctx) => {
          const retryDelay =
            typeof errorRecord?.retryDelay === "string"
              ? errorRecord.retryDelay
              : (/["']?retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?s)/.exec(
                  ctx.message,
                )?.[1] ?? undefined);
          const requestModel =
            typeof errorRecord?.requestModel === "string"
              ? errorRecord.requestModel
              : this.modelName;
          const effectiveRegion =
            typeof errorRecord?.requestRegion === "string"
              ? errorRecord.requestRegion
              : resolveVertexRegionForModel(requestModel, this.location);
          return `Google Vertex AI rate limit / shared-capacity exhausted (429 RESOURCE_EXHAUSTED / overloaded) for model '${requestModel}' in region '${effectiveRegion}'.${retryDelay ? ` Upstream suggests retrying after ${retryDelay}.` : ""}`;
        },
      },
      {
        match: (ctx) =>
          /ECONNRESET|ENOTFOUND|ECONNREFUSED|network|connection/i.test(ctx.message),
        errorClass: NetworkError,
        message: (ctx) => `Connection error: ${ctx.message}`,
      },
      {
        match: () => true,
        errorClass: ProviderError,
        message: (ctx) => `Google Vertex AI error: ${ctx.message}`,
      },
    ];
    return classifyProviderError(error, rules, this.providerName, this.modelName);
  }
  ```

  This plan verified the auth/model/rate-limit branches of the original 8465-8593 region firsthand; the 5xx/generic-fallback tail past what was read must be transcribed from the current file during implementation (`sed -n '8580,8620p' src/lib/providers/googleVertex/client.ts` before deleting it) rather than invented — preserve it as the closing `{ match: () => true, ... }` rule and any 5xx-specific rule ahead of it, following the exact same message text.

  `src/lib/providers/amazonBedrock/client.ts` — the AWS-specific `.name`/`.code` duck-typing now reads from `ProviderErrorContext.errorName`/`errorCode` (Task 1) instead of ad hoc casts, and the throttling-before-generic ordering is preserved by rule array position:

  ```typescript
  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /AccessDeniedException/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "AWS Bedrock access denied. Check your credentials and permissions.",
      },
      {
        // Checked before the generic ValidationException fallback — a
        // throttling error can be shaped like a validation error in some
        // AWS SDK error message templates, but .name/.code are authoritative.
        match: (ctx) =>
          ctx.errorName === "ThrottlingException" ||
          ctx.errorCode === "ThrottlingException",
        errorClass: RateLimitError,
        message: (ctx) => `Bedrock rate limit (throttled): ${ctx.message}`,
      },
      {
        match: (ctx) => /ValidationException/i.test(ctx.message),
        errorClass: ProviderError,
        message: (ctx) => `Validation error: ${ctx.message}`,
      },
      {
        match: () => true,
        errorClass: ProviderError,
        message: (ctx) => `AWS Bedrock error: ${ctx.message}`,
      },
    ];
    return classifyProviderError(error, rules, this.providerName, this.modelName);
  }
  ```

  Note the rate-limit rule's constructed error always uses `this.providerName` as the provider argument to `classifyProviderError` (same as before), even though the original code hardcoded the literal string `"bedrock"` in that one branch — verify `this.providerName` resolves to `"bedrock"` (`grep -n "getProviderName" src/lib/providers/amazonBedrock/client.ts`) before relying on this; if it resolves to something else, keep the literal `"bedrock"` string passed to `classifyProviderError` for that branch specifically to avoid a silent behavior change.

- [ ] **Step 4: Run and verify all assertions pass:**

  ```bash
  pnpm run test:error-classifier-native
  ```

- [ ] **Step 5: Typecheck, lint, commit.**

  ```bash
  pnpm run check && pnpm run lint
  git add src/lib/providers/anthropic/client.ts src/lib/providers/googleVertex/client.ts src/lib/providers/amazonBedrock/client.ts test/continuous-test-suite-error-classifier-native.ts package.json
  git commit -m "refactor(providers): migrate anthropic/vertex/bedrock to classifyProviderError with custom rule tables"
  ```

---

### Task 5: Deduplicate `TimeoutError` naming collision in `server/errors.ts`

**Files:**

- Edit: `src/lib/server/errors.ts`

**Interfaces:**

- Renames a locally-scoped class; no public contract change (zero external importers, confirmed by grep in this plan's verification).

- [ ] **Step 1: Write the failing test.** Add a regression assertion to `test/continuous-test-suite-error-classifier.ts` (Task 1's file), appended as a new final section:

  ```typescript
  section("No cross-module TimeoutError naming collision");

  await test("server/errors.ts's timeout class is named ServerTimeoutError, not TimeoutError", async () => {
    const serverErrorsModule = await import("../src/lib/server/errors.js");
    assert(
      "ServerTimeoutError" in serverErrorsModule,
      "server/errors.ts should export ServerTimeoutError after the rename",
    );
    assert(
      !("TimeoutError" in serverErrorsModule),
      "server/errors.ts still exports a TimeoutError that shadows utils/timeout.ts's canonical TimeoutError",
    );
  });
  ```

- [ ] **Step 2: Run and verify the test fails:**

  ```bash
  pnpm run test:error-classifier
  ```

  Expected: fails — `server/errors.ts` currently exports `TimeoutError`, not `ServerTimeoutError`.

- [ ] **Step 3: Implement.** In `src/lib/server/errors.ts`, rename the class at line 274 from `TimeoutError` to `ServerTimeoutError` (it already extends `ServerAdapterError`, which is unaffected):

  ```typescript
  // before
  export class TimeoutError extends ServerAdapterError {
    /* ... */
  }

  // after
  export class ServerTimeoutError extends ServerAdapterError {
    /* ... */
  }
  ```

  Confirm zero call sites reference the old name before/after:

  ```bash
  grep -rn "server/errors" src/ --include="*.ts" | grep -i "TimeoutError"
  ```

  Expected: no hits (this plan verified zero external importers via grep during research; this command re-verifies against the current tree before the rename is finalized). If any hit appears, update that import to `ServerTimeoutError` as part of this step.

- [ ] **Step 4: Run and verify the test passes:**

  ```bash
  pnpm run test:error-classifier
  ```

- [ ] **Step 5: Typecheck, lint, commit.**

  ```bash
  pnpm run check && pnpm run lint
  git add src/lib/server/errors.ts test/continuous-test-suite-error-classifier.ts
  git commit -m "refactor(server): rename server/errors.ts TimeoutError to ServerTimeoutError to remove naming collision with utils/timeout.ts"
  ```

---

### Task 6: Remove dead-code `NetworkError` and `TemporaryError` duplicates from `retryHandler.ts`

**Files:**

- Edit: `src/lib/utils/retryHandler.ts`

**Interfaces:**

- Removes two unexported-in-practice classes with zero external importers (confirmed by grep during this plan's research: `NetworkError` at `retryHandler.ts:43` and `TemporaryError` have no importers anywhere in `src/` outside their own definition file).

- [ ] **Step 1: Confirm dead code before deleting (safety check, not a new test).**

  ```bash
  grep -rn "from.*retryHandler" src/ --include="*.ts" | grep -v "retryHandler.ts:"
  grep -rn "NetworkError\|TemporaryError" src/lib/utils/retryHandler.ts
  grep -rln "NetworkError" src/ --include="*.ts" | xargs grep -l "from.*retryHandler"
  ```

  Expected: the third command returns nothing — no file imports `NetworkError` specifically from `retryHandler.ts` (the canonical `NetworkError` used everywhere, including by this plan's Tasks 2-4, is `src/lib/types/errors.ts`'s). `TemporaryError` has zero importers anywhere in `src/`.

- [ ] **Step 2: N/A — this is a pure-deletion task with no new behavior to characterize; Step 1's grep IS the verification.**

- [ ] **Step 3: Implement.** Delete the `NetworkError` class definition (retryHandler.ts:43, extends plain `Error`) and the `TemporaryError` class definition from `src/lib/utils/retryHandler.ts`. Remove any now-unused imports those classes required. Leave `DEFAULT_RETRY_CONFIG`, `withRetry`, `calculateBackoffDelay`, and every other export untouched — this task only removes the two dead classes, not the retry logic itself (that's Task 7).

- [ ] **Step 4: Run and verify nothing broke.**

  ```bash
  pnpm run check
  npx tsx test/continuous-test-suite-error-classifier-openai-compat.ts
  ```

  Expected: typecheck clean (proves nothing imported the deleted classes — if it didn't compile, Step 1's grep missed an importer and the classes are not actually dead; stop and restore them). The provider suite passing confirms `imageProcessor.ts`'s real `withRetry` call site (the file's sole meaningful external dependency) is unaffected.

- [ ] **Step 5: Typecheck, lint, commit.**

  ```bash
  pnpm run check && pnpm run lint
  git add src/lib/utils/retryHandler.ts
  git commit -m "chore(utils): remove dead NetworkError and TemporaryError duplicates from retryHandler.ts"
  ```

---

### Task 7: Retry-helper consolidation — migrate `fileDetector.ts`'s local `withRetry` onto the canonical exponential implementation

**Files:**

- Edit: `src/lib/utils/fileDetector.ts`
- Edit: `test/continuous-test-suite-context.ts` (file-handling suite — nearest existing home per CLAUDE.md's "Adding a New File Processor" guidance; add regression coverage for `loadFromURL`'s retry behavior if not already covered, otherwise skip to Step 3)

**Interfaces:**

- Consumes: `withRetry` from `src/lib/core/infrastructure/retry.ts` (existing, exponential + capped, signature `withRetry<T>(operation: () => Promise<T>, options: InfraRetryOptions): Promise<T>` where `InfraRetryOptions = { maxRetries, baseDelayMs, maxDelayMs?, shouldRetry? }`).
- Removes: `fileDetector.ts`'s private, unexported `withRetry` (the one with `{maxRetries?, retryDelay?}` options, exponential but uncapped) and its `DEFAULT_MAX_RETRIES`/`DEFAULT_RETRY_DELAY` constants, replaced by a call into the canonical helper.

**This task's scope, decided and recorded (do not re-litigate without re-reading the four call sites below):**

- **Migrate:** `fileDetector.ts`'s local `withRetry` (line ~269-300, single call site at `loadFromURL()` line ~2125). It is module-private, has no public contract, and is already structurally identical to `core/infrastructure/retry.ts`'s implementation (exponential backoff, `2 ** attempt`) minus the delay cap — a safe, low-risk merge.
- **Keep separate, do not migrate:** `src/lib/utils/errorHandling.ts`'s `withRetry` — this is re-exported from the **public SDK API** (`src/lib/index.ts:48`) with a documented **fixed-delay** contract (same `delayMs` between every attempt, no exponential growth). Changing it to exponential backoff would silently change behavior for any external caller relying on the fixed-interval guarantee — a backward-compatibility break per this plan's Global Constraints.
- **Keep separate, do not migrate:** `src/lib/utils/retryHandler.ts`'s `withRetry` — its sole real caller, `imageProcessor.ts`'s image-download path, depends on options (`backoffMultiplier`, a URL-redacting `onRetry` callback that strips signed URLs from log lines before they're printed) that `core/infrastructure/retry.ts` does not have. Forcing this migration would either lose the URL-redaction safety behavior or require growing `core/infrastructure/retry.ts`'s option surface to match — out of scope for this plan; flagged as a candidate for a future, narrowly-scoped follow-up if `core/infrastructure/retry.ts` ever needs an `onRetry` hook for other reasons.
- **Keep separate, do not migrate:** `src/lib/telemetry/exporters/baseExporter.ts`'s protected class-method `withRetry`, used by 8 observability exporters. Different domain entirely (health-check pings, not provider API calls or file downloads) — no reason to couple it to the file/provider retry story this plan is about.

- [ ] **Step 1: Write the failing test.** Check whether `test/continuous-test-suite-context.ts` already exercises `loadFromURL`'s retry path:

  ```bash
  grep -n "loadFromURL\|withRetry" test/continuous-test-suite-context.ts
  ```

  If no coverage exists, add one test to `test/continuous-test-suite-context.ts` verifying `loadFromURL` still retries a transient failure and eventually succeeds (using a local HTTP server or a mock fetch that fails N times then succeeds — follow the existing suite's fixture/mocking convention, checked via `grep -n "createServer\|nock\|mockFetch" test/continuous-test-suite-context.ts` before writing new scaffolding). If coverage already exists, this step is satisfied by the existing test and Step 1-2 become "re-run the existing suite to record the pre-migration baseline" instead of writing new code.

- [ ] **Step 2: Run and record the baseline** (existing tests must pass before the refactor, so this is a pre-migration checkpoint, not a fail-first TDD step, since retry BEHAVIOR is not changing — only which function implements it):

  ```bash
  pnpm run test:context
  ```

  Expected: passes (baseline).

- [ ] **Step 3: Implement.** In `src/lib/utils/fileDetector.ts`: delete the local `withRetry` function and its `DEFAULT_MAX_RETRIES`/`DEFAULT_RETRY_DELAY` constants (approx. lines 74-75, 269-300). Add the import:

  ```typescript
  import { withRetry } from "../core/infrastructure/retry.js";
  ```

  Update the single call site (`loadFromURL()`, ~line 2125) to the canonical signature — map the old `{maxRetries, retryDelay}` call shape onto `{maxRetries, baseDelayMs, shouldRetry}`:

  ```typescript
  // before (conceptually)
  return await withRetry(() => performFetch(url), {
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
  });

  // after
  return await withRetry(() => performFetch(url), {
    maxRetries: options.maxRetries ?? 3,
    baseDelayMs: 1000,
    shouldRetry: isRetryableNetworkError,
  });
  ```

  Keep `isRetryableNetworkError` (the existing module-private predicate) unchanged — it now plugs into `core/infrastructure/retry.ts`'s `shouldRetry` option instead of being called ad hoc inside the deleted local loop. Verify the exact current call-site shape with `sed -n '2100,2135p' src/lib/utils/fileDetector.ts` before editing, since the options object's exact field names must be mapped precisely, not guessed.

- [ ] **Step 4: Run and verify no regression:**

  ```bash
  pnpm run test:context
  ```

  Expected: same pass count as Step 2's baseline.

- [ ] **Step 5: Typecheck, lint, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:context
  git add src/lib/utils/fileDetector.ts test/continuous-test-suite-context.ts
  git commit -m "refactor(utils): migrate fileDetector's local withRetry onto core/infrastructure/retry.ts"
  ```

---

### Task 8: Streaming retry parity — OpenAI-compatible `streamOneStep` gains 429/5xx backoff

**Files:**

- Edit: `src/lib/providers/openaiChatCompletionsBase.ts`
- Create: `test/continuous-test-suite-openai-compat-streaming-retry.ts`
- Edit: `package.json`

**Interfaces:**

- Consumes: `withProviderRetry` (existing, `src/lib/utils/providerRetry.ts`), `trace.getActiveSpan()` (from `@opentelemetry/api`, existing idiom in this codebase — used to obtain an optional `Span` for `withProviderRetry` without threading a new parameter through `streamOneStep`'s call chain).
- The non-streaming path (`buildDelegatingModel`'s `doGenerate`) already gets 429/5xx retry via a different mechanism upstream; this task closes the gap where `streamOneStep` (the streaming path's one-HTTP-POST-per-step function, `openaiChatCompletionsBase.ts:1234-1329`) has ONLY a one-shot 400-context-overflow retry and no 429/5xx backoff at all.

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-openai-compat-streaming-retry.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — OpenAI-compat streamOneStep 429/5xx retry parity
   * (Plan 07, Task 8).
   *
   * Before this change, only the non-streaming path retried 429/5xx with
   * backoff; streamOneStep's only self-healing behavior was a one-shot
   * 400-context-overflow retry. This suite drives streamOneStep against a
   * local HTTP server that fails N times with 429 then succeeds, asserting
   * the stream eventually completes instead of surfacing the 429 to the
   * caller on the first attempt.
   *
   * No external API keys — points the provider at a local test server via
   * OPENAI_COMPATIBLE_BASE_URL.
   *
   * Run: npx tsx test/continuous-test-suite-openai-compat-streaming-retry.ts
   *      pnpm run test:openai-compat-streaming-retry
   */

  import { createServer } from "node:http";
  import { OpenAICompatibleProvider } from "../src/lib/providers/openaiCompatible/client.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite(
    "OpenAI-compat streaming retry parity",
  );

  function sseChunk(text: string): string {
    return `data: ${JSON.stringify({
      choices: [{ delta: { content: text }, finish_reason: null }],
    })}\n\n`;
  }

  void runSuite(async () => {
    section("streamOneStep retries 429 with backoff before succeeding");

    await test("a 429 followed by a successful SSE stream still yields content", async () => {
      let attempt = 0;
      const server = createServer((req, res) => {
        attempt++;
        if (attempt < 3) {
          res.writeHead(429, {
            "content-type": "application/json",
            "retry-after": "0",
          });
          res.end(JSON.stringify({ error: { message: "rate limited" } }));
          return;
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(sseChunk("hello"));
        res.write("data: [DONE]\n\n");
        res.end();
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";
      const provider = new OpenAICompatibleProvider();

      try {
        const result = await provider.stream({
          input: { text: "hi" },
          maxSteps: 1,
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += chunk.content ?? "";
        }
        assert(attempt >= 3, "streamOneStep did not retry through the 429s");
        assert(
          text.includes("hello"),
          "final successful chunk was not surfaced after retry",
        );
      } finally {
        server.close();
      }
    });

    section(
      "streamOneStep still applies the one-shot 400 context-overflow fallback",
    );

    await test("a 400 context-overflow response is NOT retried via withProviderRetry (single fallback attempt only)", async () => {
      let attempt = 0;
      const server = createServer((req, res) => {
        attempt++;
        if (attempt === 1) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: "This model's maximum context length is 4096 tokens",
              },
            }),
          );
          return;
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(sseChunk("ok"));
        res.write("data: [DONE]\n\n");
        res.end();
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";
      const provider = new OpenAICompatibleProvider();

      try {
        const result = await provider.stream({
          input: { text: "hi" },
          maxSteps: 1,
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += chunk.content ?? "";
        }
        assert(
          attempt === 2,
          "expected exactly one 400-correction retry, got a different attempt count",
        );
        assert(
          text.includes("ok"),
          "post-400-correction success was not surfaced",
        );
      } finally {
        server.close();
      }
    });
  });
  ```

- [ ] **Step 2: Run and verify the test fails:**

  ```bash
  npx tsx test/continuous-test-suite-openai-compat-streaming-retry.ts
  ```

  Expected: the first test fails — the current `streamOneStep` surfaces the first 429 immediately instead of retrying (server sees `attempt === 1` when the stream throws, not `>= 3`). The second test passes already (400-correction already works) — this is expected and confirms the existing behavior this task must NOT break.

- [ ] **Step 3: Implement.** In `src/lib/providers/openaiChatCompletionsBase.ts`, restructure `streamOneStep` (current body at lines 1234-1329) to wrap the initial fetch + ok-check in a closure passed to `withProviderRetry`, leaving the existing 400-context-overflow fallback logic reading `apiErr.statusCode` (from `buildAPIError`'s already-compatible error shape) instead of the raw `Response.status`:

  ```typescript
  import { withProviderRetry } from "../utils/providerRetry.js";
  import { trace } from "@opentelemetry/api";

  // inside streamOneStep, replacing the current single fetch:
  const doFetch = async (): Promise<Response> => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: bodyJson,
      signal,
    });
    if (!res.ok) {
      throw await buildAPIError(url, requestBody, res);
    }
    return res;
  };

  let res: Response;
  try {
    res = await withProviderRetry(doFetch, {
      span: trace.getActiveSpan() ?? undefined,
      provider: this.providerName,
      operation: "stream",
    });
  } catch (err) {
    const apiErr = err as Error & { statusCode?: number };
    if (apiErr.statusCode === 400) {
      // existing one-shot context-overflow correction fallback, unchanged
      // apart from reading apiErr.statusCode instead of a raw res.status
      // (the raw Response is no longer available after withProviderRetry's
      // final throw — buildAPIError's .statusCode carries the same value).
      const corrected =
        await correctBodyAfterContextOverflow(/* ...existing args, using apiErr in place of the old res-derived error... */);
      if (corrected) {
        res = corrected;
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }
  ```

  Verify `withProviderRetry`'s exact options shape (`{ span?, provider?, operation? }` or similar) against `src/lib/utils/providerRetry.ts`'s current signature before finalizing — this plan characterized its retry-loop/backoff/span-annotation behavior but the exact option field names must be read from the file at implementation time (`grep -n "export async function withProviderRetry" -A 15 src/lib/utils/providerRetry.ts`) rather than assumed, since a mismatched field name is a silent no-op (extra unknown properties on an options object don't error in a plain call, only under `exactOptionalPropertyTypes` — confirm the tsconfig setting or rely on `pnpm run check` in Step 4 to catch a shape mismatch via the call-site type, not runtime behavior).

  Preserve the existing `correctBodyAfterContextOverflow` call's arguments and behavior exactly — only the trigger condition (`apiErr.statusCode === 400` instead of a raw `res.status === 400` check performed before any throw) changes, because the raw `Response` object is consumed inside `doFetch`'s closure and is no longer directly available in the outer scope after `withProviderRetry` either returns it (success) or throws the classified error (failure).

- [ ] **Step 4: Run and verify both tests pass:**

  ```bash
  pnpm run test:openai-compat-streaming-retry
  ```

  Expected: both tests pass — 429s now retry (attempt count `>= 3`), and the 400-correction fallback still fires exactly once (attempt count `=== 2`), unchanged.

- [ ] **Step 5: Typecheck, lint, run the broader OpenAI-compat regression suites, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:openai-compat-streaming-retry
  npx tsx test/continuous-test-suite-openai-compat-guard.ts
  git add src/lib/providers/openaiChatCompletionsBase.ts test/continuous-test-suite-openai-compat-streaming-retry.ts package.json
  git commit -m "fix(providers): give OpenAI-compat streamOneStep the same 429/5xx retry backoff the non-streaming path already has"
  ```

---

### Task 9: Streaming retry parity — Anthropic native loop gains 429/5xx backoff

**Files:**

- Edit: `src/lib/providers/anthropic/client.ts`
- Create: `test/continuous-test-suite-anthropic-streaming-retry.ts`
- Edit: `package.json`

**Interfaces:**

- Consumes: `withProviderRetry` (Task 8's import, same primitive). No error-shape adaptation needed — `withProviderRetry`'s existing duck-typing (`duckTypedStatusCode`'s `.status` fallback, `extractRetryAfterMsFromError`'s `.headers` fallback) already matches native `@anthropic-ai/sdk` `APIError` shape with zero adaptation, per this plan's research into `providerRetry.ts`.
- The un-retried call is `client.messages.create(params, { signal: abortSignal ?? undefined })` at `anthropic/client.ts:2138`, inside the `for (let step = 0; step < maxSteps; step++)` agentic loop (`executeStreamInCaptureScope`, loop starting line 1999).

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-anthropic-streaming-retry.ts`. Anthropic's native SDK doesn't accept a raw base-URL swap as trivially as the OpenAI-compat family in all SDK versions — check whether `@anthropic-ai/sdk`'s client accepts `baseURL` in this provider's constructor (`grep -n "baseURL\|baseUrl" src/lib/providers/anthropic/client.ts`) before writing the local-server test; if it does (expected — most SDKs built on the OpenAI-client pattern expose this), the test mirrors Task 8's shape:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — Anthropic native-loop 429/5xx retry parity
   * (Plan 07, Task 9).
   *
   * Before this change, the un-retried `client.messages.create()` call
   * inside the native agentic loop had no 429/5xx backoff at all — a
   * transient rate limit or server error failed the whole turn immediately.
   * This suite points the Anthropic SDK client at a local HTTP server via
   * baseURL override, returns 429 for the first N attempts, then a real
   * SSE-shaped Messages API stream, and asserts the call eventually
   * succeeds instead of throwing on the first 429.
   *
   * No external API keys.
   *
   * Run: npx tsx test/continuous-test-suite-anthropic-streaming-retry.ts
   *      pnpm run test:anthropic-streaming-retry
   */

  import { createServer } from "node:http";
  import { AnthropicProvider } from "../src/lib/providers/anthropic/client.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite(
    "Anthropic streaming retry parity",
  );

  void runSuite(async () => {
    section(
      "client.messages.create retries 429 with backoff before succeeding",
    );

    await test("a 429 followed by a successful Messages stream still yields content", async () => {
      let attempt = 0;
      const server = createServer((req, res) => {
        attempt++;
        if (attempt < 3) {
          res.writeHead(429, {
            "content-type": "application/json",
            "retry-after": "0",
          });
          res.end(
            JSON.stringify({
              error: { type: "rate_limit_error", message: "rate limited" },
            }),
          );
          return;
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: "msg_1",
              usage: { input_tokens: 5, output_tokens: 0 },
            },
          })}\n\n`,
        );
        res.write(
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "hello" },
          })}\n\n`,
        );
        res.write(
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
        );
        res.end();
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
      const provider = new AnthropicProvider();

      try {
        const result = await provider.stream({
          input: { text: "hi" },
          maxSteps: 1,
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += chunk.content ?? "";
        }
        assert(attempt >= 3, "the native loop did not retry through the 429s");
        assert(
          text.includes("hello"),
          "final successful chunk was not surfaced after retry",
        );
      } finally {
        server.close();
        delete process.env.ANTHROPIC_BASE_URL;
      }
    });
  });
  ```

  If the provider constructor does not expose a `baseURL`/env-var override, adapt Step 1 to a lower-level unit test instead: extract the exact retry-wrapped call into a small helper importable in isolation (see Step 3), and test that helper directly against a fake `messages.create` function that fails then succeeds, rather than driving the whole `stream()` path through HTTP. Prefer the HTTP-server version if the override exists — it proves the wiring, not just the primitive.

- [ ] **Step 2: Run and verify the test fails:**

  ```bash
  npx tsx test/continuous-test-suite-anthropic-streaming-retry.ts
  ```

  Expected: fails — current code throws on the first 429 (`attempt === 1` when the error propagates).

- [ ] **Step 3: Implement.** In `src/lib/providers/anthropic/client.ts`, wrap the call at line 2138 (inside `executeStreamInCaptureScope`'s `for` loop):

  ```typescript
  import { withProviderRetry } from "../../utils/providerRetry.js";
  import { trace } from "@opentelemetry/api";

  // before:
  // const events = await client.messages.create(params, { signal: abortSignal ?? undefined });

  // after:
  const events = await withProviderRetry(
    () => client.messages.create(params, { signal: abortSignal ?? undefined }),
    {
      span: trace.getActiveSpan() ?? undefined,
      provider: this.providerName,
      operation: "stream",
    },
  );
  ```

  This is a minimal, surgical change — everything downstream (`for await (const event of events)`, `pushChunk`, cache/token accounting) is untouched, since `withProviderRetry` only wraps the call that produces `events`, not the consumption loop. Confirm `withProviderRetry`'s options shape against the current file (same caveat as Task 8's Step 3 — read `providerRetry.ts` at implementation time, don't assume the field names). Since `isRetryableProviderError` only retries BEFORE any content has been yielded (a fresh `client.messages.create()` call that hasn't started streaming yet), this naturally respects the "don't retry mid-stream after content has already been emitted" boundary without extra logic — a failure that happens after `pushChunk` has already run for this step is a different code path (the `for await` loop's own error handling, untouched by this task).

- [ ] **Step 4: Run and verify the test passes:**

  ```bash
  pnpm run test:anthropic-streaming-retry
  ```

- [ ] **Step 5: Typecheck, lint, run the broader Anthropic regression suite, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:anthropic-streaming-retry
  npx tsx test/continuous-test-suite-anthropic-guard.ts
  git add src/lib/providers/anthropic/client.ts test/continuous-test-suite-anthropic-streaming-retry.ts package.json
  git commit -m "fix(providers): give Anthropic native loop the same 429/5xx retry backoff the OpenAI-compat family has"
  ```

---

### Task 10: Consolidate the tools-vs-structured-output policy in Google AI Studio's `generate()`/`stream()` orchestrators

**Files:**

- Edit: `src/lib/providers/googleAiStudio/client.ts`
- Create: `test/continuous-test-suite-gemini-tools-schema-policy.ts` (distinct from the existing `test:gemini-guard` suite, which the area report did not identify as covering this specific inconsistency — verify via `grep -n "wantsStructuredOutput\|isToolsSchemaExclusionInForce" test/continuous-test-suite-gemini-guard.ts` before creating a new file; if it already covers this, extend it instead)
- Edit: `package.json`

**Interfaces:**

- Consumes: `isGeminiProvider`, `isToolsSchemaExclusionInForce` (existing, `src/lib/core/modules/structuredOutputPolicy.ts`) — confirmed via grep that `googleAiStudio/client.ts` currently has zero references to either function, independently re-implementing the same decision twice, inconsistently.
- Fixes a real bug as a side effect of deduplication: `stream()`'s orchestrator (lines ~776-784) proactively computes `wantsStructuredOutput` and folds it into `shouldUseTools` BEFORE building the request; `generate()`'s orchestrator (line 1382, `const shouldUseTools = !options.disableTools`) does NOT check structured-output intent at all when deciding `shouldUseTools` — it relies entirely on `buildNativeConfig`'s downstream `if (!toolsConfig)` gate (`googleNativeGemini3/utils.ts:663-727`) to silently drop the JSON schema whenever tools happen to be present. A caller requesting BOTH a schema AND tools via `generate()` today gets tools honored and the schema silently dropped, with no warning log (the `stream()` path at least logs a warning at line 801-803 before disabling tools); `generate()` has no equivalent log and, worse, keeps tools active while dropping structured output instead of the reverse.

- [ ] **Step 1: Write the failing test.** Create `test/continuous-test-suite-gemini-tools-schema-policy.ts`:

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — Gemini tools-vs-schema exclusion policy
   * consistency between generate() and stream() (Plan 07, Task 10).
   *
   * Google AI Studio's generate() and stream() orchestrators independently
   * decided whether tools or structured output wins when both are
   * requested — and disagreed. stream() proactively disabled tools;
   * generate() silently dropped the schema while keeping tools active, with
   * no warning. This suite pins the FIXED behavior: generate() must warn
   * and disable tools, exactly like stream() does, once both route through
   * the shared isToolsSchemaExclusionInForce predicate.
   *
   * No API keys — inspects the decision function directly plus a captured
   * warn-log call, not a live model call.
   *
   * Run: npx tsx test/continuous-test-suite-gemini-tools-schema-policy.ts
   *      pnpm run test:gemini-tools-schema-policy
   */

  import { isToolsSchemaExclusionInForce } from "../src/lib/core/modules/structuredOutputPolicy.js";
  import { defineSuite, assert } from "./helpers/harness.js";

  const { test, runSuite, section } = defineSuite(
    "Gemini tools-vs-schema policy consistency",
  );

  void runSuite(async () => {
    section(
      "shared predicate — sanity (already covered by structuredOutputPolicy's own suite; pinned here for the consuming call sites)",
    );

    await test("google-ai + tools + schema -> exclusion in force", () => {
      assert(
        isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 2),
        "expected the shared predicate to report exclusion in force",
      );
    });

    await test("google-ai + tools + zero tool count -> exclusion NOT in force", () => {
      assert(
        !isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 0),
        "zero active tools should never trigger the exclusion",
      );
    });

    section("googleAiStudio/client.ts source-level consistency (static check)");

    await test("generate()'s orchestrator now calls isToolsSchemaExclusionInForce (no longer silently drops the schema)", async () => {
      const fs = await import("node:fs/promises");
      const source = await fs.readFile(
        new URL(
          "../src/lib/providers/googleAiStudio/client.ts",
          import.meta.url,
        ),
        "utf-8",
      );
      const generateSectionStart = source.indexOf(
        "const shouldUseTools = !options.disableTools;",
      );
      assert(
        generateSectionStart !== -1,
        "could not locate generate()'s shouldUseTools computation to inspect",
      );
      const nearbyWindow = source.slice(
        generateSectionStart,
        generateSectionStart + 600,
      );
      assert(
        nearbyWindow.includes("isToolsSchemaExclusionInForce"),
        "generate()'s shouldUseTools computation does not reference the shared exclusion predicate",
      );
    });

    await test("stream()'s orchestrator also routes through the shared predicate (not just its own hand-rolled check)", async () => {
      const fs = await import("node:fs/promises");
      const source = await fs.readFile(
        new URL(
          "../src/lib/providers/googleAiStudio/client.ts",
          import.meta.url,
        ),
        "utf-8",
      );
      const streamSectionStart = source.indexOf(
        "const wantsStructuredOutput =",
      );
      assert(
        streamSectionStart !== -1,
        "could not locate stream()'s wantsStructuredOutput computation",
      );
      const nearbyWindow = source.slice(
        streamSectionStart,
        streamSectionStart + 900,
      );
      assert(
        nearbyWindow.includes("isToolsSchemaExclusionInForce") ||
          nearbyWindow.includes("isGeminiProvider"),
        "stream()'s orchestrator does not reference the shared structuredOutputPolicy predicates",
      );
    });
  });
  ```

  Note: this test intentionally mixes a behavioral check (the predicate itself, already covered elsewhere — included here as a documentation pin, not new coverage) with a source-grep check for the two call sites, because the actual bug is about WHICH function two different code paths call, not about the predicate's own correctness — a purely black-box call to `generate()`/`stream()` would need a live model or a heavier native-SDK mock than this plan's scope justifies; the source-level check is the pragmatic, honest verification for "did both orchestrators route through the one shared decision."

- [ ] **Step 2: Run and verify the test fails:**

  ```bash
  npx tsx test/continuous-test-suite-gemini-tools-schema-policy.ts
  ```

  Expected: the two source-grep tests fail — neither orchestrator currently references `isToolsSchemaExclusionInForce`/`isGeminiProvider` (confirmed via grep during this plan's research).

- [ ] **Step 3: Implement.** In `src/lib/providers/googleAiStudio/client.ts`, add the import:

  ```typescript
  import {
    isGeminiProvider,
    isToolsSchemaExclusionInForce,
  } from "../../core/modules/structuredOutputPolicy.js";
  ```

  In `executeStream` (~lines 775-805), replace the two independent checks (`wantsStructuredOutput`-gated `shouldUseTools`, then the separate `wantsJsonOutput` re-check that forces `disableTools:true`) with one call to the shared predicate, keeping the existing warn-log:

  ```typescript
  const wantsStructuredOutput = Boolean(
    analysisSchema || options.output?.format === "json" || options.schema,
  );

  const optionTools = options.tools || {};
  const toolCount = Object.keys(optionTools).length;
  const exclusionInForce = isToolsSchemaExclusionInForce(
    this.providerName,
    modelName,
    !options.disableTools && this.supportsTools(),
    toolCount,
  );

  const shouldUseTools =
    !options.disableTools && this.supportsTools() && !wantsStructuredOutput;

  let mergedOptions = { ...options, tools: optionTools };

  if (wantsStructuredOutput && exclusionInForce) {
    logger.warn(
      "[GoogleAIStudio] Gemini does not support tools and JSON schema output simultaneously. Disabling tools for this request.",
    );
    mergedOptions = { ...mergedOptions, disableTools: true, tools: {} };
  }

  const hasActiveTools =
    shouldUseTools &&
    !mergedOptions.disableTools &&
    mergedOptions.tools &&
    Object.keys(mergedOptions.tools).length > 0;
  ```

  In `generate()`'s orchestrator (~lines 1376-1426), add the previously-missing proactive check, mirroring `stream()`'s now-shared logic — schema wins, tools are disabled, and a warning is logged instead of the schema being silently dropped:

  ```typescript
  const wantsNativeJsonRequested = Boolean(
    options.output?.format === "json" || options.schema,
  );
  const requestedToolCount = Object.keys(options.tools || {}).length;
  const exclusionInForce = isToolsSchemaExclusionInForce(
    this.providerName,
    modelName,
    !options.disableTools,
    requestedToolCount,
  );

  let shouldUseTools = !options.disableTools;
  if (wantsNativeJsonRequested && exclusionInForce) {
    logger.warn(
      "[GoogleAIStudio] Gemini does not support tools and JSON schema output simultaneously. Disabling tools for this request (generate()).",
    );
    shouldUseTools = false;
  }

  let toolsConfig: NativeToolsConfig | undefined;
  let executeMap: Map<string, Tool["execute"]> = new DedupExecuteMap();
  let originalNameMap = new Map<string, string>();
  let declarationsResult: NativeToolDeclarationsResult | undefined;

  if (shouldUseTools) {
    const tools = options.tools || {};
    if (Object.keys(tools).length > 0) {
      const result = buildNativeToolDeclarations(tools);
      declarationsResult = result;
      toolsConfig = result.toolsConfig;
      executeMap = result.executeMap;
      originalNameMap = result.originalNameMap;
    }
  }

  const wantsNativeJson = !toolsConfig && wantsNativeJsonRequested;
  ```

  The `isGeminiProvider` import is used implicitly via `isToolsSchemaExclusionInForce` (which calls it internally) — it does not need a separate direct call site in `client.ts` unless a future task needs the narrower Gemini-only check without the Anthropic-native-surface OR; imported here for symmetry/documentation with `stream()`'s existing pattern and because the test's source-grep in Step 1 accepts either name.

  Do NOT touch `googleNativeGemini3/utils.ts`'s `buildNativeConfig()` (the "3rd copy" identified during this plan's research) — it is a wire-serialization detail (deciding what JSON actually gets sent to the API once the orchestrator has already decided tools vs. schema), not a second policy decision. Once both orchestrators correctly compute `toolsConfig`/`wantsJsonOutput` before calling it, `buildNativeConfig`'s own `if (!toolsConfig)` gate becomes correct-by-construction rather than a silent-drop safety net — leave its internals as-is.

- [ ] **Step 4: Run and verify the test passes:**

  ```bash
  pnpm run test:gemini-tools-schema-policy
  ```

- [ ] **Step 5: Typecheck, lint, run the broader Gemini regression suite, commit.**

  ```bash
  pnpm run check && pnpm run lint
  pnpm run test:gemini-tools-schema-policy
  npx tsx test/continuous-test-suite-gemini-guard.ts
  git add src/lib/providers/googleAiStudio/client.ts test/continuous-test-suite-gemini-tools-schema-policy.ts package.json
  git commit -m "fix(providers): make Google AI Studio generate() and stream() agree on tools-vs-schema exclusion via the shared structuredOutputPolicy predicate"
  ```

---

## Verification Checklist

- [ ] `pnpm run check` — 0 errors
- [ ] `pnpm run lint` — 0 errors
- [ ] `pnpm run build` — clean
- [ ] `pnpm run test:error-classifier` — all pass (Task 1 + Task 5's collision regression)
- [ ] `pnpm run test:error-classifier-openai-compat` — all pass (Tasks 2-3, 19 providers)
- [ ] `pnpm run test:error-classifier-native` — all pass (Task 4, anthropic/vertex/bedrock)
- [ ] `pnpm run test:openai-compat-streaming-retry` — all pass (Task 8)
- [ ] `pnpm run test:anthropic-streaming-retry` — all pass (Task 9)
- [ ] `pnpm run test:gemini-tools-schema-policy` — all pass (Task 10)
- [ ] `pnpm run test:context` — unchanged pass count (Task 7's fileDetector migration)
- [ ] `npx tsx test/continuous-test-suite-providers-mocked.ts` — still green (program-level gate; must not have regressed from any provider's formatProviderError rewrite)
- [ ] `npx tsx test/continuous-test-suite-anthropic-guard.ts` — still green (Task 9 didn't disturb the in-turn context guard)
- [ ] `npx tsx test/continuous-test-suite-gemini-guard.ts` — still green (Task 10 didn't disturb Gemini's other loop-guard behavior)
- [ ] `pnpm test` — main continuous suite green
- [ ] `grep -c "protected formatProviderError" src/lib/providers/*.ts src/lib/providers/*/client.ts` — every migrated provider still has exactly one `formatProviderError` override (structural sanity: nobody accidentally duplicated the method during a merge)
- [ ] `grep -rn "class NetworkError\|class TemporaryError" src/lib/utils/retryHandler.ts` — returns nothing (Task 6)
- [ ] `grep -rn "^export class TimeoutError" src/lib/server/errors.ts` — returns nothing; `grep -n "class ServerTimeoutError" src/lib/server/errors.ts` returns one line (Task 5)
- [ ] Deliberately break one assertion in `test/continuous-test-suite-error-classifier.ts` (per Global Constraints' skip-hazard rule), confirm it reports `✗` and exits non-zero, then revert — run once across this plan's work, not once per suite.

## Risks & Rollback

1. **`azureOpenai.ts`'s migration in Task 3 is a deliberate behavior change, not a pure refactor** — 429/404/network/5xx errors that previously always surfaced as a generic `ProviderError` will now surface as `RateLimitError`/`InvalidModelError`/`NetworkError`. Any caller doing `error instanceof ProviderError` (not a subclass check) is unaffected, since every subclass still extends `ProviderError`. A caller doing `!(error instanceof RateLimitError)` to gate some Azure-specific fallback logic could start taking a different branch. Mitigated: this plan found no such caller via grep of `src/` for `instanceof.*RateLimitError` combined with `azure` in the same file; the change is treated as a latent-bug fix, and Task 3's Step 1 explicitly names it as a "behavior-change check" test rather than hiding it inside a plain parity assertion. Rollback: revert Task 3's `azureOpenai.ts` commit alone (it's its own file in a multi-file commit — `git revert` with a partial-path checkout, or cherry-pick the other 10 providers' changes onto a fresh commit) and keep `azureOpenai.ts`'s original single-401-check body.
2. **Task 8/9's streaming-retry wrap could interact badly with `maxSteps`/timeout budgets** — retrying a 429 with backoff inside a streaming loop consumes wall-clock time that used to fail fast; a caller with a tight `AbortSignal` timeout could now time out mid-retry instead of getting an immediate 429 error to handle themselves. `withProviderRetry`'s existing `MAX_PROVIDER_RETRIES = 2` (3 total attempts) and capped backoff (`MAX_RETRY_AFTER_MS = 60_000`, `NO_HINT_FLOOR_MS = 10_000`) bound the worst case to roughly the same envelope the non-streaming path already accepts today, so this is consistency, not a new unbounded risk — but it IS a new latency characteristic for streaming callers who never experienced retry delay before. Mitigated: both tasks' `doFetch`/`client.messages.create` wrapping happens BEFORE any content is yielded to the consumer, so a caller who aborts via `AbortSignal` during the retry window still gets a clean abort (both the OpenAI-compat fetch and the Anthropic SDK call already accept the same signal). Rollback: unwrap the `withProviderRetry` call back to a direct call in either task's file — each is a single, isolated diff hunk (see each task's Step 3), independently revertable without touching the other.
3. **`fileDetector.ts`'s Task 7 migration changes the retry delay from uncapped-exponential to capped-exponential** (`core/infrastructure/retry.ts`'s `maxDelayMs` default of 30000ms). A pathological case with a very high `maxRetries` and a slow-failing URL would previously grow delay unboundedly; now it plateaus at 30s per attempt. This is very likely a strict improvement (nobody wants an unbounded delay), but it IS a behavior change for that edge case. Rollback: pass an explicit high `maxDelayMs` in the Task 7 call site if unbounded growth turns out to be relied upon anywhere (no such reliance was found — `loadFromURL`'s only caller path is file-attachment preprocessing with a bounded overall request timeout upstream).
4. **Task 10's `generate()` fix changes which of "tools" or "schema" wins when a caller requests both** — before, tools silently won and the schema was dropped with no warning; after, schema wins and tools are disabled, WITH a warning (matching `stream()`'s existing, presumably-intentional-since-launch behavior). Any caller who was unknowingly relying on the old silent-tools-win behavior for `generate()` specifically (not `stream()`, which never had this bug) will see a behavior change. Given the inconsistency between `generate()` and `stream()` was almost certainly unintentional (nothing in the code or comments suggests deliberate asymmetry, and `stream()`'s comment "Gemini does not support tools and JSON schema output simultaneously" states a hard vendor limitation, not a per-path policy), this plan treats matching `stream()`'s behavior as the correct fix rather than preserving the accidental asymmetry. Rollback: revert Task 10's `generate()` diff hunk alone; `stream()`'s pre-existing behavior is untouched by this rollback.
5. **The `google-ai`/`vertex` provider-name literals hardcoded throughout Task 4 and Task 10's code samples could drift from `this.providerName`'s actual runtime value** if a future plan (e.g. Plan 04's `ProviderDescriptor`) renames provider keys. Every task in this plan that constructs a `classifyProviderError(..., providerNameLiteral, ...)` call was written to use `this.providerName` (the instance getter) rather than a hardcoded string wherever the original code already did so — the one exception is Bedrock's throttling-branch literal `"bedrock"`, called out explicitly in Task 4's Step 3 with an inline verification instruction. Mitigated by that explicit note; no rollback needed unless `this.providerName` is found to disagree with a hardcoded literal during implementation, in which case Task 4's Step 3 instruction is the fix.

## Out of Scope

- **Implementing `ProviderDescriptor`, `PROVIDER_DESCRIPTORS`, `ProviderFactory.getDescriptor`/`getAllDescriptors`** — Plan 04.
- **Consuming `classifyProviderError`/`DEFAULT_ERROR_RULES` from a config-driven catalog entry (`OpenAICompatCatalogEntry`) instead of a hand-written subclass** — Plan 05. This plan migrates the EXISTING 19 hand-written subclasses' `formatProviderError` bodies in place; it does not collapse the subclasses themselves into catalog rows.
- **The agentic loop engine (`runAgenticLoop`, the merged stream channel, `toNativeToolDeclarations`) that Plan 08 builds on top of this plan's error-classification and retry primitives** — Plan 08. This plan's Tasks 8-9 add retry to the TWO existing hand-rolled streaming loops (OpenAI-compat, Anthropic) as they exist today; it does not touch the other seven native loops (AI Studio ×2, Vertex ×4, Bedrock ×2) the audit identified, since those are Plan 08's consolidation target and adding retry twice (once here, once during Plan 08's rewrite) would be wasted work.
- **Model-metadata/context-window/timeout-table consolidation** — Plan 06. This plan's `TimeoutError` work (Task 5) is a naming-collision fix only; it does not touch `DEFAULT_TIMEOUTS`, `getDefaultTimeout`, or any per-provider timeout value.
- **Retrofitting `classifyProviderError` onto providers outside the 22 covered by Tasks 2-4** (the remaining ~8 of the ~30 total providers the audit counted — TTS/STT/media/embedding-only providers with their own error-handling shape, and any provider not part of the OpenAI-compat family or the three native-SDK providers this plan named). Those providers' error handling was not characterized by this plan's research and is left for a follow-up pass once this plan's pattern is proven in production.
- **The 200-provider onboarding playbook, scaffolding tool, and CI completeness gate** that reference `classifyProviderError`/`ProviderErrorRule`/`DEFAULT_ERROR_RULES` by name as a Tier 2/3 onboarding requirement — Plan 10. This plan only produces the contract; Plan 10 documents how future providers are expected to use it.
- **`baseExporter.ts`'s observability-exporter retry method, `errorHandling.ts`'s public fixed-delay `withRetry`, and `retryHandler.ts`'s richer `withRetry`** (used by `imageProcessor.ts`) — explicitly kept separate per this plan's Task 7 scope decision (see Global Constraints and Task 7's "This task's scope, decided and recorded" note), not because they were out of reach but because migrating them would be a behavior change without a corresponding benefit.
- **`neurolink.ts` decomposition** — the 17.7K-line orchestrator's generate/stream duplication is explicitly out of scope for the whole program at this stage (per the roadmap's "What this program deliberately does not cover"); this plan's retry/error work only touches provider-level files, never `neurolink.ts` itself.
