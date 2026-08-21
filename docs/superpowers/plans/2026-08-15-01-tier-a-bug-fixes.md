# Tier A Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nine independent, verified provider-integration bugs — a silently-dropped credential mapping, a dropped SDK reference, an undercounted public provider list, a setup wizard that throws for 21 of 30 providers, a missing local-runtime health probe, three `.includes()`-based dispatch sites that can false-positive-match model names, three `export default` violations of repo convention, a non-standard credential field naming, and a wasted network call — each landing as its own commit with no dependency on any other Tier-A fix or on any other plan in this program.

**Architecture:** Every task is a targeted, additive fix to one or two existing files plus tests; none introduces a new abstraction or touches the Factory + Registry provider architecture's shape. Eight of the nine tasks (1, 2, 3, 4, 5, 6, 8, 9) add coverage to one shared, growing no-API test file, `test/continuous-test-suite-provider-wiring.ts`, created in Task 1 and appended to by each later task — this mirrors the existing repo convention (e.g. `continuous-test-suite-providers-mocked.ts`) of one file per closely-related concern rather than nine near-empty files. Task 7 is a pure dead-export deletion verified by grep + build, since there is no new behavior to unit-test.

**Tech Stack:** TypeScript (strict, ESM), pnpm, the `tsx`-based test harness (`test/helpers/harness.ts` — NOT vitest, despite `vitest.config.ts` existing), Node's built-in `http` module for an in-process fake local-runtime server in Task 5.

**Spec:**

- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/00-provider-registration-instantiation-chain.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/02-sdk-entry-orchestration-src-lib-neurolink-ts-gener.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/05-local-runtime-aggregator-provider-family-ollama-li.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/07-cli-env-config-surface-for-ai-providers.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`

## Global Constraints

- Package manager: pnpm ONLY. Build: `pnpm run build`. Typecheck: `pnpm run check`. Lint: `pnpm run lint`. Format: `pnpm run format`.
- Tests run via tsx, NOT vitest: `npx tsx test/continuous-test-suite-<name>.ts`. New suites need a `test:<name>` script in `package.json`.
- Test harness skip hazard: `defineSuite`'s `test()` classifies a thrown error as SKIP (not FAIL) when the message matches `isExpectedProviderError()`. Never interpolate raw payloads/actual values into assertion messages — describe the discrepancy (e.g. `"resolved credential key not found for provider ${name}"`, not `"got ${JSON.stringify(actual)}"`). Every suite added below follows this.
- Repo critical rules (ESLint-enforced): dynamic imports only inside `providerRegistry.ts` factory closures; ALL type definitions live in `src/lib/types/`; zero `interface` — always `type X = {...}`, intersection not `extends`; no "Types"/"Type" suffix in filenames under `src/lib/types/`; every exported type name is globally unique (domain-prefixed); the types barrel (`src/lib/types/index.ts`) contains only `export * from "./file.js"` lines; no local `types/` directories outside `src/lib/types/`; no type re-exports from non-type files; code outside `src/lib/types/` imports internal types from the barrel, never a specific file; no double type assertions in `src/` (`x as unknown as T`) — test files are exempt.
- Named exports only. No `export default`. `formatProviderError` must RETURN errors, never throw. Public SDK API must not break existing callers.
- Conventional commits (`fix:`, `test:`, `chore:`); one commit per task; NEVER `git push`.
- All line numbers below were read directly from the current tree on 2026-08-15 on branch `feat/proider-redesign`. If a file has since changed, re-run that task's verification/grep step first — it will show you where the current line numbers actually are before you touch anything.

**Plan-specific notes:**

- This plan has no dependency on any other plan in this series (wave 1, independent) and no other plan depends on it, though the master roadmap's program-level verification gate does reference `test/continuous-test-suite-provider-wiring.ts` by name once this plan lands.
- **Scope correction:** the original task assignment stated the setup wizard was missing handling for "17" providers (Task 4). Re-verification in this plan found the actual count is **21** — 30 canonical `AIProviderName` values (excluding `AUTO`) minus the 9 the wizard's switch already handles (`google-ai, openai, anthropic, azure, bedrock, vertex, huggingface, mistral, openrouter`). Task 4 below is scoped to the corrected count of 21, with the exact list enumerated inline.
- Every provider constructor touched in this plan follows the established 4-argument shape `(modelName?: string, sdk?: unknown, region?: string, credentials?: NeurolinkCredentials["x"])`, matching `llamaCpp.ts`'s existing constructor — Task 2 brings HuggingFace's constructor into line with this shape.

---

### Task 1: Hoist `credentialKeyMap` to a module-level export and fix the `together-ai` credential drop

**Files:**

- Modify: `src/lib/factories/providerFactory.ts:95-109`
- Create: `test/continuous-test-suite-provider-wiring.ts`
- Modify: `package.json:107` (new script), `package.json:166` (add to `test:unit` aggregate)

**Interfaces:**

- Produces: `export const CREDENTIAL_KEY_MAP: Record<string, string>` and `export function resolveCredentialKey(providerName: string): string`, both in `src/lib/factories/providerFactory.ts`.
- Consumes: nothing from an earlier task (this is the first task). Uses `ProviderRegistry.registerAllProviders()` (from `src/lib/index.ts`), `ProviderFactory.hasProvider(providerName: string): boolean` (existing, `src/lib/factories/providerFactory.ts:187-189`), and the `AIProviderName` enum (`src/lib/constants/enums.ts`).

The current code — `createProvider()`'s body, `src/lib/factories/providerFactory.ts:95-109` — has the map declared locally, unexported, and missing a `together-ai` entry:

```ts
// Map registered provider names to NeurolinkCredentials keys.
// Most names match (openai, anthropic, vertex, bedrock, etc.)
// but every kebab-case provider whose canonical credentials key is
// camelCase MUST be mapped here — otherwise per-call credential
// overrides silently get dropped (the factory looks up
// credentials["lm-studio"] which is undefined while the user wrote
// credentials.lmStudio).
const credentialKeyMap: Record<string, string> = {
  "google-ai": "googleAiStudio",
  "openai-compatible": "openaiCompatible",
  huggingface: "huggingFace",
  "lm-studio": "lmStudio",
  "nvidia-nim": "nvidiaNim",
};
const credKey = credentialKeyMap[normalizedName] ?? normalizedName;
```

Because `NeurolinkCredentials`'s key is `together` (`src/lib/types/providers.ts:215`) but the registered/aliased provider name is `together-ai` (`AIProviderName.TOGETHER_AI = "together-ai"`), any caller passing `credentials: { together: { apiKey: "..." } }` to a per-call or instance-level `credentials` option is silently ignored for the `together-ai` provider — it falls through to `process.env.TOGETHER_API_KEY` instead.

- [ ] **Step 1: Write the failing test — create the suite file**

Create `test/continuous-test-suite-provider-wiring.ts`:

```ts
#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Provider Wiring
 *
 * No-API regression coverage for the Tier A provider bug fixes (plan 01):
 * credential-key resolution, HuggingFace sdk forwarding, the public
 * getAvailableProviders()/isValidProvider() surface, the setup wizard's
 * generic fallback, local-runtime health probes, boundary-aware image-model
 * dispatch, Replicate credential naming, and the getBestProvider() health
 * check removal. Each test() block below corresponds to one numbered task
 * in docs/superpowers/plans/2026-08-15-01-tier-a-bug-fixes.md.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-provider-wiring.ts
 *      pnpm run test:provider-wiring
 */
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { NeurolinkCredentials } from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("Provider Wiring");

