# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Critical Rules

These are non-negotiable. Violating them breaks the build or introduces bugs.

1. **Dynamic imports only in registry** — All providers must use dynamic imports inside factory functions in `providerRegistry.ts`. Static imports create circular dependencies.
2. **Types in canonical location** — All type definitions go in `src/lib/types/`. Never create type files inside feature subdirectories.
3. **Gemini tools + JSON schema are mutually exclusive** — Google AI Studio and Vertex **Gemini** models cannot use tools and `structuredOutput` with a JSON schema simultaneously (a Gemini API limitation). This does **not** apply to Vertex **Claude** models, which support both at once — the exclusion is gated on `isGeminiProvider` in `structuredOutputPolicy.ts`, not on the Vertex provider as a whole. Providers that reject the combination at runtime (e.g. Groq) are detected via `isToolsSchemaConflictError` and transparently retried without structured output. Regardless of provider, `generate({ schema })` is guaranteed to return valid JSON in `content` plus a parsed `structuredData` object (see `coerceJsonToSchema`).
   - **Huge-text / truncation:** the native Claude paths (Vertex+Claude, direct Anthropic) must default `max_tokens` to the model's real output ceiling via `resolveClaudeMaxTokens` (Sonnet 4.x → 64K, Opus 4.x → 32K), **never** the legacy hard-coded 4096 that silently truncated large structured responses mid-JSON. The direct Anthropic non-streaming path also passes an explicit request `timeout` so the SDK's "streaming is required for long requests" pre-flight guard doesn't reject a large `max_tokens`. When output still hits the cap, truncation is surfaced — not silent: `coerceJsonToSchema` returns `{ repaired, truncated }`, and `GenerateResult` exposes `jsonRepaired` / `jsonTruncated` (set when `finishReason==="length"` or the recovered JSON came from an unclosed span) plus a WARN log. A truncated response must still yield a **partial object** — never a raw string: `coerceJsonToSchema` prefers the candidate starting at the document's real root (so a bracket pair scraped from inside a string value can't win), and backs off to the last completed field when jsonrepair can't close the span. That recovered `structuredData` is a **plain object, not necessarily a schema-valid one** — when the response was cut short it may be partial — and `jsonTruncated` is set in exactly that case (`jsonRepaired` when the JSON had to be recovered), so a caller can distinguish a salvaged object from a complete one. A caller that needs schema-valid data must check `jsonTruncated` before trusting the object; a caller that wants best-effort data can use it as is. Only schema-rejected **scalar** roots (e.g. a raw string under an object schema) are suppressed via `schemaAccepts`, since they carry no recoverable structure.
4. **CLI ≠ SDK** — CLI can use manual MCP connections; the SDK cannot. Keep concerns separate.
5. **Backward compatibility** — Public SDK API must not break existing callers.
6. **`formatProviderError` must return, never throw** — Any provider error formatter must return the error object, not throw it.
7. **Zero `interface` — always use `type`** — Never use `interface`. Always use `type X = { ... }`. The only exception is `declare global { interface Window { ... } }` which TypeScript requires for declaration merging. Use intersection (`&`) instead of `extends`.
8. **No "Types" suffix in type filenames** — Files inside `src/lib/types/` must not contain "Types" or "Type" in their name. The folder IS the types folder — `mcp.ts` not `mcpTypes.ts`, `auth.ts` not `authTypes.ts`.
9. **Unique type names across all files** — Every exported type name must be globally unique across all files in `src/lib/types/`. Use domain prefixes to disambiguate:
   - Client SDK types: `Client*` prefix (e.g., `ClientAuthConfig`, `ClientToolInfo`, `ClientStreamResult`)
   - CLI types: `Cli*` prefix (e.g., `CliGenerateResult`, `CliStreamChunk`)
   - Server types: `Server*` prefix (e.g., `ServerAuthConfig`)
   - Stream types: `Stream*` prefix (e.g., `StreamToolCall`, `StreamToolResult`)
   - Processor types: `Processor*` prefix (e.g., `ProcessorRetryConfig`)
   - Workflow judge types: `Judge*` prefix (e.g., `JudgeScoreResult`)
10. **Barrel uses `export *` only** — `src/lib/types/index.ts` must only contain `export * from "./file.js"` lines. No selective exports (`export type { X, Y }`), no aliases (`X as Y`). If adding `export *` causes a name collision, rename the type at the source with a domain prefix per rule 9.
11. **No local `types/` directories** — There must be no `types/` directory anywhere except `src/lib/types/`. No `src/lib/observability/types/`, no `src/lib/workflow/core/types/`, etc. Move those types into the canonical `src/lib/types/` folder.
12. **No type re-exports from non-type files** — Files outside `src/lib/types/` must not re-export types (`export type { X } from`). Consumers should import types from `src/lib/types/` directly. Module `index.ts` files should only re-export runtime values (classes, functions, constants), never types.

13. **Barrel-only imports for internal types** — Code outside `src/lib/types/` must import internal types from the barrel (`../types/index.js` or `../types`), never from specific type files (`../types/rag.js`, `../types/mcp.js`). External library types (`zod`, `@anthropic-ai/sdk`, etc.) can be imported normally. Files inside `src/lib/types/` are exempt (they import from each other).

14. **No double type assertions** — Never cast through `unknown`/`any` (`x as unknown as T`, `x as any as T`). A double assertion defeats the compiler's structural-overlap check entirely — the value is trusted as `T` with zero validation. Fix the type at the source, narrow with a runtime-validating type guard, or use a single `as T` (still overlap-checked). Applies to `src/`; test files are exempt. The rare genuine type-system boundary requires `// eslint-disable-next-line no-restricted-syntax -- <reason>`.

15. **Tests are end-to-end only** — Every suite must exercise a surface this package actually ships: construct `NeuroLink` and call `generate()` / `stream()`, drive the built CLI via `runCLI` (`node dist/cli/index.js`), or exercise the package's public exports from `dist/index.js` (no runtime imports from `src/lib/`). A suite that imports a module out of `src/lib/` to assert on it directly is a unit test and does not belong here. The point is to test what callers can reach — across providers, adapters and file types — not internal shapes that are free to change. If a behaviour seems reachable only from the inside, that is usually a sign it needs a public surface, not a unit test.

    **Import the built entry, not the source.** Anything the package exports — `NeuroLink`, `ModelPool`, `AIProviderFactory`, `MCPToolRegistry`, the vector stores — comes from `../dist/index.js`. Importing the same class from `src/lib/` tests a copy callers never load. Confirm a symbol is really exported by listing the **runtime** exports of `dist/index.js`, not by grepping `dist/index.d.ts`: that file re-exports under aliases, so `NeuroLinkError as ClientNeuroLinkError` makes `NeuroLinkError` look public when only `ClientNeuroLinkError` exists at runtime.

    **⚠️ One module graph per suite.** `dist/index.js` is a separate bundled copy of everything in `src/lib/`. Mixing the two inside one file breaks anything that depends on object identity — stubs, spies, `instanceof` — and it breaks _silently_, with a clean typecheck. Three ways this has already bitten:
    - `stub(AIProviderFactory, "createProvider")` on the `src` copy while `NeuroLink` came from `dist` → the stub was inert and the suite started making real network calls. It went from 0.01s / 21 passing to 45s with one skip and one failure.
    - `logger` imported from `dist` while the code under test logged through `src`'s logger → six log-assertion tests failed because the spy watched a different instance.
    - `instanceof NeuroLinkError` across the two copies → never true.

    So: a suite that drives only the public surface takes everything from `dist`. A suite operating under the determinism exception below takes everything from `src`. Never both.

    **The one exception is determinism.** A test may sit outside this rule only when it needs deterministic control that a live call cannot give — a pure translation table, a fixed set of inputs, a recorded backend. The vector-store suites are the standing example: they drive real backends (pglite in-process Postgres, recorded fixtures) and cover filter-dialect translation that no live `generate()` could be made to emit. Convenience, speed, and "it is easier to assert on the internal" are not exceptions. When you take the exception, say so in the file's header and name what determinism buys.

**Enforcement:** Rules 2, 6 and 7-15 are enforced via ESLint. Rules 2, 6, 7-13 and 15 use custom rules in `eslint-rules/`; rule 14 uses core `no-restricted-syntax` AST selectors in `eslint.config.js`. Run `pnpm run lint` (or the pre-commit hook) — no shell scripts, no regex heuristics, everything AST-based.

Rule 15's determinism exception is the `allow` list on `neurolink/e2e-tests-only` in `eslint.config.js`. Adding a file to it is a review decision, and the file's own header must say what determinism buys — it is not a way to silence the rule. (A closed "Grandfathered" block of legacy suites near the end of the list is exempt from the header requirement and must not grow.) The rule ignores type-only imports (`import type`, and `{ type A }` where every specifier is type-only) because they are erased and assert nothing.

| Rule     | ESLint rule                               |
| -------- | ----------------------------------------- |
| 2        | `neurolink/no-local-type-alias`           |
| 6        | `neurolink/format-provider-error-returns` |
| 7        | `neurolink/no-interface`                  |
| 8        | `neurolink/no-types-suffix-filename`      |
| 9        | `neurolink/unique-type-names`             |
| 10       | `neurolink/types-barrel-exports-only`     |
| 11 & 11b | `neurolink/no-local-types-folder`         |
| 12       | `neurolink/no-type-export-outside-types`  |
| 13       | `neurolink/barrel-type-imports`           |
| 14       | `no-restricted-syntax` (AST selectors)    |
| 15       | `neurolink/e2e-tests-only`                |

---

## Architecture

### Four inference types

`generate`, `stream`, `decide` and `transcribe` are peers. `decide` is not text-in, text-out: a
decision model takes one `state` plus a map of named typed questions and returns one typed,
calibrated answer each (`neurolink.decide()`, the fail-open `neurolink.tryDecide()`, and the CLI's
`neurolink decide`). It is not `evaluate()`, which scores an already-generated response.

- Provider modality is declared by `ProviderDescriptor.inferenceKinds` (omitted means
  `["generate","stream"]`). Filter on it; never special-case a provider name. `InferenceKind`
  also includes `"transcribe"`, but no descriptor declares it: STT providers are chosen from
  `STT_PROVIDER_DESCRIPTORS` (see the `transcribe` section below).
- Every internal consumer of `decide` **fails open**: with no decision provider configured,
  behaviour is exactly what it was before, and the consumer still records telemetry, under
  `SpanType.MODEL_DECISION` (never `MODEL_GENERATION`).
- `resolveDefaultDecisionProvider()` returns the first fully configured `DECISION_PROVIDERS`
  entry, and that list is sorted by each descriptor's `decideOrder` (TypeSafe 1, Laya, XOR,
  SubQ, Perplexity, Cloudflare Clef, OpenAI Decisions, ScaleDown 8), not by array position.
  Changing a `decideOrder` changes which model every built-in consumer uses.

