# 200-Provider Onboarding Playbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the nine architecture-redesign plans into a repeatable, CI-enforced process — a tiered onboarding guide, a scaffolding tool, and a data-driven completeness gate — so adding provider #50 through #230 is a checklist, not an archaeology exercise.

**Architecture:** Four onboarding tiers (aggregator passthrough → catalog entry → adapter-based native → full custom) map 1:1 to the four tables of effort the audit found (zero code / ~1 hour / days / bespoke). Each tier's checklist is derived from the _end state_ of Plans 04 (`ProviderDescriptor`), 05 (`OpenAICompatCatalogEntry`), and 07 (`classifyProviderError`) — not today's 25-touch-point reality. A new `docs/provider-integration/manifests/<provider>.json` convention plus a source-only, build-free CI script (`tools/verify-provider-onboarding.ts`) turn "did this PR wire the new provider correctly" from an honor-system checkbox into a data-driven, zero-network gate that diffs the `AIProviderName` enum against `PROVIDER_DESCRIPTORS`, `OPENAI_COMPAT_CATALOG`, the mocked-contract suite, and the manifest directory.

**Tech Stack:** TypeScript, tsx (no build step for tooling), Markdown docs, GitHub Actions (existing `ci.yml`), pnpm scripts.

**Spec:**

- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/10-openai-compat-family.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/gap1-ci-cd-automated-testing-coverage-for-ai-provider-c.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/00-provider-registration-instantiation-chain.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`

## Global Constraints

- Package manager: pnpm ONLY (repo pins version via `packageManager` field). Build: `pnpm run build`. Typecheck: `pnpm run check`. Lint+format check: `pnpm run lint`. Auto-format: `pnpm run format`.
- Tests run via tsx, NOT vitest (`vitest.config.ts` exists but is unused): `npx tsx test/continuous-test-suite-<name>.ts`. New suites need a matching `test:<name>` script in `package.json`.
- TEST HARNESS SKIP HAZARD: `defineSuite`'s `test()` classifies a thrown error as SKIP (not FAIL) when the message matches `isExpectedProviderError()` — so NEVER interpolate payloads/actual values into assertion messages (describe the discrepancy, e.g. "mismatch at `<keyPath>`"). When adding a suite, include a step to deliberately break one assertion and confirm it reports `✗` and exits non-zero, then restore.
- Repo critical rules (ESLint-enforced): (1) dynamic imports only in `providerRegistry.ts` factory closures — never static-import provider classes there; (2) ALL type definitions go in `src/lib/types/` — never create local `types/` dirs or inline shared types; (7) zero `interface` — always `type X = { ... }`, intersection (`&`) not `extends`; (8) no "Types" suffix in type filenames; (9) globally unique exported type names across `src/lib/types/` (use domain prefixes); (10) types barrel `src/lib/types/index.ts` contains only `export *` lines; (12) no type re-exports from non-type files; (13) code outside `src/lib/types/` imports internal types from the barrel (`../types` or `../types/index.js`), never from specific type files; (14) no double type assertions (`x as unknown as T`) in `src/`.
- Named exports only. No `export default`.
- `formatProviderError` must RETURN the error object, never throw.
- Backward compatibility: the public SDK API must not break existing callers.
- Conventional commits (feat:/fix:/refactor:/test:/docs:/chore:). Commit at the end of every task. NEVER `git push`.
- Workflow per change: edit → `pnpm run check` → `pnpm run lint` → targeted test suite(s) → commit.

**Plan-specific constraints:**

- **Hard dependency: this plan assumes Plans 02, 04, 05, and 07 have already landed on the branch you're working from.** Concretely: `src/lib/factories/providerDescriptors.ts` (exporting `PROVIDER_DESCRIPTORS`), `src/lib/providers/openaiCompatCatalog.ts` (exporting `OPENAI_COMPAT_CATALOG`), `ProviderDescriptor`/`OpenAICompatCatalogEntry` in `src/lib/types/providers.ts`, and `classifyProviderError`/`ProviderErrorRule`/`DEFAULT_ERROR_RULES` (Plan 07) must exist before Tasks 3, 4, 6, and 9 will pass their verification steps. If those files don't exist yet in your worktree, stop and land Plans 02/04/05/07 first — the code samples in this plan are written against their _documented end state_ (see the Shared cross-plan contracts each task's Interfaces block cites), not today's code.
- `tools/**/*.ts` is **excluded from `pnpm run check`** (`tsconfig.json` → `"exclude": [..., "tools", ...]`) and is **not matched by any ESLint `files:` block** (`eslint.config.js` only scopes TS-aware linting to `src/**/*.ts` and `test/**/*.ts`). This means the two new tools in this plan are verified by _running them_ and inspecting output, plus `pnpm run format` for Prettier compliance (Prettier's `--check .` in `pnpm run lint` covers every file in the repo, tools included) — not by `pnpm run check`/ESLint custom rules.
- Provider manifests (`docs/provider-integration/manifests/<name>.json`) are a plain JSON documentation/process convention, not a runtime SDK type. They deliberately do **not** get a `src/lib/types/` type — Critical Rule 2 governs types consumed by SDK code, not onboarding metadata read only by a docs-adjacent CI script. `tools/verify-provider-onboarding.ts` defines its own local `type ProviderManifest` for structural validation.
- The completeness gate (Task 9) is a **ratchet, not a retroactive audit**: it only enforces the four-artifact requirement for `AIProviderName` members added _after_ this plan lands. The 30 pre-existing providers are frozen into a `LEGACY_PROVIDERS` allowlist inside the tool (exact literal list captured in Task 9) so the gate doesn't fail on day one for the existing fleet, most of which predates the manifest/descriptor/catalog concepts entirely.

---

### Task 1: Architecture Decision Records

**Files:**

- Create: `docs/provider-integration/adr/README.md`
- Create: `docs/provider-integration/adr/0001-provider-descriptor-as-source-of-truth.md`
- Create: `docs/provider-integration/adr/0002-catalog-over-subclass-default.md`
- Create: `docs/provider-integration/adr/0003-mocked-contract-as-merge-gate.md`

**Interfaces:**

- Consumes: `ProviderDescriptor` (Plan 04, `src/lib/types/providers.ts`), `OpenAICompatCatalogEntry` / `ConfiguredOpenAICompatProvider` (Plan 05), `test/continuous-test-suite-providers-mocked.ts`'s `installMockFetch` pattern (existing).
- Produces: three ADR documents other tasks in this plan (and future provider PRs) link back to for rationale.

This is a docs-only task; there is no code to test, so the verification step is a grep-based content check instead of TDD.

- [ ] Create the ADR directory and index.

  ```bash
  mkdir -p $WORKSPACE/neurolink-fork/feat/proider-redesign/docs/provider-integration/adr
  ```

- [ ] Write `docs/provider-integration/adr/README.md`:

  ```markdown
  # Architecture Decision Records — Provider Onboarding Redesign

  Short, dated records of the load-bearing decisions behind the 200-provider
  redesign (Plans 01–10, August 2026). Read these before arguing to change
  the shape of `ProviderDescriptor`, the catalog, or the CI gate — the
  tradeoffs were already litigated once.

  | ADR  | Decision                                                                       | Status   |
  | ---- | ------------------------------------------------------------------------------ | -------- |
  | 0001 | `ProviderDescriptor` is the single source of truth for provider identity       | Accepted |
  | 0002 | OpenAI-wire-compatible providers default to a data-catalog row, not a subclass | Accepted |
  | 0003 | Mocked-fetch contract tests are the CI gate; live-API suites are not           | Accepted |
  ```

- [ ] Write `docs/provider-integration/adr/0001-provider-descriptor-as-source-of-truth.md`:

  ```markdown
  # ADR-0001: `ProviderDescriptor` is the single source of truth for provider identity

  **Status:** Accepted — 2026-08-15
  **Context:** Plans 00/11 (audit)

  ## Context

  Before this redesign, "what providers exist and what do they need" was
  answered by five independently hand-maintained places that had already
  drifted from each other: `providerRegistry.ts` (registration + aliases),
  `commandFactory.ts` (CLI `--provider` choices, re-listing every alias),
  `providerHealth.ts` (hardcoded 8-of-31-provider health/auto-select list),
  `contextWindows.ts` (per-model context windows), and
  `providerImageAdapter.ts` (vision capability map). A sixth ad hoc identity
  mechanism existed for `"anthropic-subscription"`. Google AI Studio alone
  had five different spellings across these tables. None of this was
  type-checked; typos were silent runtime misses (`credentialKeyMap` was
  already missing a `together-ai` entry in production).

  At 30 providers this was tolerable tech debt. At 200+ it is not: ~1,000+
  hand-authored string literals with zero compile-time linkage between them.

  ## Decision

  Every provider gets exactly one `ProviderDescriptor` object
  (`src/lib/types/providers.ts`) held in one array,
  `PROVIDER_DESCRIPTORS` (`src/lib/factories/providerDescriptors.ts`), a
  **pure data module** — no dynamic imports, no provider-class imports — so
  it is safe to import statically from anywhere, including the CLI's
  command-definition code (which needs `--provider` choices synchronously,
  before any provider is instantiated).

  Every other subsystem that previously hardcoded its own provider list
  (CLI choices, health-check auto-selection, alias resolution) is expected
  to derive from `PROVIDER_DESCRIPTORS` / `ProviderFactory.getAllDescriptors()`
  instead of maintaining a parallel list. `ProviderFactory.normalizeProviderName`
  replaces its O(n) linear alias scan with an alias→canonical index built
  once at registration time from the same descriptors.

  ## Consequences

  - **Positive:** one array to review per new provider; CLI/health/alias
    tables can no longer drift because they no longer _have_ independent
    data to drift from.
  - **Positive:** `ProviderFactory.getDescriptor(name)` becomes the answer
    to "does this provider exist and what does it need" for every
    subsystem, including this plan's own CI gate (Task 9).
  - **Negative:** `PROVIDER_DESCRIPTORS` becomes a single large file that
    every new provider touches — a predictable merge-conflict hotspot at
    high PR volume. Mitigated by keeping each entry a small, independent
    object literal (low conflict surface per line) and by the Tier 2 path
    (Task 3 of this plan) needing only a ~10-line addition.
  - **Negative:** subsystems that haven't yet been migrated to read from
    `PROVIDER_DESCRIPTORS` (this ADR doesn't retroactively migrate
    `providerHealth.ts` etc. — that's Plans 06/08's job) still need manual
    edits until they are. The tier docs in this plan (Tasks 2–5) call this
    out explicitly rather than silently overclaiming.
  ```

- [ ] Write `docs/provider-integration/adr/0002-catalog-over-subclass-default.md`:

  ```markdown
  # ADR-0002: OpenAI-wire-compatible providers default to a catalog row, not a subclass

  **Status:** Accepted — 2026-08-15
  **Context:** Plans 05/10 (audit area `10-openai-compat-family.md`)

  ## Context

  Nineteen of NeuroLink's providers extend one abstract class,
  `OpenAIChatCompletionsProvider`. Seven of those (groq, xai, togetherAi,
  fireworks, perplexity, cloudflare, mistral) are pure configuration — an
  env var name, a base URL, a default/fallback model, and a
  `formatProviderError` string-matcher copy-pasted with only the message
  text and error class varying. The constructor's credential-precedence
  block (`credentials?.apiKey?.trim() || getXApiKey()`) is repeated
  character-for-character across 8 subclasses. None of this variation is
  behavioral — it's data wearing a class costume.

  ## Decision

  A new provider whose backend speaks the OpenAI `/v1/chat/completions`
  wire format and needs **no behavioral override** (no custom
  `adjustRequestBody`, `adjustResponseFormat`, `getAuthHeaders`, etc.) is
  onboarded as one `OpenAICompatCatalogEntry` object appended to
  `OPENAI_COMPAT_CATALOG` (`src/lib/providers/openaiCompatCatalog.ts`),
  constructed at registration time by one generic
  `ConfiguredOpenAICompatProvider` class
  (`src/lib/providers/configuredOpenAICompat.ts`) — **not** a new
  `src/lib/providers/<name>.ts` subclass file.

  A dedicated subclass is still the right choice — and remains fully
  supported — the moment a provider needs a real hook override (DeepSeek's
  `adjustResponseFormat`, Azure's four overrides, NVIDIA NIM's
  `adjustBodyAfter400`). This is exactly the Tier 2 vs. Tier 3 boundary
  documented in `docs/provider-integration/tiers/`.

  ## Consequences

  - **Positive:** the ~15–20 lines of copy-pasted constructor +
    error-formatter boilerplate per zero-quirk provider (3,000–4,000 lines
    at 200 providers, per the audit) collapses to a ~10-line data row.
  - **Positive:** catalog rows are trivially data-driven — a future
    optimization can iterate `OPENAI_COMPAT_CATALOG` to generate
    `providerRegistry.ts`'s registration blocks instead of hand-writing one
    per provider (out of scope for this plan; see Plan 05/09).
  - **Negative:** a provider that _starts_ as a zero-quirk catalog row and
    later needs one override (e.g., a vendor adds a nonstandard 400 body)
    requires a migration from catalog row to dedicated subclass. This is a
    known, accepted cost — it's strictly better than every provider paying
    subclass overhead up front on the speculation that it might need a hook
    someday.
  - **Negative:** reviewers must actually check "does this really need zero
    overrides" — a catalog entry that silently needs a `formatProviderError`
    tweak but doesn't get one produces a confusing generic error message
    instead of a build failure. The Tier 2 checklist (Task 3) makes this an
    explicit checklist item, not an assumption.
  ```

- [ ] Write `docs/provider-integration/adr/0003-mocked-contract-as-merge-gate.md`:

  ```markdown
  # ADR-0003: Mocked-fetch contract tests are the CI merge gate; live-API suites are not

  **Status:** Accepted — 2026-08-15
  **Context:** Plan 10 (audit area `gap1-ci-cd-automated-testing-coverage...md`)

  ## Context

  Zero `test:*` npm scripts run in any GitHub Actions workflow or git hook
  today. `ci.yml`'s `quality-gate` job has a step literally named
  "🎯 Test Suite Validation" whose body is two `echo` lines under
  `continue-on-error: true`. Provider correctness is entirely dependent on
  a human manually running `pnpm run test:matrix` with real, funded API
  keys and self-reporting the result in the PR template's honor-system
  checkboxes, which nothing enforces.

  Extrapolating the live-API pattern (`continuous-test-suite-provider-matrix.ts`)
  to 200 providers is not viable as a PR gate: ~200 sets of funded CI
  secrets, an unparallelized sequential loop already documented to take

  > 4 minutes per call for some providers, real per-token vendor billing on
  > every push, and constant vendor-side flakiness that the codebase already
  > has to special-case via `isExpectedProviderError`/`Skip` promotion — an
  > implicit admission that live tests can't be a hard pass/fail signal.

  The codebase already has the alternative that scales:
  `continuous-test-suite-providers-mocked.ts` intercepts `globalThis.fetch`
  and asserts request shape, response parsing, and 401/429/5xx error
  mapping — zero network I/O, zero cost, fully deterministic, runs in
  seconds — but only for 13 of 30 providers, and it isn't wired into any
  workflow.

  ## Decision

  Every provider PR (Tier 2 and above; Tier 1 needs no code) must add a
  mocked-contract section to `test/continuous-test-suite-providers-mocked.ts`
  covering at minimum: happy-path request/response shape, and a 401 →
  friendly auth error. This is enforced as a required, always-on,
  zero-cost CI gate (`tools/verify-provider-onboarding.ts`, Task 9 of this
  plan) that fails the PR if a _new_ `AIProviderName` member lands without
  a matching mocked section.

  Live-provider suites (`test:matrix`, `test:live`, `test:new-providers`,
  `test:product`) remain valuable and remain in the repo, but stay
  deliberately **manual/scheduled**, never a per-PR gate. This is a
  conscious choice to preserve today's cost/flakiness tradeoff rather than
  drift into it by accident.

  ## Consequences

  - **Positive:** for the first time, there is an automated check — CI,
    not a human — that verifies a newly-registered provider is wired
    correctly before merge, at zero marginal cost per provider.
  - **Positive:** the gate is data-driven (diffs the enum against four
    registries; see Task 9), so it scales to 200 providers without anyone
    hand-writing a 200-entry CI matrix.
  - **Negative:** mocked contract tests only prove wire-shape correctness
    against NeuroLink's _assumptions_ about the vendor's API, not that the
    real vendor endpoint still matches those assumptions today. A live,
    scheduled (not per-PR) suite remains necessary to catch vendor-side
    drift — explicitly out of scope for this plan; see the existing
    `test:matrix`/`test:new-providers` scripts and the CI/CD gap report's
    "Opportunities" section for that follow-up.
  - **Negative:** the gate only covers providers added _after_ this ADR
    (the `LEGACY_PROVIDERS` ratchet in Task 9) — it does not retroactively
    audit the 17 of 30 existing providers still missing mocked coverage.
    That backfill is tracked as follow-up work, not blocked on this plan.
  ```

- [ ] Verify the ADRs render as expected Markdown (no broken relative links) and commit.

  ```bash
  grep -rl "^# ADR-000" $WORKSPACE/neurolink-fork/feat/proider-redesign/docs/provider-integration/adr/
  # Expected: all three 000N files listed
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign && pnpm run format
  git add docs/provider-integration/adr/
  git commit -m "docs(provider-integration): add ADRs for descriptor/catalog/mocked-gate decisions"
  ```

---

### Task 2: Tier overview + Tier 1 (aggregator passthrough)

**Files:**

- Create: `docs/provider-integration/tiers/README.md`
- Create: `docs/provider-integration/tiers/tier-1-aggregator-passthrough.md`

**Interfaces:**

- Consumes: nothing from other plans (Tier 1 requires zero SDK code changes by design).
- Produces: the tier decision tree that Task 7 wires the top-level `docs/provider-integration/README.md` into, and that `tools/scaffold-provider.ts` (Task 8) references by file path.

- [ ] Create the tiers directory and write the overview.

  ```bash
  mkdir -p $WORKSPACE/neurolink-fork/feat/proider-redesign/docs/provider-integration/tiers
  ```

  `docs/provider-integration/tiers/README.md`:

  ````markdown
  # Provider Onboarding Tiers

  Four tiers, ordered by effort. **Always pick the lowest tier that's
  actually true for the provider you're adding** — a provider that's
  OpenAI-wire-compatible but gets built as a bespoke Tier 3 subclass "to be
  safe" is exactly the copy-pasted-boilerplate problem this redesign
  exists to eliminate (see ADR-0002).

  ```text
  Is the model already served by an aggregator NeuroLink already speaks to
  (LiteLLM proxy, OpenRouter)?
  ├─ Yes → Tier 1 — zero code. → tier-1-aggregator-passthrough.md
  └─ No, it's a new backend.
     │
     Does it speak the OpenAI /v1/chat/completions wire format (Bearer
     auth, standard SSE) with NO behavioral quirks (no custom body
     mutation, no 400-retry dance, no nonstandard auth header)?
     ├─ Yes → Tier 2 — one catalog row, ~1 hour. → tier-2-catalog-entry.md
     └─ No.
        │
        Does it need custom wire-format handling but is still a normal
        HTTP+JSON API you can drive with a provider class (own SSE parser,
        own auth scheme, own error shapes)?
        ├─ Yes → Tier 3 — adapter-based native, days. → tier-3-adapter-native.md
        └─ No — non-HTTP protocol, SDK-mediated auth (e.g. AWS SigV4),
           or a genuinely bespoke multi-step lifecycle.
           → Tier 4 — full custom, justify it. → tier-4-full-custom.md
  ```
  ````

  | Tier                       | Example                                                                            | Code required                                                     | Time                              |
  | -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
  | 1 — Aggregator passthrough | A new model id on an existing LiteLLM/OpenRouter route                             | None                                                              | Minutes                           |
  | 2 — Catalog entry          | A new zero-quirk OpenAI-compatible vendor (the Groq/xAI/Together shape)            | One data row + one mocked-test section                            | ~1 hour                           |
  | 3 — Adapter-based native   | A vendor with its own SDK/wire format but a normal request/response HTTP lifecycle | One provider class                                                | Days                              |
  | 4 — Full custom            | SageMaker-class: non-HTTP protocol, SDK-signed auth, bespoke lifecycle             | Custom `executeStream`/`doGenerate`, possibly own CLI subcommands | Days, needs written justification |

  Every tier that adds a new `AIProviderName` member (Tier 2 and above) ends
  the same way: a manifest at
  `docs/provider-integration/manifests/<provider>.json`
  (see `../manifests/README.md`) and a green run
  of `pnpm run verify:provider-onboarding` (see
  `../../../tools/verify-provider-onboarding.ts`).
  Tier 1 needs no manifest and no gate — see
  `tier-1-aggregator-passthrough.md`.

  Use `../../../tools/scaffold-provider.ts`
  (`pnpm run scaffold:provider`) to generate the starting-point snippets for
  Tiers 2–4 instead of copy-pasting from an existing provider by hand.

  ```

  ```

- [ ] Write `docs/provider-integration/tiers/tier-1-aggregator-passthrough.md`:

  ````markdown
  # Tier 1 — Aggregator Passthrough

  **When this applies:** the model you want is already reachable through a
  provider NeuroLink already registers as a pass-through aggregator —
  today that's `litellm` (any backend the user's LiteLLM proxy exposes) or
  `openrouter` (any model in OpenRouter's catalog). No new
  `AIProviderName` member, no new provider class, no new catalog row.

  **What you're actually doing:** picking a model id string and confirming
  it works — this is a _usage_ change, not an _integration_ change.

  ## Checklist

  - [ ] Confirm the aggregator actually serves the model. For LiteLLM,
        check the proxy's `/v1/models` (or its `config.yaml`) for the
        model's `model_name`. For OpenRouter, check
        `https://openrouter.ai/models` for the exact `vendor/model-id`
        slug.
  - [ ] No `AIProviderName` enum change. No `PROVIDER_DESCRIPTORS` change.
        No `OPENAI_COMPAT_CATALOG` change. If you find yourself editing any
        of those three for a "Tier 1" provider, it isn't Tier 1 — restart
        from `../tiers/README.md`'s decision tree.
  - [ ] Optional: if the model needs a friendlier default alias, add it to
        `MODEL_ALIASES` / `DEFAULT_MODEL_ALIASES` in
        `src/lib/models/modelRegistry.ts`. Not required for the model to
        work.
  - [ ] Optional: if the model needs a documented env var (e.g., a
        dedicated LiteLLM route), document it in
        `docs/getting-started/environment-variables.md`.
  - [ ] Manually smoke-test the model end-to-end.
  - [ ] No manifest file is required — `tools/verify-provider-onboarding.ts`
        (see `../../../tools/verify-provider-onboarding.ts`) only gates
        _new_ `AIProviderName` members, and Tier 1 never adds one.

  ## Verification commands

  ```bash
  # LiteLLM example
  pnpm run cli generate "hello" --provider litellm --model <litellm-model-name>

  # OpenRouter example
  pnpm run cli generate "hello" --provider openrouter --model <vendor>/<model-id>
  ```
  ````

  Both should return a normal `GenerateResult` with non-empty `content`. If
  either 400s with an "unknown model" style error, the aggregator doesn't
  actually serve that model yet — fix the aggregator-side config, not
  NeuroLink.

  ```

  ```