// A compile-time-verified enumeration of every NeurolinkCredentials key. If a
// key is renamed/removed in NeurolinkCredentials, this literal fails to
// typecheck, so it can't silently drift from the real type.
const KNOWN_CREDENTIAL_KEYS = {
  openai: undefined,
  anthropic: undefined,
  googleAiStudio: undefined,
  vertex: undefined,
  bedrock: undefined,
  sagemaker: undefined,
  azure: undefined,
  mistral: undefined,
  huggingFace: undefined,
  openrouter: undefined,
  litellm: undefined,
  openaiCompatible: undefined,
  ollama: undefined,
  deepseek: undefined,
  nvidiaNim: undefined,
  lmStudio: undefined,
  llamacpp: undefined,
  xai: undefined,
  groq: undefined,
  cohere: undefined,
  together: undefined,
  fireworks: undefined,
  perplexity: undefined,
  cloudflare: undefined,
  replicate: undefined,
  voyage: undefined,
  jina: undefined,
  stability: undefined,
  ideogram: undefined,
  recraft: undefined,
} satisfies Record<keyof NeurolinkCredentials, undefined>;

await test("every registered AIProviderName resolves to a real NeurolinkCredentials key", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  const { ProviderFactory, resolveCredentialKey } =
    await import("../dist/factories/providerFactory.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  const knownKeys = new Set(Object.keys(KNOWN_CREDENTIAL_KEYS));
  const providerNames = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  for (const name of providerNames) {
    assert(
      ProviderFactory.hasProvider(name),
      `provider not registered: ${name}`,
    );
    const credKey = resolveCredentialKey(name);
    assert(
      knownKeys.has(credKey),
      `resolveCredentialKey produced an unknown NeurolinkCredentials key for provider ${name}`,
    );
  }
});

await runSuite();
```

- [ ] **Step 2: Wire the new suite into package.json, then build and run to confirm the failure**

In `package.json`, add a new script immediately after line 107 (`"test:provider-fallback-latency"`):

```json
    "test:provider-wiring": "npx tsx test/continuous-test-suite-provider-wiring.ts",
```

And append `&& pnpm run test:provider-wiring` to the end of the `test:unit` aggregate on line 166.

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: FAIL — the test throws `TypeError: resolveCredentialKey is not a function` (it doesn't exist in `dist/factories/providerFactory.js` yet), reported as `✗` with a non-zero exit code.

- [ ] **Step 3: Hoist the map to a module-level export and add the missing entry**

In `src/lib/factories/providerFactory.ts`, insert the following immediately after the imports (after line 10, before `export class ProviderFactory`):

```ts
/**
 * Maps registered provider names to NeurolinkCredentials keys. Most names
 * match (openai, anthropic, vertex, bedrock, etc.) but every kebab-case
 * provider whose canonical credentials key is camelCase — or otherwise
 * spelled differently — MUST be mapped here, otherwise per-call/instance
 * credential overrides silently get dropped (createProvider() looks up
 * credentials["lm-studio"], which is undefined, while the caller wrote
 * credentials.lmStudio).
 */
export const CREDENTIAL_KEY_MAP: Record<string, string> = {
  "google-ai": "googleAiStudio",
  "openai-compatible": "openaiCompatible",
  huggingface: "huggingFace",
  "lm-studio": "lmStudio",
  "nvidia-nim": "nvidiaNim",
  "together-ai": "together",
};

/**
 * Resolve a registered provider name to its NeurolinkCredentials key.
 * Falls back to the provider name itself when no remapping is needed.
 */