Before touching `decide` / `tryDecide`, a decision provider, `decisionLimits`, `siteDecide` or one
of the five internal `decide` call sites, load the `neurolink-decide` skill. It holds the full
contract: per-provider limits, shared-credential traps and the test hazards.

### The `transcribe` inference type

`neurolink.transcribe()`, `transcribeStream()`, the CLI's `neurolink transcribe` and the server's
transcription routes make up the fourth inference type. With no provider named,
`NEUROLINK_STT_PROVIDER` wins (a shipped name, an alias, or a `NEUROLINK_STT_ENDPOINTS`
endpoint); otherwise the first configured entry of `STT_PROVIDER_DESCRIPTORS` in
`src/lib/factories/sttDescriptors.ts`, with Whistle (the built-in local engine, zero-config)
last. Nothing in the pipeline may lose words. The full notes load
automatically from `src/lib/voice/CLAUDE.md` when you work under `src/lib/voice/`; read that
file before changing `STT_PROVIDER_DESCRIPTORS` or `resolveDefaultSTTProvider()` in
`src/lib/factories/sttDescriptors.ts`, which is outside that directory.

### Pattern: Factory + Registry

Every extensible system (providers, processors, chunkers, rerankers) follows the same pattern:

```
Factory  →  creates instances
Registry →  holds factory functions (via dynamic import)
```

