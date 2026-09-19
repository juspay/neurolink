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

NeuroLink is a unified AI development platform shipping as both a **TypeScript SDK** and **CLI**. It wraps 40 AI providers across three inference types (`generate`, `stream`, `decide`) (OpenAI, Anthropic, Google AI Studio, Vertex, AWS Bedrock, Azure, Mistral, LiteLLM, SageMaker, Hugging Face, Ollama, OpenAI-compatible, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, OpenRouter, Cerebras, SambaNova, ElevenLabs, Deepgram, Azure Speech, Fish Audio, Cartesia, and more) behind a single consistent API, with full MCP support, multimodal file processing, voice (TTS/STT/realtime), media generation (image / video / music / avatar with Kling / Runway / Replicate / Beatoven / Lyria / D-ID / HeyGen handlers), RAG pipelines, observability, and a workflow engine.

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

13. **Barrel-only imports for internal types** — Code outside `src/lib/types/` must import internal types from the barrel (`../types/index.js` or `../types`), never from specific type files (`../types/rag.js`, `../types/mcp.js`). External library types (`zod`, `@anthropic-ai/sdk`, etc.) can be imported normally. Files inside `src/lib/types/` are exempt (they import from each other).

14. **No double type assertions** — Never cast through `unknown`/`any` (`x as unknown as T`, `x as any as T`). A double assertion defeats the compiler's structural-overlap check entirely — the value is trusted as `T` with zero validation. Fix the type at the source, narrow with a runtime-validating type guard, or use a single `as T` (still overlap-checked). Applies to `src/`; test files are exempt. The rare genuine type-system boundary requires `// eslint-disable-next-line no-restricted-syntax -- <reason>`.

15. **Tests are end-to-end only** — Every suite must exercise a surface this package actually ships: construct `NeuroLink` and call `generate()` / `stream()`, or drive the built CLI via `runCLI` (`node dist/cli/index.js`). A suite that imports a module out of `src/lib/` to assert on it directly is a unit test and does not belong here. The point is to test what callers can reach — across providers, adapters and file types — not internal shapes that are free to change. If a behaviour seems reachable only from the inside, that is usually a sign it needs a public surface, not a unit test.

    **Import the built entry, not the source.** Anything the package exports — `NeuroLink`, `ModelPool`, `AIProviderFactory`, `MCPToolRegistry`, the vector stores — comes from `../dist/index.js`. Importing the same class from `src/lib/` tests a copy callers never load. Confirm a symbol is really exported by listing the **runtime** exports of `dist/index.js`, not by grepping `dist/index.d.ts`: that file re-exports under aliases, so `NeuroLinkError as ClientNeuroLinkError` makes `NeuroLinkError` look public when only `ClientNeuroLinkError` exists at runtime.

    **⚠️ One module graph per suite.** `dist/index.js` is a separate bundled copy of everything in `src/lib/`. Mixing the two inside one file breaks anything that depends on object identity — stubs, spies, `instanceof` — and it breaks _silently_, with a clean typecheck. Three ways this has already bitten:
    - `stub(AIProviderFactory, "createProvider")` on the `src` copy while `NeuroLink` came from `dist` → the stub was inert and the suite started making real network calls. It went from 0.01s / 21 passing to 45s with one skip and one failure.
    - `logger` imported from `dist` while the code under test logged through `src`'s logger → six log-assertion tests failed because the spy watched a different instance.
    - `instanceof NeuroLinkError` across the two copies → never true.

    So: a suite that drives only the public surface takes everything from `dist`. A suite operating under the determinism exception below takes everything from `src`. Never both.

    **The one exception is determinism.** A test may sit outside this rule only when it needs deterministic control that a live call cannot give — a pure translation table, a fixed set of inputs, a recorded backend. The vector-store suites are the standing example: they drive real backends (pglite in-process Postgres, recorded fixtures) and cover filter-dialect translation that no live `generate()` could be made to emit. Convenience, speed, and "it is easier to assert on the internal" are not exceptions. When you take the exception, say so in the file's header and name what determinism buys.

**Enforcement:** Rules 2, 6 and 7-15 are enforced via ESLint. Rules 2, 6, 7-13 and 15 use custom rules in `eslint-rules/`; rule 14 uses core `no-restricted-syntax` AST selectors in `eslint.config.js`. Run `pnpm run lint` (or the pre-commit hook) — no shell scripts, no regex heuristics, everything AST-based.