- [ ] Verify both files exist and the overview's internal links resolve to files that exist.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  test -f docs/provider-integration/tiers/README.md && \
  test -f docs/provider-integration/tiers/tier-1-aggregator-passthrough.md && \
  echo "OK: both files present"
  # Expected: "OK: both files present"
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/tiers/README.md docs/provider-integration/tiers/tier-1-aggregator-passthrough.md
  git commit -m "docs(provider-integration): add tier overview and Tier 1 aggregator-passthrough guide"
  ```

---

### Task 3: Tier 2 — catalog entry

**Files:**

- Create: `docs/provider-integration/tiers/tier-2-catalog-entry.md`

**Interfaces:**

- Consumes: `type OpenAICompatCatalogEntry` and `class ConfiguredOpenAICompatProvider` (Plan 05), `type ProviderDescriptor` and `PROVIDER_DESCRIPTORS` (Plan 04).
- Produces: the checklist `tools/scaffold-provider.ts` (Task 8) prints for `--tier=2` and that `tools/verify-provider-onboarding.ts` (Task 9) enforces.

- [ ] Write `docs/provider-integration/tiers/tier-2-catalog-entry.md`:

  ````markdown
  # Tier 2 — Catalog Entry

  **When this applies:** the vendor speaks the OpenAI `/v1/chat/completions`
  wire format (Bearer auth, standard SSE, standard JSON body) and needs
  **zero** behavioral overrides — no custom `adjustRequestBody`, no
  `adjustResponseFormat`, no nonstandard auth header, no `adjustBodyAfter400`.
  This is the Groq/xAI/Together AI/Fireworks/Perplexity/Cloudflare/Mistral
  shape from before the redesign — now expressed as one data row instead of
  a ~130-line subclass file (see ADR-0002).

  If you're not sure whether your provider is quirk-free, start writing the
  catalog entry anyway — if it turns out you need a hook, migrate to
  Tier 3 instead of forcing the quirk into the
  catalog shape.

  ## Files touched (end state, assumes Plans 04/05/07 have landed)

  | #   | File                                              | Change                                                                                                                                                               |
  | --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `src/lib/constants/enums.ts`                      | One new `AIProviderName` member                                                                                                                                      |
  | 2   | `src/lib/providers/openaiCompatCatalog.ts`        | One `OpenAICompatCatalogEntry` object appended to `OPENAI_COMPAT_CATALOG`                                                                                            |
  | 3   | `src/lib/factories/providerDescriptors.ts`        | One `ProviderDescriptor` object appended to `PROVIDER_DESCRIPTORS`                                                                                                   |
  | 4   | `src/lib/types/providers.ts`                      | One new `NeurolinkCredentials["<key>"]` slice                                                                                                                        |
  | 5   | `src/lib/factories/providerRegistry.ts`           | One `ProviderFactory.registerProvider()` block constructing `ConfiguredOpenAICompatProvider` from the catalog entry (dynamic import — Critical Rule 1 still applies) |
  | 6   | `test/continuous-test-suite-providers-mocked.ts`  | One mocked-contract section (happy-path + 401)                                                                                                                       |
  | 7   | `docs/provider-integration/manifests/<name>.json` | New manifest (see `../manifests/README.md`)                                                                                                                          |

  This list assumes Plans 04–08 have landed and wired `commandFactory.ts`'s
  CLI `--provider` choices, `providerHealth.ts`'s auto-selection list, and
  `contextWindows.ts`'s fallback resolution to iterate
  `ProviderFactory.getAllDescriptors()` / `PROVIDER_DESCRIPTORS`
  automatically (their stated end goal — see
  ADR-0001). **If
  any of those integration points haven't landed yet in your branch**, add
  the provider to that file by hand too — check by grepping for a recent
  Tier-2 provider's name (e.g. `groq`) in the file; if it's there by hand,
  yours needs to be too, for now.

  ## Step 1 — catalog entry

  `src/lib/providers/openaiCompatCatalog.ts`:

  ```typescript
  {
    provider: AIProviderName.CEREBRAS,
    defaultBaseURL: "https://api.cerebras.ai/v1",
    envBaseURLVar: "CEREBRAS_BASE_URL",
    defaultModel: "llama3.1-70b",
    fallbackModels: ["llama3.1-8b"],
  },
  ```
  ````

  Add `errorRules` only if the vendor's error bodies need a match beyond
  `DEFAULT_ERROR_RULES` (Plan 07) — most Tier 2 providers don't.

  ## Step 2 — descriptor entry

  `src/lib/factories/providerDescriptors.ts`:

  ```typescript
  {
    name: AIProviderName.CEREBRAS,
    aliases: ["cerebras"] as const,
    credentialsKey: "cerebras",
    envVars: {
      apiKey: "CEREBRAS_API_KEY",
      baseURL: "CEREBRAS_BASE_URL",
      model: "CEREBRAS_MODEL",
    },
    defaultModel: "llama3.1-70b",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
  },
  ```

  ## Step 3 — credentials slice

  `src/lib/types/providers.ts`, inside `NeurolinkCredentials`:

  ```typescript
  cerebras?: {
    apiKey?: string;
    baseURL?: string;
  };
  ```

  ## Step 4 — registration

  `src/lib/factories/providerRegistry.ts`, inside `_doRegister()`:

  ```typescript
  ProviderFactory.registerProvider(
    AIProviderName.CEREBRAS,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const { ConfiguredOpenAICompatProvider } =
        await import("../providers/configuredOpenAICompat.js");
      const { OPENAI_COMPAT_CATALOG } =
        await import("../providers/openaiCompatCatalog.js");
      const entry = OPENAI_COMPAT_CATALOG.find(
        (e) => e.provider === AIProviderName.CEREBRAS,
      )!;
      const cerebrasCreds = credentials as NeurolinkCredentials["cerebras"];
      return new ConfiguredOpenAICompatProvider(
        entry,
        modelName,
        sdk,
        cerebrasCreds,
      );
    },
    process.env.CEREBRAS_MODEL ?? "llama3.1-70b",
    ["cerebras"],
  );
  ```

  (If Plan 05's end state instead iterates `OPENAI_COMPAT_CATALOG` once to
  register every catalog row automatically — the "make `_doRegister()`
  data-driven" opportunity the audit flagged — you won't need to write this
  block by hand at all; check `providerRegistry.ts` for that loop before
  copy-pasting this snippet.)

  ## Step 5 — mocked contract test

  `test/continuous-test-suite-providers-mocked.ts`, following the existing
  `groq`/`xai` sections as a template:

  ```typescript
  const spec = { provider: "cerebras", envKey: "CEREBRAS_API_KEY" };
  const section = `LLM ${spec.provider}`;
  // ... installMockFetch route for POST https://api.cerebras.ai/v1/chat/completions,
  // assert Authorization: Bearer <key>, assert happy-path parse into
  // GenerateResult.content, then assert a 401 body maps to a friendly
  // authentication error (see the existing groq section for the exact
  // shape — record(results, `${section}: happy-path generate()`, ...) /
  // record(results, `${section}: 401 surfaces friendly error`, ...)).
  ```

  ## Step 6 — manifest

  `docs/provider-integration/manifests/cerebras.json`:

  ```json
  {
    "provider": "cerebras",
    "tier": 2,
    "addedInPR": "https://github.com/juspay/neurolink/pull/<PR-NUMBER>",
    "addedDate": "2026-08-15",
    "filesTouched": [
      "src/lib/constants/enums.ts",
      "src/lib/providers/openaiCompatCatalog.ts",
      "src/lib/factories/providerDescriptors.ts",
      "src/lib/types/providers.ts",
      "src/lib/factories/providerRegistry.ts",
      "test/continuous-test-suite-providers-mocked.ts"
    ],
    "mockedContractSection": "LLM cerebras",
    "manualTestStatus": "not-tested"
  }
  ```

  ## Verification commands

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run test:providers-mocked
  pnpm run verify:provider-onboarding
  pnpm run build
  pnpm run cli generate "hello" --provider cerebras
  ```

  All five commands must pass/exit 0 before opening the PR.

  ```

  ```