- `ProviderFactory` + `ProviderRegistry` — AI providers
- `ProcessorRegistry` — file/multimodal processors
- `ChunkerFactory` + `ChunkerRegistry` — RAG chunking strategies
- `RerankerFactory` + `RerankerRegistry` — RAG rerankers

### Context Compaction Pipeline

`BudgetChecker` fires before every LLM call. If context exceeds the threshold
(80% of the model window by default, and only ever _lowered_ per request by the
context-budget decision — see rule 4 in "Where the architecture will fight us"),
`ContextCompactor` runs 5 stages:

0. **Relevance drop** — one boolean per message, batched. The only stage that
   asks what a message is _for_ rather than how old it is. Needs a decision
   provider; skipped entirely without one, which is why it is additive.
1. Tool output pruning (protect recent 40K tokens)
2. File read deduplication
3. LLM summarization (10-section structured summary), now behind a gate — a
   summary that loses a decision or an open question is rejected and the
   messages are left for a later stage
4. Sliding window truncation

`CompactionStage` in `src/lib/types/context.ts` is the source of truth for the
list: `relevance | prune | deduplicate | summarize | truncate`.

### Proxy pool engines

The proxy runs two independent subscription pool engines, Anthropic (`POST /v1/messages`) and
Codex (`POST /backend-api/codex/responses`), over a shared token store and cooldown/quota layer.
Cooldowns and quota are keyed by the full account key; Anthropic quota reads still fall back to the
bare label for snapshots saved before the switch. A third provider copies the Codex pattern; do not modify the Anthropic hot path. The full
notes load automatically from `src/lib/server/routes/CLAUDE.md`.