export function resolveCredentialKey(providerName: string): string {
  return (
    CREDENTIAL_KEY_MAP[providerName.toLowerCase()] ?? providerName.toLowerCase()
  );
}
```

Then replace `createProvider()`'s local block (lines 95-109) with a single line:

```ts
const credKey = resolveCredentialKey(normalizedName);
```

- [ ] **Step 4: Build and run to confirm the test passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — `Passed: 1`, `Failed: 0`, `RESULT: PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/factories/providerFactory.ts test/continuous-test-suite-provider-wiring.ts package.json
git commit -m "fix(factories): resolve together-ai credentials and export credential key map"
```

---

### Task 2: Forward the `sdk` instance through the HuggingFace factory closure

**Files:**

- Modify: `src/lib/factories/providerRegistry.ts:235-250`
- Modify: `src/lib/providers/huggingFace/client.ts:40-53`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Consumes: `CREDENTIAL_KEY_MAP`/`resolveCredentialKey` are not needed here, but this task reuses Task 1's suite file and its `ProviderFactory`/`ProviderRegistry` dist-import pattern.
- Produces: `HuggingFaceProvider`'s constructor becomes `(modelName?: string, sdk?: unknown, _region?: string, credentials?: NeurolinkCredentials["huggingFace"])` — the 4-arg shape every other provider in this codebase uses.

The current registration, `src/lib/factories/providerRegistry.ts:235-250`, discards the `sdk` and `region` arguments (prefixed `_` and never used) and only forwards 3 args to the constructor:

```ts
// Register Hugging Face provider (Unified Router implementation)
ProviderFactory.registerProvider(
  AIProviderName.HUGGINGFACE,
  async (
    modelName?: string,
    _providerName?: string,
    _sdk?: NeuroLink,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const hfCreds = credentials as NeurolinkCredentials["huggingFace"];
    const { HuggingFaceProvider } =
      await import("../providers/huggingFace/index.js");
    return new HuggingFaceProvider(modelName, undefined, hfCreds);
  },
  process.env.HUGGINGFACE_MODEL || HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
  ["huggingface", "hf"],
);
```

Since `HuggingFaceProvider` extends `OpenAIChatCompletionsProvider`, whose constructor passes `sdk` straight into `BaseProvider`'s `protected neurolink?: NeuroLink` field, the effect of `new HuggingFaceProvider(modelName, undefined, hfCreds)` is that every HuggingFace provider instance has `this.neurolink === undefined` — silently breaking MCP tool access and any other feature keyed on the live `NeuroLink` instance, for this provider only.

- [ ] **Step 1: Write the failing test**

Append to `test/continuous-test-suite-provider-wiring.ts`, immediately before the final `await runSuite();` line:

```ts
await test("HuggingFace factory forwards the sdk instance through to BaseProvider", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();
  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");

  const fakeSdk = { __fakeNeuroLinkSdk: true };
  const provider = await ProviderFactory.createProvider(
    "huggingface",
    "some-model",
    fakeSdk,
    undefined,
    { huggingFace: { apiKey: "hf_test_key" } },
  );

  const internal = provider as unknown as { neurolink?: unknown };
  assert(
    internal.neurolink === fakeSdk,
    "expected HuggingFaceProvider to forward the sdk instance to BaseProvider",
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: FAIL on the new test — `internal.neurolink === fakeSdk` is false because `internal.neurolink` is `undefined`.

- [ ] **Step 3: Fix the factory closure**

In `src/lib/factories/providerRegistry.ts`, replace the HuggingFace registration block with:

```ts
// Register Hugging Face provider (Unified Router implementation)
ProviderFactory.registerProvider(
  AIProviderName.HUGGINGFACE,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: NeuroLink,
    region?: string,
    credentials?: UnknownRecord,
  ) => {
    const hfCreds = credentials as NeurolinkCredentials["huggingFace"];
    const { HuggingFaceProvider } =
      await import("../providers/huggingFace/index.js");
    return new HuggingFaceProvider(modelName, sdk, region, hfCreds);
  },
  process.env.HUGGINGFACE_MODEL || HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
  ["huggingface", "hf"],
);
```

- [ ] **Step 4: Align HuggingFaceProvider's constructor to the 4-arg shape**

In `src/lib/providers/huggingFace/client.ts`, change the constructor (lines 40-53) from:

```ts
  constructor(
    modelName?: string,
    sdk?: unknown,
    credentials?: NeurolinkCredentials["huggingFace"],
  ) {
```

to:

```ts
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["huggingFace"],
  ) {
```

The rest of the constructor body is unchanged — `super("huggingface" as AIProviderName, modelName, sdk, { baseURL, apiKey });` already receives `sdk` correctly; only the parameter list needed the extra slot.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/factories/providerRegistry.ts src/lib/providers/huggingFace/client.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(providers): forward sdk instance through HuggingFace factory"
```

---

### Task 3: Make `getAvailableProviders()`/`isValidProvider()` reflect all 30 canonical providers

**Files:**

- Modify: `src/lib/utils/providerUtils.ts:535-557`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Consumes: `AIProviderName` enum (`src/lib/constants/enums.ts`), already imported in `providerUtils.ts` at line 12.
- Produces: no signature change — `getAvailableProviders(): string[]` and `isValidProvider(provider: string): boolean` keep their existing synchronous signatures.

**Design decision (why synchronous, enum-backed — not async, registry-backed):** `src/lib/index.ts:175-179` re-exports these two functions directly and un-wrapped:

```ts
export {
  getAvailableProviders,
  getBestProvider,
  isValidProvider,
} from "./utils/providerUtils.js";
```

This makes them part of the public SDK's synchronous function surface today. A live-registry-backed fix (reading `ProviderFactory`'s registration Map) would require first awaiting `ProviderRegistry.registerAllProviders()`, since registration is lazy — which would force these functions to become `Promise`-returning, breaking every existing synchronous caller of the barrel re-export (a genuine violation of "Public SDK API must not break"). The `NeuroLink` class's own `getAvailableProviders()`/`isValidProvider()` methods (`src/lib/neurolink.ts:14296-14318`) are already `async` wrappers around these functions, so they would tolerate the change with zero edits — but the barrel re-export would not.

Instead, this task sources the list from the canonical `AIProviderName` enum, which is synchronously available with no registry population required. This fixes the actual bug (10 hardcoded entries vs. 30 real providers) without changing the return type, and is self-maintaining: any future provider added to the enum is automatically included. The trade-off — the enum answers "is this a known provider name," not "is this provider registered in the current process" — is the more useful semantic for a validity check anyway, and matches what `isValidProvider()`'s name already promises.

The current code, `src/lib/utils/providerUtils.ts:535-557`:

```ts
export function getAvailableProviders(): string[] {
  return [
    "bedrock",
    "vertex",
    "openai",
    "anthropic",
    "azure",
    "google-ai",
    "litellm",
    "huggingface",
    "ollama",
    "mistral",
  ];
}
```

```ts
export function isValidProvider(provider: string): boolean {
  return getAvailableProviders().includes(provider.toLowerCase());
}
```

- [ ] **Step 1: Write the failing test**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`:

```ts
await test("getAvailableProviders returns all 30 canonical providers, not the historical 10", async () => {
  const { getAvailableProviders } = await import("../dist/index.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  const result = getAvailableProviders();
  const expected = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  assert(
    result.length === expected.length,
    `expected getAvailableProviders() to list all ${expected.length} canonical providers, got ${result.length}`,
  );
  for (const previouslyMissing of [
    "together-ai",
    "replicate",
    "cohere",
    "voyage",
    "groq",
  ]) {
    assert(
      result.includes(previouslyMissing),
      `expected getAvailableProviders() to include previously-missing provider ${previouslyMissing}`,
    );
  }
});

await test("isValidProvider recognizes a provider the old hardcoded list missed", async () => {
  const { isValidProvider } = await import("../dist/index.js");
  assert(
    isValidProvider("together-ai") === true,
    "expected isValidProvider to recognize together-ai",
  );
  assert(
    isValidProvider("not-a-real-provider") === false,
    "expected isValidProvider to reject an unknown provider name",
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: FAIL on both new tests — the hardcoded list has 10 entries (not 30) and does not include `"together-ai"`.

- [ ] **Step 3: Source the list from `AIProviderName`**

In `src/lib/utils/providerUtils.ts`, replace lines 535-548 with:

```ts
export function getAvailableProviders(): string[] {
  return Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );
}
```

`isValidProvider()` (lines 555-557) is unchanged — it already delegates to `getAvailableProviders()`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all four tests in the suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/providerUtils.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(utils): source getAvailableProviders from the canonical AIProviderName enum"
```

---

### Task 4: Setup wizard falls back to a generic flow instead of throwing for 21 unhandled providers

**Files:**

- Modify: `src/cli/commands/setup.ts:16-30, 460-503`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Consumes: 18 existing `createXConfig(): ProviderConfigOptions` factory functions from `src/lib/utils/providerConfig.js`; `ProviderConfigOptions` type (`src/lib/types/providers.ts:680-692`); `AIProviderName` enum.
- Produces: `export const EXTRA_PROVIDER_CONFIGS: Record<string, ProviderConfigOptions>` and `export async function delegateToProviderSetup(providerId: string): Promise<void>` (gains `export`) from `src/cli/commands/setup.ts`.

**Scope (corrected from "17" to 21):** `AIProviderName` has 30 members excluding `AUTO`. The wizard's `PROVIDERS` array and `delegateToProviderSetup` switch (`src/cli/commands/setup.ts:28-146, 460-503`) handle exactly 9: `google-ai, openai, anthropic, azure, bedrock, vertex, huggingface, mistral, openrouter`. The remaining 21 all currently hit `delegateToProviderSetup`'s `default: throw new Error(...)` case if a caller reaches them (e.g. via a future CLI path that accepts an arbitrary provider id):

`openai-compatible, ollama, litellm, sagemaker, deepseek, nvidia-nim, lm-studio, llamacpp, xai, groq, cohere, together-ai, fireworks, perplexity, cloudflare, replicate, voyage, jina, stability, ideogram, recraft`

Of these, 18 already have a `createXConfig()` factory in `src/lib/utils/providerConfig.ts`; 3 (`ollama`, `litellm`, `sagemaker`) do not and need inline `ProviderConfigOptions` literals.

The current `delegateToProviderSetup`, `src/cli/commands/setup.ts:460-503`:

```ts
async function delegateToProviderSetup(providerId: string): Promise<void> {
  const setupArgs = {
    nonInteractive: false,
    "non-interactive": false,
    check: false,
    _: [] as (string | number)[],
    $0: "neurolink",
  };

  switch (providerId) {
    case "google-ai":
      await handleGoogleAISetup(setupArgs);
      break;
    case "openai":
      await handleOpenAISetup(setupArgs);
      break;
    case "anthropic":
      await handleAnthropicSetup(setupArgs);
      break;
    case "azure":
      await handleAzureSetup(setupArgs);
      break;
    case "bedrock":
      await handleBedrockSetup(setupArgs);
      break;
    case "vertex":
      await handleGCPSetup(setupArgs);
      break;
    case "huggingface":
      await handleHuggingFaceSetup(setupArgs);
      break;
    case "mistral":
      await handleMistralSetup(setupArgs);
      break;
    case "openrouter":
      await handleOpenRouterSetup();
      break;
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }

  // After successful setup, show completion message
  await showSetupCompletion(providerId);
}
```

`showSetupCompletion(providerId)` (lines 548-569) is already a safe no-op for provider ids not in `PROVIDERS`: `const provider = PROVIDERS.find((p) => p.id === providerId); if (!provider) { return; }`.

- [ ] **Step 1: Write the failing test**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`:

```ts
await test("delegateToProviderSetup falls back to a generic flow for a previously-unhandled provider", async () => {
  const { delegateToProviderSetup } =
    await import("../dist/cli/commands/setup.js");
  // Previously threw "Unknown provider: together-ai". Should now print the
  // generic data-driven setup flow instead of throwing.
  await delegateToProviderSetup("together-ai");
});

await test("delegateToProviderSetup still throws for a genuinely unknown provider id", async () => {
  const { delegateToProviderSetup } =
    await import("../dist/cli/commands/setup.js");
  let threw = false;
  try {
    await delegateToProviderSetup("not-a-real-provider-xyz");
  } catch {
    threw = true;
  }
  assert(
    threw,
    "expected delegateToProviderSetup to still throw for an unrecognized provider id",
  );
});

await test("EXTRA_PROVIDER_CONFIGS covers exactly the 21 providers unhandled by the wizard's switch", async () => {
  const { EXTRA_PROVIDER_CONFIGS } =
    await import("../dist/cli/commands/setup.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");
  const wizardHandled = new Set([
    "google-ai",
    "openai",
    "anthropic",
    "azure",
    "bedrock",
    "vertex",
    "huggingface",
    "mistral",
    "openrouter",
  ]);
  const allProviders = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );
  const expectedExtra = allProviders.filter((name) => !wizardHandled.has(name));

  assert(
    expectedExtra.length === 21,
    `expected 21 providers unhandled by the wizard switch, got ${expectedExtra.length}`,
  );
  for (const providerId of expectedExtra) {
    assert(
      Boolean(EXTRA_PROVIDER_CONFIGS[providerId]),
      `expected EXTRA_PROVIDER_CONFIGS to have an entry for ${providerId}`,
    );
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: FAIL on all three new tests — `delegateToProviderSetup` is not exported yet, and `EXTRA_PROVIDER_CONFIGS` does not exist.

- [ ] **Step 3: Add the `ProviderConfigOptions` type import and the 18 factory imports**

In `src/cli/commands/setup.ts`, replace the existing type import (line 25):

```ts
import type { SetupArgs, SetupProviderInfo } from "../../lib/types/index.js";
```

with:

```ts
import type {
  ProviderConfigOptions,
  SetupArgs,
  SetupProviderInfo,
} from "../../lib/types/index.js";
import {
  createCloudflareConfig,
  createCohereConfig,
  createDeepSeekConfig,
  createFireworksConfig,
  createGroqConfig,
  createIdeogramConfig,
  createJinaConfig,
  createLlamaCppConfig,
  createLmStudioConfig,
  createNvidiaNimConfig,
  createOpenAICompatibleConfig,
  createPerplexityConfig,
  createRecraftConfig,
  createReplicateConfig,
  createStabilityConfig,
  createTogetherAIConfig,
  createVoyageConfig,
  createXaiConfig,
} from "../../lib/utils/providerConfig.js";
```

- [ ] **Step 4: Add `EXTRA_PROVIDER_CONFIGS` and `printGenericProviderSetup`**

Insert immediately after the `PROVIDERS` array closes (after its closing `];`, before `delegateToProviderSetup`):

```ts
/**
 * ProviderConfigOptions for the 21 canonical AIProviderName values the
 * interactive wizard above doesn't have a bespoke handleXSetup() for. 18
 * reuse the existing createXConfig() factories in providerConfig.ts; the
 * remaining 3 (ollama, litellm, sagemaker) don't have a factory and are
 * defined inline using their real env var names.
 */
export const EXTRA_PROVIDER_CONFIGS: Record<string, ProviderConfigOptions> = {
  "openai-compatible": createOpenAICompatibleConfig(),
  deepseek: createDeepSeekConfig(),
  "nvidia-nim": createNvidiaNimConfig(),
  "lm-studio": createLmStudioConfig(),
  llamacpp: createLlamaCppConfig(),
  xai: createXaiConfig(),
  groq: createGroqConfig(),
  cohere: createCohereConfig(),
  replicate: createReplicateConfig(),
  "together-ai": createTogetherAIConfig(),
  fireworks: createFireworksConfig(),
  perplexity: createPerplexityConfig(),
  voyage: createVoyageConfig(),
  jina: createJinaConfig(),
  stability: createStabilityConfig(),
  ideogram: createIdeogramConfig(),
  recraft: createRecraftConfig(),
  cloudflare: createCloudflareConfig(),
  ollama: {
    providerName: "Ollama",
    envVarName: "OLLAMA_BASE_URL",
    setupUrl: "https://ollama.com/download",
    description:
      "Run open-source models locally via Ollama's OpenAI-compatible API.",
    instructions: [
      "Install Ollama from https://ollama.com/download",
      "Pull a model: ollama pull llama3.1",
      "Ollama serves its API at http://localhost:11434 by default — set OLLAMA_BASE_URL only to override.",
      "Optionally set OLLAMA_MODEL to choose the default model.",
    ],
    optional: true,
  },
  litellm: {
    providerName: "LiteLLM",
    envVarName: "LITELLM_API_KEY",
    setupUrl: "https://docs.litellm.ai/docs/simple_proxy",
    description:
      "Route through a LiteLLM proxy server for unified access to 100+ upstream providers.",
    instructions: [
      "Start a LiteLLM proxy server (see https://docs.litellm.ai/docs/simple_proxy).",
      "Set LITELLM_BASE_URL to the proxy's URL (defaults to http://localhost:4000).",
      "Set LITELLM_API_KEY to the proxy's virtual key (defaults to a permissive placeholder for local proxies without auth).",
    ],
    fallbackEnvVars: ["LITELLM_BASE_URL"],
    optional: true,
  },
  sagemaker: {
    providerName: "Amazon SageMaker",
    envVarName: "SAGEMAKER_ENDPOINT_NAME",
    setupUrl:
      "https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints.html",
    description:
      "Invoke a self-hosted model on an Amazon SageMaker real-time inference endpoint.",
    instructions: [
      "Deploy a model to a SageMaker real-time endpoint (see AWS docs above).",
      "Set SAGEMAKER_ENDPOINT_NAME to the deployed endpoint's name.",
      "Set SAGEMAKER_REGION to the AWS region hosting the endpoint.",
      "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or use an AWS credential provider chain) for authentication.",
    ],
    fallbackEnvVars: [
      "SAGEMAKER_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ],
    optional: false,
  },
};

/**
 * Generic, data-driven setup printout for providers without a bespoke
 * interactive handler — reads directly from a ProviderConfigOptions entry.
 */
function printGenericProviderSetup(
  providerId: string,
  config: ProviderConfigOptions,
): void {
  logger.always("");
  logger.always(chalk.blue(`🔧 ${config.providerName} Setup`));
  logger.always("");
  logger.always(config.description);
  logger.always("");
  logger.always(chalk.yellow("Setup steps:"));
  config.instructions.forEach((step, index) => {
    logger.always(`  ${index + 1}. ${step}`);
  });
  logger.always("");
  logger.always(chalk.yellow("Environment variable:"));
  const optionalNote = config.optional
    ? " (optional — has a working local default)"
    : "";
  logger.always(
    chalk.cyan(`  export ${config.envVarName}=your_value_here${optionalNote}`),
  );
  if (config.fallbackEnvVars?.length) {
    logger.always(
      chalk.cyan(`  Also relevant: ${config.fallbackEnvVars.join(", ")}`),
    );
  }
  logger.always("");
  logger.always(chalk.yellow("Test the configuration:"));
  logger.always(
    chalk.cyan(`  neurolink generate "Hello!" --provider ${providerId}`),
  );
  logger.always("");
  logger.always(chalk.gray(`Docs: ${config.setupUrl}`));
}
```

- [ ] **Step 5: Wire the fallback into `delegateToProviderSetup` and export it**

Change the function's signature (line 460) from `async function delegateToProviderSetup` to `export async function delegateToProviderSetup`, and replace the `default:` case (line 497-498):

```ts
    default:
      throw new Error(`Unknown provider: ${providerId}`);
```

with:

```ts
    default: {
      const genericConfig = EXTRA_PROVIDER_CONFIGS[providerId];
      if (!genericConfig) {
        throw new Error(`Unknown provider: ${providerId}`);
      }
      printGenericProviderSetup(providerId, genericConfig);
      break;
    }
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all seven tests in the suite green.

- [ ] **Step 7: Commit**

```bash
git add src/cli/commands/setup.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(cli): setup wizard falls back to a generic flow for 21 unhandled providers"
```

---

### Task 5: Shared local-runtime health probe for Ollama, LM Studio, and llama.cpp

**Files:**

- Modify: `src/lib/providers/openaiChatCompletionsBase.ts:66-67, 411-416`
- Modify: `src/lib/providers/ollama/client.ts:248-275`
- Modify: `src/lib/providers/lmStudio.ts:111-138`
- Modify: `src/lib/providers/llamaCpp.ts:51-55`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Produces: `protected async probeModelsEndpoint(headers?: Record<string, string>): Promise<boolean>` on `OpenAIChatCompletionsProvider` (`src/lib/providers/openaiChatCompletionsBase.ts`).
- Consumes: `createProxyFetch` (`../proxy/proxyFetch.js`), `stripTrailingSlash` (`./openaiChatCompletionsClient.js`), `ModelsResponse` type (`../types/index.js`) — all already imported in `openaiChatCompletionsBase.ts`; `redactUrlCredentials` (`../utils/logSanitize.js`) — newly imported by this task.

Ollama and LM Studio each hand-roll an identical GET-`/models`-with-≥1-model reachability probe; `llamaCpp.ts` has no override at all and silently inherits the base class's `validateConfiguration()` (`src/lib/providers/openaiChatCompletionsBase.ts:411-416`), which only checks that `apiKey` is a non-empty string — always true for llama.cpp, since it defaults to a placeholder key (`LLAMACPP_PLACEHOLDER_KEY = "llamacpp"`, `src/lib/providers/llamaCpp.ts:10`) even when no llama-server process is running.

- [ ] **Step 1: Write the failing tests**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`. First add the `node:http` import to the top of the file, alongside the existing imports:

```ts
import { createServer, type Server } from "node:http";
```

Then add the fake-server helper and six tests:

```ts
async function startFakeModelsServer(
  modelsPayload: unknown,
  status = 200,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    if (req.url?.endsWith("/models")) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(modelsPayload));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

await test("Ollama validateConfiguration returns true when /models has entries", async () => {
  const { OllamaProvider } = await import("../dist/providers/ollama/client.js");
  const fake = await startFakeModelsServer({ data: [{ id: "llama3.1" }] });
  try {
    const provider = new OllamaProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("Ollama validateConfiguration returns false when the server is unreachable", async () => {
  const { OllamaProvider } = await import("../dist/providers/ollama/client.js");
  const provider = new OllamaProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});

await test("LM Studio validateConfiguration returns true when /models has entries", async () => {
  const { LmStudioProvider } = await import("../dist/providers/lmStudio.js");
  const fake = await startFakeModelsServer({ data: [{ id: "local-model" }] });
  try {
    const provider = new LmStudioProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("LM Studio validateConfiguration returns false when the server is unreachable", async () => {
  const { LmStudioProvider } = await import("../dist/providers/lmStudio.js");
  const provider = new LmStudioProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});

await test("llama.cpp validateConfiguration returns true when /models has entries", async () => {
  const { LlamaCppProvider } = await import("../dist/providers/llamaCpp.js");
  const fake = await startFakeModelsServer({ data: [{ id: "loaded-model" }] });
  try {
    const provider = new LlamaCppProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("llama.cpp validateConfiguration returns false when the server is unreachable", async () => {
  const { LlamaCppProvider } = await import("../dist/providers/llamaCpp.js");
  const provider = new LlamaCppProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});
```

- [ ] **Step 2: Run to verify the llama.cpp tests fail**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: the two `Ollama` and two `LM Studio` tests PASS already (their existing hand-rolled probes already do this correctly). The two `llama.cpp` tests FAIL: `validateConfiguration()` inherits the base class's apiKey-presence check, so it returns `true` for BOTH the reachable and unreachable cases — the "returns false when unreachable" assertion fails.

- [ ] **Step 3: Add the shared helper to `OpenAIChatCompletionsProvider`**

In `src/lib/providers/openaiChatCompletionsBase.ts`, add the import immediately after the existing `logger` import (line 66):

```ts
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
```

Then insert the new method immediately after the base `validateConfiguration()` (after line 416, before `getConfiguration()`):

```ts
  /**
   * Shared local-runtime reachability probe: GET `${baseURL}/models` with a
   * short timeout, requiring at least one model entry with a non-empty id.
   * Local providers (Ollama, LM Studio, llama.cpp) call this from their own
   * validateConfiguration() override instead of relying on the base class's
   * "apiKey is a non-empty string" default, which can't detect an
   * unreachable local server.
   */
  protected async probeModelsEndpoint(
    headers: Record<string, string> = {},
  ): Promise<boolean> {
    try {
      const url = `${stripTrailingSlash(this.config.baseURL)}/models`;
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(url, {
        headers: { ...headers, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response
        .json()
        .catch(() => null)) as ModelsResponse | null;
      return Boolean(
        data?.data?.some(
          (m) => typeof m?.id === "string" && m.id.trim().length > 0,
        ),
      );
    } catch (error) {
      logger.debug(`[${this.constructor.name}] probeModelsEndpoint failed`, {
        baseURL: redactUrlCredentials(this.config.baseURL),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
```

- [ ] **Step 4: Slim Ollama's `validateConfiguration()` down to the shared helper**

In `src/lib/providers/ollama/client.ts`, replace the full body of `validateConfiguration()` (lines 248-275) with:

```ts
  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(this.getAuthHeaders());
  }
```

- [ ] **Step 5: Slim LM Studio's `validateConfiguration()` down to the shared helper**

In `src/lib/providers/lmStudio.ts`, replace the full body of `validateConfiguration()` (lines 111-138) with:

```ts
  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(
      this.config.apiKey && this.config.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
        ? { Authorization: `Bearer ${this.config.apiKey}` }
        : {},
    );
  }
```

- [ ] **Step 6: Add the missing override to llama.cpp**

In `src/lib/providers/llamaCpp.ts`, insert a new `validateConfiguration()` override immediately after the constructor closes (after line 51), before `protected getProviderName()`:

```ts
  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(this.getAuthHeaders());
  }
```

- [ ] **Step 7: Run to verify all six tests pass**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all thirteen tests in the suite green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/providers/openaiChatCompletionsBase.ts src/lib/providers/ollama/client.ts src/lib/providers/lmStudio.ts src/lib/providers/llamaCpp.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(providers): add llama.cpp health probe and dedupe local-runtime validateConfiguration"
```

---

### Task 6: Boundary-aware image-model dispatch

**Files:**

- Modify: `src/lib/core/baseProvider.ts:4, 358-360, 1371-1373`
- Modify: `src/lib/providers/replicate.ts:161, 173-175`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Consumes: `isImageGenerationModel(modelName: string | undefined): boolean` (existing, `src/lib/core/constants.ts:66-87`) — boundary-aware, already used nowhere else in the dispatch path.

All three sites currently use plain substring matching via `IMAGE_GENERATION_MODELS.some((m) => this.modelName.includes(m))`, which can false-positive on a model name that merely _contains_ an entry mid-token (e.g. a hypothetical model `"eV_10"` contains the Ideogram entry `"V_1"` as a raw substring — `"eV_10".includes("V_1")` is `true` — but `isImageGenerationModel("eV_10")` correctly returns `false` because the character before the match, `"e"`, is not a boundary character).

`src/lib/core/baseProvider.ts:4` currently imports the raw array:

```ts
import { IMAGE_GENERATION_MODELS } from "../core/constants.js";
```

and both dispatch sites (358-360, 1371-1373) inline the same check:

```ts
const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
  this.modelName.includes(m),
);
```

`IMAGE_GENERATION_MODELS` has no other use in this file (verified: it appears only at the import line and these two call sites), so the import can be swapped rather than added to.

`src/lib/providers/replicate.ts:161, 173-175` dynamically imports the same array inside `generate()`:

```ts
const { IMAGE_GENERATION_MODELS } = await import("../core/constants.js");
```

```ts
const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
  this.modelName.includes(m),
);
```

- [ ] **Step 1: Grep-verify the current state**

Run: `grep -n "IMAGE_GENERATION_MODELS" src/lib/core/baseProvider.ts`

Expected output: 3 matches — the import (line 4) and both dispatch sites (358, 1371).

Run: `grep -n "IMAGE_GENERATION_MODELS" src/lib/providers/replicate.ts`

Expected output: 3 matches — a doc comment (line 79, left untouched), the dynamic import (line 161), and the dispatch site (line 173).

- [ ] **Step 2: Swap `baseProvider.ts`'s import and both dispatch sites**

Change line 4 from:

```ts
import { IMAGE_GENERATION_MODELS } from "../core/constants.js";
```

to:

```ts
import { isImageGenerationModel } from "../core/constants.js";
```

Change both occurrences (358-360 and 1371-1373) of:

```ts
const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
  this.modelName.includes(m),
);
```

to:

```ts
const isImageModel = isImageGenerationModel(this.modelName);
```

- [ ] **Step 3: Swap replicate.ts's dynamic import and dispatch site**

Change line 161 from:

```ts
const { IMAGE_GENERATION_MODELS } = await import("../core/constants.js");
```

to:

```ts
const { isImageGenerationModel } = await import("../core/constants.js");
```

Change lines 173-175 from:

```ts
const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
  this.modelName.includes(m),
);
```

to:

```ts
const isImageModel = isImageGenerationModel(this.modelName);
```

- [ ] **Step 4: Grep-verify the swap took effect**

Run: `grep -n "IMAGE_GENERATION_MODELS" src/lib/core/baseProvider.ts`

Expected output: no matches.

Run: `grep -n "isImageGenerationModel" src/lib/core/baseProvider.ts`

Expected output: 3 matches (the import and both dispatch sites).

Run: `grep -n "IMAGE_GENERATION_MODELS\.some\|await import(\"\.\./core/constants\.js\")" src/lib/providers/replicate.ts`

Expected output: no matches for `IMAGE_GENERATION_MODELS.some`; the dynamic import line still matches but now destructures `isImageGenerationModel`.

- [ ] **Step 5: Add a regression test locking in the boundary behavior the dispatch sites now rely on**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`:

```ts
await test("isImageGenerationModel rejects a substring match that isn't at a boundary", async () => {
  const { isImageGenerationModel } = await import("../dist/core/constants.js");
  // "eV_10" contains the Ideogram entry "V_1" as a raw substring, but "e"
  // immediately before it is not a boundary character — the old
  // `.includes()`-based dispatch (removed from baseProvider.ts and
  // replicate.ts in this task) would have wrongly matched this as an
  // image-generation model.
  assert(
    isImageGenerationModel("eV_10") === false,
    "expected a non-boundary substring match to be rejected",
  );
  assert(
    isImageGenerationModel("gpt-image-1") === true,
    "expected an exact known entry to still match",
  );
  assert(
    isImageGenerationModel("black-forest-labs/flux-schnell") === true,
    "expected a boundary-separated prefix match to still match",
  );
});
```

- [ ] **Step 6: Typecheck, lint, and run the suite**

Run: `pnpm run check && pnpm run lint`

Expected: 0 errors.

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all fourteen tests green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/core/baseProvider.ts src/lib/providers/replicate.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(core): use boundary-aware isImageGenerationModel at all three dispatch sites"
```

---

### Task 7: Remove `export default` violations in jina.ts, voyage.ts, replicate.ts

**Files:**

- Modify: `src/lib/providers/jina.ts:328`
- Modify: `src/lib/providers/voyage.ts:281`
- Modify: `src/lib/providers/replicate.ts:523`

**Interfaces:**

- Consumes: nothing new.
- Produces: nothing new — this is a pure deletion. `JinaProvider`, `VoyageProvider`, `ReplicateProvider` remain available exactly as before via their existing named exports (`export class JinaProvider ...` at `jina.ts:45`, `export class VoyageProvider ...` at `voyage.ts:46`, `export class ReplicateProvider ...` at `replicate.ts:88`) and via `src/lib/providers/index.ts`'s existing named re-exports (`export { JinaProvider as Jina } from "./jina.js";` etc.).

Repo convention (CLAUDE.md: "Named exports only. No `export default`.") is violated by one trailing line in each of these three files:

```ts
export default JinaProvider;
```

```ts
export default VoyageProvider;
```

```ts
export default ReplicateProvider;
```

- [ ] **Step 1: Grep-verify the current violations**

Run: `grep -n "^export default" src/lib/providers/jina.ts src/lib/providers/voyage.ts src/lib/providers/replicate.ts`

Expected output: exactly 3 lines — `jina.ts:328:export default JinaProvider;`, `voyage.ts:281:export default VoyageProvider;`, `replicate.ts:523:export default ReplicateProvider;`.

- [ ] **Step 2: Grep-verify no other file consumes them via default import**

Run:

```bash
grep -rn "from [\"'].*/jina\.js[\"']\|from [\"'].*/voyage\.js[\"']\|from [\"'].*/replicate\.js[\"']" src/ test/ | grep -v "src/lib/factories/providerRegistry.ts\|src/lib/providers/index.ts\|src/lib/types/index.ts"
```

Expected output: no matches. (`providerRegistry.ts` uses named dynamic-import destructuring, e.g. `const { VoyageProvider } = await import("../providers/voyage.js");`; `providers/index.ts` uses named re-exports; `types/index.ts`'s `export * from "./replicate.js"` is the unrelated types barrel.)

- [ ] **Step 3: Delete the three lines**

Delete `export default JinaProvider;` (jina.ts:328), `export default VoyageProvider;` (voyage.ts:281), and `export default ReplicateProvider;` (replicate.ts:523). Each file's final class-closing `}` becomes the new last line of substantive code (a trailing blank line is fine).

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm run check && pnpm run lint`