- [ ] Verify the file was created and contains all six numbered steps.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  grep -c "^## Step" docs/provider-integration/tiers/tier-2-catalog-entry.md
  # Expected: 6
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/tiers/tier-2-catalog-entry.md
  git commit -m "docs(provider-integration): add Tier 2 catalog-entry onboarding guide"
  ```

---

### Task 4: Tier 3 — adapter-based native

**Files:**

- Create: `docs/provider-integration/tiers/tier-3-adapter-native.md`

**Interfaces:**

- Consumes: `type ProviderErrorRule`, `classifyProviderError`, `DEFAULT_ERROR_RULES` (Plan 07, `src/lib/utils/errorClassifier.ts`), `type ProviderDescriptor` / `PROVIDER_DESCRIPTORS` (Plan 04), `BaseProvider` (existing, `src/lib/core/baseProvider.ts`).
- Produces: the checklist `tools/scaffold-provider.ts` (Task 8) prints for `--tier=3`.

- [ ] Write `docs/provider-integration/tiers/tier-3-adapter-native.md`:

  ````markdown
  # Tier 3 — Adapter-Based Native

  **When this applies:** the vendor has its own SDK or wire format that
  isn't OpenAI-compatible, but it's still a normal request/response (or
  request/SSE-stream) HTTP+JSON lifecycle you can drive from a provider
  class. This is the Mistral/Cohere/Ollama shape — a dedicated
  `src/lib/providers/<name>.ts` extending `BaseProvider` directly, not the
  `OpenAIChatCompletionsProvider` family.

  If Plan 08 has landed a shared streaming-loop adapter for this shape by
  the time you read this (check for a `src/lib/providers/nativeAdapter*.ts`
  or similar — grep `src/lib/providers/` for a recently-added shared base
  beyond `BaseProvider` and `OpenAIChatCompletionsProvider`), extend that
  instead of hand-rolling the SSE parser and multi-step tool loop; the
  steps below describe the always-true minimum regardless of whether that
  shared adapter exists yet.

  ## Files touched (end state, assumes Plans 04/07 have landed)

  | #   | File                                                                                           | Change                                                                                                                                                                                                                    |
  | --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `src/lib/constants/enums.ts`                                                                   | New `AIProviderName` member + a `<Name>Models` enum (default + fallback model ids — Tier 3 providers keep an explicit model catalog since there's no `OPENAI_COMPAT_CATALOG` row to hold `defaultModel`/`fallbackModels`) |
  | 2   | `src/lib/providers/<name>.ts`                                                                  | NEW provider class extending `BaseProvider` (or Plan 08's shared adapter, if landed)                                                                                                                                      |
  | 3   | `src/lib/factories/providerDescriptors.ts`                                                     | One `ProviderDescriptor` entry                                                                                                                                                                                            |
  | 4   | `src/lib/factories/providerRegistry.ts`                                                        | One `ProviderFactory.registerProvider()` block, dynamic import                                                                                                                                                            |
  | 5   | `src/lib/types/providers.ts`                                                                   | New `NeurolinkCredentials["<key>"]` slice                                                                                                                                                                                 |
  | 6   | `src/lib/adapters/providerImageAdapter.ts`                                                     | `VISION_CAPABILITIES` entry — only if the provider/model is multimodal                                                                                                                                                    |
  | 7   | `test/continuous-test-suite-providers-mocked.ts`                                               | Mocked-contract section                                                                                                                                                                                                   |
  | 8   | `test/continuous-test-suite-new-providers.ts` (or a new suite + matching `test:<name>` script) | Fuller feature coverage — recommended for Tier 3 since, unlike Tier 2, there's bespoke request/response code that a mocked-shape test alone won't fully exercise                                                          |
  | 9   | `docs/provider-integration/manifests/<name>.json`                                              | New manifest                                                                                                                                                                                                              |

  Same caveat as Tier 2: this list assumes downstream subsystems
  (`commandFactory.ts`, `providerHealth.ts`, `contextWindows.ts`) read from
  `PROVIDER_DESCRIPTORS` automatically once Plans 06/08 land. If they
  haven't yet, add the provider to those files by hand too.

  ## Provider class skeleton

  `src/lib/providers/<name>.ts`:

  ```typescript
  import { AIProviderName } from "../constants/enums.js";
  import { BaseProvider } from "../core/baseProvider.js";
  import { classifyProviderError } from "../utils/errorClassifier.js";
  import { DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
  import type {
    NeurolinkCredentials,
    ProviderErrorRule,
    StreamOptions,
    StreamResult,
  } from "../types/index.js";
  import type { NeuroLink } from "../neurolink.js";

  const ACME_ERROR_RULES: readonly ProviderErrorRule[] = [
    ...DEFAULT_ERROR_RULES,
    // Add vendor-specific rules only where the vendor's error shape
    // deviates from the defaults, e.g.:
    // { status: 422, errorClass: "invalid-model" },
  ];

  export class AcmeProvider extends BaseProvider {
    constructor(
      modelName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: NeurolinkCredentials["acme"],
    ) {
      const apiKey = credentials?.apiKey?.trim() || process.env.ACME_API_KEY;
      super(modelName ?? "acme-default-model", AIProviderName.ACME, sdk);
      // Store apiKey/baseURL on `this`, build the vendor's SDK client here.
    }

    formatProviderError(error: unknown): Error {
      // MUST return, never throw — Critical Rule 6.
      // classifyProviderError's real signature (Plan 07) is positional:
      // (error, rules, provider: string, modelName?: string) — NOT an
      // object third argument.
      return classifyProviderError(
        error,
        ACME_ERROR_RULES,
        "acme",
        this.modelName,
      );
    }

    // Override executeStream()/doGenerate()-equivalent hooks per
    // BaseProvider's contract for the vendor's actual wire format. See
    // src/lib/providers/mistral.ts or src/lib/providers/cohere.ts for a
    // worked, currently-shipping Tier-3-shaped example.
  }
  ```
  ````

  ## Verification commands

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run test:providers-mocked
  pnpm run test:new-providers   # or your new suite's test:<name> script
  pnpm run verify:provider-onboarding
  pnpm run build
  pnpm run cli generate "hello" --provider acme
  ```

  ```

  ```

- [ ] Verify the file exists and the file-list table has exactly 9 rows.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  grep -c "^| [1-9] " docs/provider-integration/tiers/tier-3-adapter-native.md
  # Expected: 9
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/tiers/tier-3-adapter-native.md
  git commit -m "docs(provider-integration): add Tier 3 adapter-based-native onboarding guide"
  ```

---

### Task 5: Tier 4 — full custom

**Files:**

- Create: `docs/provider-integration/tiers/tier-4-full-custom.md`

**Interfaces:**

- Consumes: everything Tier 3 consumes, plus the existing `src/lib/providers/amazonSagemaker.ts` as the worked example.
- Produces: the checklist `tools/scaffold-provider.ts` (Task 8) prints for `--tier=4`, and the `tier4Justification` field `tools/verify-provider-onboarding.ts` (Task 9) requires in Tier-4 manifests.

- [ ] Write `docs/provider-integration/tiers/tier-4-full-custom.md`:

  ````markdown
  # Tier 4 — Full Custom

  **When this applies — and when it doesn't:** Tier 4 is for a provider
  that genuinely cannot be expressed as a request/response HTTP+JSON class
  extending `BaseProvider`. The canonical example is Amazon SageMaker
  (`src/lib/providers/amazonSagemaker.ts`): auth is AWS SigV4-signed via
  an SDK, not a bearer token; the invocation lifecycle isn't a plain POST;
  and it needs its own CLI subcommand surface for model/endpoint
  management (`SagemakerCommandFactory`).

  **Tier 4 is the most expensive tier and the one most often claimed
  incorrectly.** Before writing a line of code, re-read
  `tier-3-adapter-native.md` and confirm the
  vendor truly isn't a normal HTTP+JSON lifecycle you could adapt. "This
  vendor's SDK is inconvenient" is not sufficient justification — `fetch`
  works against inconvenient SDKs too. Genuine justifications: non-HTTP
  transport, SDK-mediated request signing that can't be replicated with
  plain headers, or a multi-step lifecycle (create → poll → fetch) that
  doesn't fit `BaseProvider`'s single-call contract at all.

  Every Tier 4 manifest **requires** a `tier4Justification` string field
  explaining, in a sentence or two, which of the above applies — reviewers
  should push back on a Tier 4 claim whose justification is thin enough to
  actually be Tier 2 or 3. `tools/verify-provider-onboarding.ts` (Task 9)
  enforces the field's presence, not its quality — that part is a human
  code-review job.

  ## What it costs, on top of everything in Tier 3

  - A custom `executeStream()`/`doGenerate()`-equivalent that bypasses
    `BaseProvider`'s template methods almost entirely, instead of
    overriding a couple of hooks.
  - Possibly its own CLI factory
    (`src/cli/factories/<name>CommandFactory.ts`, following the
    `SagemakerCommandFactory`/`OllamaCommandFactory` pattern) if the
    provider needs subcommands beyond `generate`/`stream` (model listing,
    endpoint lifecycle, etc.).
  - More test surface: the mocked-contract section still applies (Tier 4
    still needs to mock whatever transport it uses — SDK client calls
    instead of `fetch`, if that's the shape), but expect to also need
    provider-specific unit coverage for the custom lifecycle, since a
    single mocked happy-path/401 pair won't exercise a multi-step flow.
  - More docs: a dedicated `docs/getting-started/providers/<name>.md` page
    is expected, not optional, given the setup complexity Tier 4 implies
    (IAM roles, SDK credentials, etc.).
  - A higher review bar: a second reviewer sign-off on the
    tier4Justification is recommended (enforce via your team's normal PR
    review process — this plan doesn't add tooling for a second-reviewer
    requirement).

  ## Manifest addition

  `docs/provider-integration/manifests/<name>.json` needs the extra field:

  ```json
  {
    "provider": "acme-sdk",
    "tier": 4,
    "addedInPR": "https://github.com/juspay/neurolink/pull/<PR-NUMBER>",
    "addedDate": "2026-08-15",
    "filesTouched": ["..."],
    "mockedContractSection": "LLM acme-sdk",
    "manualTestStatus": "not-tested",
    "tier4Justification": "Auth is SDK-mediated request signing (proprietary HMAC scheme); cannot be replicated with plain fetch headers."
  }
  ```
  ````

  ## Verification commands

  Same as Tier 3, plus whatever the custom lifecycle needs — e.g. for a
  provider with its own CLI factory:

  ```bash
  pnpm run check
  pnpm run lint
  pnpm run test:providers-mocked
  pnpm run build:cli && pnpm run cli <new-subcommand> --help
  pnpm run verify:provider-onboarding
  pnpm run build
  ```

  ```

  ```

- [ ] Verify the file exists and mentions `tier4Justification` (the field Task 9's tool checks for).

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  grep -c "tier4Justification" docs/provider-integration/tiers/tier-4-full-custom.md
  # Expected: a number >= 2 (mentioned in prose and in the JSON example)
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/tiers/tier-4-full-custom.md
  git commit -m "docs(provider-integration): add Tier 4 full-custom onboarding guide"
  ```

---

### Task 6: Provider manifest convention

**Files:**

- Create: `docs/provider-integration/manifests/README.md`
- Create: `docs/provider-integration/manifests/_example-tier2-catalog.json`
- Create: `docs/provider-integration/manifests/_example-tier3-adapter.json`

**Interfaces:**

- Produces: the `ProviderManifest` shape (documented here as plain JSON, formally typed as a local `type ProviderManifest` inside `tools/verify-provider-onboarding.ts` in Task 9 — deliberately not a `src/lib/types/` type, see Global Constraints).
- Consumes: nothing from other plans.

The two example files are prefixed `_example-` so they can never collide
with a real provider's manifest filename (`<provider>.json`) and so
`tools/verify-provider-onboarding.ts` (Task 9), which only looks up
`<enum-member>.json`, never mistakes them for real entries.

- [ ] Create the manifests directory and write the README.

  ```bash
  mkdir -p $WORKSPACE/neurolink-fork/feat/proider-redesign/docs/provider-integration/manifests
  ```

  `docs/provider-integration/manifests/README.md`:

  ````markdown
  # Provider Manifests

  Every provider onboarded via Tier 2, 3, or 4 gets
  one JSON file here, named `<provider>.json` where `<provider>` is the
  exact `AIProviderName` enum value (e.g. `cerebras.json` for
  `AIProviderName.CEREBRAS = "cerebras"`).

  This is deliberately a plain JSON convention, not a `src/lib/types/`
  TypeScript type — manifests are onboarding-process metadata consumed by
  `tools/verify-provider-onboarding.ts` and by humans reading the
  directory, not part of the runtime SDK's type surface. Critical Rule 2
  ("all type definitions go in `src/lib/types/`") governs types the SDK's
  code imports; it doesn't apply here.

  ## Shape

  ```jsonc
  {
    // Must exactly equal the AIProviderName enum value.
    "provider": "cerebras",

    // 2, 3, or 4. (Tier 1 never gets a manifest — see tiers/tier-1-*.md.)
    "tier": 2,

    // Full PR URL. Leave "" until the PR exists, fill in before merge.
    "addedInPR": "https://github.com/juspay/neurolink/pull/1234",

    // YYYY-MM-DD.
    "addedDate": "2026-08-15",

    // Every file this provider's onboarding touched — used for PR review,
    // not machine-checked beyond "the array exists".
    "filesTouched": ["src/lib/constants/enums.ts", "..."],

    // Must match the section-name prefix used in
    // test/continuous-test-suite-providers-mocked.ts's `record(results,
    // \`${section}: ...\`, ...)` calls for this provider, e.g. "LLM cerebras".
    "mockedContractSection": "LLM cerebras",

    // One of: "not-tested" | "manual-live-tested" | "ci-mocked-only"
    "manualTestStatus": "not-tested",

    // REQUIRED when tier === 4 only. A sentence or two justifying why
    // this couldn't be Tier 2/3. See tiers/tier-4-full-custom.md.
    "tier4Justification": "...",
  }
  ```
  ````

  ## Two worked examples

  See `_example-tier2-catalog.json` and
  `_example-tier3-adapter.json` — these are
  documentation fixtures, not real provider entries (note the `_example-`
  prefix; a real manifest is always named exactly `<provider>.json`).

  ## How it's checked

  `pnpm run verify:provider-onboarding` (`tools/verify-provider-onboarding.ts`)
  fails a PR that introduces a new `AIProviderName` member without a
  matching, structurally valid manifest here. It does **not** retroactively
  require manifests for the 30 providers that predate this convention —
  see that tool's `LEGACY_PROVIDERS` list.

  ```

  ```

- [ ] Write the two example fixtures.

  `docs/provider-integration/manifests/_example-tier2-catalog.json`:

  ```json
  {
    "provider": "example-tier2-vendor",
    "tier": 2,
    "addedInPR": "https://github.com/juspay/neurolink/pull/0000",
    "addedDate": "2026-08-15",
    "filesTouched": [
      "src/lib/constants/enums.ts",
      "src/lib/providers/openaiCompatCatalog.ts",
      "src/lib/factories/providerDescriptors.ts",
      "src/lib/types/providers.ts",
      "src/lib/factories/providerRegistry.ts",
      "test/continuous-test-suite-providers-mocked.ts"
    ],
    "mockedContractSection": "LLM example-tier2-vendor",
    "manualTestStatus": "ci-mocked-only"
  }
  ```

  `docs/provider-integration/manifests/_example-tier3-adapter.json`:

  ```json
  {
    "provider": "example-tier3-vendor",
    "tier": 3,
    "addedInPR": "https://github.com/juspay/neurolink/pull/0000",
    "addedDate": "2026-08-15",
    "filesTouched": [
      "src/lib/constants/enums.ts",
      "src/lib/providers/exampleTier3Vendor.ts",
      "src/lib/factories/providerDescriptors.ts",
      "src/lib/factories/providerRegistry.ts",
      "src/lib/types/providers.ts",
      "test/continuous-test-suite-providers-mocked.ts",
      "test/continuous-test-suite-new-providers.ts"
    ],
    "mockedContractSection": "LLM example-tier3-vendor",
    "manualTestStatus": "manual-live-tested"
  }
  ```

- [ ] Verify both fixtures are valid JSON.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  node -e 'JSON.parse(require("fs").readFileSync("docs/provider-integration/manifests/_example-tier2-catalog.json", "utf8")); JSON.parse(require("fs").readFileSync("docs/provider-integration/manifests/_example-tier3-adapter.json", "utf8")); console.log("OK: both valid JSON")'
  # Expected: OK: both valid JSON
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/manifests/
  git commit -m "docs(provider-integration): define the provider manifest convention"
  ```

---

### Task 7: Rewire the existing docs index into the tiered flow

**Files:**

- Modify: `docs/provider-integration/README.md` (decision tree + document index)
- Modify: `docs/provider-integration/15-adding-llm-provider.md` (replace stale 12-file-checklist content with a redirect)
- Modify: `docs/provider-integration/CHECKLIST.md` (§A section, lines 24–71)
- Modify: `docs/provider-integration/06-testing.md` (fix the stale `ALL_PROVIDERS` reference)

**Interfaces:**

- Consumes: Tasks 1–6's new files (this task links to them).
- Produces: nothing new consumed by later tasks; this is the "make the new docs discoverable" step.

- [ ] Update `docs/provider-integration/README.md`'s decision tree to route the LLM path through the new tiers, and add pointers to the ADRs/manifests. Replace the "Quick decision tree" LLM branch:

  Find this block (current lines 18–40):

  ```markdown
  ├─ A new LLM / chat provider
  │ → 15-adding-llm-provider.md
  ```

  Replace with:

  ```markdown
  ├─ A new LLM / chat provider
  │ → tiers/README.md (pick your tier: aggregator passthrough / catalog
  │ entry / adapter-native / full custom — see also 15-adding-llm-provider.md,
  │ now a redirect into the tiers)
  ```

  And add two rows to the "How-to guides" table (after the `CHECKLIST.md`
  row, before `SAFETY-PRIMITIVES.md`):

  ```markdown
  | `tiers/README.md` | Tiered LLM-provider onboarding (the current canonical path) | Adding any new chat/text-generation provider — read this first, not `15-adding-llm-provider.md` directly |
  | `adr/README.md` | Why the tiers/catalog/descriptor/CI-gate are shaped the way they are | Before proposing a change to the onboarding process itself |
  | `manifests/README.md` | The per-provider manifest convention | Every Tier 2+ provider PR |
  ```

- [ ] Replace `docs/provider-integration/15-adding-llm-provider.md`'s content
      entirely with a short redirect (the old 12-file checklist describes a
      pre-redesign world where every provider needed its own subclass, its
      own `providerConfig.ts` factory, and 3 separate `commandFactory.ts`
      edit spots — all superseded by the tiers):

  ```markdown
  # 15 · Adding a New LLM Provider — superseded by the tiered guide

  > **This document is a redirect, not the current guide.** The 12-file
  > checklist this file used to describe predates the provider-descriptor
  > and OpenAI-compat-catalog redesign (Plans 04/05, August 2026) and no
  > longer matches the codebase. Use
  > `tiers/README.md` instead — it routes you to the
  > right tier (1–4) and each tier doc has the current, accurate file
  > list.

  ## Quick links

  - `tiers/README.md` — start here; decision tree
  - `tiers/tier-1-aggregator-passthrough.md` — zero code
  - `tiers/tier-2-catalog-entry.md` — ~1 hour, one data row
  - `tiers/tier-3-adapter-native.md` — days, one provider class
  - `tiers/tier-4-full-custom.md` — bespoke, needs written justification
  - `adr/0001-provider-descriptor-as-source-of-truth.md` — why the shape changed

  The implementation journals this guide used to generalize from
  (`00-architecture.md`, `02-deepseek.md` through `05-llamacpp.md`) are
  still useful as worked historical examples of the _pre-redesign_ shape —
  read them for BaseProvider/streaming fundamentals, not for the current
  file checklist.
  ```

- [ ] Rewrite `docs/provider-integration/CHECKLIST.md`'s `§A` section (the
      block from `## §A — New LLM provider (12 files)` through the line
      before `## §B — New TTS provider (6 files)`) to point at the tiers
      instead of repeating the stale 12-file list:

  ```markdown
  ## §A — New LLM provider (tiered — see `tiers/`)

  Full guide: `tiers/README.md`. Pick your tier first;
  each tier doc has its own exact file checklist and verification
  commands — don't paste a generic 12-file list anymore, it's stale.

  - [ ] Tier picked and justified: 1 (aggregator passthrough) / 2 (catalog
        entry) / 3 (adapter-native) / 4 (full custom — `tier4Justification`
        written in the manifest)
  - [ ] All files listed in the matching `tiers/tier-N-*.md` checklist
        touched
  - [ ] `docs/provider-integration/manifests/<name>.json` created (Tier 2+
        only; see `manifests/README.md`)
  - [ ] Mocked-contract section added to
        `test/continuous-test-suite-providers-mocked.ts` (Tier 2+ only)
  - [ ] `pnpm run check && pnpm run lint && pnpm run test:providers-mocked
  && pnpm run verify:provider-onboarding && pnpm run build` all green
  - [ ] CLI smoke test passes (`pnpm run cli generate "..." --provider
  <name>`)

  **Docs (Tier 2 and above; Tier 1 is different — see the note below):**

  - [ ] `docs/getting-started/providers/<name>.md` — NEW per-provider guide
  - [ ] `docs/getting-started/providers/index.md` — add card
  - [ ] `docs/getting-started/provider-setup.md` — add to index
  - [ ] `docs/getting-started/environment-variables.md` — document new env
        vars

  Tier 1 adds no new `AIProviderName`, so the per-provider guide, card, and
  index entries above don't apply. Only `environment-variables.md` may be
  touched, and even that is optional — see the Tier 1 guide's own checklist
  item in `tiers/tier-1-aggregator-passthrough.md`.

  - [ ] `docs/reference/provider-comparison.md` — add row
  - [ ] `README.md` — update provider count
  ```