---

## Development Commands

```bash
# Quality
pnpm run check:docs-api   # Regenerate docs/api and fail if it differs from src/
# validate and validate:all do NOT include that docs/api check. CI runs it as
# its own step, so a green validate:all can still fail the required `test`.

# Testing — every suite is end-to-end (see "Tests are end-to-end only" below).
# All suites run via tsx; there is no vitest runner despite vitest.config.ts existing.
pnpm test                 # Main suite (test/continuous-test-suite.ts)
pnpm run test:ci          # test + test:client
pnpm run test:client      # SDK client suite
pnpm run test:decide      # The decide inference type: offline cases, then live (gateway half skips without AI_GATEWAY_API_KEY)
pnpm run test:transcribe  # The transcribe inference type: SDK, CLI and routes (no API; Whistle cases skip without its files or macOS `say`)
pnpm run test:transcribe:stream  # Chunked streaming adapter: endpointer, LocalAgreement, takeover (no API; determinism exception)
pnpm run test:context     # Context compaction + file handling
pnpm run test:mcp         # MCP infrastructure (no-API; mcp-infra.ts)
pnpm run test:mcp:http    # HTTP-transport suite (mcp-http.ts) — live
pnpm run test:mcp:sdk     # Live SDK MCP enhancements (mcp-sdk.ts)
pnpm run test:mcp:cli     # Live CLI MCP suite (mcp-cli.ts)
pnpm run test:mcp:registry # MCPRegistryClient remote lookup vs a local mock registry (mcp-registry.ts) — no API
pnpm run test:mcp:spans   # Issue#5 span attributes (mcp-spans.ts) — no API
pnpm run test:mcp:full    # All mcp-* suites in dependency order
pnpm run test:rag         # RAG suite
pnpm run test:skills      # Native skills suite (mostly no-API; live test skips without keys)
pnpm run test:providers   # Provider-specific feature tests
pnpm run test:matrix      # Capability sweep across every registered provider
pnpm run test:media       # Media generation suite
pnpm run test:memory      # Memory suite (incl. session-memory-bug regressions)
pnpm run test:observability  # Includes tracing + telemetry-gaps + issue-04
pnpm run test:ppt
pnpm run test:servers
pnpm run test:tts
pnpm run test:workflow
pnpm run test:credentials # Includes issue-01 model-access regression
pnpm run test:evaluation  # Includes evaluation-scoring sub-suite
pnpm run test:middleware
pnpm run test:autoresearch       # E2E + live (live half skips without keys)
pnpm run test:docs-snippets      # Docs' new NeuroLink({...}) options vs the built d.ts (no-API; needs a build; CI does NOT run it); :update regenerates its ledger
pnpm run test:docs-methods       # Docs' neurolink.<method>() calls vs the built NeuroLink class (no-API; needs a build; CI runs it in the `types` shard); a block can be marked `planned` on its fence line
pnpm run test:provider-model-resolution  # Which model each registered provider name resolves from the environment (no-API; needs a build; CI does NOT run it)

# What CI actually gates — NOT test:unit.
# .github/workflows/ci.yml has two required jobs over test/, and both are
# sharded behind an aggregator of the same name. Branch protection requires the
# aggregator, so the required name is never a job that runs a suite:
#   provider-safety-net → build, then `contract` (test:providers-mocked) and
#     `rest` (test:provider-structure, test:error-classifier-contract, the
#     bedrock/sagemaker/anthropic/aistudio characterization suites, and
#     verify:provider-onboarding).
#   test → `lint` (format-check, eslint), `validate` (validate:all, docs:api
#     currency, check:deps), `types` (check:ci-scripts, check:test-parse,
#     check:tools-tests, check:dts, test:docs-methods, both builds).
# The pre-push hook is a DIFFERENT set, not a subset: check:deps,
# check:docs-api, build, test:provider-structure, test:model-manifests.
# test:providers-mocked is deliberately not in it — 259s, and
# provider-safety-net already gates it.
# Everything else in test/ runs only when someone runs it, so adding a suite
# does not make it a gate.

# Run a single suite directly
pnpm exec tsx test/continuous-test-suite-<name>.ts
```

