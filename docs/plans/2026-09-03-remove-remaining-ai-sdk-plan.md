# Removing the remaining Vercel AI SDK dependencies

Status: in progress. Supersedes the Google-only milestone in
`docs/plans/2026-05-02-remove-aisdk-execution-agent-prompt.md`, which shipped as
`adc51feb` and deliberately deferred everything below.

## Where we actually are

Already native: **all streaming** (there is no `streamText` call anywhere in
`src/`), plus Google AI Studio, Vertex (Gemini and Claude) and Bedrock, whose
`getAISDKModel()` throws on purpose. `@ai-sdk/google` and `@ai-sdk/google-vertex`
are removed and banned by `scripts/check-banned-deps.ts`.

Five packages remain:

| package             | version  | sole reason it is still installed                                       |
| ------------------- | -------- | ----------------------------------------------------------------------- |
| `ai`                | ^6.0.134 | non-streaming generate loop, middleware, tool/error seams, public types |
| `@ai-sdk/provider`  | ^3.0.8   | `LanguageModelV3` types, `APICallError`                                 |
| `@ai-sdk/openai`    | ^3.0.37  | browser bundle re-export + Whisper transcription                        |
| `@ai-sdk/anthropic` | ^3.0.50  | browser bundle re-export only                                           |
| `@ai-sdk/mistral`   | ^3.0.21  | browser bundle re-export only                                           |

The dependency is deliberately funnelled through three seam files
(`utils/generation.ts`, `utils/tool.ts`, `utils/generationErrors.ts`) so it can
be swapped without touching call sites.

## Verified constraints

- `tool`, `jsonSchema`, `Output`, `stepCountIs`, the four error classes,
  `wrapLanguageModel` and the three `create*` factories are **not** runtime
  exports of `dist/index.js`. The runtime blast radius is internal only.
- The **type** surface does leak. Five declaration files re-export `ai` types,
  and `dist/files/fileTools.d.ts` embeds inferred `import("ai").Tool<...>`.
  Removing `ai` without hand-declared replacements breaks consumer typechecks.
- The browser bundle is built by a required CI job (`build-check` runs
  `prepack`), but **no test exercises it**. It builds; nothing proves it works.
- The Whisper path in `AudioProcessor.ts` has **zero** test coverage and there
  are no speech fixtures in the repo.

## Environmental blockers on this machine

Recorded so proof claims stay honest:

- **OpenAI has no credits** (`credit_balance_exhausted`, HTTP 429 on a direct
  Whisper POST). The `openai` provider and the Whisper path cannot be proven
  live here. Mistral, DeepSeek and Groq exercise the identical
  `openaiChatCompletionsBase` road and stand in for wire coverage.
- **Bedrock's AWS session token is expired.** That provider is unprovable here.

## Proof protocol

Every stage runs the same harness before and after, driving only
`dist/index.js` per repo rule 15: plain generate, structured output, a tool
loop, plain stream, and a streaming tool loop, across every provider with
working credentials. A stage lands only if the after-matrix equals the
before-matrix.

Baseline captured at `d745d235`: **29 passed, 11 failed**, all failures
environmental (OpenAI credits, Bedrock token, one Groq stream timeout).

## Stages

The first ordering here put the tool seam, middleware and public types before
the generate loop. The audit overturned that. Three dimensions independently
reach the same conclusion: `generateText` is the consumer that forces the
`jsonSchema` brand, the `LanguageModelV3` model shape and the middleware
protocol, so none of those can be replaced while it is still the thing running
the loop. The generate loop therefore moves ahead of them, and the seams
collapse behind it rather than being unpicked one at a time.

- **Stage 1 — browser bundle. Done.** Native factories under the same six
  public names, dropping `@ai-sdk/anthropic` and `@ai-sdk/mistral`. Landed with
  the first test the browser bundle has ever had.
- **Stage 2 — Whisper.** Replace `experimental_transcribe` in
  `AudioProcessor.ts` with a native multipart POST, modelled on
  `src/lib/voice/providers/OpenAISTT.ts`, which already solves exactly this
  problem with no ai-sdk. Drops `@ai-sdk/openai`. Independent of every other
  stage, so it can land whenever. Live proof is blocked on OpenAI credits, so it
  is proven against a local mock asserting the wire shape.
- **Stage 3 — the generate loop.** The linchpin. Replace `generateText` in
  `GenerationHandler.ts` with a native multi-step tool loop. Everything below
  is blocked on this.
- **Stage 4 — tool and error seams.** Hand-roll `tool`, `jsonSchema`, `Output`
  and `stepCountIs`, plus the error classes. `tool()` is pure identity upstream
  and is trivial. `jsonSchema()` is not: it brands the object with
  `Symbol.for("vercel.ai.schema")`, and `asSchema()` checks that brand before
  it considers Zod. The brand only matters while the ai-sdk loop consumes it,
  which is why this follows stage 3. `NoOutputGeneratedError.isInstance` is
  load-bearing in `noOutputSentinel.ts` and needs a class-identity-compatible
  replacement, not a name match.
- **Stage 5 — middleware.** Reimplement `wrapLanguageModel`. Record, do not
  quietly fix, the pre-existing gap that `wrapStream` never runs because every
  streaming path is already native and bypasses the wrapped model.