Rule 15's determinism exception is the `allow` list on `neurolink/e2e-tests-only` in `eslint.config.js`. Adding a file to it is a review decision, and the file's own header must say what determinism buys — it is not a way to silence the rule. The rule ignores type-only imports (`import type`, and `{ type A }` where every specifier is type-only) because they are erased and assert nothing.

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

### Three inference types

`generate`, `stream` and `decide` are peers. The first two assume the model
emits text; `decide` does not — a decision model takes one `state` plus a map
of named typed questions and returns one typed, calibrated answer each in a
single parallel pass, with no text anywhere.

The discriminator is one field on `ProviderDescriptor`:

```ts
inferenceKinds?: readonly ("generate" | "stream" | "decide")[]
```

Omitted means `["generate","stream"]`, so every text provider keeps its
meaning. This is the **only declarative statement of provider modality** in the
codebase — before it, modality was implied by `toolSupport`, `healthCheck` and
the auto-select ranks, which is why embedding-only providers (voyage, jina)
have to implement `getAISDKModel()` as a throw. Anything that builds a
generation fallback chain, runs the health sweep or offers model choices must
filter on `inferenceKinds` rather than special-casing a provider name.

`AIProvider.decide?()` is optional and `BaseProvider` supplies a throwing
default, exactly as `embed()` does. Public surface is `neurolink.decide()` and
`neurolink.tryDecide()` — the fail-open variant, which returns `null` on any
failure and is what every internal consumer uses — plus the CLI's
`neurolink decide [state]`, a thin wrapper over `decide()` (`src/cli/commands/decide.ts`).

**Not to be confused with `evaluate()`**, which scores an already-generated
response with RAGAS scorers. Different feature, different word, ~20
`Evaluation*` types already taken.

**The degradation contract.** Every internal consumer of `decide` fails open:
with no decision provider configured, behaviour is exactly what it was before.
That is deliberate and load-bearing — and it is also why each consumer records
telemetry even when it does nothing, because a decision path that silently
stopped working is otherwise indistinguishable from one that was never
configured. Decisions carry their own span type (`SpanType.MODEL_DECISION`),
never `MODEL_GENERATION`: folding them together would distort generation
counts, latency percentiles and the output-token aggregate at once.

**Five `decide()` call sites, in four files** — verified with
`grep -rn 'await decide(' src/lib`:

| Call site                         | Powers                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `routing/classifierStrategies.ts` | model routing, the model catalogue AND the per-request context budget — one request, three features |
| `context/contextDecision.ts` (×2) | relevance compaction, and the summary-quality gate                                                  |
| `core/toolRoutingDecision.ts`     | tool / MCP server routing                                                                           |
| `rag/retrieval/searchDecision.ts` | per-query RAG planning (opt-in: `RAGPipeline` only, not the `rag: {}` shortcut)                     |

`routing/modelCatalog.ts` and `context/budgetChecker.ts` are NOT callers: the
catalogue renders candidate lines that the routing call's `model` question
chooses between, and the budget threshold is read out of that same call's
`context` answer. Neither costs a second round trip.

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
│   ├── providers/            # AI provider implementations (40 registered)
│   ├── factories/            # ProviderFactory + ProviderRegistry
│   ├── core/                 # BaseProvider, constants, infrastructure
│   ├── adapters/             # Provider-specific content adapters (image, TTS, video)
│   ├── utils/                # MessageBuilder, FileDetector, transformations
│   ├── types/                # ALL type definitions (103 files)
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

### MCP Transport Protocols

| Transport   | Config key        | Use case                    |
| ----------- | ----------------- | --------------------------- |
| `stdio`     | `command`, `args` | Local server via subprocess |
| `http`      | `url`, `headers`  | Remote HTTP/Streamable HTTP |
| `sse`       | `url`, `headers`  | Server-Sent Events          |
| `websocket` | `url`, `headers`  | WebSocket connection        |

---

## Key Files