**Keep payloads out of assertion messages.** In a suite not declared
`offline`, `defineSuite` counts a failure whose message reads like a provider
error as a SKIP (unless the error is a `HardFail`, which always fails), so an
assertion that quotes a response can fail and still exit 0. The details and the safe pattern
are in `test/CLAUDE.md`.

### ⚠️ Never write a CI-skip directive into a commit message

GitHub honours `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]` and
`[actions skip]` **anywhere in a commit message — subject or body**. It does not
care whether you meant it or were quoting it. A commit that contains one runs
**no workflows at all** for its push.

This is not a hypothetical. A PR merged to `release` quoting semantic-release's
own `chore(release): x.y.z [skip ci]` template, while documenting that those
commits were going away, and the merge ran nothing: no CI, no release job. The
failure is invisible by construction — a suppressed run looks exactly like a run
that was never required — and it surfaced only because the branch's check list
looked implausibly short an hour later.

If you need to write about a directive, break up the literal (`skip-ci`) or put
the explanation in the **PR body**, which GitHub does not scan. GitHub skips the
`push` and `pull_request` runs when the PR's head commit holds a directive, so
the required `🔒 Single Commit Policy Validation` check never reports: it stays
Pending and blocks the merge. `Reject CI-Skip Directives` in
`single-commit-enforcement.yml` (it reads the full message with `%B`) is only a
backstop and cannot report that case, and its regex does not cover a
`skip-checks:` trailer. The older `Validate Commit Message Format` step reads
only `%s`, but that is not why this got through: GitHub skipped the whole
workflow before any step ran, so even a check that read the full message would
never have run.

### ⚠️ Required status checks and the release bot

`release` carries **five** required status checks, and they live on **two
different layers** that GitHub enforces as a union:

| check                                | ruleset `11413189` | classic branch protection |
| ------------------------------------ | ------------------ | ------------------------- |
| `test`                               | ✅                 | ✅                        |
| `provider-safety-net`                | ✅                 | ✅                        |
| `build-check`                        | ✅                 | ✅                        |
| `🔒 Single Commit Policy Validation` | ✅                 | ✅                        |
| `security-suites`                    | ❌                 | ✅                        |

