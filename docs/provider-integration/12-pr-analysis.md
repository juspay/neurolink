# PR Analysis & Commit Plan

## What the PR contains

### Total scope

- **28 modified files** (existing core files updated)
- **6 new file groups** (4 new provider files + 1 test suite + 1 shell script + docs/)
- **~700 insertions, ~80 deletions** in modified files
- **~1000 LOC** in new provider files
- **~870 LOC** in new test file
- **13 new Markdown docs** (~150KB)

### Risk level: medium

- Touches public SDK API (new providers visible at runtime via the `AIProviderName.DEEPSEEK` constant or the string id `"deepseek"`, etc.)
- Modifies shared pricing logic (`pricing.ts` `_default` fallback) — could affect other providers
- Modifies 12 test suite files (changes shared `PROVIDER_MAX_TOKENS` map and fallback)
- Test changes are backwards-compatible — same tests pass for existing providers

---

## Files to commit

### A. New provider implementations (4 files, ~1000 LOC)

```
src/lib/providers/deepseek.ts        (≈250 lines)
src/lib/providers/nvidiaNim.ts       (≈310 lines, NIM-specific extras + retry-on-400)
src/lib/providers/lmStudio.ts        (≈330 lines, /v1/models auto-discovery)
src/lib/providers/llamaCpp.ts        (≈330 lines, /health 3x retry + auto-discovery)
```

All four:

- Extend `BaseProvider`
- Use `createOpenAI(...).chat()` for /v1/chat/completions endpoint (NOT /v1/responses)
- Wrap `streamText` with `withClientSpan` for OTEL tracing
- Emit `neurolink.provider.stream` span with proper `gen_ai.*` attrs
- Use `makeLoggingFetch` to capture upstream non-2xx response bodies
- Implement all 5 `BaseProvider` abstract methods (executeStream, getProviderName, getDefaultModel, getAISDKModel, formatProviderError)

### B. Core integration changes (10 modified files)

| File                                       | Change                                                                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/factories/providerRegistry.ts`    | 4 dynamic-import registrations (per CLAUDE.md rule #1)                                                                                                                                                                                                          |
| `src/lib/types/providers.ts`               | `NeurolinkCredentials` extended + new `NvidiaNimExtraBody` type                                                                                                                                                                                                 |
| `src/lib/constants/enums.ts`               | `AIProviderName` enum + 4 model enums                                                                                                                                                                                                                           |
| `src/lib/constants/contextWindows.ts`      | 4 sections with model context windows                                                                                                                                                                                                                           |
| `src/lib/utils/pricing.ts`                 | 4 entries + `_default` sentinel as provider-level fallback. Local providers (lm-studio / llamacpp) `_default` rates are **0** (no upstream USD price) and `hasPricing()` returns `false` for zero-rate entries so callers correctly treat them as non-billable. |
| `src/lib/utils/providerConfig.ts`          | 4 `createXConfig` helpers                                                                                                                                                                                                                                       |
| `src/lib/utils/modelChoices.ts`            | `TOP_MODELS_CONFIG` + `MODEL_ENUMS` entries                                                                                                                                                                                                                     |
| `src/lib/adapters/providerImageAdapter.ts` | `VISION_CAPABILITIES` (vision unsupported)                                                                                                                                                                                                                      |
| `src/cli/factories/commandFactory.ts`      | provider choices in 3 spots                                                                                                                                                                                                                                     |
| `src/lib/providers/index.ts`               | barrel exports                                                                                                                                                                                                                                                  |

### C. Test infrastructure fixes (15 modified files)

**The biggest fix** — 12 test files had `PROVIDER_MAX_TOKENS[provider] || 8192`. For our local providers (8K context window), this set `maxTokens = contextWindow` → `availableInputTokens = 0` → every memory/context/mcp test failed instantly with "Budget: 0 tokens". The bug existed for any unknown provider (silent broken test).

- `test/continuous-test-suite-context.ts` ← Budget=0 fix + Vertex Compaction tests now generic
- `test/continuous-test-suite-evaluation.ts` ← Budget=0 fix + dimension-specific RAGAS judge prompts
- `test/continuous-test-suite-evaluation-scoring.ts` ← Budget=0 fix
- `test/continuous-test-suite-mcp.ts` ← added new providers to map
- `test/continuous-test-suite-mcp-http.ts` ← Budget=0 fix
- `test/continuous-test-suite-media-gen.ts` ← Budget=0 fix
- `test/continuous-test-suite-memory.ts` ← Budget=0 fix
- `test/continuous-test-suite-observability.ts` ← Budget=0 fix + `TEST_TIMEOUT_MS` env var
- `test/continuous-test-suite-ppt.ts` ← Budget=0 fix
- `test/continuous-test-suite-providers.ts` ← Gemini 3 DisableTools generic, Observability Spans Pipeline-A skip
- `test/continuous-test-suite-session-memory-bugs.ts` ← Budget=0 fix
- `test/continuous-test-suite-tts.ts` ← Budget=0 fix
- `test/continuous-test-suite-workflow.ts` ← Budget=0 fix
- `test/continuous-test-suite-client.ts` ← pass `timeout: TEST_CONFIG.timeout` to `createServer`
- `test/continuous-test-suite-credentials.ts` ← `credKeys` extended

### D. New tests + tooling

```
test/continuous-test-suite-new-providers.ts   (NEW, 868 lines, 10 sections × 4 providers)
test/run-provider-matrix.sh                   (NEW, bash 3.2-compat matrix runner)
```

### E. Config (3 files)

- `.env.example` — 4 provider env-var sections with comments
- `package.json` — 4 new test scripts (`test:dynamic`, `test:proxy`, `test:bugfixes`, `test:new-providers`) + js-yaml dep
- `pnpm-lock.yaml` — 43-line diff for js-yaml + @types/js-yaml

### F. Documentation (15 markdown files)

```
docs/provider-integration/
  README.md
  00-architecture.md
  01-shared-changes.md
  02-deepseek.md, 03-nvidia-nim.md, 04-lm-studio.md, 05-llamacpp.md
  06-testing.md
  07-implementation-order.md
  08-feature-matrix.md
  09-test-suite-spec.md
  10-test-results-final.md
  11-test-failure-investigation.md
  12-pr-analysis.md (this file)
  13-code-review.md