- [ ] Fix `docs/provider-integration/06-testing.md`'s stale
      `ALL_PROVIDERS` reference. Find:

  ```markdown
  This is the main provider suite. The relevant section is the `ALL_PROVIDERS` array (around line 73):
  ```

  Replace with:

  ```markdown
  This is the main provider suite. The old `ALL_PROVIDERS` array this
  section used to describe was removed and migrated to
  `test/helpers/providerMatrix.ts`'s `PROVIDERS` table (one entry per
  `AIProviderName` member, consumed by `pnpm run test:matrix`). For the
  zero-cost, CI-gated equivalent, see
  `test/continuous-test-suite-providers-mocked.ts` and
  `pnpm run verify:provider-onboarding`
  (`docs/provider-integration/tiers/README.md`).
  ```

- [ ] Verify no file in `docs/provider-integration/` still references the
      removed `ALL_PROVIDERS` array or the stale 12-file checklist framing.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  grep -rn "add to \`ALL_PROVIDERS\`\|The relevant section is the \`ALL_PROVIDERS\` array" docs/provider-integration/ || echo "CLEAN"
  # Expected: CLEAN
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add docs/provider-integration/README.md docs/provider-integration/15-adding-llm-provider.md docs/provider-integration/CHECKLIST.md docs/provider-integration/06-testing.md
  git commit -m "docs(provider-integration): route the LLM onboarding path through the new tiers"
  ```

---

### Task 8: Scaffolding tool — `tools/scaffold-provider.ts`

**Files:**

- Create: `tools/scaffold-provider.ts`
- Modify: `package.json` (add `scaffold:provider` script)

**Interfaces:**

- Produces: `npx tsx tools/scaffold-provider.ts --name=<kebab> --tier=<1|2|3|4> --defaultModel=<id> [--baseURL=<url>] [--envVar=<ENV_NAME>] [--aliases=a,b,c] [--out=<dir>]`, writing generated snippet files to `--out` (default `.scaffold-output/<name>/`) and printing the manual checklist to stdout. Never edits real source files — output is copy-paste material for a human, reviewed before landing anywhere.
- Consumes: nothing at runtime from other plans (it generates code _shaped like_ Plan 04/05/07's contracts, it doesn't import them).

This is a template-string generator with no external dependencies — no unit-test harness needed beyond "run it and inspect the files it wrote", per the plan-specific constraint that `tools/**` isn't type-checked by `pnpm run check`.

- [ ] Write `tools/scaffold-provider.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Provider scaffolding tool (Tier 1–4 onboarding).
   *
   * Given {name, tier, baseURL, envVar, defaultModel, aliases}, generates
   * the boilerplate snippets an engineer splices into the real source
   * files, plus a manifest stub and the tier-specific manual checklist.
   * Never edits repo source directly — everything lands under --out
   * (default .scaffold-output/<name>/) for review before copy-paste.
   *
   * Usage:
   *   npx tsx tools/scaffold-provider.ts --name=cerebras --tier=2 \
   *     --baseURL=https://api.cerebras.ai/v1 --envVar=CEREBRAS_API_KEY \
   *     --defaultModel=llama3.1-70b --aliases=cerebras-ai
   *
   * pnpm script: pnpm run scaffold:provider -- --name=... --tier=... ...
   *
   * See docs/provider-integration/tiers/README.md for what each tier means.
   */

  import { mkdirSync, writeFileSync } from "node:fs";
  import { join } from "node:path";

  type ScaffoldTier = 1 | 2 | 3 | 4;

  type ScaffoldInput = {
    name: string;
    tier: ScaffoldTier;
    baseURL?: string;
    envVar: string;
    defaultModel: string;
    aliases: readonly string[];
    out: string;
  };

  function toConstantCase(name: string): string {
    return name.toUpperCase().replace(/-/g, "_");
  }

  function toPascalCase(name: string): string {
    return name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  function toCamelCase(name: string): string {
    return name.replace(/-([a-z])/g, (_match, char: string) =>
      char.toUpperCase(),
    );
  }

  function parseArgs(argv: readonly string[]): ScaffoldInput {
    const flags = new Map<string, string>();
    for (const arg of argv) {
      const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
      if (match) {
        flags.set(match[1], match[2]);
      }
    }
    const name = flags.get("name");
    const tierRaw = flags.get("tier");
    const defaultModel = flags.get("defaultModel");
    if (!name || !tierRaw || !defaultModel) {
      console.error(
        "Usage: npx tsx tools/scaffold-provider.ts --name=<kebab> --tier=<1|2|3|4> --defaultModel=<id> [--baseURL=<url>] [--envVar=<ENV_NAME>] [--aliases=a,b,c] [--out=<dir>]",
      );
      process.exit(1);
    }
    const tierNum = Number(tierRaw);
    if (![1, 2, 3, 4].includes(tierNum)) {
      console.error(`--tier must be 1, 2, 3, or 4 (got "${tierRaw}")`);
      process.exit(1);
    }
    const tier = tierNum as ScaffoldTier;
    return {
      name,
      tier,
      baseURL: flags.get("baseURL"),
      envVar: flags.get("envVar") ?? `${toConstantCase(name)}_API_KEY`,
      defaultModel,
      aliases: (flags.get("aliases") ?? "").split(",").filter(Boolean),
      out: flags.get("out") ?? join(".scaffold-output", name),
    };
  }

  function enumEntrySnippet(input: ScaffoldInput): string {
    return `  ${toConstantCase(input.name)} = "${input.name}",\n`;
  }

  function descriptorSnippet(input: ScaffoldInput): string {
    const constant = toConstantCase(input.name);
    const camelKey = toCamelCase(input.name);
    const aliasesLiteral = input.aliases.map((a) => `"${a}"`).join(", ");
    return `  {
    name: AIProviderName.${constant},
    aliases: [${aliasesLiteral}] as const,
    credentialsKey: "${camelKey}",
    envVars: {
      apiKey: "${input.envVar}",
      baseURL: "${constant}_BASE_URL",
      model: "${constant}_MODEL",
    },
    defaultModel: "${input.defaultModel}",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
  },
  `;
  }

  function catalogEntrySnippet(input: ScaffoldInput): string {
    const constant = toConstantCase(input.name);
    const baseURLLiteral = input.baseURL ? `"${input.baseURL}"` : "undefined";
    return `  {
    provider: AIProviderName.${constant},
    defaultBaseURL: ${baseURLLiteral},
    envBaseURLVar: "${constant}_BASE_URL",
    defaultModel: "${input.defaultModel}",
    fallbackModels: ["${input.defaultModel}"],
  },
  `;
  }

  // NOTE: tools/** is excluded from `pnpm run check` (see this plan's
  // Global Constraints), so a wrong classifyProviderError call shape in
  // this template would never surface as a type error in CI — it would
  // only fail once a human copies the generated snippet into real src/
  // code and runs `pnpm run check` against *that*. The call below MUST
  // match Plan 07's real signature exactly: classifyProviderError(error,
  // rules, provider: string, modelName?: string) — positional, not an
  // object third argument.
  function providerClassSnippet(input: ScaffoldInput): string {
    const className = `${toPascalCase(input.name)}Provider`;
    const constant = toConstantCase(input.name);
    const camelKey = toCamelCase(input.name);
    return `import { AIProviderName } from "../constants/enums.js";
  import { BaseProvider } from "../core/baseProvider.js";
  import { classifyProviderError, DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
  import type { NeurolinkCredentials, ProviderErrorRule } from "../types/index.js";
  import type { NeuroLink } from "../neurolink.js";
  
  const ${constant}_ERROR_RULES: readonly ProviderErrorRule[] = [
    ...DEFAULT_ERROR_RULES,
    // Add provider-specific rules here.
  ];
  
  export class ${className} extends BaseProvider {
    constructor(
      modelName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: NeurolinkCredentials["${camelKey}"],
    ) {
      super(modelName ?? "${input.defaultModel}", AIProviderName.${constant}, sdk);
      // TODO: resolve apiKey/baseURL from credentials -> env -> default,
      // build the wire client, implement executeStream()/doGenerate().
    }
  
    formatProviderError(error: unknown): Error {
      return classifyProviderError(error, ${constant}_ERROR_RULES, "${input.name}", this.modelName);
    }
  }
  `;
  }

  function mockedTestSectionSnippet(input: ScaffoldInput): string {
    return `// --- ${toPascalCase(input.name)} (Tier ${input.tier}) ---
  const section = "LLM ${input.name}";
  // TODO: installMockFetch route for POST <baseURL>/chat/completions,
  // assert Authorization header + body shape, assert happy-path parse,
  // then assert 401 -> friendly auth error. Copy the nearest existing
  // section in test/continuous-test-suite-providers-mocked.ts as a
  // template (e.g. the groq or xai section).
  `;
  }

  function manifestJson(input: ScaffoldInput): string {
    const base: Record<string, unknown> = {
      provider: input.name,
      tier: input.tier,
      addedInPR: "",
      addedDate: new Date().toISOString().slice(0, 10),
      filesTouched: [],
      mockedContractSection: `LLM ${input.name}`,
      manualTestStatus: "not-tested",
    };
    if (input.tier === 4) {
      base.tier4Justification = "";
    }
    return `${JSON.stringify(base, null, 2)}\n`;
  }

  function tierDocFor(tier: ScaffoldTier): string {
    switch (tier) {
      case 1:
        return "tiers/tier-1-aggregator-passthrough.md";
      case 2:
        return "tiers/tier-2-catalog-entry.md";
      case 3:
        return "tiers/tier-3-adapter-native.md";
      case 4:
        return "tiers/tier-4-full-custom.md";
    }
  }

  function manualChecklist(input: ScaffoldInput): string {
    const doc = tierDocFor(input.tier);
    if (input.tier === 1) {
      return `# Manual checklist for "${input.name}" (Tier 1)
  
  Full guide: docs/provider-integration/${doc}
  
  Tier 1 is a usage change, not an integration change — no files are
  generated under this directory for Tier 1.
  
  - [ ] Confirm the aggregator (litellm/openrouter) actually serves the
        model
  - [ ] No AIProviderName enum change, no PROVIDER_DESCRIPTORS change, no
        OPENAI_COMPAT_CATALOG change
  - [ ] Optional: friendlier default alias in MODEL_ALIASES /
        DEFAULT_MODEL_ALIASES (src/lib/models/modelRegistry.ts)
  - [ ] Optional: document a dedicated env var in
        docs/getting-started/environment-variables.md
  - [ ] Manually smoke-test the model end-to-end
  - [ ] No manifest.json required — verify-provider-onboarding only gates
        new AIProviderName members
  `;
    }
    const camelKey = toCamelCase(input.name);
    const catalogOrClassLine =
      input.tier === 2
        ? "- [ ] Splice catalog-entry.ts.snippet into OPENAI_COMPAT_CATALOG (src/lib/providers/openaiCompatCatalog.ts)"
        : "- [ ] Move provider-class.ts.snippet to src/lib/providers/<name>.ts and fill in the TODOs";
    return `# Manual checklist for "${input.name}" (Tier ${input.tier})
  
  Full guide: docs/provider-integration/${doc}
  
  Generated files under this directory are STARTING POINTS, not finished
  code — review every TODO before copy-pasting into src/.
  
  - [ ] Splice enum-entry.ts.snippet into src/lib/constants/enums.ts
  ${catalogOrClassLine}
  - [ ] Splice descriptor-entry.ts.snippet into PROVIDER_DESCRIPTORS (src/lib/factories/providerDescriptors.ts)
  - [ ] Add a NeurolinkCredentials["${camelKey}"] slice in src/lib/types/providers.ts
  - [ ] Add one ProviderFactory.registerProvider() block in src/lib/factories/providerRegistry.ts (dynamic import — Critical Rule 1)
  - [ ] Move mocked-test-section.ts.snippet into test/continuous-test-suite-providers-mocked.ts and finish the TODOs
  - [ ] Fill in manifest.json (addedInPR, filesTouched) and move it to docs/provider-integration/manifests/${input.name}.json
  - [ ] pnpm run check && pnpm run lint && pnpm run test:providers-mocked && pnpm run verify:provider-onboarding
  `;
  }

  function main(): void {
    const input = parseArgs(process.argv.slice(2));
    mkdirSync(input.out, { recursive: true });

    if (input.tier !== 1) {
      writeFileSync(
        join(input.out, "enum-entry.ts.snippet"),
        enumEntrySnippet(input),
      );
      writeFileSync(
        join(input.out, "descriptor-entry.ts.snippet"),
        descriptorSnippet(input),
      );
    }
    if (input.tier === 2) {
      writeFileSync(
        join(input.out, "catalog-entry.ts.snippet"),
        catalogEntrySnippet(input),
      );
    }
    if (input.tier === 3 || input.tier === 4) {
      writeFileSync(
        join(input.out, "provider-class.ts.snippet"),
        providerClassSnippet(input),
      );
    }
    if (input.tier !== 1) {
      writeFileSync(
        join(input.out, "mocked-test-section.ts.snippet"),
        mockedTestSectionSnippet(input),
      );
      writeFileSync(join(input.out, "manifest.json"), manifestJson(input));
    }
    const checklist = manualChecklist(input);
    writeFileSync(join(input.out, "MANUAL-CHECKLIST.md"), checklist);

    console.log(
      `Scaffolded "${input.name}" (Tier ${input.tier}) -> ${input.out}`,
    );
    console.log(checklist);
  }

  main();
  ```

- [ ] Add the pnpm script. In `package.json`, next to the existing
      `"test:providers-mocked"` entry:

  ```json
  "test:providers-mocked": "npx tsx test/continuous-test-suite-providers-mocked.ts",
  "scaffold:provider": "npx tsx tools/scaffold-provider.ts",
  ```

- [ ] Run the tool for a Tier 2 example and verify it produced the
      expected files.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  pnpm run scaffold:provider -- --name=cerebras --tier=2 \
    --baseURL=https://api.cerebras.ai/v1 --envVar=CEREBRAS_API_KEY \
    --defaultModel=llama3.1-70b --aliases=cerebras-ai \
    --out=.scaffold-output/cerebras
  ls .scaffold-output/cerebras
  # Expected: catalog-entry.ts.snippet  descriptor-entry.ts.snippet
  #           enum-entry.ts.snippet  manifest.json  MANUAL-CHECKLIST.md
  #           mocked-test-section.ts.snippet
  cat .scaffold-output/cerebras/enum-entry.ts.snippet
  # Expected:   CEREBRAS = "cerebras",
  node -e 'JSON.parse(require("fs").readFileSync(".scaffold-output/cerebras/manifest.json", "utf8")); console.log("manifest.json is valid JSON")'
  # Expected: manifest.json is valid JSON
  ```

- [ ] Run it once more for Tier 4 and confirm `tier4Justification` appears
      in the generated manifest (proves the tier-branching logic).

  ```bash
  pnpm run scaffold:provider -- --name=acme-sdk --tier=4 \
    --defaultModel=acme-default --out=.scaffold-output/acme-sdk
  grep -q "tier4Justification" .scaffold-output/acme-sdk/manifest.json && echo "OK: tier4Justification present"
  # Expected: OK: tier4Justification present
  grep -q "tier4Justification" .scaffold-output/cerebras/manifest.json && echo "UNEXPECTED" || echo "OK: absent for Tier 2"
  # Expected: OK: absent for Tier 2
  ```

- [ ] Run it once more for Tier 1 and confirm no code-change artifacts are
      generated (proves the Tier-1 short-circuit in `main()` and
      `manualChecklist()`).

  ```bash
  pnpm run scaffold:provider -- --name=example-aggregator-model --tier=1 \
    --defaultModel=example-default --out=.scaffold-output/example-aggregator-model
  ls .scaffold-output/example-aggregator-model
  # Expected: MANUAL-CHECKLIST.md only — no enum-entry.ts.snippet,
  #           descriptor-entry.ts.snippet, catalog-entry.ts.snippet,
  #           provider-class.ts.snippet, mocked-test-section.ts.snippet,
  #           or manifest.json
  grep -q "manifest.json" .scaffold-output/example-aggregator-model/MANUAL-CHECKLIST.md && echo "UNEXPECTED" || echo "OK: no manifest.json reference"
  # Expected: OK: no manifest.json reference
  grep -q "provider-class.ts.snippet" .scaffold-output/example-aggregator-model/MANUAL-CHECKLIST.md && echo "UNEXPECTED" || echo "OK: no provider-class.ts.snippet reference"
  # Expected: OK: no provider-class.ts.snippet reference
  ```

- [ ] Clean up the scratch output before committing (it's a local
      demonstration, not part of the repo) and add `.scaffold-output/` to
      `.gitignore`.

  ```bash
  rm -rf .scaffold-output
  grep -qxF '.scaffold-output/' .gitignore || echo '.scaffold-output/' >> .gitignore
  ```

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add tools/scaffold-provider.ts package.json .gitignore
  git commit -m "feat(tools): add scaffold-provider generator for Tier 1-4 onboarding"
  ```

---

### Task 9: Completeness gate — `tools/verify-provider-onboarding.ts` + CI + PR template

**Files:**

- Create: `tools/verify-provider-onboarding.ts`
- Modify: `package.json` (add `verify:provider-onboarding` script)
- Modify: `.github/workflows/ci.yml` (`quality-gate` job — add a step)
- Modify: `.github/PULL_REQUEST_TEMPLATE.md` (add a "New Provider Onboarding" section)

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS` (Plan 04, `src/lib/factories/providerDescriptors.ts`), `OPENAI_COMPAT_CATALOG` (Plan 05, `src/lib/providers/openaiCompatCatalog.ts`), `AIProviderName` (existing, `src/lib/constants/enums.ts`), `test/continuous-test-suite-providers-mocked.ts`'s `provider: "<name>"` spec-object convention (existing), `docs/provider-integration/manifests/<name>.json` (Task 6).
- Produces: `npx tsx tools/verify-provider-onboarding.ts` exit-0/exit-1 gate; a required CI step.

This tool is source-only — it imports `PROVIDER_DESCRIPTORS`/`OPENAI_COMPAT_CATALOG`/`AIProviderName` directly from their `.ts` source files via relative dynamic `import()` with a `.js` specifier, the exact same mechanism `src/lib/factories/providerRegistry.ts` already relies on for every provider's dynamic import (tsx resolves `.js` specifiers to sibling `.ts` files at runtime). This deliberately avoids the `../dist/index.js` pattern some existing structural checks use, because that requires a prior `pnpm run build` — which the `quality-gate` CI job (where this step lands) doesn't run today, and both `PROVIDER_DESCRIPTORS` and `OPENAI_COMPAT_CATALOG` are guaranteed side-effect-free "pure data" modules per Plan 04/05's contract, so importing them directly from source is safe.

- [ ] Write `tools/verify-provider-onboarding.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Provider Onboarding Completeness gate.
   *
   * For every AIProviderName member NOT in LEGACY_PROVIDERS (i.e. every
   * provider added after this gate existed), asserts the four required
   * onboarding artifacts landed together:
   *   1. A ProviderDescriptor entry (PROVIDER_DESCRIPTORS)
   *   2. Either an OpenAICompatCatalogEntry OR a concrete, registered
   *      provider class (catalog-or-class)
   *   3. A mocked-contract test section in
   *      test/continuous-test-suite-providers-mocked.ts
   *   4. A manifest file at docs/provider-integration/manifests/<name>.json
   *      (with tier4Justification present when tier === 4)
   *
   * Zero network I/O, zero API keys, source-only — does not require
   * `pnpm run build` first (see docs/provider-integration/tiers/README.md
   * and this repo's tools/README notes on why: PROVIDER_DESCRIPTORS and
   * OPENAI_COMPAT_CATALOG are pure-data modules, safe to import directly
   * from src/ via tsx's on-the-fly TS loader — the same mechanism
   * src/lib/factories/providerRegistry.ts already relies on for every
   * provider's dynamic import).
   *
   * Run with: pnpm run verify:provider-onboarding
   */

  import { existsSync, readdirSync, readFileSync } from "node:fs";
  import { join } from "node:path";

  const REPO_ROOT = process.cwd();

  // Snapshot of AIProviderName members that predate this gate (August
  // 2026). The gate does NOT retroactively require manifests/mocked
  // sections for these — see ADR-0003 and the manifests/README.md ratchet
  // note. Do not add to this list; it's a frozen baseline, not a way to
  // exempt a new provider from the gate.
  const LEGACY_PROVIDERS: ReadonlySet<string> = new Set([
    "bedrock",
    "openai",
    "openai-compatible",
    "openrouter",
    "vertex",
    "anthropic",
    "azure",
    "google-ai",
    "huggingface",
    "ollama",
    "mistral",
    "litellm",
    "sagemaker",
    "deepseek",
    "nvidia-nim",
    "lm-studio",
    "llamacpp",
    "xai",
    "groq",
    "cohere",
    "together-ai",
    "fireworks",
    "perplexity",
    "cloudflare",
    "replicate",
    "voyage",
    "jina",
    "stability",
    "ideogram",
    "recraft",
  ]);

  type ProviderManifest = {
    provider: string;
    tier: 1 | 2 | 3 | 4;
    addedDate: string;
    mockedContractSection: string;
    tier4Justification?: string;
  };

  type CheckResult = { provider: string; ok: boolean; problems: string[] };

  async function loadEnumMemberMap(): Promise<
    Readonly<Record<string, string>>
  > {
    const mod = (await import("../src/lib/constants/enums.js")) as {
      AIProviderName: Record<string, string>;
    };
    return mod.AIProviderName;
  }

  function loadEnumMembers(
    enumMemberMap: Readonly<Record<string, string>>,
  ): ReadonlySet<string> {
    return new Set(Object.values(enumMemberMap).filter((v) => v !== "auto"));
  }

  async function loadDescriptors(): Promise<ReadonlySet<string>> {
    const mod =
      (await import("../src/lib/factories/providerDescriptors.js")) as {
        PROVIDER_DESCRIPTORS: ReadonlyArray<{ name: string }>;
      };
    return new Set(mod.PROVIDER_DESCRIPTORS.map((d) => d.name));
  }

  async function loadCatalog(): Promise<ReadonlySet<string>> {
    const mod =
      (await import("../src/lib/providers/openaiCompatCatalog.js")) as {
        OPENAI_COMPAT_CATALOG: ReadonlyArray<{ provider: string }>;
      };
    return new Set(mod.OPENAI_COMPAT_CATALOG.map((c) => c.provider));
  }

  function loadNativeProviderNames(
    enumMemberMap: Readonly<Record<string, string>>,
  ): ReadonlySet<string> {
    // Every AIProviderName that has its own registerProvider() block whose
    // dynamic-import target is a real file (or folder/index.ts) in
    // src/lib/providers/ counts as "catalog-or-class" covered even without
    // a catalog row (Tier 3/4).
    //
    // The registry pairs a *kebab-case* enum value (AIProviderName.<MEMBER>)
    // with a *camelCase* import path (e.g. AIProviderName.OPENAI_COMPATIBLE
    // = "openai-compatible" imports "../providers/openaiCompatible.js";
    // AIProviderName.NVIDIA_NIM = "nvidia-nim" imports
    // "../providers/nvidiaNim/index.js"). Comparing the raw file basename
    // to the provider identity string never matches, so instead: split the
    // registry source into one chunk per registerProvider() call, resolve
    // each chunk's own <MEMBER> to its real enum value via enumMemberMap,
    // and pair it with that same chunk's own import target (not a
    // file-basename lookup against the whole file's enum-value set).
    const registrySource = readFileSync(
      join(REPO_ROOT, "src/lib/factories/providerRegistry.ts"),
      "utf8",
    );
    const providersDir = join(REPO_ROOT, "src/lib/providers");
    const entries = readdirSync(providersDir, { withFileTypes: true });
    const flatFiles = new Set(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".ts"))
        .map((e) => e.name.replace(/\.ts$/, "")),
    );
    const folders = new Set(
      entries
        .filter(
          (e) =>
            e.isDirectory() &&
            existsSync(join(providersDir, e.name, "index.ts")),
        )
        .map((e) => e.name),
    );

    const memberRe = /AIProviderName\.(\w+)/;
    // Matches both flat `providers/<name>.js` and folder
    // `providers/<name>/index.js` import forms.
    const importRe =
      /await import\("\.\.\/providers\/([\w-]+)(?:\/index)?\.js"\)/;
    const blocks = registrySource.split(
      /(?=ProviderFactory\.registerProvider\()/,
    );

    const covered = new Set<string>();
    for (const block of blocks) {
      const memberMatch = memberRe.exec(block);
      const importMatch = importRe.exec(block);
      if (!memberMatch || !importMatch) {
        continue;
      }
      const base = importMatch[1];
      if (!flatFiles.has(base) && !folders.has(base)) {
        continue;
      }
      const value = enumMemberMap[memberMatch[1]];
      if (value) {
        covered.add(value);
      }
    }
    return covered;
  }

  function hasMockedSection(provider: string): boolean {
    const source = readFileSync(
      join(REPO_ROOT, "test/continuous-test-suite-providers-mocked.ts"),
      "utf8",
    );
    const re = new RegExp(`provider:\\s*"${provider}"`);
    return re.test(source);
  }

  function loadManifest(provider: string): ProviderManifest | null {
    const path = join(
      REPO_ROOT,
      "docs/provider-integration/manifests",
      `${provider}.json`,
    );
    if (!existsSync(path)) {
      return null;
    }
    const parsed = JSON.parse(
      readFileSync(path, "utf8"),
    ) as Partial<ProviderManifest>;
    if (
      typeof parsed.provider !== "string" ||
      typeof parsed.tier !== "number" ||
      typeof parsed.addedDate !== "string" ||
      typeof parsed.mockedContractSection !== "string"
    ) {
      return null;
    }
    return parsed as ProviderManifest;
  }

  async function main(): Promise<void> {
    const enumMemberMap = await loadEnumMemberMap();
    const [descriptors, catalog] = await Promise.all([
      loadDescriptors(),
      loadCatalog(),
    ]);
    const enumMembers = loadEnumMembers(enumMemberMap);
    const nativeClasses = loadNativeProviderNames(enumMemberMap);

    const results: CheckResult[] = [];
    for (const provider of [...enumMembers].sort()) {
      if (LEGACY_PROVIDERS.has(provider)) {
        continue;
      }
      const problems: string[] = [];
      if (!descriptors.has(provider)) {
        problems.push(
          "missing ProviderDescriptor entry (PROVIDER_DESCRIPTORS)",
        );
      }
      if (!catalog.has(provider) && !nativeClasses.has(provider)) {
        problems.push(
          "no OpenAICompatCatalogEntry and no registered provider class (catalog-or-class)",
        );
      }
      if (!hasMockedSection(provider)) {
        problems.push(
          "no mocked-contract section in continuous-test-suite-providers-mocked.ts",
        );
      }
      const manifest = loadManifest(provider);
      if (!manifest) {
        problems.push(
          `missing/invalid manifest at docs/provider-integration/manifests/${provider}.json`,
        );
      } else if (manifest.tier === 4 && !manifest.tier4Justification) {
        problems.push("tier-4 manifest missing tier4Justification");
      }
      results.push({ provider, ok: problems.length === 0, problems });
    }

    const failures = results.filter((r) => !r.ok);
    for (const r of results) {
      console.log(`${r.ok ? "✓" : "✗"} ${r.provider}`);
      for (const p of r.problems) {
        console.log(`    - ${p}`);
      }
    }
    if (results.length === 0) {
      console.log("No new (post-legacy) providers to check.");
    } else {
      console.log(
        `\n${results.length - failures.length}/${results.length} new providers fully onboarded.`,
      );
    }
    if (failures.length > 0) {
      console.error(
        `\nProvider Onboarding Completeness FAILED for: ${failures.map((f) => f.provider).join(", ")}`,
      );
      process.exit(1);
    }
  }

  main().catch((err: unknown) => {
    console.error("verify-provider-onboarding crashed:", err);
    process.exit(1);
  });
  ```

- [ ] Add the pnpm script, next to `"scaffold:provider"` in `package.json`:

  ```json
  "scaffold:provider": "npx tsx tools/scaffold-provider.ts",
  "verify:provider-onboarding": "npx tsx tools/verify-provider-onboarding.ts",
  ```

- [ ] Run it against the current (post-Plan-04/05) repo state and confirm
      it passes with zero new providers (every current `AIProviderName`
      member is in `LEGACY_PROVIDERS`).

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  pnpm run verify:provider-onboarding
  # Expected: "No new (post-legacy) providers to check." and exit code 0
  echo "exit: $?"
  ```

- [ ] Deliberately break the gate to prove it catches a real gap (per the
      Global Constraints' "break one assertion on purpose" requirement),
      then restore. Temporarily add a fake enum member with no supporting
      artifacts:

  ```bash
  cp src/lib/constants/enums.ts src/lib/constants/enums.ts.bak
  # Add a throwaway member that has no descriptor/catalog/mocked-section/manifest:
  perl -0pi -e 's/(AUTO = "auto",\n)/  FAKE_TEST_PROVIDER = "fake-test-provider",\n$1/' src/lib/constants/enums.ts
  pnpm run verify:provider-onboarding
  # Expected: exits 1, prints "✗ fake-test-provider" with all four problem
  # lines, and the final line lists "fake-test-provider" as a failure.
  mv src/lib/constants/enums.ts.bak src/lib/constants/enums.ts
  pnpm run verify:provider-onboarding
  # Expected: back to "No new (post-legacy) providers to check." / exit 0
  ```

- [ ] Wire the gate into CI. In `.github/workflows/ci.yml`, inside the
      `quality-gate` job, add a new step directly after the existing
      "🎯 Test Suite Validation" step (find that step by its `name:` line
      and insert immediately below its `continue-on-error: true` line):

  ```yaml
  - name: 🎯 Test Suite Validation
    run: |
      echo "🎯 Continuous test suites are run separately with API keys"
      echo "Skipping automated test execution in CI"
    continue-on-error: true

  - name: 🧩 Provider Onboarding Completeness
    run: |
      echo "🧩 Verifying every new provider shipped descriptor + catalog-or-class + mocked-contract + manifest..."
      pnpm run verify:provider-onboarding
  ```

  Note this step is **not** wrapped in `continue-on-error: true` — unlike
  its no-op neighbor, this one is meant to actually fail the build.

- [ ] Add a "New Provider Onboarding" section to
      `.github/PULL_REQUEST_TEMPLATE.md`. Insert it directly after the
      "## Breaking Changes" section and before "## Testing" (find the
      `## Testing` heading and insert above it):

  ```markdown
  ## New Provider Onboarding

  **Skip this section entirely if this PR doesn't add a new AI provider.**

  - [ ] Tier: 1 (aggregator passthrough) / 2 (catalog entry) / 3
        (adapter-native) / 4 (full custom) — see
        `docs/provider-integration/tiers/README.md`
  - [ ] Manifest added at `docs/provider-integration/manifests/<name>.json`
        (Tier 2+; Tier 4 includes `tier4Justification`)
  - [ ] Mocked-contract section added to
        `test/continuous-test-suite-providers-mocked.ts` (Tier 2+)
  - [ ] `pnpm run verify:provider-onboarding` passes locally
  ```

- [ ] Verify the CI YAML is still valid and the PR template contains the
      new section.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  node -e 'require("js-yaml")' 2>/dev/null && node -e 'const yaml=require("js-yaml"); yaml.load(require("fs").readFileSync(".github/workflows/ci.yml","utf8")); console.log("YAML OK")' || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"
  # Expected: "YAML OK" from whichever parser is available
  grep -q "New Provider Onboarding" .github/PULL_REQUEST_TEMPLATE.md && echo "OK: PR template updated"
  # Expected: OK: PR template updated
  ```

- [ ] `pnpm run check && pnpm run lint` (covers the `package.json` and
      workflow/template edits; `tools/verify-provider-onboarding.ts` itself
      is excluded from `pnpm run check` per the plan-specific constraint,
      but `pnpm run lint`'s Prettier check still covers it).

- [ ] Format and commit.

  ```bash
  pnpm run format
  git add tools/verify-provider-onboarding.ts package.json .github/workflows/ci.yml .github/PULL_REQUEST_TEMPLATE.md
  git commit -m "feat(ci): gate new-provider PRs on descriptor/catalog/mocked-test/manifest completeness"
  ```

---

### Task 10: CLAUDE.md updates

**Files:**

- Modify: `CLAUDE.md` (lines 263–284, "Adding a New Provider"; line 162, Key Files table's `src/lib/types/providers.ts` row)

**Interfaces:**

- Consumes: everything produced by Tasks 1–9 (this task's job is to make the top-level project instructions point at it).

- [ ] Fix the stale `AIProviderName` location and rewrite "Adding a New
      Provider" to the tiered flow. In `CLAUDE.md`, find the exact current
      block (verified present at lines 263–284):

  ````markdown
  ### Adding a New Provider

  1. Create `src/lib/providers/yourProvider.ts` — extend `BaseProvider`
  2. Add name to `AIProviderName` enum in `src/lib/types/providers.ts`
  3. Add model constants to `src/lib/models/`
  4. Register in `ProviderRegistry.registerAllProviders()` using a dynamic import:

     ```typescript
     ProviderFactory.registerProvider(
       AIProviderName.YOUR_PROVIDER,
       async (modelName?, _providerName?, sdk?) => {
         const { YourProvider } = await import("../providers/yourProvider.js");
         return new YourProvider(modelName, sdk as NeuroLink | undefined);
       },
       YourModels.DEFAULT,
       ["alias1", "alias2"],
     );
     ```

  5. If multimodal: add vision capabilities to `ProviderImageAdapter.VISION_CAPABILITIES`
  6. Add to CLI provider choices in `src/cli/factories/commandFactory.ts`
  7. Add tests to the most relevant `test/continuous-test-suite-*.ts` (e.g. `-providers.ts`), or create a new suite `test/continuous-test-suite-<name>.ts` and add a matching `test:<name>` script in `package.json`
  ````

  Replace it with:

  ```markdown
  ### Adding a New Provider

  **Start at `docs/provider-integration/tiers/README.md`** — it routes you to one of four tiers by actual effort required, not a one-size-fits-all checklist:

  - **Tier 1 — aggregator passthrough** (a model already served by LiteLLM/OpenRouter): zero code, just a model id. See `tiers/tier-1-aggregator-passthrough.md`.
  - **Tier 2 — catalog entry** (OpenAI-wire-compatible, zero behavioral quirks — most new providers): one `OpenAICompatCatalogEntry` row in `src/lib/providers/openaiCompatCatalog.ts` + one `ProviderDescriptor` row in `src/lib/factories/providerDescriptors.ts` + one mocked-contract test section. ~1 hour. See `tiers/tier-2-catalog-entry.md`.
  - **Tier 3 — adapter-based native** (own SDK/wire format, still a normal HTTP request/response lifecycle): a `src/lib/providers/<name>.ts` class extending `BaseProvider`, days. See `tiers/tier-3-adapter-native.md`.
  - **Tier 4 — full custom** (SageMaker-class: non-HTTP protocol or SDK-signed auth): everything Tier 3 needs plus a custom lifecycle, and a written `tier4Justification` in its manifest. See `tiers/tier-4-full-custom.md`.

  Regardless of tier, `AIProviderName` lives in `src/lib/constants/enums.ts` (not `src/lib/types/providers.ts`). Every provider ends with a manifest at `docs/provider-integration/manifests/<name>.json` and a green `pnpm run verify:provider-onboarding` — this is a required CI gate for Tier 2+ providers, not optional. Use `pnpm run scaffold:provider` (`tools/scaffold-provider.ts`) to generate starting-point snippets instead of copy-pasting from an existing provider by hand.
  ```

- [ ] Fix the `src/lib/types/providers.ts` row in the Key Files table
      (currently line 162: ``| `src/lib/types/providers.ts` | `AIProvider`
interface, `AIProviderName` enum |``) and add rows for the new
      onboarding files. Find:

  ```markdown
  | `src/lib/types/providers.ts` | `AIProvider` interface, `AIProviderName` enum |
  ```

  Replace with:

  ```markdown
  | `src/lib/constants/enums.ts` | `AIProviderName` enum (the actual location — not `types/providers.ts`) |
  | `src/lib/types/providers.ts` | `AIProvider` type, `NeurolinkCredentials`, `ProviderDescriptor` type |
  | `src/lib/factories/providerDescriptors.ts` | `PROVIDER_DESCRIPTORS` — single source of truth for provider metadata (aliases, credentials key, env vars, tool support) |
  | `src/lib/providers/openaiCompatCatalog.ts` | `OPENAI_COMPAT_CATALOG` — data rows for zero-quirk OpenAI-wire-compatible providers (Tier 2 onboarding) |
  | `docs/provider-integration/tiers/README.md` | Tiered new-provider onboarding guide — start here for any new provider |
  ```

- [ ] Verify the edits landed and no stale reference to the old location
      remains.

  ```bash
  cd $WORKSPACE/neurolink-fork/feat/proider-redesign
  grep -n "AIProviderName.*enum.*src/lib/types/providers.ts\|src/lib/types/providers.ts.*AIProviderName" CLAUDE.md || echo "CLEAN: no stale location reference"
  # Expected: CLEAN: no stale location reference
  grep -q "tiers/README.md" CLAUDE.md && echo "OK: tiered flow referenced"
  # Expected: OK: tiered flow referenced
  ```

- [ ] `pnpm run lint` (Prettier covers Markdown files including `CLAUDE.md`).

- [ ] Commit.

  ```bash
  pnpm run format
  git add CLAUDE.md
  git commit -m "docs(claude-md): point Adding-a-New-Provider at the tiered onboarding flow, fix AIProviderName location"
  ```

---

## Verification Checklist

- [ ] `pnpm run check` — 0 errors (note: does not cover `tools/**`, which is excluded in `tsconfig.json`)
- [ ] `pnpm run lint` — 0 errors (Prettier `--check .` covers every new file including `tools/**` and `docs/**`)
- [ ] `pnpm run build` — clean
- [ ] `pnpm run test:providers-mocked` — still green (unchanged by this plan, but must not have regressed)
- [ ] `pnpm run verify:provider-onboarding` — exits 0, prints "No new (post-legacy) providers to check." against the unmodified repo
- [ ] `pnpm run scaffold:provider -- --name=cerebras --tier=2 --defaultModel=llama3.1-70b --out=.scaffold-output/cerebras` — produces the 6 expected files, then clean up `.scaffold-output/`
- [ ] The deliberate-break test from Task 9 was run once (fake enum member → gate exits 1 with 4 problem lines) and reverted — confirms the gate isn't a silent no-op
- [ ] `grep -rn "ALL_PROVIDERS" docs/provider-integration/` returns nothing describing the removed array as current
- [ ] `grep -c "^## Step" docs/provider-integration/tiers/tier-2-catalog-entry.md` → 6
- [ ] `grep -c "^| [1-9] " docs/provider-integration/tiers/tier-3-adapter-native.md` → 9
- [ ] All three ADRs exist and cross-link correctly: `ls docs/provider-integration/adr/*.md` → 4 files (README + 3 ADRs)
- [ ] `.github/workflows/ci.yml`'s `quality-gate` job contains a "🧩 Provider Onboarding Completeness" step without `continue-on-error: true`
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` contains "New Provider Onboarding"
- [ ] `CLAUDE.md`'s "Adding a New Provider" section references `docs/provider-integration/tiers/README.md` and no longer claims `AIProviderName` lives in `src/lib/types/providers.ts`

## Risks & Rollback

1. **Plans 02/04/05/07 land later than expected or with a different shape than their stated contracts.** Tasks 3, 4, 6, 8, and 9 reference `PROVIDER_DESCRIPTORS`, `OPENAI_COMPAT_CATALOG`, and `classifyProviderError` by the exact names/signatures in this roadmap's shared contracts block. If the landed shape differs (e.g., a renamed field), Task 9's tool will throw a runtime `TypeError` on import, not silently pass — that's a loud, obvious failure, not silent drift. Rollback: fix the tool's field access to match reality; the tier docs' code samples need the same spot-fix. Nothing in this plan can merge before those four plans land — it's stated as a hard dependency in Global Constraints, not an assumption baked silently into code.
2. **The CI gate (Task 9) is a new required-feeling step that could false-positive-fail unrelated PRs.** Mitigated by the `LEGACY_PROVIDERS` ratchet (only new enum members are checked) and by the tool being pure source-regex/JSON-parse with no network calls — the only way it fails is a real missing artifact. Rollback: remove the `- name: 🧩 Provider Onboarding Completeness` step from `ci.yml`'s `quality-gate` job (one YAML block) without touching anything else; the tool and pnpm script can stay dormant.
3. **The scaffolding tool (Task 8) generates code that's subtly wrong for a real vendor** (e.g., a vendor whose auth header isn't `Authorization: Bearer`). This is scoped intentionally — the tool never writes into real source files, only into `.scaffold-output/<name>/` for human review, and every generated snippet is explicitly marked with `// TODO` where vendor-specific judgment is required. Rollback: delete `tools/scaffold-provider.ts` and the `scaffold:provider` script; nothing else depends on it.
4. **Rewriting `docs/provider-integration/15-adding-llm-provider.md` and `CHECKLIST.md`'s `§A` breaks an inbound link someone bookmarked to the old 12-file checklist.** The old file is kept (not deleted) as a redirect page with the same filename/anchor, so URLs don't 404 — they land on a page that immediately points at the current guide. Rollback: `git revert` the Task 7 commit restores the original content verbatim.
5. **The manifest convention (Task 6) becomes yet another hand-maintained table that drifts, the exact failure mode this whole plan exists to prevent.** Mitigated structurally: Task 9's CI gate is the drift-preventer — a provider PR literally cannot merge with a missing/invalid manifest once it's past the `LEGACY_PROVIDERS` baseline. Rollback: if the manifest concept turns out to be more overhead than value, drop the manifest check from Task 9's tool (one `if` block) and delete `docs/provider-integration/manifests/`; the other three checks (descriptor/catalog-or-class/mocked-section) stand alone as a still-useful, slightly weaker gate.

## Out of Scope

- **Implementing `ProviderDescriptor`, `PROVIDER_DESCRIPTORS`, `ProviderFactory.getDescriptor`/`getAllDescriptors`** — Plan 04.
- **Implementing `ProviderErrorRule`, `classifyProviderError`, `DEFAULT_ERROR_RULES`** — Plan 07.
- **Implementing `OpenAICompatCatalogEntry`, `ConfiguredOpenAICompatProvider`, `OPENAI_COMPAT_CATALOG`** — Plan 05.
- **Wiring `commandFactory.ts` CLI choices, `providerHealth.ts` auto-selection, or `contextWindows.ts` fallback resolution to actually read from `PROVIDER_DESCRIPTORS`** — Plans 06/08. This plan's tier docs explicitly flag where those integration points are assumed-but-not-guaranteed and tell the reader to check.
- **Retiring `ModelConfigurationManager`, merging the three context-window stores, or fixing the `together-ai`/`together` `credentialKeyMap` gap** — separate structural fixes identified by the audit, not part of the onboarding-process deliverable.
- **Backfilling manifests, catalog entries, or mocked-contract sections for the 17 of 30 pre-existing providers that currently lack them.** The `LEGACY_PROVIDERS` ratchet in Task 9 explicitly defers this; it's tracked as follow-up work per ADR-0003's "Negative" consequences, not blocked on this plan.
- **The proxy subsystem's own scaling to 200+ providers.** Explicitly out of scope — see the architecture audit's proxy chapter for that as a separate future workstream; nothing in this plan touches `src/lib/proxy/` or its CI (`proxy-performance` job in `ci.yml`).
- **Wiring the existing live-API suites (`test:matrix`, `test:live`, `test:new-providers`, `test:product`) into any CI workflow**, scheduled or otherwise. ADR-0003 explicitly keeps them manual/scheduled by design — that's a deliberate decision this plan documents, not a gap this plan closes.
- **TTS/STT/Realtime/Video/Image-gen/Avatar/Music provider onboarding** (`docs/provider-integration/16-adding-tts-provider.md` through `22-adding-multimodal-provider.md`). The tiered redesign in this plan is scoped to the `AIProvider` (chat/text-generation) registration chain that Plans 02/04/05/06/07/08 actually touch; those modality guides are untouched and remain accurate for their own subsystems.