- **Stage 6 — public types.** Hand-declare the leaked types. Four re-export
  blocks are the obvious part; the non-obvious part is the inferred
  `import("ai").Tool` in the `/files` subpath declarations, which no source edit
  removes on its own.
- **Stage 7 — removal.** Migrate the seven test suites that consume `ai` at
  runtime, rewrite the documentation snippets that tell users to import from
  `ai` directly, extend the dependency guard to cover `ai` and
  `@ai-sdk/provider`, and drop the packages.

## Blockers the audit surfaced

- **The dependency guard cannot currently ban `ai`.** It needs its scan scope
  widened before it can enforce the endgame.
- **The seven suites that import `ai` are runtime consumers**, not type-only
  importers. None survives removal unchanged.
- **Some existing suites reach into deep `dist/` paths.** That is grandfathered
  debt. New characterization tests must not copy it.
- **Documentation still tells users to import from `ai` directly**, including
  in provider integration templates. Those snippets have to go before the
  dependency does.

## Stage 3 in detail

The audit found three remaining families on the ai loop, each with a different
amount of existing machinery, so they get three different treatments rather than
one strategy.

- **Direct Anthropic.** Rebuild `generate()` on `runAgenticLoop` using the
  existing `createAnthropicLoopAdapter`. This is not a new adapter: it is
  already generic over message shape so both direct Anthropic and Vertex Claude
  fit it, and it already backs a non-streaming `generate()` for Claude on
  Vertex. Highest leverage, lowest risk.
- **The OpenAI-compatible family.** Extend its own native SSE loop rather than
  re-platforming onto the shared engine. This class already owns a complete
  multi-step tool loop with context guarding, mid-turn tool hydration and usage
  merging, and it backs roughly twenty providers. The shared engine's value is
  reuse across wire formats; this file already is the shared implementation for
  one.
- **SageMaker.** The only family with no adapter and no in-request loop. Do it
  last, once the pattern has been exercised twice.

Nothing cross-cutting needs building. Usage extraction, provider retry,
structured-output coercion, context budget checking and tool-execution guards
are all already provider-agnostic and already shared by the native paths.

### Middleware: a narrow, real consequence

Model middleware is applied by wrapping the model in
`prepareGenerationContext`, which a native `generate()` override bypasses.
Google AI Studio, Vertex and Bedrock already bypass it for exactly this reason,
so stage 3 extends an existing gap rather than inventing one.

The blast radius is small and was measured, not assumed. Wrapping is **opt-in**:
`getAISDKModelWithMiddleware` returns the model untouched unless the caller
passes middleware options, and the factory returns it untouched again when the
resulting chain is empty. A default `generate()` call is therefore unaffected.
Lifecycle callbacks such as `onFinish` are handled above the model layer and
were confirmed to fire on every provider including the already-native ones.

The repo's own middleware suite cannot guard this. It targets Vertex, which
already bypasses model middleware, and it is flaky here regardless: two
consecutive runs failed different tests, both with an empty response from the
provider.

## What the first stage-3 attempt taught

The generate-loop migration was written, tested against every provider
reachable from this machine, found green, and reverted. It is worth being
precise about why, because the next attempt will hit the same walls.

**The wire format changed, and only the mocked gate saw it.** Both native paths
drove the turn through the streaming machinery, so `generate()` began sending
`stream: true` where the ai loop sent a plain JSON request. That is exactly the
distinction `useStreamingWireForGenerate()` encodes, and it defaults to false
because some OpenAI-compatible backends mishandle `stream_options` or omit
usage on streams. Every provider with working credentials here supports
streaming, so a live matrix of 40 cells could not see it.
`test:providers-mocked` serves a canned non-streaming body and went from 0
failures to 17.

**The fix direction is known.** Loop over the delegating model's existing
`doGenerate` rather than over the streaming loop. It already picks the JSON or
SSE wire, and already carries the 400 retry, the context-overflow correction
and the invalid-model fallback the gate checks. What remains is the multi-step
tool iteration around it and appending tool results in the shape its own
message conversion expects. Anthropic needs a non-streaming `messages.create`
for the same reason: its loop adapter sets stream on every step.

**Two regressions will recur.** Structured output dropped to null whenever a
schema arrived with no tools, because `appendFinalResultTool` declines an empty
tool list and the ai path did not need tools at all. And `onFinish` stopped
firing, because NeuroLink turns it into lifecycle middleware and middleware is
applied by wrapping the model, which a native override bypasses. Vertex already
solved the second one with `fireGenerateOnFinish`.

## Two bugs the stricter harness surfaced

Neither is caused by this work; both were hidden by assertions that were too
lenient.

- **DeepSeek produces no structured output on the ai path.** It fails with "No
  object generated: response did not match schema". The baseline recorded
  `hasStructured: false` and still passed, because the harness exempted it. The
  reverted native path fixed this by putting `response_format` on the wire, so
  a correct reimplementation should recover it.
- **Groq had silently decommissioned `llama-3.3-70b-versatile`.** The old
  harness reported generate as passing while something else answered. The
  harness now records which provider actually answered and fails when it is not
  the one requested.