| File                                               | Purpose                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/neurolink.ts`                             | Main SDK class — orchestrates everything                                                                                 |
| `src/lib/factories/providerRegistry.ts`            | Provider registration (use dynamic imports here)                                                                         |
| `src/lib/providers/catalog/`                       | One JSON per Tier-2 provider — the source of truth for its whole integration (`schema.ts` validates, `loader.ts` builds) |
| `src/lib/core/baseProvider.ts`                     | Base class all providers extend; central `stream()` tool merge                                                           |
| `src/lib/utils/messageBuilder.ts`                  | Constructs messages; handles all file types                                                                              |
| `src/lib/adapters/providerImageAdapter.ts`         | Per-provider multimodal formatting + vision capability map                                                               |
| `src/lib/adapters/tts/`                            | TTS provider handlers (Google TTS, Cartesia); new handlers go here                                                       |
| `src/lib/mcp/toolRegistry.ts`                      | Tool management + MCP server registry                                                                                    |
| `src/lib/mcp/mcpClientFactory.ts`                  | Creates MCP clients for all transport types                                                                              |
| `src/lib/processors/registry/ProcessorRegistry.ts` | Selects file processor by MIME type + priority                                                                           |
| `src/lib/types/index.ts`                           | Main type exports (start here for any type lookup)                                                                       |
| `src/lib/types/providers.ts`                       | `AIProvider` type, `NeurolinkCredentials`, `ProviderDescriptor` type                                                     |
| `src/lib/factories/providerDescriptors.ts`         | `PROVIDER_DESCRIPTORS` — single source of truth for provider metadata (aliases, credentials key, env vars, tool support) |
| `src/lib/providers/openaiCompatCatalog.ts`         | `OPENAI_COMPAT_CATALOG` — data rows for zero-quirk OpenAI-wire-compatible providers (Tier 2 onboarding)                  |
| `docs/provider-integration/tiers/README.md`        | Tiered new-provider onboarding guide — start here for any new provider                                                   |
| `src/lib/types/mcp.ts`                             | `MCPTransportType` and MCP config types                                                                                  |
| `src/lib/constants/enums.ts`                       | `AIProviderName` enum (the actual location — not `types/providers.ts`)                                                   |
| `src/lib/constants/contextWindows.ts`              | Per-provider, per-model context window sizes                                                                             |
| `src/lib/context/contextCompactor.ts`              | Multi-stage context reduction orchestrator                                                                               |
| `src/lib/context/budgetChecker.ts`                 | Pre-call budget validation                                                                                               |
| `src/lib/rag/ragIntegration.ts`                    | `prepareRAGTool()` — auto RAG setup for generate/stream                                                                  |
| `src/cli/factories/commandFactory.ts`              | All CLI command options and flag definitions                                                                             |
| `src/lib/server/routes/agentRoutes.ts`             | HTTP server routes including `/api/agent/embed`                                                                          |
| `src/lib/server/routes/claudeProxyRoutes.ts`       | Anthropic pool engine — account routing, retry, SSE relay                                                                |
| `src/lib/server/routes/codexProxyRoutes.ts`        | Codex (ChatGPT) pool engine — `/backend-api/codex/responses`                                                             |
| `src/lib/auth/codexOAuth.ts`                       | Codex OAuth: `auth.json` import, refresh, account-id resolution                                                          |

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
pnpm run test:decide      # The decide inference type (live; gateway half skips without AI_GATEWAY_API_KEY)
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
#     check:tools-tests, both builds).
# The pre-push hook is a DIFFERENT set, not a subset: check:deps, build,
# test:provider-structure, test:model-manifests. test:providers-mocked is
# deliberately not in it — 259s, and provider-safety-net already gates it.
# Everything else in test/ runs only when someone runs it, so adding a suite
# does not make it a gate.

# Run a single suite directly
pnpm exec tsx test/continuous-test-suite-<name>.ts

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

### Stacked pull requests, and why they used to be unmergeable

A **stacked** pull request is one whose base is another feature branch rather
than `release`, opened so dependent work can proceed before its parent merges.
They work now. They did not before, and the reason is worth keeping because it
is invisible in exactly the way this repository keeps getting caught by.

Four of the five required status contexts — `test`, `provider-safety-net`,
`security-suites`, `build-check` — are **jobs inside `ci.yml`**. The fifth,
`🔒 Single Commit Policy Validation`, comes from a separate workflow,
`single-commit-enforcement.yml`. So a base-branch filter on `ci.yml`'s
`pull_request` trigger does not decide whether those four checks pass. It
decides whether they are **created at all**. Scoped to `branches: [release]`, a
stacked PR got none of those four, and a check that was never created reports as
_missing_, not as failing — which on a pull request is indistinguishable from
"still queued". PR #1670 sat at **1 of 5** required contexts from the day it was
opened, with nothing red to explain why.

`single-commit-enforcement.yml` broke them a second, independent way. Its
`pull_request` trigger was scoped to `[release, main]`, so a stacked PR fell
through to the **push-event** path, which hardcoded `BASE_BRANCH="origin/release"`.
Counting commits from `release` on a branch stacked on another feature branch
includes the parent's commit, so a single-commit PR was reported as carrying two
and failed a policy it had not broken.

Both `pull_request` triggers are now unfiltered by base branch. The
pull-request path already resolved the real base from `github.base_ref`; it was
simply never reached. The push path now asks for the branch's open PR and uses
its base, falling back to `release` when there is none.

Two things to know when stacking:

- **`push` in `ci.yml` is still scoped to `release`,** deliberately. Only
  pull-request handling was widened.
- **Merge the parent first, then rebase each child by hand.** Do not expect
  GitHub to retarget a child for you, and omit `--delete-branch` on a parent
  that still has an open child: deleting the base can **close** the child
  outright rather than retarget it, which is the `#1696` incident recorded in
  "⚠️ Merging a stack: `--delete-branch` closes the child" below. Rebase-merge
  also replays the parent's commit under a new SHA, so the child still carries
  the parent's old commit and fails the single-commit policy until it is
  rebased — see "rebase-merge rewrites the parent, so rebase each child" for
  the `git rebase --onto origin/release <parent-old-head>` recipe.

  The same applies to a parent that is merely **force-pushed while still
  open**, which is the more common case: rebasing a parent orphans the copy of
  its commit that each child carries, and every child flips to `CONFLICTING`
  the moment the parent is pushed. Rebasing #1668 and #1647 onto a moved
  `release` did exactly that to #1670 and #1648, each of which needed
  `git rebase --onto origin/<parent-branch> <parent-old-head>` before it was
  mergeable again. Expect to fix up the whole stack, bottom-up, after touching
  any link in it. A force-push does re-trigger stale bot reviews on the child,
  but that is a cost of the rebase, not a reason to skip it.

