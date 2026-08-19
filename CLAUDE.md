# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Contents

1. [Project Overview](#project-overview)
2. [Critical Rules](#critical-rules)
3. [Architecture](#architecture)
4. [Key Files](#key-files)
5. [Development Commands](#development-commands)
6. [How-To Guides](#how-to-guides)
7. [Common Patterns](#common-patterns)

---

## Project Overview

NeuroLink is a unified AI development platform shipping as both a **TypeScript SDK** and **CLI**. It wraps 21+ AI providers (OpenAI, Anthropic, Google AI Studio, Vertex, AWS Bedrock, Azure, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, OpenAI-compatible, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, OpenRouter, ElevenLabs, Deepgram, Azure Speech, Fish Audio, Cartesia, and more) behind a single consistent API, with full MCP support, multimodal file processing, voice (TTS/STT/realtime), media generation (image / video / music / avatar with Kling / Runway / Replicate / Beatoven / Lyria / D-ID / HeyGen handlers), RAG pipelines, observability, and a workflow engine.

---

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

13. **Barrel-only imports for internal types** — Code outside `src/lib/types/` must import internal types from the barrel (`../types/index.js` or `../types`), never from specific type files (`../types/rag.js`, `../types/mcp.js`). External library types (`zod`, `@ai-sdk/provider`, etc.) can be imported normally. Files inside `src/lib/types/` are exempt (they import from each other).

14. **No double type assertions** — Never cast through `unknown`/`any` (`x as unknown as T`, `x as any as T`). A double assertion defeats the compiler's structural-overlap check entirely — the value is trusted as `T` with zero validation. Fix the type at the source, narrow with a runtime-validating type guard, or use a single `as T` (still overlap-checked). Applies to `src/`; test files are exempt. The rare genuine type-system boundary requires `// eslint-disable-next-line no-restricted-syntax -- <reason>`.

15. **Tests are end-to-end only** — Every suite must exercise a surface this package actually ships: construct `NeuroLink` and call `generate()` / `stream()`, or drive the built CLI via `runCLI` (`node dist/cli/index.js`). A suite that imports a module out of `src/lib/` to assert on it directly is a unit test and does not belong here. The point is to test what callers can reach — across providers, adapters and file types — not internal shapes that are free to change. If a behaviour seems reachable only from the inside, that is usually a sign it needs a public surface, not a unit test.

    **Import the built entry, not the source.** Anything the package exports — `NeuroLink`, `ModelPool`, `AIProviderFactory`, `MCPToolRegistry`, the vector stores — comes from `../dist/index.js`. Importing the same class from `src/lib/` tests a copy callers never load. Confirm a symbol is really exported by listing the **runtime** exports of `dist/index.js`, not by grepping `dist/index.d.ts`: that file re-exports under aliases, so `NeuroLinkError as ClientNeuroLinkError` makes `NeuroLinkError` look public when only `ClientNeuroLinkError` exists at runtime.

    **⚠️ One module graph per suite.** `dist/index.js` is a separate bundled copy of everything in `src/lib/`. Mixing the two inside one file breaks anything that depends on object identity — stubs, spies, `instanceof` — and it breaks _silently_, with a clean typecheck. Three ways this has already bitten:
    - `stub(AIProviderFactory, "createProvider")` on the `src` copy while `NeuroLink` came from `dist` → the stub was inert and the suite started making real network calls. It went from 0.01s / 21 passing to 45s with one skip and one failure.
    - `logger` imported from `dist` while the code under test logged through `src`'s logger → six log-assertion tests failed because the spy watched a different instance.
    - `instanceof NeuroLinkError` across the two copies → never true.

    So: a suite that drives only the public surface takes everything from `dist`. A suite operating under the determinism exception below takes everything from `src`. Never both.

    **The one exception is determinism.** A test may sit outside this rule only when it needs deterministic control that a live call cannot give — a pure translation table, a fixed set of inputs, a recorded backend. The vector-store suites are the standing example: they drive real backends (pglite in-process Postgres, recorded fixtures) and cover filter-dialect translation that no live `generate()` could be made to emit. Convenience, speed, and "it is easier to assert on the internal" are not exceptions. When you take the exception, say so in the file's header and name what determinism buys.

**Enforcement:** Rules 2 and 7-15 are enforced via ESLint. Rules 2, 7-13 and 15 use custom rules in `eslint-rules/`; rule 14 uses core `no-restricted-syntax` AST selectors in `eslint.config.js`. Run `pnpm run lint` (or the pre-commit hook) — no shell scripts, no regex heuristics, everything AST-based.

Rule 15's determinism exception is the `allow` list on `neurolink/e2e-tests-only` in `eslint.config.js`. Adding a file to it is a review decision, and the file's own header must say what determinism buys — it is not a way to silence the rule. The rule ignores type-only imports (`import type`, and `{ type A }` where every specifier is type-only) because they are erased and assert nothing.

| Rule     | ESLint rule                              |
| -------- | ---------------------------------------- |
| 2        | `neurolink/no-local-type-alias`          |
| 7        | `neurolink/no-interface`                 |
| 8        | `neurolink/no-types-suffix-filename`     |
| 9        | `neurolink/unique-type-names`            |
| 10       | `neurolink/types-barrel-exports-only`    |
| 11 & 11b | `neurolink/no-local-types-folder`        |
| 12       | `neurolink/no-type-export-outside-types` |
| 13       | `neurolink/barrel-type-imports`          |
| 14       | `no-restricted-syntax` (AST selectors)   |
| 15       | `neurolink/e2e-tests-only`               |

---

## Architecture

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

### Directory Map

```
src/
├── lib/
│   ├── neurolink.ts          # Main SDK entry point
│   ├── providers/            # 21+ AI provider implementations
│   ├── factories/            # ProviderFactory + ProviderRegistry
│   ├── core/                 # BaseProvider, constants, infrastructure
│   ├── adapters/             # Provider-specific content adapters (image, TTS, video)
│   ├── utils/                # MessageBuilder, FileDetector, transformations
│   ├── types/                # ALL type definitions (28+ files)
│   ├── mcp/                  # MCPToolRegistry, client factory, HTTP transport
│   ├── memory/               # Redis + in-memory conversation memory
│   ├── context/              # Context compaction, budget checking
│   ├── processors/           # File processors (17+ types)
│   ├── rag/                  # Chunkers, hybrid search, rerankers, pipeline
│   ├── evaluation/           # RAGAS-based evaluator (no unit tests yet)
│   ├── telemetry/            # OpenTelemetry + Langfuse observability
│   ├── workflow/             # Workflow engine with HITL and checkpointing
│   ├── server/               # Hono/Express/Fastify/Koa adapters
│   ├── config/               # Configuration management
│   └── models/               # Model definitions per provider
├── cli/
│   ├── index.ts              # CLI entry point
│   ├── factories/            # CommandFactory (yargs)
│   ├── commands/             # Individual command implementations
│   └── loop/                 # Interactive REPL session
└── test/
    ├── continuous-test-suite.ts              # Main orchestrator (pnpm test)
    ├── continuous-test-suite-<name>.ts       # Per-domain suites (auth, mcp, rag, ppt, …)
    └── fixtures/                             # CSVs, PDFs, PNG, JSON used by suites
```

### Message Flow

```
User input (text + files)
  → MessageBuilder (src/lib/utils/messageBuilder.ts)
  → FileDetector detects MIME types
  → ProcessorRegistry selects processor per file
  → ProviderImageAdapter formats for target provider
  → Provider sends to AI API
```

### Context Compaction Pipeline

`BudgetChecker` fires before every LLM call. If context exceeds 80% of the model window, `ContextCompactor` runs 4 stages:

1. Tool output pruning (protect recent 40K tokens)
2. File read deduplication
3. LLM summarization (9-section structured summary)
4. Sliding window truncation

### MCP Transport Protocols

| Transport   | Config key        | Use case                    |
| ----------- | ----------------- | --------------------------- |
| `stdio`     | `command`, `args` | Local server via subprocess |
| `http`      | `url`, `headers`  | Remote HTTP/Streamable HTTP |
| `sse`       | `url`, `headers`  | Server-Sent Events          |
| `websocket` | `url`, `headers`  | WebSocket connection        |

---

## Key Files

| File                                               | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/neurolink.ts`                             | Main SDK class — orchestrates everything                           |
| `src/lib/factories/providerRegistry.ts`            | Provider registration (use dynamic imports here)                   |
| `src/lib/core/baseProvider.ts`                     | Base class all providers extend; central `stream()` tool merge     |
| `src/lib/utils/messageBuilder.ts`                  | Constructs messages; handles all file types                        |
| `src/lib/adapters/providerImageAdapter.ts`         | Per-provider multimodal formatting + vision capability map         |
| `src/lib/adapters/tts/`                            | TTS provider handlers (Google TTS, Cartesia); new handlers go here |
| `src/lib/mcp/toolRegistry.ts`                      | Tool management + MCP server registry                              |
| `src/lib/mcp/mcpClientFactory.ts`                  | Creates MCP clients for all transport types                        |
| `src/lib/processors/registry/ProcessorRegistry.ts` | Selects file processor by MIME type + priority                     |
| `src/lib/types/index.ts`                           | Main type exports (start here for any type lookup)                 |
| `src/lib/types/providers.ts`                       | `AIProvider` type                                                  |
| `src/lib/types/mcp.ts`                             | `MCPTransportType` and MCP config types                            |
| `src/lib/constants/enums.ts`                       | `AIProviderName` enum                                              |
| `src/lib/constants/contextWindows.ts`              | Per-provider, per-model context window sizes                       |
| `src/lib/context/contextCompactor.ts`              | Multi-stage context reduction orchestrator                         |
| `src/lib/context/budgetChecker.ts`                 | Pre-call budget validation                                         |
| `src/lib/rag/ragIntegration.ts`                    | `prepareRAGTool()` — auto RAG setup for generate/stream            |
| `src/cli/factories/commandFactory.ts`              | All CLI command options and flag definitions                       |
| `src/lib/server/routes/agentRoutes.ts`             | HTTP server routes including `/api/agent/embed`                    |
| `src/lib/server/routes/claudeProxyRoutes.ts`       | Anthropic pool engine — account routing, retry, SSE relay          |
| `src/lib/server/routes/codexProxyRoutes.ts`        | Codex (ChatGPT) pool engine — `/backend-api/codex/responses`       |
| `src/lib/auth/codexOAuth.ts`                       | Codex OAuth: `auth.json` import, refresh, account-id resolution    |

### Proxy pool engines

The proxy runs two independent subscription pool engines that share the token
store and the cooldown/quota persistence layer:

|                    | Anthropic (Claude)              | Codex (ChatGPT)                           |
| ------------------ | ------------------------------- | ----------------------------------------- |
| Inbound route      | `POST /v1/messages`             | `POST /backend-api/codex/responses`       |
| Upstream           | `api.anthropic.com/v1/messages` | `chatgpt.com/backend-api/codex/responses` |
| Wire format        | Anthropic Messages              | OpenAI Responses                          |
| Token-store prefix | `anthropic:`                    | `codex:`                                  |
| Quota windows      | unified 5h / 7d                 | primary / secondary                       |

Both engines key **cooldowns** by the full account key. **Quota** is keyed by the
full key on the Codex side but by the bare label (`foo`, not `anthropic:foo`) on
the Anthropic side — a historical asymmetry, not a pattern to copy. Either way
`codex:foo` cannot collide with an Anthropic entry, because no bare label
contains a `:` prefix. Prefer the full key in new code; when reading quota for an
Anthropic account you must use `account.label`.

**Migrating the Anthropic side to full keys** (not done, deliberately): the bare
label is persisted in `~/.neurolink/account-quotas.json` on every user's machine,
so a change of key means either losing every stored snapshot — which blinds
quota-aware routing until each account is observed again — or a one-time
migration that rewrites `<label>` to `anthropic:<label>` on load and tolerates
both shapes for a release. Until that is worth doing, treat the bare label as
load-bearing for Anthropic quota and use the full key everywhere else.

When adding a third provider, follow the Codex pattern: a new
`<provider>OAuth.ts`, a `<provider>AccountUsage.ts` quota parser, and a
`<provider>ProxyRoutes.ts` engine — do not modify the Anthropic hot path.
See `docs/features/codex-proxy-support.md`.

---

## Development Commands

```bash
# Build
pnpm run build            # Full SDK + CLI build
pnpm run build:cli        # CLI only (faster iteration)
pnpm run build:complete   # Build + validation

# Type checking
pnpm run check            # Type check
pnpm run check:watch      # Watch mode

# Quality
pnpm run lint             # Check lint + format
pnpm run format           # Auto-format
pnpm run check:all        # All quality checks

# Testing — every suite is end-to-end (see "Tests are end-to-end only" below).
# All suites run via tsx; there is no vitest runner despite vitest.config.ts existing.
pnpm test                 # Main suite (test/continuous-test-suite.ts)
pnpm run test:ci          # test + test:client
pnpm run test:client      # SDK client suite
pnpm run test:context     # Context compaction + file handling
pnpm run test:mcp         # MCP infrastructure (no-API; mcp-infra.ts)
pnpm run test:mcp:http    # HTTP-transport suite (mcp-http.ts) — live
pnpm run test:mcp:sdk     # Live SDK MCP enhancements (mcp-sdk.ts)
pnpm run test:mcp:cli     # Live CLI MCP suite (mcp-cli.ts)
pnpm run test:mcp:spans   # Issue#5 span attributes (mcp-spans.ts) — no API
pnpm run test:mcp:full    # All five mcp-* suites in dependency order
pnpm run test:rag         # RAG suite
pnpm run test:skills      # Native skills suite (mostly no-API; live test skips without keys)
pnpm run test:providers   # Provider-specific feature tests
pnpm run test:matrix      # Capability sweep across all 17 providers
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

# What CI actually gates — NOT test:unit.
# .github/workflows/ci.yml has a `provider-safety-net` job running
#   build + test:providers-mocked + test:provider-structure
# on every PR; the same pair is the pre-push hook. The job named `test` is
# format-check, eslint, validate:all and the builds. Everything else in test/
# runs only when someone runs it, so adding a suite does not make it a gate.

# Run a single suite directly
npx tsx test/continuous-test-suite-<name>.ts

# Environment
pnpm run env:validate     # Validate .env setup
pnpm run env:setup        # Interactive setup

# CLI smoke test
pnpm run build:cli && pnpm run cli <command>
```

**Workflow:** edit → `pnpm run check` → `pnpm run lint` → `pnpm test` → `pnpm run build`

### ⚠️ Keep payloads out of assertion messages

`defineSuite`'s `test()` classifies a thrown error as **SKIP** — not FAIL — when
it is a `Skip`, when the message starts with `SKIP:`, **or when the message
matches `isExpectedProviderError()`**. That last clause reads the message text,
so an assertion message that merely _quotes_ provider-ish content is downgraded
to a skip and the run still exits 0.

```ts
// DON'T — dumping the actual value into the message. If the payload contains
// something like "stream_error", "502" or "ECONNREFUSED", a genuine failure is
// reported as ⊘ skipped and CI stays green.
assert(ok, `terminal journal wrong — got ${JSON.stringify(actual)}`);

// DO — describe the discrepancy without quoting the payload.
assert(ok, `terminal journal wrong — mismatch at ${keyPath}`);
```

This bit during the Vitest migration: three real failures in
`continuous-test-suite-proxy-terminal-errors.ts` reported as `Passed: 2,
Skipped: 3` with exit 0. An audit of the 26 no-API suites found no _existing_
suite affected — the hazard is for new assertions.

When adding a suite, sanity-check it by breaking one assertion on purpose and
confirming it reports `✗` and exits non-zero rather than `⊘`.

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
the explanation in the **PR body**, which GitHub does not scan. This is now
enforced: `Reject CI-Skip Directives` in `single-commit-enforcement.yml` reads
the full message with `%B` and fails the PR. Note the older
`Validate Commit Message Format` step reads only `%s`, so it cannot see a
directive in the body — that gap is exactly how this got through.

### ⚠️ Required status checks and the release bot

`release` carries required status checks (`test`, `provider-safety-net`,
`build-check`, `🔒 Single Commit Policy Validation`) with **no bypass actors**.

Anything that pushes **directly** to `release` — rather than through a PR —
carries no check runs, so every required check reads as missing and the push is
declined:

```
GH013: Repository rule violations found for refs/heads/release
- 4 of 4 required status checks are expected.
! [remote rejected]   HEAD -> release
```

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

### ⚠️ ffmpeg is deliberately not installed in CI

Nothing CI runs needs it. No package script invokes it, nothing installs it as a
dependency, and `src/` shells out to ffmpeg only at **runtime** (frame
extraction, video merging, audio playback) — never during install, lint,
typecheck, build or pack, which is all the CI jobs do. `provider-safety-net` has
always built the package and run its suites without it.

It was removed after breaking CI four ways in a single day: a corrupt published
asset, a version pin that stopped resolving, a step deadline too tight for a
slow mirror, and an Ubuntu mirror returning `Ign:` for every index while apt sat
for fourteen minutes. Because `build-check` is a required check, each of those
blocked **every open pull request** on a dependency none of the jobs use.

If a job ever genuinely exercises media, install ffmpeg **in that job only**, and
bound every wait — `DPkg::Lock::Timeout`, `Acquire::http::Timeout`,
`Acquire::https::Timeout` — plus a step `timeout-minutes`. An unbounded `apt-get`
waits forever on the dpkg lock that `unattended-upgrades` holds.

---

## How-To Guides

### Adding a New Provider

1. Create `src/lib/providers/yourProvider.ts` — extend `BaseProvider`
2. Add name to `AIProviderName` enum in `src/lib/constants/enums.ts`
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

### Working with Embeddings

Four providers support embeddings natively: OpenAI, Google AI Studio, Google Vertex, Amazon Bedrock. All expose `embed()` / `embedMany()` on the provider interface. Unsupported providers throw descriptive errors.

Server endpoints: `POST /api/agent/embed` and `POST /api/agent/embed-many` in `src/lib/server/routes/agentRoutes.ts`.

### RAG Integration

**Simple path** — pass `rag` config directly to `generate()` or `stream()`:

```typescript
const result = await neurolink.generate({
  prompt: "What are the key features?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown", // auto-detected from extension if omitted
    chunkSize: 512, // default: 1000
    topK: 5, // default: 5
  },
});
```

CLI equivalent: `neurolink generate "query" --rag-files ./docs/guide.md --rag-strategy markdown`

NeuroLink creates a `search_knowledge_base` tool the model can call. For full control (custom vector stores, embeddings), use `createVectorQueryTool` from `src/lib/rag/retrieval/vectorQueryTool.ts` directly.

**Chunking strategies:** `character`, `recursive`, `sentence`, `token`, `markdown`, `html`, `json`, `latex`, `semantic`, `semantic-markdown`

**Rerankers:** `simple` (TF-IDF, no LLM), `llm`, `batch`, `cross-encoder` (stub), `cohere` (stub)

### Observability (Langfuse + OTEL)

NeuroLink initializes its own `TracerProvider` by default. If your app already has one, set `useExternalTracerProvider: true` to avoid duplicate registration errors, then add NeuroLink's span processors via `getSpanProcessors()` to your OTEL SDK setup.

Use `setLangfuseContext({ userId, sessionId, conversationId, ... }, callback)` to attach context to traces. Trace names default to `userId:operationName`; customize with `traceNameFormat`.

Key exports: `getSpanProcessors`, `setLangfuseContext`, `getLangfuseContext`, `getTracer`, `createContextEnricher`, `isUsingExternalTracerProvider`.

### Thinking Level

Supported by Anthropic Claude, Gemini 2.5+, Gemini 3:

```typescript
await neurolink.generate({ prompt: "...", thinkingLevel: "high" });
// CLI: neurolink generate "..." --thinking-level high
```

Levels: `minimal` | `low` | `medium` (default) | `high`

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
