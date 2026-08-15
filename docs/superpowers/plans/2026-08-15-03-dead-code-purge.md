# Dead Code Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the provably-dead code the provider-family and type/model-registry audits surfaced — duplicate provider utils/constants files, an orphaned static provider barrel, an abandoned Vertex model-creation call tree, a dead Phase-1 options abstraction, two unused local-runtime config factories, a dead capability function, duplicate zod schemas, dead slices of the model-configuration manager, four stale doc comments, and one unreachable branch — so the codebase this redesign builds on top of isn't carrying load-bearing-looking code that nothing calls.

**Architecture:** This is a pure subtraction plan: no new abstractions, no new files (except doc-comment fixes, which edit in place). Every task follows the same shape — re-verify the audit's dead-code claim with a fresh grep against the current tree (not the audit's memory of it), delete the dead code and any barrel line that re-exported it, then prove nothing broke via typecheck/lint/build plus the nearest targeted test suite. Three tasks (3, 6, 8) turned out to need a **narrower** cut than the audit originally scoped, because re-verification found either more dead code than claimed (Task 3) or that the claimed-dead code is still reachable through a live re-export chain (Task 6) or still has real callers the audit missed (Task 8) — those corrections are called out inline where they occur, with the grep evidence that drove them.

**Tech Stack:** TypeScript, pnpm, ESLint (custom rules enforcing this repo's 14 Critical Rules), the `tsx`-based `continuous-test-suite-*.ts` test harness (no vitest runner despite `vitest.config.ts` existing).

**Spec:**

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/03-native-sdk-provider-family-anthropic-openai-google.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/05-local-runtime-aggregator-provider-family-ollama-li.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/00-provider-registration-instantiation-chain.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/gap2-model-metadata-subsystem-model-registry-modelresol.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/04-cloud-enterprise-provider-family-googlevertex-amaz.md`

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts`.
- Repo rules: dynamic imports only in providerRegistry.ts; all types in src/lib/types/; types barrel only `export *` lines; barrel-only type imports; named exports only.
- Conventional commits; commit per task; NEVER `git push`. Public SDK API must not break — before deleting any EXPORTED symbol, grep both src/ AND test/ AND docs/ for usage, and check whether it is re-exported from src/lib/index.ts or src/lib/types/index.ts (public surface); if it is public, note the breaking-change consideration and prefer deprecation comment over deletion unless provably unused.

**Plan-specific notes:**

- This plan has no dependency on any other plan in this series — it operates entirely on code that exists on the branch today. It is safe to run before or after Plans 01–10.
- **Three deviations from the original task assignment, each with grep evidence inline at the point they occur:** Task 3's dead-code scope grew from 7 functions to 12 (re-verification found 5 more functions in the same orphaned call tree that the original audit missed). Task 6's scope shrank from "delete the function and the field" to "delete only the function" (the field is reachable through a live public re-export chain and is the generic capability parameter's actual mechanism, not dead). Task 8's scope shrank from "delete most of the 1,130-line file, keep only the TelemetryHandler slice" to "delete 3 methods + 1 const + 4 free functions, keep the file" (re-verification found 7 real production call sites the original framing missed).
- All line numbers below were read directly from the current tree on 2026-08-15 on branch `feat/proider-redesign`. If you're running this plan later and a file has since changed, re-run the task's grep-verification step first — it will show you where the current line numbers actually are before you touch anything.

---

### Task 1: Dead sibling utils/constants files across provider directories

**Files:**

- Delete: `src/lib/providers/anthropic/utils.ts` (202 lines, 6 exports, all dead)
- Edit: `src/lib/providers/anthropic/constants.ts` (remove `streamTracer` export + now-unused `trace` import; keep `ANTHROPIC_BETA_HEADERS`)
- Edit: `src/lib/providers/anthropic/index.ts` (remove the `./utils.js` barrel line)
- Delete: `src/lib/providers/openAI/utils.ts` (2 exports, both dead)
- Delete: `src/lib/providers/openAI/constants.ts` (1 export, dead)
- Edit: `src/lib/providers/openAI/index.ts` (remove `./constants.js` and `./utils.js` barrel lines)
- Delete: `src/lib/providers/googleAiStudio/utils.ts` (1 export, dead)
- Edit: `src/lib/providers/googleAiStudio/index.ts` (remove the `./utils.js` barrel line)
- Delete: `src/lib/providers/googleNativeGemini3/constants.ts` (1 export, dead)
- Edit: `src/lib/providers/googleNativeGemini3/index.ts` (remove the `./constants.js` barrel line)
- Delete: `src/lib/providers/ollama/utils.ts` (7 exports, all dead)
- Edit: `src/lib/providers/ollama/index.ts` (remove the `./utils.js` barrel line only — `./constants.js` is untouched, out of scope for this task)
- Delete: `src/lib/providers/litellm/utils.ts` (2 exports, both dead)
- Delete: `src/lib/providers/litellm/constants.ts` (1 export, dead)
- Edit: `src/lib/providers/litellm/index.ts` (remove `./constants.js` and `./utils.js` barrel lines)
- Delete: `src/lib/providers/nvidiaNim/utils.ts` (8 exports, all dead — audit said 6; re-verification found `stripReasoningBudget` and `stripChatTemplate` are dead too, see step below)
- Edit: `src/lib/providers/nvidiaNim/index.ts` (remove the `./utils.js` barrel line only — `./constants.js` is untouched, out of scope for this task)
- Delete: `src/lib/providers/huggingFace/utils.ts` (2 exports, both dead)
- Edit: `src/lib/providers/huggingFace/index.ts` (remove the `./utils.js` barrel line)
- Edit: `src/lib/providers/openRouter/utils.ts` (file stays — delete only `getOpenRouterConfig` and its now-unused `OpenRouterConfig` type import; `getDefaultOpenRouterModel` is live, keep it)

**Interfaces:**

- Removes: 9 internal (non-barrel-exported-as-public) helper functions/constants across 8 provider directories, all superseded by identically-named or renamed local copies already living in each directory's `client.ts`.
- Unaffected: every provider's public `AIProvider` contract (`stream`/`generate`/etc.) — these files are pure internal plumbing with zero callers outside their own directory, confirmed below.
- `openRouter/utils.ts`'s `getDefaultOpenRouterModel` keeps its existing export unchanged (still imported live by `openRouter/client.ts`).

Do these as one grouped task since they're mechanically identical; each file gets its own verify → delete → barrel-edit sub-step before the shared check/lint/build/test/commit at the end.

- [ ] Verify anthropic/utils.ts has zero external importers and client.ts has local copies of all 6 exports.

  ```bash
  grep -rn 'from ["'"'"'].*anthropic/utils' src/ test/ docs/
  grep -n "getAnthropicApiKey\|getDefaultAnthropicModel\|getOAuthToken\|detectSubscriptionTier\|detectAuthMethod\|parseRateLimitHeaders" src/lib/providers/anthropic/client.ts
  ```

  Expected: first command returns nothing (no external importers). Second command shows local `const`/function redeclarations for `getAnthropicApiKey`, `getDefaultAnthropicModel`, `getOAuthToken`, `detectSubscriptionTier`, `detectAuthMethod` around client.ts:130-268; `parseRateLimitHeaders` shows no local redeclaration in client.ts — it is simply unused (the live rate-limit-header parser is `parseAnthropicLimitHeaders` in a different file, not a redeclaration of this one).

- [ ] Delete `src/lib/providers/anthropic/utils.ts`.

- [ ] Edit `src/lib/providers/anthropic/constants.ts` to remove the dead `streamTracer` export and its now-unused import, keeping `ANTHROPIC_BETA_HEADERS`:

  ```typescript
  export const ANTHROPIC_BETA_HEADERS = {
    "anthropic-beta": [
      "claude-code-20250219",
      "fine-grained-tool-streaming-2025-05-14",
    ].join(","),
  };
  ```

  (Remove the `import { trace } from "@opentelemetry/api";` line and the `export const streamTracer = trace.getTracer("neurolink.provider.anthropic");` line. `ANTHROPIC_BETA_HEADERS` is confirmed live — imported and used at `client.ts:118`, `:898`, `:937`.)

- [ ] Edit `src/lib/providers/anthropic/index.ts` — remove the `export * from "./utils.js";` line, keep the other two:

  ```typescript
  export * from "./client.js";
  export * from "./constants.js";
  ```

- [ ] Verify openAI/utils.ts and openAI/constants.ts have zero external importers and client.ts has local copies.

  ```bash
  grep -rn 'from ["'"'"'].*openAI/utils\|from ["'"'"'].*openAI/constants' src/ test/ docs/
  grep -n "getOpenAIApiKey\|getOpenAIModel\|streamTracer" src/lib/providers/openAI/client.ts
  ```

  Expected: first command empty. Second shows local redeclarations at `client.ts:69` (`getOpenAIApiKey`), `:71` (`getOpenAIModel`), `:73` (`streamTracer`), used at `:99`, `:132`, `:213`.

- [ ] Delete `src/lib/providers/openAI/utils.ts` and `src/lib/providers/openAI/constants.ts`.

- [ ] Edit `src/lib/providers/openAI/index.ts` to keep only:

  ```typescript
  export * from "./client.js";
  ```

- [ ] Verify googleAiStudio/utils.ts has zero external importers and client.ts has a local `createGoogleGenAIClient`.

  ```bash
  grep -rn 'from ["'"'"'].*googleAiStudio/utils' src/ test/ docs/
  grep -n "createGoogleGenAIClient" src/lib/providers/googleAiStudio/client.ts
  ```

  Expected: first empty. Second shows client.ts's own `async function createGoogleGenAIClient(apiKey: string): Promise<GenAIClient>` defined at `client.ts:96-113` (not imported from `./utils.js` — its import block has no such import), called at `:403` and `:858`.

- [ ] Delete `src/lib/providers/googleAiStudio/utils.ts`.

- [ ] Edit `src/lib/providers/googleAiStudio/index.ts` to keep only:

  ```typescript
  export * from "./client.js";
  ```

- [ ] Verify googleNativeGemini3/constants.ts's `GEMINI3_NATIVE_MAX_STEPS` has zero external importers and utils.ts has its own local copy.

  ```bash
  grep -rn "GEMINI3_NATIVE_MAX_STEPS" src/ test/ docs/
  ```

  Expected: hits only at `googleNativeGemini3/constants.ts` (the dead export) and `googleNativeGemini3/utils.ts:734` (a local `const GEMINI3_NATIVE_MAX_STEPS = 100;`, used at `:742-743`) — no third-party importer of the constants.ts export.

- [ ] Delete `src/lib/providers/googleNativeGemini3/constants.ts`.

- [ ] Edit `src/lib/providers/googleNativeGemini3/index.ts` to keep only:

  ```typescript
  export * from "./utils.js";
  ```

- [ ] Verify ollama/utils.ts's 7 exports have zero external importers and confirm each one's fate in client.ts.

  ```bash
  grep -rn 'from ["'"'"'].*ollama/utils' src/ test/ docs/
  grep -n "resolveOllamaBaseURL\|getDefaultOllamaModel\|AbortSignal.timeout\|createTimeoutController\|getTimeout(" src/lib/providers/ollama/client.ts
  ```

  Expected: first empty. Second confirms: `getOllamaBaseUrl` → superseded by local `resolveOllamaBaseURL` (client.ts:49-56, richer `/v1`-suffix handling); `getDefaultOllamaModel` → exact-name local redeclaration (client.ts:39-40); `createAbortSignalWithTimeout` → superseded by inline `AbortSignal.timeout(5000)` (client.ts:257) plus the shared `createTimeoutController` (client.ts:19,326); `getOllamaTimeout` → superseded by the richer `getTimeout()` override (client.ts:223-241); `isOllamaHttpError`, `createOllamaHttpError`, `isOpenAICompatibleMode` → no equivalent at all, pure dead code (error mapping goes through the base client's `buildAPIError` instead; `isOpenAICompatibleMode`'s backing env var `OLLAMA_OPENAI_COMPATIBLE` is unread anywhere in `src/`, though it is still documented as live in `docs/getting-started/providers/ollama.md` and `docs/reference/provider-capabilities-audit.md` — that doc/behavior mismatch is a separate pre-existing issue, out of scope here, worth a follow-up note but not a blocker for this deletion since the _code_ path is unambiguously dead).

- [ ] Delete `src/lib/providers/ollama/utils.ts`.

- [ ] Edit `src/lib/providers/ollama/index.ts` — remove only the `export * from "./utils.js";` line, leave the other two untouched:

  ```typescript
  export * from "./client.js";
  export * from "./constants.js";
  ```

- [ ] Verify litellm/utils.ts and litellm/constants.ts have zero external importers.

  ```bash
  grep -rn 'from ["'"'"'].*litellm/utils\|from ["'"'"'].*litellm/constants' src/ test/ docs/
  ```

  Expected: empty (both `getLiteLLMConfig`/`getDefaultLiteLLMModel` in utils.ts and `streamTracer` in constants.ts are dead — the LiteLLM provider's real config/model resolution lives inline in client.ts).

- [ ] Delete `src/lib/providers/litellm/utils.ts` and `src/lib/providers/litellm/constants.ts`.

- [ ] Edit `src/lib/providers/litellm/index.ts` to keep only:

  ```typescript
  export * from "./client.js";
  ```

- [ ] Verify nvidiaNim/utils.ts's 8 exports (not 6 — re-verification found `stripReasoningBudget` and `stripChatTemplate`, not mentioned in the original audit summary, are dead too) have zero external importers, and confirm client.ts's fetch mechanism doesn't route through the dead `makeLoggingFetch`.

  ```bash
  grep -rn 'from ["'"'"'].*nvidiaNim/utils' src/ test/ docs/
  grep -n "envInt\|envFloat\|buildNvidiaNimExtraBody\|getNimApiKey\|getDefaultNimModel\|stripFieldFromJsonBody\|createProxyFetch" src/lib/providers/nvidiaNim/client.ts
  ```

  Expected: first empty. Second shows local redeclarations of `envInt` (client.ts:115), `envFloat` (:123), `buildNvidiaNimExtraBody` (:132), `getNimApiKey` (:174), `getDefaultNimModel` (:178); `stripReasoningBudget`/`stripChatTemplate` have no equivalent at all in client.ts (its own differently-named `stripFieldFromJsonBody` at :384, re-exported alongside `isNimFieldRejection`, serves the equivalent purpose); `makeLoggingFetch` has zero references anywhere in client.ts — the file has no fetch override at all and inherits `createProxyFetch()` from the shared `openaiChatCompletionsBase.ts` base class instead.

- [ ] Delete `src/lib/providers/nvidiaNim/utils.ts`.

- [ ] Edit `src/lib/providers/nvidiaNim/index.ts` — remove only the `export * from "./utils.js";` line, leave the other two untouched:

  ```typescript
  export * from "./client.js";
  export * from "./constants.js";
  ```

- [ ] Verify huggingFace/utils.ts has zero external importers.

  ```bash
  grep -rn 'from ["'"'"'].*huggingFace/utils' src/ test/ docs/
  ```

  Expected: empty.

- [ ] Delete `src/lib/providers/huggingFace/utils.ts`.

- [ ] Edit `src/lib/providers/huggingFace/index.ts` to keep only:

  ```typescript
  export * from "./client.js";
  ```

- [ ] Verify openRouter/utils.ts's two exports: `getOpenRouterConfig` is dead, `getDefaultOpenRouterModel` is live.

  ```bash
  grep -rn "getOpenRouterConfig\b" src/ test/ docs/
  grep -n "getDefaultOpenRouterModel" src/lib/providers/openRouter/client.ts
  ```

  Expected: first command's only hits are the export's own declaration and JSDoc in utils.ts — zero callers anywhere. Second confirms `getDefaultOpenRouterModel` is imported and called live at `client.ts:22` (import), `:120`, `:236`, `:261`.

- [ ] Edit `src/lib/providers/openRouter/utils.ts` to remove `getOpenRouterConfig` and its now-unused `OpenRouterConfig` type import, leaving only:

  ```typescript
  import { OpenRouterModels } from "../../constants/enums.js";
  import { getProviderModel } from "../../utils/providerConfig.js";

  export const getDefaultOpenRouterModel = (): string => {
    return getProviderModel(
      "OPENROUTER_MODEL",
      OpenRouterModels.CLAUDE_SONNET_4_5,
    );
  };
  ```

  (`openRouter/index.ts` is unchanged — the file still exists, still has a live export.)

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider suite.

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/providers/anthropic/utils.ts src/lib/providers/anthropic/constants.ts src/lib/providers/anthropic/index.ts \
    src/lib/providers/openAI/utils.ts src/lib/providers/openAI/constants.ts src/lib/providers/openAI/index.ts \
    src/lib/providers/googleAiStudio/utils.ts src/lib/providers/googleAiStudio/index.ts \
    src/lib/providers/googleNativeGemini3/constants.ts src/lib/providers/googleNativeGemini3/index.ts \
    src/lib/providers/ollama/utils.ts src/lib/providers/ollama/index.ts \
    src/lib/providers/litellm/utils.ts src/lib/providers/litellm/constants.ts src/lib/providers/litellm/index.ts \
    src/lib/providers/nvidiaNim/utils.ts src/lib/providers/nvidiaNim/index.ts \
    src/lib/providers/huggingFace/utils.ts src/lib/providers/huggingFace/index.ts \
    src/lib/providers/openRouter/utils.ts
  git commit -m "$(cat <<'EOF'
  chore(providers): remove dead sibling utils/constants files

  Nine provider directories carried a utils.ts and/or constants.ts whose
  exports had zero importers outside their own directory — client.ts had
  already grown identical or richer local copies. Deleting the unused
  originals so there's one implementation per helper, not two.
  EOF
  )"
  ```

---

### Task 2: Dead static provider barrel `src/lib/providers/index.ts`

**Files:**

- Delete: `src/lib/providers/index.ts` (29 export lines — audit said 27, recount below)

**Interfaces:**

- Removes: a 29-entry static re-export barrel of every provider class. Zero importers; if anything ever did import it, it would violate Critical Rule 1 (dynamic imports only in providerRegistry.ts), so its existence is itself a latent rule violation waiting to be used.
- Unaffected: nothing consumes this file. `ProviderFactory`/`ProviderRegistry` are the only real provider-lookup path and don't touch it.

- [ ] Verify the file's true export count and confirm zero importers anywhere.

  ```bash
  grep -c "^export" src/lib/providers/index.ts
  grep -rnE 'from ["'"'"'].*providers/index\.js|from ["'"'"']\.\./providers["'"'"']|from ["'"'"']\.\./\.\./providers["'"'"']' src/ test/ docs/
  ```

  Expected: first command prints `29` (correcting the audit's "27-entry" description — the file re-exports all 29 currently-registered provider classes under aliased names, e.g. `GoogleVertexProvider as GoogleVertexAI`). Second command returns nothing — no file imports from this barrel by any of its plausible import-path spellings.

- [ ] Delete `src/lib/providers/index.ts`.

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider suite.

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/providers/index.ts
  git commit -m "$(cat <<'EOF'
  chore(providers): remove dead static provider barrel

  src/lib/providers/index.ts re-exported all 29 provider classes via
  static imports with zero real importers. ProviderFactory/ProviderRegistry
  (dynamic imports per Critical Rule 1) are the only live provider-lookup
  path; this file was dead weight that, if ever imported, would have
  reintroduced the circular-dependency risk dynamic imports exist to avoid.
  EOF
  )"
  ```

---

### Task 3: googleVertex dead model-creation call tree

**⚠️ Scope correction from original assignment:** the original task listed 7 dead functions (`validateVertexAuthentication`, `validateVertexProjectConfiguration`, `checkVertexRegionalSupport`, `analyzeAnthropicCreationError`, `getAnthropicTroubleshootingSteps`, `createAnthropicModel`, `createVertexInstance`). Re-verification confirms all 7 are dead, but tracing their only caller (`getModel()`, itself never called) surfaced **5 more dead functions in the same orphaned tree** that the original list missed: `getModel()` itself (client.ts:1366), `initializeModelCreationLogging()` (:1086), `attemptAnthropicModelCreation()` (:1108), `createGoogleVertexModel()` (:1171), and `validateAnthropicModelName()` (:8982, a fifth diagnostic helper sitting between `checkVertexRegionalSupport` and `analyzeAnthropicCreationError` that the audit's summary didn't name). All 12 functions are deleted in this task with the same evidence standard as the original 7.

**Files:**

- Edit: `src/lib/providers/googleVertex/client.ts` (9,966 lines) — delete 12 dead methods across two disjoint line ranges (~1086-1394 and ~8753-9194); keep the throwing `getAISDKModel()` override at line 1068 (required by `BaseProvider`'s abstract contract)

**Interfaces:**

- Removes: 12 private/internal instance methods on `GoogleVertexProvider`. All are unreachable — `getAISDKModel()` (the only method `BaseProvider` can call to obtain a model) unconditionally throws, directing all real callers to the separate, live `executeNativeGemini3Stream/Generate` and `executeNativeAnthropicStream/Generate` methods instead. None of the 12 has any caller outside this same dead island.
- Unaffected: live equivalents for the 3 validate/check diagnostics already exist as `private static` methods on `ProviderHealth` (`src/lib/utils/providerHealth.ts:1546,1645,1700`) — those are untouched by this task; they are the "keep" versions the dead instance methods duplicated.
- `createAnthropicModel` (client.ts:8757) has no `private`/`protected` modifier (technically public on the class), but is confirmed to have zero callers anywhere in src/test/docs outside its own dead caller at line 1132 — its public visibility doesn't create an external consumer.

- [ ] Verify all 12 functions have zero callers outside this same dead tree, and that `getModel()` — the tree's sole entry point — itself has zero callers.

  ```bash
  grep -nE "initializeModelCreationLogging|attemptAnthropicModelCreation|createGoogleVertexModel|createVertexInstance|getModel\(\)|createAnthropicModel|validateVertexAuthentication|validateVertexProjectConfiguration|checkVertexRegionalSupport|validateAnthropicModelName|analyzeAnthropicCreationError|getAnthropicTroubleshootingSteps" src/lib/providers/googleVertex/client.ts
  grep -rnE "attemptAnthropicModelCreation|createGoogleVertexModel|initializeModelCreationLogging|getModel\(\)|createVertexInstance|createAnthropicModel|validateVertexAuthentication|validateVertexProjectConfiguration|checkVertexRegionalSupport|validateAnthropicModelName|analyzeAnthropicCreationError|getAnthropicTroubleshootingSteps" test/ docs/
  grep -rnE "validateVertexAuthentication|validateVertexProjectConfiguration|checkVertexRegionalSupport" src/
  ```

  Expected: first command's every call-site hit (as opposed to definition-line hit) is `this.<name>(` from another function inside this same list — e.g. `getModel()` (1366) calls `this.initializeModelCreationLogging()` (1373), `this.attemptAnthropicModelCreation(...)` (1376), `this.createGoogleVertexModel(...)` (1388); `attemptAnthropicModelCreation` calls `this.createAnthropicModel(...)` (1132); `createGoogleVertexModel` calls `this.createVertexInstance(...)` (1254) — and `getModel()` itself has **no** caller anywhere in the file. Second command returns nothing (no test/docs reference any of the 12 names). Third command's only hits are the dead definitions in `googleVertex/client.ts` (8776/8872/8930) and the live static equivalents in `providerHealth.ts` (1546/1645/1700, called only by `providerHealth.ts`'s own internal `this.`-calls) — confirming no cross-file caller exists for the client.ts trio.

- [ ] Delete the first dead block, `client.ts:1086-1394` (`initializeModelCreationLogging`, `attemptAnthropicModelCreation`, `createGoogleVertexModel`, `createVertexInstance` with its `@deprecated` JSDoc at :1339-1341, `getModel` with its JSDoc at :1361-1365). Leave the surrounding code (`getAISDKModel` above it, `validateStreamOptionsOnly` below it) untouched.

- [ ] Delete the second dead block, `client.ts:8753-9194` (JSDoc + `createAnthropicModel` at 8753-8771; JSDoc + `validateVertexAuthentication` at 8773-8867; JSDoc + `validateVertexProjectConfiguration` at 8869-8925; JSDoc + `checkVertexRegionalSupport` at 8927-8977; JSDoc + `validateAnthropicModelName` at 8979-9027; JSDoc + `analyzeAnthropicCreationError` at 9029-9115; JSDoc + `getAnthropicTroubleshootingSteps` at 9117-9194). Leave `hasAnthropicSupport()` above it (8749-8751, live, delegates to the module-level `hasAnthropicSupport()` helper — unrelated to this dead tree) untouched.

  Note: because the second block's line numbers shift once the first block is deleted, do the deletions top-to-bottom in one editing pass (delete block 1, then re-locate block 2 by name in the now-shorter file rather than trusting the pre-deletion line numbers above) or delete bottom-to-top (block 2 first, then block 1) so neither range's line numbers move out from under the other.

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider suite.

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/providers/googleVertex/client.ts
  git commit -m "$(cat <<'EOF'
  chore(providers): remove dead googleVertex model-creation call tree

  getAISDKModel() has unconditionally thrown since Vertex moved to native
  @google/genai / @anthropic-ai/vertex-sdk clients, routing all real calls
  through executeNativeGemini3Stream/Generate and
  executeNativeAnthropicStream/Generate instead. That left a 12-function
  island (getModel and everything only it could reach) with zero live
  callers. The 3 validation/diagnostic helpers in the island already have
  live static equivalents in providerHealth.ts.
  EOF
  )"
  ```

---

### Task 4: Dead Phase-1 abstraction `universalProviderOptions.ts`

**Files:**

- Delete: `src/lib/types/universalProviderOptions.ts` (158 lines: 8 types + 1 runtime class `ParameterNormalizer`)
- Edit: `src/lib/types/index.ts` (remove the `export * from "./universalProviderOptions.js";` barrel line)

**Interfaces:**

- Removes: `UniversalProviderOptions`, `GenericProviderOptions`, `OpenAIProviderOptions`, `GoogleAIProviderOptions`, `AnthropicProviderOptions`, `BedrockProviderOptions`, `ProviderSpecificOptions`, `ProviderFactoryConfig` (types), `ParameterNormalizer` (runtime class).
- **Public-surface note (per Global Constraints):** these symbols ARE technically reachable from the package's main entry point today, via `src/lib/index.ts:169` (`export * from "./types/index.js";`) → `src/lib/types/index.ts:65` (`export * from "./universalProviderOptions.js";`) — a double `export *` chain that reaches `dist/index.d.ts` for the 8 types and `dist/index.js` for the `ParameterNormalizer` class. The separate `./types` sub-export (`src/lib/types/sdk.ts`, which builds to `dist/types/sdk.d.ts`) is a hand-curated selective list and does **not** include any of these symbols — clean. Zero real consumers exist anywhere in `src/`, `test/`, or `docs/` (only auto-generated TypeDoc pages reference them). Per the Global Constraints exception ("prefer deprecation comment over deletion unless provably unused"), this is provably unused in practice despite nominal public reachability — proceeding with deletion, but flagging it explicitly as a minor breaking change in the commit message rather than treating it as risk-free.

- [ ] Verify zero real consumers and confirm the public-reachability chain.

  ```bash
  grep -rn 'from ["'"'"'].*universalProviderOptions' src/ test/ docs/
  grep -rn "ParameterNormalizer" src/ test/
  grep -n "types/index" src/lib/index.ts
  grep -n "universalProviderOptions\|UniversalProviderOptions\|ParameterNormalizer\|ProviderFactoryConfig\|GenericProviderOptions" src/lib/types/sdk.ts
  ```

  Expected: first command's only hit is `src/lib/types/index.ts` (the barrel). Second command returns nothing (zero usages of `ParameterNormalizer` anywhere). Third confirms `src/lib/index.ts` re-exports the types barrel wholesale. Fourth returns nothing — the curated `./types` sub-export path is clean and unaffected by this deletion.

- [ ] Delete `src/lib/types/universalProviderOptions.ts`.

- [ ] Edit `src/lib/types/index.ts` to remove the line `export * from "./universalProviderOptions.js";`.

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted SDK client suite.

  ```bash
  npx tsx test/continuous-test-suite-client.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/types/universalProviderOptions.ts src/lib/types/index.ts
  git commit -m "$(cat <<'EOF'
  chore(types)!: remove dead universalProviderOptions abstraction

  Abandoned Phase-1 "provider factory" option-normalization design with
  zero real consumers in src/, test/, or docs/. Technically reachable from
  the package's main `.` export via the types barrel's export *, so this
  is a minor breaking change for any external consumer importing
  UniversalProviderOptions/ParameterNormalizer/etc. directly from
  '@juspay/neurolink' — none exist in this repo's own usage.
  EOF
  )"
  ```

---

### Task 5: Dead local-runtime config factories in `providerConfig.ts`

**Files:**

- Edit: `src/lib/utils/providerConfig.ts` — delete `createLmStudioConfig()` (lines 475-491) and `createLlamaCppConfig()` (lines 495-509), 35 lines total including the blank line between them

**Interfaces:**

- Removes: `createLmStudioConfig`, `createLlamaCppConfig` — two exported functions returning `ProviderConfigOptions` for LM Studio and llama.cpp.
- Unaffected: `lmStudio.ts` and `llamaCpp.ts` provider implementations never called these — their real config resolution is inline. `ProviderConfigOptions` type itself is untouched (used by other, live `create*Config` functions in the same file).

- [ ] Verify zero callers anywhere, including no internal dispatcher inside providerConfig.ts itself.

  ```bash
  grep -n "createLmStudioConfig\|createLlamaCppConfig" src/lib/utils/providerConfig.ts
  grep -rn "createLmStudioConfig\|createLlamaCppConfig" src/ test/
  ```

  Expected: first command's only hits are the two functions' own `export function` declaration lines (475, 495) — no internal reference elsewhere in the file. Second command's only hits are again those same two declaration lines — zero callers anywhere in src/ or test/ (references exist only in `docs/provider-integration/*.md` template docs, not real code).

- [ ] Delete lines 475-509 of `src/lib/utils/providerConfig.ts` (both function bodies plus their JSDoc comments and the blank line separating them).

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider suite.

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/utils/providerConfig.ts
  git commit -m "$(cat <<'EOF'
  chore(utils): remove dead createLmStudioConfig/createLlamaCppConfig

  Neither lmStudio.ts nor llamaCpp.ts ever called these; both providers
  resolve their config inline. Zero callers anywhere in src/ or test/.
  EOF
  )"
  ```

---

### Task 6: Dead standalone `supportsVision()` function in `anthropicModels.ts`

**⚠️ Scope correction from original assignment:** the original task said to delete both the standalone `supportsVision()` function AND the `supportsVision` field from `MODEL_METADATA` entries / the `AnthropicModelMetadata` type. Re-verification confirms the **function** is dead, but the **field** is not — deleting it would be a breaking change to a live, documented, generically-accessed public surface. Evidence below. Only the function is deleted in this task.

**Files:**

- Edit: `src/lib/models/anthropicModels.ts` — delete `supportsVision()` (lines 626-635, JSDoc + function + trailing blank line)
- **No change** to `src/lib/types/subscription.ts`'s `AnthropicModelMetadata` type or to any `MODEL_METADATA` entry's `supportsVision: true/false` field (lines 114, 128, 142, 156, 170, 184, 198, 212, 226) — these stay exactly as they are.

**Interfaces:**

- Removes: the free function `supportsVision(model: string): boolean` (a thin, redundant wrapper: `return MODEL_METADATA[model]?.supportsVision ?? false;`).
- Unaffected — and here is why the field must stay:
  1. `AnthropicModelMetadata` is exported from the types barrel (`src/lib/types/index.ts:55` → `export * from "./subscription.js";`) — it is part of the protected public types surface per Critical Rule 10/12, and TypeDoc generates a public page for it (`docs/api/type-aliases/AnthropicModelMetadata.md`).
  2. Two other **live, exported** functions in the same file — `modelSupportsCapability(model, capability)` (anthropicModels.ts:402-418) and `getModelsWithCapability(capability)` (:469-481) — are generically typed over `keyof Omit<AnthropicModelMetadata, "displayName" | "description" | "family">`, which makes `"supportsVision"` a valid, live, runtime-checkable capability key for both functions via `metadata[capability]` indexing. This is the field's actual designed access path, not an incidental one.
  3. `getModelCapabilities` (an alias for `getModelMetadata`, which returns the full `AnthropicModelMetadata` object) is imported by `anthropic/client.ts` and **re-exported** at the bottom of that file (`client.ts:2569-2575`, "Re-export types and utilities for convenience"), propagating through `anthropic/index.ts`'s `export * from "./client.js"` barrel. `docs/features/claude-subscription.md:978` documents this function's example output as explicitly including `supportsVision: true` — external code calling the documented `getModelCapabilities()` API depends on this field being present in the return shape.
  4. Deleting the field would therefore change the return shape of a re-exported, documented public function — exactly the case the Global Constraints block's "prefer deprecation comment over deletion unless provably unused" carve-out exists for. The function, by contrast, has zero callers anywhere (real vision checks route through the unrelated `ProviderImageAdapter.supportsVision(provider, model)` static method instead) and is provably unused.

- [ ] Verify the standalone function has zero callers, and confirm the field's two live internal readers plus its public re-export chain.

  ```bash
  grep -rn "\bsupportsVision(" src/ test/ docs/ | grep -v "anthropicModels.ts:6[23][0-9]\|ProviderImageAdapter"
  grep -n "modelSupportsCapability\|getModelsWithCapability" src/lib/models/anthropicModels.ts
  grep -n "getModelCapabilities\|getModelMetadata" src/lib/providers/anthropic/client.ts
  grep -n "subscription" src/lib/types/index.ts
  ```

  Expected: first command returns nothing (the only two hits for the literal `supportsVision(` call/definition pattern are the dead function's own definition and the unrelated `ProviderImageAdapter` static method, both filtered out — meaning zero real external callers of the free function). Second command shows both functions accept a generic `capability` parameter typed against `AnthropicModelMetadata`'s keys. Third shows `client.ts:27` imports `getModelCapabilities`, `client.ts:1034` calls it inside the provider's own public `getModelCapabilities()` instance method, and `client.ts:2571` re-exports the free function of the same name. Fourth confirms `export * from "./subscription.js";` at line 55 — `AnthropicModelMetadata` is barrel-exported.

- [ ] Delete `src/lib/models/anthropicModels.ts:626-635` — the JSDoc comment, the `supportsVision(model: string): boolean` function body, and the trailing blank line, so the file flows directly from whatever precedes line 626 into the next function's (`supportsExtendedThinking`) JSDoc, which currently starts at line 636.

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted model-capabilities and credentials suites.

  ```bash
  npx tsx test/continuous-test-suite-model-capabilities.ts
  npx tsx test/continuous-test-suite-credentials.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/models/anthropicModels.ts
  git commit -m "$(cat <<'EOF'
  chore(models): remove dead standalone supportsVision() in anthropicModels

  The free function was a redundant wrapper around
  MODEL_METADATA[model]?.supportsVision with zero callers — real vision
  checks go through ProviderImageAdapter.supportsVision() instead. The
  supportsVision FIELD stays: it's a live generic capability read by
  modelSupportsCapability()/getModelsWithCapability(), part of the
  publicly barrel-exported AnthropicModelMetadata type, and documented as
  part of getModelCapabilities()'s return shape (re-exported from
  anthropic/client.ts). Only the dead function is removed.
  EOF
  )"
  ```

---

### Task 7: Duplicate zod schemas in `dynamicModels.ts`

**Files:**

- Edit: `src/lib/core/dynamicModels.ts` — delete the local `ModelConfigSchema`/`ModelRegistrySchema` declarations (lines 9-31, including their leading comment) and import the canonical ones from the types barrel instead

**Interfaces:**

- Removes: two locally-declared `const` zod schemas that were byte-for-byte duplicates (same field names, same types, same order, same nested `z.record(z.string(), z.record(z.string(), ModelConfigSchema))` shape) of the canonical `ModelConfigSchema`/`ModelRegistrySchema` already exported from `src/lib/types/model.ts:79-101` and re-exported via the types barrel (`src/lib/types/index.ts:40` → `export * from "./model.js";`).
- Unaffected: neither local schema constant was itself exported from `dynamicModels.ts` (they were plain `const`, not `export const`), so nothing outside this one file could have imported them directly — this is a same-file, zero-blast-radius substitution. `dynamicModels.ts`'s own real consumers (`src/lib/index.ts:155`, `src/lib/core/factory.ts:10`, `src/lib/constants/contextWindows.ts:14`) only ever touch the `dynamicModelProvider`/`DynamicModelProvider` singleton, never the schema constants.

- [ ] Verify the canonical schemas' exact location and confirm the local ones are true duplicates, not near-duplicates.

  ```bash
  grep -n "ModelConfigSchema\|ModelRegistrySchema" src/lib/types/model.ts
  grep -n "ModelConfigSchema\|ModelRegistrySchema" src/lib/types/index.ts
  grep -n "ModelConfigSchema\|ModelRegistrySchema" src/lib/core/dynamicModels.ts
  ```

  Expected: first command confirms `ModelConfigSchema` at `types/model.ts:79-90` and `ModelRegistrySchema` at `:95-101`, both exported. Second confirms `types/index.ts:40` re-exports the whole file via `export *`. Third confirms `dynamicModels.ts` has its own local copies at lines 12-23 and 25-31 — read both files' schema bodies side-by-side to confirm they are field-for-field identical before deleting (they are: verified during plan-writing).

- [ ] Edit `src/lib/core/dynamicModels.ts`: delete lines 9-31 (the comment plus both local schema `const` declarations), and change the existing type-only import block (currently, around lines 4-7):

  ```typescript
  import type {
    DynamicModelConfig as ModelConfig,
    ModelRegistry,
  } from "../types/index.js";
  ```

  to a combined value+type import that also pulls in the two runtime schema values:

  ```typescript
  import {
    ModelConfigSchema,
    ModelRegistrySchema,
    type DynamicModelConfig as ModelConfig,
    type ModelRegistry,
  } from "../types/index.js";
  ```

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted dynamic-models suite.

  ```bash
  npx tsx test/continuous-test-suite-dynamic.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/core/dynamicModels.ts
  git commit -m "$(cat <<'EOF'
  refactor(core): dedupe dynamicModels.ts zod schemas

  ModelConfigSchema/ModelRegistrySchema were redeclared locally,
  field-for-field identical to the canonical versions already exported
  from types/model.ts. Import the canonical ones instead of maintaining
  two copies that can silently drift.
  EOF
  )"
  ```

---

### Task 8: Dead slices of `modelConfiguration.ts`

**⚠️ Scope correction from original assignment:** the original task framed this 1,130-line file as "not wired into the live createProvider path," to be mostly deleted except a `TelemetryHandler.calculateActualCost` pricing-fallback slice. Re-verification found this framing is wrong: the `modelConfig` singleton has **7 real production call sites** across the codebase (analytics, evaluation, telemetry, and two providers), not one. The file **stays**. Only 3 genuinely-dead class methods, 1 dead top-level const, and 4 dead module-level wrapper functions are deleted.

**Files:**

- Edit: `src/lib/core/modelConfiguration.ts` (1,129 lines) — delete `updateProviderConfiguration` (~line 686), `loadConfigurationsFromFile` (~line 775), `getConfigurationMeta` (~line 1018) class methods; delete the top-level `MODEL_NAMES` const (line 21); delete the 4 module-level wrapper functions `getProviderConfiguration`/`getModelForTier`/`getCostInfo`/`isProviderAvailable` at lines 1098-1129 (note: these free-function wrappers are dead — every real caller uses the `modelConfig` singleton's own instance methods of the same names instead, not these wrappers)

**Interfaces:**

- Removes: 3 dead class methods, 1 dead const, 4 dead free-function wrappers.
- **Stays live and unchanged:** the `ModelConfigurationManager` class, the `modelConfig` singleton instance (line 1089), and all of its instance methods actually called by:
  1. `src/lib/core/modules/TelemetryHandler.ts:193` — `calculateActualCost()`, falls back to `modelConfig.getCostInfo(...)` after `pricing.ts`'s `calculateCost`/`hasPricing` miss.
  2. `src/lib/core/analytics.ts:134` (inside `estimateCost()`, itself called live at `:37` from `createAnalytics`, imported by `streamAnalyticsCollector.ts`, `StreamHandler.ts`, and `amazonBedrock/client.ts`) — identical `pricing.ts`-then-`modelConfig.getCostInfo()` fallback pattern.
  3. `src/lib/core/evaluationProviders.ts` — imports `modelConfig`, calls `.getAllConfigurations()` (:38), `.getProviderConfiguration()` (:61), `.getAvailableProviders()` (:70), `.getCostInfo()` (:117), `.isProviderAvailable()` (:130); this file is itself re-exported from the types barrel (`src/lib/types/index.ts:25`, a pre-existing Rule-12 violation, out of scope here) and imported by `TelemetryHandler.ts:33`.
  4. `src/lib/core/evaluation.ts:231` — `modelConfig.getModelForTier(...)`, reached via `TelemetryHandler.ts:74`'s dynamic `import("../evaluation.js")`.
  5. `src/lib/neurolink.ts:10500-10503` — dynamic `import()` of `ModelConfigurationManager`, `.getInstance().getProviderConfiguration("ollama")`.
  6. `src/lib/providers/ollama/client.ts:2,195` — `modelConfig.getProviderConfiguration("ollama")`.
  7. `src/lib/providers/googleVertex/client.ts:26,8722` — `ModelConfigurationManager.getInstance().getProviderConfiguration("google-vertex")`.
- `pricing.ts` (`src/lib/utils/pricing.ts`) is not a repoint target — it's already the _primary_ path both fallback call sites try first; `modelConfiguration.ts`'s cost data is the secondary source, not competing infrastructure.

- [ ] Trace every real consumer of `modelConfig`/`getCostInfo`/`ModelConfigurationManager` to separate live from dead, and confirm the 3 methods + const + 4 wrappers are genuinely uncalled.

  ```bash
  grep -rn "modelConfig\b" src/ test/
  grep -rn "getCostInfo" src/ test/
  grep -rn "ModelConfigurationManager" src/ test/
  grep -n "updateProviderConfiguration\|loadConfigurationsFromFile\|getConfigurationMeta\|MODEL_NAMES" src/lib/core/modelConfiguration.ts
  ```

  Expected: first three commands together produce the 7 production call sites listed above (plus internal-to-the-file and test-file hits, which don't count as production consumers). Fourth command shows each of the 3 methods and the const appearing only once each — their own declaration line, no caller anywhere including inside the file itself. Also separately confirm the 4 module-level wrapper functions at 1098-1129 have no callers: `grep -rn "^import.*getProviderConfiguration\|^import.*getModelForTier\|^import.*getCostInfo\|^import.*isProviderAvailable" src/ test/` should be empty (every real caller goes through `modelConfig.<methodName>(...)` on the singleton instance, never these standalone function imports).

- [ ] Delete `updateProviderConfiguration`, `loadConfigurationsFromFile`, and `getConfigurationMeta` class methods (exact current line ranges — re-grep immediately before deleting since the file may have shifted since this plan was written) and the top-level `MODEL_NAMES` const (line 21) from `src/lib/core/modelConfiguration.ts`.

- [ ] Delete the 4 module-level wrapper functions at the end of the file (`getProviderConfiguration`/`getModelForTier`/`getCostInfo`/`isProviderAvailable`, lines 1098-1129) — these are free-function convenience wrappers around the singleton, distinct from and redundant with the singleton's own instance methods of the same names, which stay.

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider, observability, and evaluation suites (covering ollama/googleVertex config reads, telemetry cost fallback, and evaluationProviders.ts respectively).

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  npx tsx test/continuous-test-suite-observability.ts
  npx tsx test/continuous-test-suite-evaluation.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/core/modelConfiguration.ts
  git commit -m "$(cat <<'EOF'
  chore(core): trim dead slices of modelConfiguration.ts

  ModelConfigurationManager and its modelConfig singleton are live
  infrastructure (analytics cost fallback, evaluation model-tier lookup,
  TelemetryHandler, ollama/googleVertex runtime config) — not dead code.
  Only 3 class methods, 1 const, and 4 unused module-level wrapper
  functions (every real caller uses the singleton's own instance methods
  instead) had zero callers; those are what's removed here.
  EOF
  )"
  ```

---

### Task 9: Stale-comment truth fixes

**Files:**

- Edit: `src/lib/core/modules/structuredOutputPolicy.ts` (line 47 area — corrected path; not `src/lib/policies/`)
- Edit: `src/lib/core/modules/GenerationHandler.ts` (lines 364-366 area)
- Edit: `CLAUDE.md` (lines 162, 266, 272)
- Edit: `src/lib/providers/perplexity.ts` (line 34)

**Interfaces:** None — comment/doc-only changes, zero runtime behavior change.

- [ ] Verify all four stale claims against the actual implementations.

  ```bash
  sed -n '44,50p' src/lib/core/modules/structuredOutputPolicy.ts
  sed -n '362,368p' src/lib/core/modules/GenerationHandler.ts
  grep -n "@ai-sdk/amazon-bedrock" src/ package.json -r
  grep -n "amazon-bedrock\|@aws-sdk" src/lib/providers/amazonBedrock/client.ts src/lib/providers/amazonBedrock/utils.ts
  grep -n "AIProviderName" CLAUDE.md src/lib/constants/enums.ts
  sed -n '30,40p' src/lib/providers/perplexity.ts
  grep -n "citation" src/lib/providers/perplexity.ts src/lib/providers/openaiChatCompletionsBase.ts
  ```

  Expected:
  - `structuredOutputPolicy.ts:46-48` currently reads (in part) `"...handling (it runs on the third-party @ai-sdk/amazon-bedrock model) and still falls back to text-mode coercion."` — false. Bedrock's real implementation imports directly from `@aws-sdk/client-bedrock-runtime` (`amazonBedrock/client.ts:10,16,2461`) and dynamically from `@aws-sdk/client-bedrock` (`amazonBedrock/utils.ts:2,4`); `@ai-sdk/amazon-bedrock` is not a dependency anywhere in `package.json` or `src/`.
  - `GenerationHandler.ts:364-366` currently reads (in part) `"...Bedrock is deliberately excluded — it runs on the third-party @ai-sdk/amazon-bedrock model, which has no such handling."` — same false claim, same proof.
  - `CLAUDE.md:162` (Key Files table) and `:266`/`:272` (How-To Guide) claim `AIProviderName` lives in `src/lib/types/providers.ts` — it lives in `src/lib/constants/enums.ts:8`. (`types/providers.ts` does separately define the `AIProvider` type/interface — only the `AIProviderName` enum location claim is wrong.)
  - `perplexity.ts:34`'s docstring claims `"web context (search-augmented answers + citations)"` — the word "citation" appears nowhere else in the file or in the shared `openaiChatCompletionsBase.ts` base class; there is no citation extraction/parsing/return logic anywhere.

- [ ] Fix `src/lib/core/modules/structuredOutputPolicy.ts` — replace the false `@ai-sdk/amazon-bedrock` claim with an accurate description (Bedrock uses the raw AWS SDK directly, not an ai-sdk provider package).

- [ ] Fix `src/lib/core/modules/GenerationHandler.ts` — same correction, matching wording style to the surrounding comment.

- [ ] Fix `CLAUDE.md` — change all three `AIProviderName` location references (Key Files table row at line 162, How-To Guide step at line 266, code sample context at line 272) from `src/lib/types/providers.ts` to `src/lib/constants/enums.ts`.

- [ ] Fix `src/lib/providers/perplexity.ts` — remove or qualify the "+ citations" claim in the line-34 docstring so it accurately reflects that no citation data is extracted or returned.

- [ ] Run the full verification gate (docs/comment-only changes still must pass typecheck/lint since CLAUDE.md is markdown but the 3 source files are TS).

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Commit.

  ```bash
  git add src/lib/core/modules/structuredOutputPolicy.ts src/lib/core/modules/GenerationHandler.ts CLAUDE.md src/lib/providers/perplexity.ts
  git commit -m "$(cat <<'EOF'
  docs: fix four stale comments claiming things that aren't true

  structuredOutputPolicy.ts and GenerationHandler.ts both claimed Bedrock
  runs on @ai-sdk/amazon-bedrock — it uses the raw AWS SDK directly, and
  that package isn't even a dependency. CLAUDE.md's key-files table and
  how-to guide pointed AIProviderName at types/providers.ts; it lives in
  constants/enums.ts. perplexity.ts's docstring claimed citation support
  the implementation never provides.
  EOF
  )"
  ```

---

### Task 10: Unreachable class-constructor fallback branch in `providerFactory.ts`

**Files:**

- Edit: `src/lib/factories/providerFactory.ts` — simplify `createProvider`'s inner try/catch (lines 127-172) to remove the unreachable constructor-retry branch

**Interfaces:** None — the outer `catch (error)` block (line 175, unchanged) already formats and rethrows any error from the inner block identically to how the dead branch's `else { throw factoryError; }` did, so this is a behavior-preserving simplification, not a behavior change.

- [ ] Verify the branch is unreachable: every registered factory is an arrow function (arrow functions have no `.prototype`, so the guard `registration.constructor.prototype && ...` is always falsy), and confirm the outer catch already handles the rethrow identically.

  ```bash
  sed -n '118,182p' src/lib/factories/providerFactory.ts
  grep -c "registerProvider(" src/lib/factories/providerRegistry.ts
  grep -n "registerProvider(\s*$" src/lib/factories/providerRegistry.ts | head -5
  ```

  Expected: the read confirms the `if (registration.constructor.prototype && registration.constructor.prototype.constructor === registration.constructor)` guard at lines 144-148, whose `if` body (the `new (registration.constructor as new (...) => AIProvider)(...)` constructor-retry attempt, lines 149-168) can never execute because every one of the 30 `registerProvider(` calls in `providerRegistry.ts` passes an `async (modelName?, ...) => {...}` arrow function as the factory — arrow functions have no `.prototype` property per the JS spec, so the guard is always `false` and execution always falls to the `else { throw factoryError; }` at line 170. The outer `catch (error)` at line 175 formats and rethrows any error identically regardless of which inner path produced it.

- [ ] Edit `src/lib/factories/providerFactory.ts`, replacing lines 125-172 (the `let result: AIProvider;` declaration plus the whole inner try/catch) with a direct, non-wrapped call — letting any factory error propagate straight to the existing outer `catch (error)` at line 175 unchanged:

  ```typescript
  const factoryResult = (
    registration.constructor as (
      modelName?: string,
      providerName?: string,
      sdk?: NeuroLink,
      region?: string,
      credentials?: Record<string, unknown>,
    ) => Promise<AIProvider> | AIProvider
  )(model, resolvedProviderName, sdk, region, scopedCredentials);

  const result =
    factoryResult instanceof Promise ? await factoryResult : factoryResult;
  ```

  (The surrounding outer `try { ... } catch (error) { logger.error(...); throw new Error(...); }` at lines 118/175-181 stays exactly as-is; only the inner try/catch and its dead branch are removed.)

- [ ] Run the full verification gate.

  ```bash
  pnpm run check && pnpm run lint && pnpm run build
  ```

- [ ] Run the targeted provider suite (exercises `createProvider` across every registered provider).

  ```bash
  npx tsx test/continuous-test-suite-providers.ts
  ```

- [ ] Commit.

  ```bash
  git add src/lib/factories/providerFactory.ts
  git commit -m "$(cat <<'EOF'
  refactor(factories): remove unreachable constructor-fallback branch

  Every registerProvider() call in providerRegistry.ts passes an arrow
  function; arrow functions have no .prototype, so the guard gating the
  "retry as a class constructor" fallback can never be true. The outer
  catch already formats and rethrows the same error either way — this is
  a behavior-preserving simplification.
  EOF
  )"
  ```

---

## Verification Checklist

- [ ] All 10 tasks' grep-verification steps were re-run against the current tree (not copy-pasted from this plan's cached line numbers) immediately before each deletion.
- [ ] `pnpm run check && pnpm run lint && pnpm run build` passes after every single task, not just at the end.
- [ ] Every provider directory's `index.ts` barrel exports exactly the files that still exist in that directory — no barrel line points at a deleted file.
- [ ] `src/lib/types/index.ts` no longer exports `universalProviderOptions.js`; every other barrel line is untouched.
- [ ] `AnthropicModelMetadata`'s `supportsVision` field is confirmed still present in the type (`src/lib/types/subscription.ts`) and in all 9 `MODEL_METADATA` entries — this task deliberately did NOT touch it.
- [ ] `modelConfiguration.ts`'s `ModelConfigurationManager` class and `modelConfig` singleton are confirmed still present and functioning — this task deliberately did NOT delete the file.
- [ ] `npx tsx test/continuous-test-suite-providers.ts` passes after Tasks 1, 2, 3, 5, 8, 10 (the tasks that touch provider-instantiation-adjacent code).
- [ ] `npx tsx test/continuous-test-suite-model-capabilities.ts` and `test:credentials` pass after Task 6.
- [ ] `npx tsx test/continuous-test-suite-dynamic.ts` passes after Task 7.
- [ ] `npx tsx test/continuous-test-suite-observability.ts` and `test:evaluation` pass after Task 8.
- [ ] `git log` shows one commit per task (10 commits), each a conventional-commit message, none pushed.
- [ ] A final `grep -rn "TODO\|FIXME" <touched files>` sanity check shows no leftover markers from the edits.

## Risks & Rollback

- **Risk — Task 3 (googleVertex) is the largest single edit** (12 functions across a 9,966-line file, deleted in two blocks whose line numbers shift relative to each other). Mitigation: delete bottom-to-top (second block, i.e. the higher line numbers, first) so the first block's line numbers never move out from under you mid-edit; re-run the grep-verification step after the first deletion to get fresh line numbers before the second.
- **Risk — Task 4 (universalProviderOptions.ts) is a nominal breaking change.** It's reachable via the package's main `.` export today, even though nothing internally or externally (per repo-wide grep) consumes it. If semantic-release / commit-message conventions in this repo treat a `!`-suffixed conventional commit as a major-version trigger, confirm that's the intended signal before merging — a `chore!:` may need to become a plain `chore:` with a note in the PR description instead, depending on how strictly this repo's release automation reads commit types. Rollback: `git revert` the single Task 4 commit; the deleted file's content is fully captured in this plan's Task 4 section if it needs reconstructing without a git history dive.
- **Risk — Task 6 deliberately does LESS than originally assigned** (keeps the `supportsVision` field). If the team intended a genuine breaking change to `AnthropicModelMetadata`'s shape as part of a larger model-metadata consolidation (out of scope here, see below), this task's conservative choice may need revisiting once that consolidation plan exists — at that point deleting the field becomes a deliberate, coordinated breaking change rather than an accidental one, which is a different decision than this task is scoped to make alone.
- **Risk — Task 8 deliberately does LESS than originally assigned** (keeps the file). Same shape of risk as Task 6: if a broader model-configuration consolidation plan later wants to retire `ModelConfigurationManager` entirely in favor of a unified registry, that's a coordinated migration (repoint 7 call sites, not just delete), not a dead-code deletion — explicitly out of scope for this plan.
- **Rollback, general:** every task is a single, independent commit. Any task can be reverted in isolation with `git revert <sha>` without affecting the others, since no task's deletions depend on another task's deletions (the only soft ordering constraint is within Task 3, noted above).

## Out of Scope

- **SageMaker orphaned streaming code** — flagged in the audit as a separate dead/orphaned pattern in the SageMaker provider; whether to wire it up or delete it is a design decision, not a mechanical dead-code deletion. Covered by **Plan 08**.
- **Vertex's duplicated live loops** (the _live_ code paths that duplicate logic across `executeNativeGemini3Stream/Generate` and `executeNativeAnthropicStream/Generate`, as opposed to this plan's Task 3, which only removes the fully-dead legacy call tree those live paths replaced) — a refactor of working code, not a deletion of dead code. Covered by **Plan 08**.
- **MODEL_REGISTRY consolidation** — merging the anthropicModels.ts / MODEL_REGISTRY / MODEL_CONTEXT_WINDOWS / VISION_CAPABILITIES model-metadata stores into one source of truth, including any future decision to reshape `AnthropicModelMetadata` itself (which would supersede this plan's conservative Task 6 choice to keep `supportsVision` as-is). Covered by **Plan 06**.
- **`OLLAMA_OPENAI_COMPATIBLE` doc/behavior mismatch** — discovered incidentally during Task 1's ollama verification (the env var is documented as live in `docs/getting-started/providers/ollama.md` and `docs/reference/provider-capabilities-audit.md`, but the code path that would read it is dead and client.ts's docstring says the provider now always uses the OpenAI-compatible API unconditionally). This is a docs-accuracy issue adjacent to, but distinct from, the dead-code deletion this plan performs — worth a follow-up docs fix, not bundled into Task 1 here.
- **`evaluationProviders.ts`'s barrel re-export from `src/lib/types/index.ts`** — noted during Task 8's consumer trace as a pre-existing Critical Rule 12 violation (a non-type file's content re-exported from the types barrel). Not part of this plan's scope; flagged for whichever plan owns general Rule-12 cleanup, if one exists.