### ⚠️ Reading a CI result: seven ways this repo has misread one

Every incident below produced a confident wrong answer. The first four are the
same mistake — treating the _absence_ of a signal as a signal. The last three
are its close relatives: reading a signal the tool never emitted, getting the
same wrong answer twice from two passes that shared an input, and reading a
signal that belongs to a commit you have already replaced. They are recorded
together because each one cost real time before it was spotted.

**1. `CANCELLED` is not a failure.** Superseded runs report `CANCELLED`, and this
workflow cancels its own in-progress runs (`concurrency.cancel-in-progress`), so
an amend-and-force-push routinely leaves cancelled runs behind. A check written
as `conclusion != "SUCCESS"` therefore alarms on healthy history: three runs
fired for one SHA in 28 seconds on #1552 and the first was cancelled by the
second. Classify `CANCELLED` as _no result_, never as red.

**2. A check that has not appeared has not passed.** `pending == 0` is true both
when every check finished and when none has been created yet. GitHub takes a
while to register a workflow's check runs, and a pull request polled inside that
window looks green with a handful of unrelated checks while four of the five
required contexts are simply missing. Gate on the required contexts being
**present** before reading their state:

```bash
gh pr view <N> --json statusCheckRollup --jq \
  '[.statusCheckRollup[] | select((.name//.context) | IN(
     "test","provider-safety-net","build-check",
     "🔒 Single Commit Policy Validation","security-suites"))
   | (.name//.context)] | unique | length'   # must be 5 before the result means anything
```

**3. Count required checks as distinct contexts.** `🔒 Single Commit Policy
Validation` reliably appears **twice** in `statusCheckRollup`, so a naive count
reports six-of-five and a comparison written as `== 5` fails on a green pull
request. Deduplicate by name, as above.

**4. `gh pr checks --json` returns empty in some environments.** It exits
successfully and prints nothing, which reads as "no failures". Use
`gh pr view <N> --json statusCheckRollup` instead — the failure mode of the
wrong command here is silence, not an error.

**5. An exit code from the shell is not a result from the tool.** The four
above are all "the tool ran and the signal was misread". This one is worse:
the tool never ran. A gate invoked as `pnpm run check > "$out"` where `$out`
is a directory fails in the redirect, before the command starts, and reports
exit 1 — indistinguishable at a glance from a real failure, while the output
file is empty in exactly the way a clean run also leaves it. It was hit twice
in one day, and in both directions: once read as a broken build, once as a
clean one. Check that the output actually contains the tool's own output
before believing either verdict, and prefer a path you created over one you
assumed was a file.

**6. A verifier that shares an input with the claim it checks is not
adversarial about that input.** An adversarial review pass exists to refute a
finding, but it can only do that on evidence the finding did not supply. Two
reviewers in this repo both read `pull/<N>/head` from a shared clone while
other agents were fetching different pull requests into it, so `FETCH_HEAD`
had moved: the first produced a finding that was already false at the head it
was told to read, and the second "confirmed" it from the same stale object.
The result was a confident, verified, wrong finding reported to another
author. Pin to the sha — `gh api repos/<owner>/<repo>/pulls/<N> --jq
.head.sha` — at **both** stages, and treat any check that reuses the input,
tooling or assumption under test as unverified. This is the same failure as
the probe below, one level up: agreement between two passes is not evidence
when they share the thing that is wrong.