**Querying only the ruleset API under-reports the list.** `gh api
repos/juspay/neurolink/rulesets/11413189` returns four contexts and no mention
of `security-suites`; `gh api repos/juspay/neurolink/branches/release/protection`
returns all five. Check both, or you will conclude a required check is optional
— and a red `security-suites` will block a merge you were sure it could not.

The two layers also differ in who can bypass them. The ruleset has
`bypass_actors: []`, so its four are unbypassable by anyone. Classic protection
has `enforce_admins: false`, so the classic layer — which is the only place
`security-suites` is required — does not apply to admins. Net effect: four
checks nobody can bypass, plus a fifth that a repository admin can.

**A migration to rulesets would silently drop `security-suites`.** GitHub has
been steering repositories off classic protection, and the migration is
per-layer: switching classic off removes every requirement that exists only
there. Four of the five are duplicated on the ruleset and would survive. The
fifth is not, and would simply stop gating — no warning, no failed merge, no
visible change on any pull request. What makes it invisible is that the check
keeps running and keeps reporting: a green `security-suites` looks identical
whether it is blocking the merge or merely describing it, and the way you find
out it stopped blocking is that something red merges. Before disabling classic
protection, add the context to ruleset `11413189` first and confirm with
`gh api repos/juspay/neurolink/rulesets/11413189` that it comes back — the same
call that under-reports the list today is the one that proves the migration is
safe.

Anything that pushes **directly** to `release` — rather than through a PR —
carries no check runs, so every required check reads as missing and the push is
declined:

```
GH013: Repository rule violations found for refs/heads/release
- 4 of 4 required status checks are expected.
! [remote rejected]   HEAD -> release
```