Expected: 0 errors — confirms no default-import consumer was missed.

- [ ] **Step 5: Build and run the closest existing targeted suite**

Run: `pnpm run build && npx tsx test/continuous-test-suite-providers-mocked.ts`

Expected: PASS — this suite exercises Jina, Voyage, and Replicate through their mocked-contract paths; no regressions since the named exports are untouched.

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/jina.ts src/lib/providers/voyage.ts src/lib/providers/replicate.ts
git commit -m "fix(providers): remove export default from jina, voyage, replicate"
```

---

### Task 8: Replicate accepts both legacy and standard credential field names

**Files:**

- Modify: `src/lib/types/providers.ts:219`
- Modify: `src/lib/providers/replicate.ts:102-107`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Produces: `NeurolinkCredentials["replicate"]` gains two new optional fields, `apiKey?: string` and `baseURL?: string`, alongside the existing `apiToken?: string` and `baseUrl?: string` — additive, fully backward compatible.

Every other entry in `NeurolinkCredentials` uses `{ apiKey?: string; baseURL?: string }`. Replicate is the sole outlier: `src/lib/types/providers.ts:219`:

```ts
  replicate?: { apiToken?: string; baseUrl?: string };
```

`ReplicateProvider`'s constructor, `src/lib/providers/replicate.ts:92-113`, only reads the legacy names:

```ts
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["replicate"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "replicate" as AIProviderName, validatedNeurolink);

    const overrideToken = credentials?.apiToken?.trim();
    this.apiToken =
      overrideToken && overrideToken.length > 0
        ? overrideToken
        : validateApiKey(createReplicateConfig());
    this.baseURL = credentials?.baseUrl;