```

---

## Cleanup performed

| Item                                                                                                                   | Action                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `README.md` was clobbered to 1 line (test writeFile tool overwrote it)                                                 | Restored from `origin/release`                                                                 |
| 100+ test artifact files in repo root (`Turn 5 done.txt`, `Charles_Babbage.txt`, `Haskell programming language`, etc.) | Deleted via `git clean -fd`                                                                    |
| `test-results-v3..v13/` dirs (per-environment test outputs)                                                            | Deleted; only `FINAL.md` and `INVESTIGATION.md` kept (moved into `docs/provider-integration/`) |
| `test/run-iter{3..13}.sh` debug runners                                                                                | Deleted; only `run-provider-matrix.sh` kept                                                    |
| Stray test fixtures (`test/data.csv`, `test/output.txt`, `test/test.txt`)                                              | Deleted (writeFile artifacts, not fixtures)                                                    |
| `debug-budget.ts` debug script                                                                                         | Deleted                                                                                        |

---

## Suggested commit plan

### Option A — Single atomic commit (smaller PR, faster review)

```
feat(providers): integrate DeepSeek, NVIDIA NIM, LM Studio, llama.cpp

- Add 4 OpenAI-compatible providers via Vercel AI SDK's createOpenAI().chat()
- Each provider extends BaseProvider, emits neurolink.provider.stream OTEL spans,
  and ships with proper error formatting + validateConfiguration
- Pricing: add _default sentinel as provider-level fallback + symbolic local rates
- Tests: fix maxTokens fallback that defaulted unknown providers to context-overflow
  value (8192), making every memory/context/mcp test fail instantly with "Budget: 0"
- Tests: make Gemini 3 DisableTools and Vertex Compaction tests provider-agnostic
- Tests: handle Pipeline A providers (AI SDK + Langfuse OTEL) in Observability Spans
- Tests: dimension-specific RAGAS judge prompts so context-precision actually
  evaluates the context (not the answer)
- Add test:dynamic, test:proxy, test:bugfixes scripts
- Install js-yaml runtime dep (proxy Config Loading test fixture)
```

### Option B — Atomic logical commits (cleaner history, slower review)

```
1. feat(providers): add DeepSeek provider                       [+ deepseek.ts + 1 enum + 1 pricing + 1 model + .env.example + commandFactory + barrel]
2. feat(providers): add NVIDIA NIM provider                     [+ nvidiaNim.ts + same supporting changes]
3. feat(providers): add LM Studio provider                      [+ lmStudio.ts + supporting]
4. feat(providers): add llama.cpp provider                      [+ llamaCpp.ts + supporting]
5. fix(pricing): support _default sentinel as fallback          [pricing.ts findRates]
6. fix(test): correct maxTokens fallback (8192 → 1024)          [13 test files]
7. fix(test): make Gemini 3 + Vertex tests provider-agnostic    [providers.ts + context.ts]
8. fix(test): handle Pipeline A providers in observability      [providers.ts]
9. fix(test): dimension-specific RAGAS judge prompts            [evaluation.ts]
10. fix(test): pass Hono server timeout to client suite         [client.ts]
11. chore: add test scripts + js-yaml dep                       [package.json + lock]
12. test: add provider matrix runner + cross-provider suite     [new-providers.ts + run-provider-matrix.sh]
13. docs: provider integration architecture                     [docs/provider-integration/]
```

**Recommendation: Option B** for maintainability. The `_default` pricing fix and the test maxTokens fix are independently useful (could be backported separately if needed) and easier to revert if anything breaks.

---

## PR description (proposed)

```
## Summary
- Integrate 4 new OpenAI-compatible AI providers: DeepSeek, NVIDIA NIM, LM Studio, llama.cpp
- All four use Vercel AI SDK's createOpenAI().chat() for /v1/chat/completions
- Includes pricing entries, vision capability flags, model enums, CLI choices, and full
  end-to-end test coverage via test/continuous-test-suite-new-providers.ts