The same rule generalises past CI, and is worth applying to any probe: **an
assertion about something NOT happening needs a precondition proving the thing
under test actually ran.** A probe once reported `LEAK: socket still open` for a
Bedrock request, on a run where the request never left the machine —
`closedAt === null` meant "nothing happened", not "still open". Three successive
probe designs agreed with each other and were all wrong for the same reason,
because they shared an unstated assumption about the transport. Assert the
precondition first, in the probe, and make it fail loudly when it does not hold.

**7. A pull request's check rollup can describe the PREVIOUS head.** Incident 2
above is the one about a check that has not appeared yet — 1, 3 and 4 are a
cancelled run, a duplicated context and a command that printed nothing. This is
incident 2's mirror image: a check that appeared, passed, and belongs to a commit
you have just replaced.
Immediately after an amend-and-force-push, `gh pr view <N> --json
statusCheckRollup` can still serve the outgoing head's runs — so the gate reads
a clean `5/5 SUCCESS` for a SHA that no longer exists on the branch, seconds
after a push that has not started a single job. It was hit while merging a
rebased stack: the rollup said five green, and `commits/<new-sha>/check-runs`
said three present and all `in_progress`.

Ask the commit, not the pull request:

```bash
SHA=$(gh api repos/juspay/neurolink/pulls/<N> --jq .head.sha)
gh api "repos/juspay/neurolink/commits/$SHA/check-runs?per_page=100"
```

and re-read `.head.sha` on every poll, so a gate aborts rather than reports
when the head moves underneath it. `mergeable_state` is not a substitute —
it read `unknown` through the whole window. This is incident 6 again in a
different costume: the stale object was a check run rather than a `FETCH_HEAD`,
and a rollup that is merely _late_ is indistinguishable from one that is
_right_ unless you pin the sha yourself.

### ⚠️ A "regenerate and diff" check needs a reproducible generator first

`docs/api` currency works because typedoc is a pure function of the source.
`docs-site/static/{llms.txt,llms-full.txt,search-index.json}` were not, and a
naive currency check over them would have been **permanently red** — the same
shape of always-failing required check the ffmpeg incident below produced.

(Only `search-index.json` is committed now. The two llms files are gitignored:
they are not in package.json `files`, so they never shipped, and committing a
9.5 MB whole-file regeneration conflicted on nearly every docs pull request.
The reproducibility lesson below still stands — it is what lets the remaining
artifact be diffed at all.)

Two separate causes, and the second is the one that hides:

1. `build-llms-txt.ts` stamped `new Date().toISOString()` into both llms files.
   Obvious once you look, and trivially fatal to any diff.
2. `docFiles.sort((a, b) => a.order - b.order)` is **not a total order** — many
   files share one `order`. `Array.prototype.sort` is stable, so ties fell back
   to the input order, which came from `glob()`, which is filesystem order. Two
   consecutive builds of an unchanged tree differed by **215,862 lines**.
   `sortSections` had the same defect: every section outside `SECTION_ORDER`
   scores 999, so their ties came from Map insertion order.

Both are fixed **in the llms generator**, and those two artifacts are now
byte-identical across runs.

**`search-index.json` was never fixed, and this file said otherwise for
months.** The fix commit `ef125b2bd` touched five paths — the workflow, this
file, `build-llms-txt.ts`, and the two llms artifacts. `grep -c search-index`
over that file list returns 0. Its generator,
`docs-site/plugins/docusaurus-plugin-search-index/index.js`, still walks
`fs.readdirSync` with **no sort at all**, and still numbers entries with a
positional counter (`objectID: String(id++)`), so any reordering rewrites every
subsequent id and amplifies a one-file change into a whole-file diff. A rebuild
on an unchanged tree differs by ~1,640 positions, and the entry count moves —
which a reorder alone cannot do, and which the sync-docs collision below
explains. Tracked in issue #1749.

Note what that leaves: the only one of the three artifacts still committed, and
therefore the only one a currency check actually diffs, is the one whose
generator was never made reproducible.

The reason the claim survived is the lesson restated. `ef125b2bd`'s message said
the change "leaves search-index.json byte-identical" — true of the run that was
observed, and never a property established in code. An observation from one run
was written down as an invariant, in the very section warning against exactly
that. So: when adding any generator whose output is committed, prove it by
building twice and `cmp`-ing, before writing a check that assumes it — and
before writing down that it holds. Tiebreak with a codepoint
comparison, not `localeCompare` — collation depends on the Node ICU build, so
it can order CI and a laptop differently.