```

- [ ] **Step 1: Write the failing tests**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`:

```ts
await test("Replicate credentials accept the new apiKey/baseURL naming", async () => {
  const { ReplicateProvider } = await import("../dist/providers/replicate.js");
  const provider = new ReplicateProvider(undefined, undefined, undefined, {
    apiKey: "r8_test_new_style",
    baseURL: "https://example.test/replicate",
  });
  const config = provider.getConfiguration() as { baseURL?: string };
  assert(
    config.baseURL === "https://example.test/replicate",
    "expected baseURL from the new-style credential field to be used",
  );
  const internal = provider as unknown as { apiToken: string };
  assert(
    internal.apiToken === "r8_test_new_style",
    "expected apiKey from the new-style credential field to be used as the token",
  );
});

await test("Replicate credentials still accept the legacy apiToken/baseUrl naming", async () => {
  const { ReplicateProvider } = await import("../dist/providers/replicate.js");
  const provider = new ReplicateProvider(undefined, undefined, undefined, {
    apiToken: "r8_test_legacy_style",
    baseUrl: "https://legacy.example.test/replicate",
  });
  const config = provider.getConfiguration() as { baseURL?: string };
  assert(
    config.baseURL === "https://legacy.example.test/replicate",
    "expected baseURL from the legacy credential field to still work",
  );
  const internal = provider as unknown as { apiToken: string };
  assert(
    internal.apiToken === "r8_test_legacy_style",
    "expected apiToken from the legacy credential field to still work",
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: the "legacy naming" test PASSES already (existing behavior). The "new apiKey/baseURL naming" test FAILS — `config.baseURL` is `undefined` and `internal.apiToken` falls back to the env-var-derived default rather than `"r8_test_new_style"`, because the constructor doesn't read `apiKey`/`baseURL` yet.

- [ ] **Step 3: Extend the credentials type**

In `src/lib/types/providers.ts`, change line 219 from:

```ts
  replicate?: { apiToken?: string; baseUrl?: string };