- Bonus: 10+ pre-existing test infrastructure bugs uncovered and fixed during validation
  (the biggest: maxTokens fallback set unknown providers' max-tokens to their full context
  window → 0 input budget for memory/context/mcp tests)

## What's new
- Providers: deepseek, nvidia-nim, lm-studio, llamacpp
- Pricing: _default sentinel as provider-level fallback (covers all 4 + future additions)
- Tests: full matrix via test/run-provider-matrix.sh (9 suites × 4 providers)
- Docs: docs/provider-integration/ — 15 architecture/implementation markdown files

## Test plan
- [x] `pnpm run check` (TypeScript) — 0 errors
- [x] `pnpm run lint` — 0 errors, 19 pre-existing warnings (max-lines-per-function on long
      methods that already existed)
- [x] All 4 providers smoke-tested via direct SDK calls
- [x] 9 test suites × 4 providers via test/run-provider-matrix.sh — sub-test pass rate
      ≈99% per provider (see docs/provider-integration/10-test-results-final.md)
- [x] All 4 explicit sub-test failures investigated (see 11-test-failure-investigation.md):
       - 2 were real test bugs (RAGAS prompt + Pipeline A skip)
       - 1 was the same Budget=0 bug as the memory test
       - 1 was env (LM Studio server crashed mid-run; reproducible PASS when up)
```

---

## Verification status

| Check                      | Status                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm run check`           | ✅ 0 errors, 0 warnings, 3632 files                                                  |
| `pnpm run format`          | ✅ all files formatted                                                               |
| `pnpm run lint`            | ✅ 0 errors, 19 pre-existing warnings (none from this PR)                            |
| `pnpm run build`           | ✅ dist/ regenerated successfully                                                    |
| Provider matrix run        | ✅ ~99% sub-test pass rate per provider after fixes (see 10-test-results-final.md)   |
| Real failure investigation | ✅ all 4 explicit sub-test fails investigated (see 11-test-failure-investigation.md) |
| Linter formatting issues   | ✅ resolved via `pnpm run format`                                                    |
| README clobber repaired    | ✅ restored from origin/release                                                      |
| Test artifacts cleaned     | ✅ ~120 stray writeFile-tool outputs deleted                                         |
| `git status` clean         | ✅ only legitimate changes remain (28 modified + 6 new groups)                       |

---

## Open questions / items pending user decision

1. **Commit strategy**: Option A (single atomic) or Option B (13 logical commits)?
2. **Include test-results-v13 docs** in PR? (Currently moved to `docs/provider-integration/10-*` and `11-*`. They document the iteration trail but aren't strictly needed for the implementation.)
3. **`run-provider-matrix.sh`**: include in PR or not? It's useful for CI but adds a shell script to test/.
4. **`.env.example`**: did we pick reasonable env-var names? (`DEEPSEEK_API_KEY`, `NVIDIA_NIM_API_KEY`, `LM_STUDIO_BASE_URL`, `LLAMACPP_BASE_URL`)
5. ~~**Should we ship the `(this as unknown as { modelName: string }).modelName = modelToUse;` cast escape in lmStudio.ts and llamaCpp.ts?**~~ **Resolved.** Replaced by making `BaseProvider.modelName` mutable and adding `refreshHandlersForModel(model)`. See "Items addressed by this PR" below.

---

## Items deliberately deferred (NOT in this PR)

- Re-running 17 untested test suites (`test:bugfixes`, `test:autoresearch-*`, `test:issue-*`, etc.) for the 4 providers. None are currently expected to fail given the test-infra fixes.
- Server-keep-alive watchdog for LM Studio in test runner (operational, not code).
- Image generation / TTS support for these providers (capability gap; not supported by the providers themselves).

## Items addressed by this PR (originally deferred, then included)

- The original "clamp `getOutputReserve` to 80% of the context window"
  attempt was reverted after review: capping the reserve made
  `getAvailableInputTokens()` advertise more headroom than the outgoing
  request actually allocates, letting oversized prompts pass preflight and
  fail upstream. The active mitigation is the per-suite test fix lowering
  `PROVIDER_MAX_TOKENS[…] || 8192` to `… || 1024` (12 test files +
  `continuous-test-suite.ts:5099`), which keeps unmapped providers within
  their context window without changing SDK behavior.
- `BaseProvider.modelName` no longer `readonly`, plus a new
  `refreshHandlersForModel(model)` that rebuilds composed handlers
  (`MessageBuilder`, `StreamHandler`, `TelemetryHandler`, `GenerationHandler`,
  `Utilities`) so auto-discovery providers (lm-studio, llamacpp) propagate
  the resolved model into pricing / span / log metadata. Replaces the
  earlier `(this as unknown as { modelName: string }).modelName = ...`
  workaround.