Note also why the artifacts drifted in the first place, and why the check lives
on the pull request rather than in `docs-deploy.yml`: that workflow runs
post-merge with `contents: read`, and giving it write access would not help,
because a push to `release` from outside a pull request carries no check runs
and is declined by branch protection. See the required-status-checks section
above.

### ⚠️ `pnpm --filter ./docs-site` matches nothing and exits 0

`pnpm-workspace.yaml` deliberately sets no `packages:` field — the cooldown
policy lives there, and `docs-site/` stays an independent project. So a
`--filter ./docs-site` selector matches no project. pnpm prints _"No projects
matched the filters"_ and **exits 0**, which means every script written that way
succeeds while doing nothing.

The four `docs:*` scripts were written that way, including the `docs:build` that
the artifact-currency check printed as its own remediation. Running exactly what
the error message told you to run left the artifacts stale and reported success.
Use `pnpm --dir docs-site <script>`, which does not depend on workspace
membership.

The general trap: a command that exits 0 is not evidence it did anything. Check
that the work landed — a changed file, a written artifact — not the status code.

And the sharper version of that trap: the artifact **was** written, and is still
wrong. `pnpm run docs:api` used to do exactly this whenever the checkout's
absolute path contained a directory named `test`. `typedoc.json` excluded
`**/test/**`, typedoc matches `exclude` against absolute paths, and
`cleanOutputDir` wipes the output first — so every file under `src/lib/` was
excluded, the entry point converted to an empty module, and the run deleted 3545
of 3546 files and wrote the module README. Exit 0. No errors, no warnings,
`markdown generated at ./docs/api`, and a working tree holding a mass deletion
that looked like a clean regeneration.

It is not a hypothetical path: `workforge create -t test -n <name>` puts the
worktree under a directory named for the branch type, so any worktree opened for
test work sat on it. Two worktrees at the same commit, same lockfile, same
`tsc --listFiles` output of 4847 files, disagreed by 3545 files, and neither
reinstalling nor rebuilding changed anything — the only difference was the path.

The pattern is now anchored to the project root (`./test/**`), which cannot
match an ancestor of the repository. When adding an `exclude`, `ignore` or
`files` pattern to any tool config, anchor directory patterns to the root:
a bare `**/<name>/**` is a claim about every directory between `/` and the
repository, not just the one you meant. CI never saw this — GitHub checks out at
`/home/runner/work/neurolink/neurolink` — which is its own lesson about where a
path-dependent bug hides.

### ⚠️ Merging a stack: `--delete-branch` closes the child

The house recipe is `gh pr merge <n> --rebase --delete-branch`, and on a
pull request that targets `release` it is correct. On a **stacked** pull request
— one whose base is another open PR's branch — the `--delete-branch` half is
actively destructive: GitHub does not always retarget a child onto the merged
PR's base. It can simply **close** it, because the branch the child was opened
against no longer exists.

That happened to #1696 when #1649 landed. The child's own branch was untouched,
so no work was lost, but the pull request went to `state=closed, merged=false`
and could not be reopened — `PATCH /pulls/1696 -f state=open` returns

```
state cannot be changed. The fix/campaign-followups-closeout branch has been deleted.
```

Recovery is to recreate the base branch at the SHA it had before the merge,
reopen the child, retarget it to `release`, and only then delete the temporary
ref:

```bash
# The base ref is already deleted, so <pre-merge-sha> is not rev-parseable from
# any branch — read it from the reflog, which still holds the deleted tip.
deleted_base=<deleted-base>
gh api -X POST repos/juspay/neurolink/git/refs \
  -f ref="refs/heads/$deleted_base" \
  -f sha="$(git reflog -1 --format=%H "$deleted_base")"
gh api -X PATCH repos/juspay/neurolink/pulls/<child> -f state=open
gh api -X PATCH repos/juspay/neurolink/pulls/<child> -f base=release
```

Approvals and review threads survive that round trip. Before deleting the
recreated ref, confirm its content really landed — after a rebase-merge the SHA
differs, so `git merge-base --is-ancestor` reports NOT_MERGED on a branch that
is fully merged. Compare trees instead: `git rev-parse <branch>^{tree}` against
`git rev-parse <merge-commit>^{tree}`.

**So: omit `--delete-branch` for any PR that still has an open child**, and let
it run only on the last link. The repository's own auto-delete-on-merge handles
the rest.