```

to:

```ts
  replicate?: {
    apiToken?: string;
    baseUrl?: string;
    apiKey?: string;
    baseURL?: string;
  };
```

- [ ] **Step 4: Prefer the new field names, fall back to the legacy ones**

In `src/lib/providers/replicate.ts`, replace lines 102-107:

```ts
const overrideToken = credentials?.apiToken?.trim();
this.apiToken =
  overrideToken && overrideToken.length > 0
    ? overrideToken
    : validateApiKey(createReplicateConfig());
this.baseURL = credentials?.baseUrl;
```

with:

```ts
const overrideToken =
  credentials?.apiKey?.trim() || credentials?.apiToken?.trim();
this.apiToken =
  overrideToken && overrideToken.length > 0
    ? overrideToken
    : validateApiKey(createReplicateConfig());
this.baseURL = credentials?.baseURL || credentials?.baseUrl;
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all sixteen tests in the suite green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/providers.ts src/lib/providers/replicate.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(providers): accept apiKey/baseURL alongside Replicate's legacy apiToken/baseUrl"
```

---

### Task 9: Remove the wasted health check in `getBestProvider()`

**Files:**

- Modify: `src/lib/utils/providerUtils.ts:27-64`
- Test: `test/continuous-test-suite-provider-wiring.ts` (append)

**Interfaces:**

- Consumes/Produces: no signature change — `getBestProvider(requestedProvider?: string): Promise<string>` keeps its existing signature. `ProviderHealthChecker` (imported at `providerUtils.ts:13`) stays imported — it's still used later in the same function's auto-selection path (`ProviderHealthChecker.getBestHealthyProvider()`, line 67).

The current code, `src/lib/utils/providerUtils.ts:27-64`:

```ts
export async function getBestProvider(
  requestedProvider?: string,
): Promise<string> {
  // Check requested provider FIRST - explicit user choice overrides defaults
  if (requestedProvider && requestedProvider !== "auto") {
    // For explicit provider requests, ALWAYS honor the request
    // Never override explicit provider selection with health-based fallbacks
    logger.debug(
      `[getBestProvider] Using explicitly requested provider: ${requestedProvider}`,
    );

    // Optional health check for logging purposes only
    try {
      const health = await ProviderHealthChecker.checkProviderHealth(
        requestedProvider as AIProviderName,
        { includeConnectivityTest: false, cacheResults: true },
      );

      if (health.isHealthy) {
        logger.debug(
          `[getBestProvider] Explicitly requested provider ${requestedProvider} is healthy`,
        );
      } else {
        logger.warn(
          `[getBestProvider] Explicitly requested provider ${requestedProvider} may have issues, but using anyway`,
          { error: health.error },
        );
      }
    } catch (error) {
      logger.warn(
        `[getBestProvider] Health check failed for explicitly requested provider ${requestedProvider}, using anyway`,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    // ALWAYS return the explicitly requested provider
    return requestedProvider;
  }
```

The `try`/`catch` block (lines 38-60) runs `ProviderHealthChecker.checkProviderHealth()` purely to decide which log line to print — its result is never used to alter control flow; the function returns `requestedProvider` regardless of the outcome. This makes every explicit-provider call to `getBestProvider()` pay for an avoidable health/connectivity check.

- [ ] **Step 1: Write the failing test**

Append to `test/continuous-test-suite-provider-wiring.ts`, before the final `await runSuite();`:

```ts
await test("getBestProvider returns an explicit provider without an extra health check round-trip", async () => {
  const { getBestProvider } = await import("../dist/utils/providerUtils.js");
  const start = Date.now();
  const result = await getBestProvider("openai");
  const elapsedMs = Date.now() - start;
  assert(
    result === "openai",
    "expected getBestProvider to echo back the explicit provider",
  );
  // The removed health check made a connectivity-capable call. Without it
  // this resolves near-instantly. A generous ceiling avoids flakiness
  // while still catching a reintroduced round-trip, which would be
  // orders of magnitude slower in a no-network test environment.
  assert(
    elapsedMs < 500,
    `expected getBestProvider("openai") to resolve quickly, took ${elapsedMs}ms`,
  );
});
```

- [ ] **Step 2: Run to verify it fails (or is flaky/slow)**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: FAIL or a borderline-slow PASS — the current implementation always performs the health-check round-trip before returning, so elapsed time depends on `ProviderHealthChecker.checkProviderHealth()`'s latency, which is unbounded by this call site.

- [ ] **Step 3: Delete the wasted health check**

In `src/lib/utils/providerUtils.ts`, replace the full block from `// Optional health check for logging purposes only` through the closing `}` of the outer `try`/`catch` (lines 38-60) with nothing, leaving:

```ts
export async function getBestProvider(
  requestedProvider?: string,
): Promise<string> {
  // Check requested provider FIRST - explicit user choice overrides defaults
  if (requestedProvider && requestedProvider !== "auto") {
    // For explicit provider requests, ALWAYS honor the request
    // Never override explicit provider selection with health-based fallbacks
    logger.debug(
      `[getBestProvider] Using explicitly requested provider: ${requestedProvider}`,
    );

    // ALWAYS return the explicitly requested provider
    return requestedProvider;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm run build && pnpm run test:provider-wiring`

Expected: PASS — all seventeen tests in the suite green, and reliably fast.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/providerUtils.ts test/continuous-test-suite-provider-wiring.ts
git commit -m "fix(utils): remove wasted health check for explicitly-requested providers in getBestProvider"
```

---

## Verification Checklist

Run after all nine tasks are complete:

- [ ] `pnpm run check` — typecheck clean, 0 errors.
- [ ] `pnpm run lint` — 0 ESLint violations across all 14 repo rules + format.
- [ ] `pnpm run build` — SDK + CLI build succeeds.
- [ ] `pnpm run test:provider-wiring` — new suite, all 17 tests PASS (0 failed, 0 skipped).
- [ ] `pnpm run test:unit` — full no-API aggregate still green, including the new suite.
- [ ] `npx tsx test/continuous-test-suite-providers-mocked.ts` — mocked-contract suite still green (Task 7's blast-radius check).
- [ ] `git log --oneline -9` — 9 commits, one per task, each a conventional-commit message.
- [ ] Manual smoke test: `pnpm run build:cli && npx neurolink setup` still completes for the 9 wizard-native providers (google-ai, openai, anthropic, azure, bedrock, vertex, huggingface, mistral, openrouter) exactly as before.

## Risks & Rollback

- **No task in this plan changes a public function's signature or return type.** Task 3 changes `getAvailableProviders()`'s data source (enum-backed instead of hardcoded), not its `string[]` return type; Task 9 removes an internal side-effecting call with no return-value change. All nine fixes are additive or purely corrective — none is a documented breaking change.
- **Task 5 has the widest blast radius** (touches the shared `OpenAIChatCompletionsProvider` base class plus 3 subclasses in one logical change). It is still low-risk: the new `probeModelsEndpoint()` method is additive (no existing method is removed from the base class), and Ollama/LM Studio's _observable_ behavior is unchanged — only the implementation is deduplicated. Rollback: `git revert` the Task 5 commit; the other 8 tasks are unaffected since none of them touches these 4 files.
- **The shared test file (`test/continuous-test-suite-provider-wiring.ts`) grows across all 9 tasks.** Reverting a single task's commit out of order (rather than reverting from the tip backward) may produce a merge conflict in this file, since each task appends its `test()` blocks near the end of the file. Prefer reverting from the most recent commit backward if a partial rollback is needed.
- **Task 4's `EXTRA_PROVIDER_CONFIGS` literals for `ollama`/`litellm`/`sagemaker`** are hand-authored (no existing factory to delegate to). If any of the referenced env var names (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `SAGEMAKER_ENDPOINT_NAME`, `SAGEMAKER_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are renamed elsewhere in the codebase in the future, these three literals will drift out of sync silently (no compile-time link to the actual env var reads in `ollama/client.ts`, `litellm/client.ts`, `sagemaker/config.ts`). Not a rollback concern, but worth a follow-up grep if those files change later.

## Out of Scope

- **SageMaker streaming support** — plan `2026-08-15-08-agentic-loop-engine.md`. Task 4 only adds SageMaker's _setup wizard_ entry (config/instructions), not streaming behavior.
- **Descriptor-driven consolidation of the 9 hardcoded provider lists this plan touches** (the wizard's `PROVIDERS` array, `EXTRA_PROVIDER_CONFIGS`, `AIProviderName`-derived lists in the new test suite) into a single `ProviderDescriptor` source of truth — plan `2026-08-15-04-provider-descriptor.md`. This plan deliberately keeps each fix minimal and local rather than pre-adopting that not-yet-existing contract.
- **Deletion of other dead code** encountered incidentally while reading these files (e.g. any unused local-runtime config factories noted during Task 4's research) — plan `2026-08-15-03-dead-code-purge.md` already covers dead-code removal and re-verifies each claim independently; this plan does not delete anything beyond the three `export default` lines in Task 7, which are in scope because they are one of the nine assigned bugs.
- **CI wiring of `test:provider-wiring` into branch protection / required status checks** — plan `2026-08-15-02-ci-safety-net.md`. This plan adds the suite and its `test:unit` aggregation entry only.