(That message is quoted verbatim from the original failure and counts only the
ruleset's four — another reason the ruleset view alone is misleading.)

This blocked publishing entirely when the checks were first enabled, because
`@semantic-release/git` pushed the version bump back to the branch. The usual
remedy — allowing the GitHub Actions app to bypass — **cannot be configured at
repository level**; that actor must belong to the owner organization. The fix
was to drop `@semantic-release/git` so nothing pushes to the branch at all.

Consequences worth knowing before you go looking for them:

- `CHANGELOG.md` is **not** committed to the repo any more. It is still
  generated and still ships inside the published package, and the notes remain
  on the GitHub Release.
- `package.json`'s version in git no longer tracks the published version.
  semantic-release derives the next version from **tags**, so publishing is
  correct, but `--version` from a git clone reports whatever was last committed.
- There are no more `chore(release): x.y.z [skip ci]` commits on the branch.

**Before adding anything that writes to `release`, check whether it pushes
directly.** If it does, it will be rejected, and the failure appears as a
release-job error rather than anything resembling a permissions problem.

### ⚠️ `reset --soft` onto a newer base reverts everything in between

Squashing a branch to one commit is routine here — the single-commit policy
requires it. This is the wrong way to do it, and it produced **three silent
reversions in a single day**:

```bash
git reset --hard origin/<branch>     # take the branch's tree
git reset --soft origin/release      # move the pointer to the new base
git commit                           # <- reverts everything in between
```

No conflict is involved, which is what makes it so easy to do. The sequence
**reparents** a stale tree onto a new base instead of replaying content onto
it, so git faithfully records the difference: every line `release` gained
since the branch point becomes a **deletion** in a commit whose parent is
`release` itself. A squash has to replay — `git rebase -i`, or rebase then
squash. `reset --soft` onto a newer base is a reversion generator.

One such commit was **206 files, +1316, -3390**: whole test suites
(`tools-manager-truncation` -568, `native-vendor-recovery` -443),
`nativeGenerateGuard.ts` -234, `ToolsManager.ts` -241, 156 lines of this file.
Its actual purpose was to add two catalog JSON files.

**Nothing on the pull request catches it.** It reported `mergeable: clean`,
zero conflicts, 5/5 required checks green, one commit, valid subject. Each
gate is blind for a structural reason: `git merge-tree` finds no conflict
because the deletions are the commit's own content; CI passes because
**deleting a test suite does not fail a test run**; the single-commit check
counts commits, not damage. The only signal is the diffstat.

**A tree-hash check does not save you either**, and this is the part worth
carrying, because it is a real check, correctly executed, answering the
adjacent question. Comparing `HEAD^{tree}` before and after the squash and
getting an exact match proves the squash preserved the _pre-squash tip's_
tree. It says nothing about whether that tip was stale relative to the new
base. It cannot detect this failure, and it reads as reassuring.

The check that does work, before pushing any squashed or rebased branch:

```bash
git diff --numstat "$(git merge-base HEAD origin/release)" HEAD \
  | awk -F'\t' '$2 > 0 && $3 !~ /^docs\/api(\/|$)/ { print $3 }'
# must print nothing
```

**Measure against the merge base, never against `release`.** On a branch cut
weeks ago a release-relative diff reports every commit since as a deletion:
one audit that way reported 50,787 deletions and 117 deleted files on a branch
that deleted nothing, and 14 of 16 pull requests were wrongly flagged as
reverting work before the error was spotted. Against the merge base, 12 of
those 16 deleted nothing at all. The same trap catches a **stacked** pull
request from the other direction — diff a child against `release` rather than
against its parent branch and a clean single commit reads as a large revert.

When a rebase touches generated files, **regenerate instead of resolving**:
`pnpm run codegen:catalog`, `pnpm run docs:api`, the docs-site build. Reset to
the new tip, re-apply only the branch's own hand-written changes, re-run the
generators. There is then nothing to resolve, which removes the failure mode
rather than avoiding it one more time.

### ⚠️ Two more silent traps when stacking PRs and stashing

- **Omit `--delete-branch` when merging a PR that still has an open stacked child.** GitHub can
  close the child instead of retargeting it (this happened to #1696), and it cannot be reopened
  until the deleted base branch is recreated. `gh pr merge <n> --rebase --delete-branch` is right
  only for the last link of a stack.
- **Never address a stash by index (`stash@{0}`).** The stash list is shared by every worktree, so
  an index can resolve to another session's stash. Prefer not stashing (`git show <sha>:<path>`
  reads another version of a file); otherwise capture the SHA atomically with `git stash create`.

The recovery recipes, the rebase-each-child procedure for a stack and the ways this repo has
misread a CI result live in the `neurolink-pr-merge` skill. Load it before merging a stack or
trusting a check rollup. The generator, docs-site and advisory-gate playbooks are in the
`neurolink-ci-maintenance` skill.

---

## How-To Guides

### Adding a New Provider

**Start at `docs/provider-integration/tiers/README.md`** — it routes you to one of four tiers by actual effort required, not a one-size-fits-all checklist:

- **Tier 1 — aggregator passthrough** (a model already served by LiteLLM/OpenRouter): zero code, just a model id. See `tiers/tier-1-aggregator-passthrough.md`.
- **Tier 2 — catalog entry** (OpenAI-wire-compatible, zero behavioral quirks — most new providers): **one JSON file**, `src/lib/providers/catalog/<id>.json`, then `pnpm run codegen:catalog && pnpm run build`. Zero hand-written source edits and zero test edits — the enum member, `<Name>Models` enum and `NeurolinkCredentials` key are machine-generated into marked regions, and the descriptor, config, context windows, pricing, vision map, model choices and every test row/count derive from the same file. See `tiers/tier-2-catalog-entry.md` for the field reference and the mandatory live probes.
- **Tier 3 — adapter-based native** (own SDK/wire format, still a normal HTTP request/response lifecycle): a `src/lib/providers/<name>.ts` class extending `BaseProvider`, days. See `tiers/tier-3-adapter-native.md`.
- **Tier 4 — full custom** (SageMaker-class: non-HTTP protocol or SDK-signed auth): everything Tier 3 needs plus a custom lifecycle, and a written `tier4Justification` in its manifest. See `tiers/tier-4-full-custom.md`.

`AIProviderName` lives in `src/lib/constants/enums.ts` (not `src/lib/types/providers.ts`), and for catalog providers its members sit in a **generated region** — never hand-edit them; edit the JSON and re-run codegen. Every tier that adds an `AIProviderName` member must end with a green `pnpm run verify:provider-onboarding` — a required CI gate. For Tier 2 that gate reads the catalog JSON and requires `evidence.rosterVerified` + `evidence.addedInPR`; Tier 3/4 still use a manifest at `docs/provider-integration/manifests/<name>.json`. Tier 1 adds no `AIProviderName` member, so the gate doesn't apply — see `tiers/tier-1-aggregator-passthrough.md`. Use `pnpm run scaffold:provider` (`tools/scaffold-provider.ts`) to start: Tier 2 emits a pre-filled catalog JSON plus a probe checklist, Tier 3/4 emit source snippets.

### Adding a New File Processor

1. Create processor in the appropriate category under `src/lib/processors/`:
   - `document/` — Excel, Word, RTF, OpenDocument
   - `data/` — JSON, YAML, XML
   - `markup/` — HTML, SVG, Markdown, Text
   - `code/` — source code, config files
   - `media/` — video, audio
   - `archive/` — zip, tar, gz
2. Extend `BaseFileProcessor` and implement `canProcess()`, `process()`, `getInfo()`
3. Register in `ProcessorRegistry` with a priority (lower number = higher priority)
4. Add MIME type mappings in `src/lib/processors/config/mimeTypes.ts`
5. Add tests to the closest existing suite (e.g. `test/continuous-test-suite-context.ts` for file-handling, or `continuous-test-suite.ts` for CLI-level coverage). There is no dedicated `file-processor-test-suite.ts`.

### Modifying Message Building

1. Core logic: `src/lib/utils/messageBuilder.ts`
2. Provider formatting: `src/lib/adapters/` (add provider-specific adapter if needed)
3. Type changes: `src/lib/types/conversation.ts`
4. Ensure backward compatibility — existing message formats must still work

### Per-Request Credentials

Pass provider credentials at instance level or per-call. Per-call wins over instance, instance wins over env vars.

```typescript
// Instance-level default
const nl = new NeuroLink({
  credentials: { openai: { apiKey: "sk-..." } },
});

// Per-call override
await nl.generate({
  input: { text: "hello" },
  provider: "openai",
  credentials: { openai: { apiKey: "sk-user-key" } },
});
```

Credentials flow through the factory chain (`neurolink.ts` → `core/factory.ts` → `providerFactory.ts` → `providerRegistry.ts` → provider constructor). Each provider's constructor accepts a provider-scoped slice (e.g. `{ apiKey }` for OpenAI, `{ accessKeyId, secretAccessKey }` for Bedrock, `{ projectId, serviceAccountKey }` for Vertex).

CLI-only usage still relies on env vars — credentials field is excluded from `textGenerationOptionsSchema` to avoid shell-history leaks.

See `docs/features/per-request-credentials.md` for the full provider reference.

---

## Common Patterns

### Error Handling

- Use `ErrorFactory` for typed errors
- Wrap async calls with `withTimeout` utility
- `formatProviderError` must **return** errors, never throw

### Tool Transformations

- `transformToolExecutions()` — convert tool results for providers
- `transformAvailableTools()` — format tools for AI model calls
- `transformParamsForLogging()` — safely strip secrets before logging

### Memory

- Development: in-memory store
- Production: Redis (set `REDIS_URL`)
- Long conversations auto-compact via `SummarizationEngine` + `BudgetChecker`

### Streaming Tool Injection

`BaseProvider.stream()` merges base tools (MCP/built-in) with user-provided tools before calling provider-specific `executeStream()`. Individual providers use `options.tools || await this.getAllTools()` as fallback. This is the canonical pattern — do not bypass it.

### Logger Guard

Always wrap expensive serialization with `logger.shouldLog("debug")` before calling it.