### ⚠️ Merging a stack: rebase-merge rewrites the parent, so rebase each child

**Rebase and merge** replays the parent's commit onto `release` under a _new_
SHA. The child's branch still carries the parent's _old_ commit, which is now on
no branch — so the moment the child is retargeted to `release` it reports **two
commits** and fails `🔒 Single Commit Policy Validation`, a policy it has not
broken.

Rebase each child onto the new tip between merges. Use `--onto` with the
parent's old head, which replays only the child's own commit and never asks
about the parent's:

```bash
git fetch origin release
git switch <child>
git rebase --onto origin/release <parent-old-head>
```

`git switch` first is not optional: `--onto` replays whatever is on `HEAD`, and
between merges the operator is often standing on a sibling link of the stack.
Without it the command silently rebases the wrong branch.

A plain `git rebase origin/release` does **not** recognise the parent's commit
as already landed — the rebase-merge rewrote it, and any regeneration folded in
on top changed its tree — so it replays it and conflicts. `--onto` avoids the
`--skip` dance entirely.

Expect `docs-site/static/search-index.json` to conflict on every link of a
stack: it is generated, committed, and touched by almost everything. Resolve it
by regenerating rather than by picking a side — `pnpm run build`, `pnpm run
docs:api`, then `pnpm --dir docs-site run build` — and fold the result into the
single commit. See the reproducible-generator section above for why a second
build must produce zero drift.

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

### ⚠️ The stash list is shared by every worktree, so `stash@{0}` is a race

`git stash` writes to the **shared** `.git` directory. The stash list is
therefore common to every worktree of a repository, not per-worktree — which
makes every index-based reference (`stash@{0}`, `stash@{1}`) a race against
whatever else is running.

This is not hypothetical. With nine agents working in parallel across separate
worktrees of this repository, one pushed a stash, another pushed one before the
first popped, and the first agent's `git stash pop` applied **someone else's**
five files into its worktree and dropped that entry from the list. The victim
was mid-change on an unrelated branch.

It recovered only because a stash commit is an ordinary immutable commit: the
SHA was still reachable, so `git stash store -m "<original message>" <sha>`
put it back with its content intact. Had the SHA not been captured, the entry
would have been unreferenced and the work gone at the next `gc`.

What makes it dangerous is that nothing looks wrong at the time. `git stash
pop` succeeds, reports files restored, and exits 0. The applying worktree gets
extra modified files that may look like its own half-finished work, and the
owning worktree's stash simply is not in the list any more.

So, whenever more than one worktree is in play:

- **Never address a stash by index.** And do not capture the SHA as a second
  command either — `git stash push` followed by `git rev-parse "stash@{0}"`
  is the same race in miniature: another worktree's `stash push` can land in
  the gap between the two, and `stash@{0}` then resolves to _that_ stash, not
  yours. Capture it atomically instead: `git stash create` builds the stash
  commit and prints its SHA on its own, without reading or writing the shared
  stash list, so there is no gap for another worktree to land in —
  `sha=$(git stash create)` — then register it under that known SHA with
  `git stash store -m "<message>" "$sha"` and clear the working tree with
  `git reset --hard`. Use that SHA for every later `apply`/`drop`. A SHA
  identifies one specific stash; an index identifies whatever happens to be
  on top when you get there.
- **Prefer not stashing at all.** Reading one file's other version is what
  `git show <sha>:<path>` is for, and a scratch copy outside the repository
  costs nothing. Neither touches shared state.
- Note the same sharing applies to other `.git`-level state — refs, the reflog,
  `gc` — so a worktree is not the isolation boundary it looks like.

### ⚠️ The advisory gate is time-dependent: a green run expires

`scripts/security-check.ts` — the "🔒 Security & Environment Validation" step
inside `test-shards (validate)`, and therefore inside the required `test`
check — runs `pnpm audit --prod --json` **live** against the advisory
database. Nothing about its verdict is pinned to the commit.

Two consequences, both of which have already produced wrong conclusions here:

**A pull request's green is a statement about when it ran, not about its
diff.** When the js-yaml and hono advisories were published, one PR's
`validate` shard had run at 20:05 UTC and passed; another ran at 02:03 UTC
and failed. Identical dependency trees. The first PR looked green and
mergeable and was neither — a re-run would have failed it. **Do not treat a
green `test` older than the newest advisory publication as current**, and
never conclude from "this PR is green and that one is red" that the
difference is in their diffs.

**A red gate usually is not yours.** Because the audit is repo-wide and
live, a newly published advisory turns `test` red on _every_ open pull
request simultaneously, including ones that touch no manifest at all. The
check's own output says so — it appends a note about the branch being behind
`origin/release` and warns that the failure "may not originate in your
changes." Before investigating your own diff, reproduce on the untouched
`release` tip:

```bash
# A fixed path is not re-runnable: the second call dies with
# `fatal: '/tmp/nl-audit' already exists` instead of auditing. Take a unique
# directory, and remove the worktree outside the `&&` chain so a failed audit
# still cleans up after itself.
audit_dir="$(mktemp -d)/nl-audit"
git fetch origin release \
  && git worktree add "$audit_dir" origin/release \
  && ( cd "$audit_dir" && pnpm install --frozen-lockfile \
       && pnpm exec tsx scripts/security-check.ts )
audit_status=$?
# Guarded: if the fetch or the `worktree add` failed, there is nothing to
# remove, and an unguarded remove prints `fatal: ... is not a working tree`
# on exactly the failure path this section exists to de-confuse.
[ -d "$audit_dir" ] && git worktree remove --force "$audit_dir"
rm -rf "$(dirname "$audit_dir")"
# Cleanup runs unconditionally, so the block's own exit status would otherwise
# be the `rm`'s — 0 — and a caller that wraps this diagnostic in a script reads
# a red gate as a pass, which is the exact misreading this section exists to
# prevent. Restore the audit's status. `( exit N )` and not a bare
# `exit "$audit_status"`: the latter closes the interactive shell you pasted
# this into, while the subshell form still leaves `$?` correct for a script.
( exit "$audit_status" )
```

Note `origin/release`, not `release`: the check reports how far behind
`origin/release` you are, so auditing a stale local ref reproduces a tree CI
never ran and sends you chasing a difference that is your own checkout. The
throwaway worktree keeps it read-only — `git stash && git checkout` mutates
the tree you are debugging, which is a poor trade for a diagnostic whose
whole question is "was it already broken without me?" And `--frozen-lockfile`
because that is how every CI job installs: a plain `pnpm install` may
re-resolve a transitive range and hand you a tree CI never audited, which is
the same class of mistake this whole section is about.

If it fails there too, the fix belongs in its own dependency PR, not in
whatever you were working on.

**Fixing it: raise the floor, and move the override band with it.** Prefer
bumping the declared range over adding an accepted-risk entry — an accepted
risk silences the gate for everyone, while a floor bump is what actually
protects downstream consumers, who resolve from `package.json` and never see
our lockfile. Two things are easy to get wrong:

- **A lockfile-only bump is not a fix.** It greens CI and leaves every
  installer of the published package on the vulnerable version.
- **A raised floor with a stale `pnpm.overrides` band is worse than no
  override.** The entries lift transitive consumers to a version that was
  patched for an _older_ advisory, which can sit inside the _new_ one's
  vulnerable range.

  The worked example is historical, and deliberately so — the repository has
  since been fixed, so do not expect `package.json` to still show the broken
  state. `GHSA-2883-xcg3-v3hh` covers `>=3.0.0 <3.15.2` **and**
  `>=4.0.0 <4.3.2`; the js-yaml overrides then read `>=3.14.2` / `>=4.1.1`,
  which are the fixes for an _earlier_ js-yaml advisory and sit **inside**
  both of this one's bands. They now read `>=3.15.2` / `>=4.3.2`, on the band
  edges, which is what correct looks like. The trap is the shape, not those
  numbers: an override target that was patched for the advisory you fixed
  last time.

  A lockfile that happens to resolve a safe version hides this, so CI stays
  green and the pin re-manifests on the next install that re-resolves a
  transitive range. Note also that `pnpm audit` printed only the 4.x range —
  the 3.x half was invisible. Check every range on the GHSA record, not just
  the one the audit showed you:

  ```bash
  gh api graphql -f query='{securityVulnerabilities(first:10, ecosystem:NPM,
    package:"<pkg>"){nodes{advisory{ghsaId} vulnerableVersionRange
    firstPatchedVersion{identifier}}}}'
  ```

  `fast-xml-parser`, `undici` and now `js-yaml` in the same table are the
  worked examples of a band kept in step with its floor.

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

### Working with Embeddings

Nine providers implement embeddings natively: OpenAI, Google AI Studio, Google Vertex, Amazon Bedrock, Cohere, Ollama, LiteLLM, Voyage, Jina. All expose `embed()` / `embedMany()`; everything else inherits `BaseProvider`'s throwing default. Voyage and Jina are embedding-only (their `getAISDKModel()` throws); the rest also serve `generate()`/`stream()`.

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
