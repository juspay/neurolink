# Model middleware on Vertex, AI Studio and Bedrock

> **Status:** AI Studio (`301e4e18a`) and Bedrock are implemented. Vertex
> remains specification only — the rest of this document, including the
> "still reach none of the five" language below, was written before either
> landed and is accurate for Vertex alone.
>
> **Goal:** make `transformParams` / `wrapGenerate` / `wrapStream` run on the
> three providers that bypass them entirely, on both `generate()` and
> `stream()`.

## The gap, stated exactly

`middleware` is a public option on `generate()` and `stream()`. It is applied
by wrapping the model handle, in exactly one place:

```
BaseProvider.getAISDKModelWithMiddleware(options)   // baseProvider.ts:2723
  └─ applyMiddlewareToModel(await getAISDKModel(), options)   // :2738
```

Five call sites reach it. That is the whole list:

| call site                                                      | mode                                         |
| -------------------------------------------------------------- | -------------------------------------------- |
| `openaiChatCompletionsBase.ts:1132`                            | generate                                     |
| `openaiChatCompletionsBase.ts:1534` (`applyMiddlewareToModel`) | stream                                       |
| `anthropic/client.ts:1766`                                     | generate                                     |
| `amazonSagemaker.ts:206`                                       | generate                                     |
| `baseProvider.ts:1515`                                         | inside `prepareGenerationContext` — **live** |

The fifth entry matters, and an earlier draft of this spec got it wrong by
calling it deleted. `prepareGenerationContext` is live; it is the seam a
provider reaches by going through `BaseProvider.runGenerateInActiveContext`.

`googleVertex`, `googleAiStudio` and `amazonBedrock` still reach none of the
five. Verified per file rather than assumed: Vertex and Bedrock contain zero
references to `prepareGenerationContext`, `getAISDKModelWithMiddleware` or
`applyMiddlewareToModel`; AI Studio's only mention of
`runGenerateInActiveContext` is a comment saying it replicates that dispatch
**because its override bypasses that path**.
Each overrides `generate()` and `executeStream()` with a native path that
never wraps its model, so for those three:

- `transformParams` never fires — a middleware that rewrites the prompt,
  `maxOutputTokens`, `temperature` or `topP` is silently ignored
- `wrapGenerate` and `wrapStream` never fire — guardrails do not filter,
  and a **guardrail that blocks a prompt does not block it**
- on **Vertex** `onFinish` still fires, special-cased separately via
  `fireGenerateOnFinish` — which is invoked from `googleVertex/client.ts`
  and nowhere else
- on **AI Studio and Bedrock**, not even that: both files contain zero
  references to `onFinish`, so a caller's `onFinish` is dropped on the
  **generate** path

That last point is about generate only. `stream()` lifecycle callbacks are
unaffected on all three: `BaseProvider.wrapStreamWithLifecycleCallbacks`
reads `onChunk` / `onFinish` / `onError` and is applied on the generic stream
path, so a streaming caller still gets them. What no provider here gets is
**model** middleware.

The last point is the sharp one: a caller who configures blocking guardrails
and points at Vertex gets no error and no filtering. It looks configured and
does nothing.

### Entry points to change

| provider                   | generate | stream                                    |
| -------------------------- | -------- | ----------------------------------------- |
| `googleVertex/client.ts`   | `:6635`  | `:1175` `executeStream`, `:6575` `stream` |
| `googleAiStudio/client.ts` | `:1746`  | `:772` `executeStream`                    |
| `amazonBedrock/client.ts`  | `:233`   | `:895` `executeStream`                    |

## Why it was left

Acknowledged twice and deliberately: `docs/plans/2026-09-03-remove-remaining-ai-sdk-plan.md`
records that these three "already bypass it for exactly this reason, so stage 3
extends an existing gap rather than inventing one", and PR #1636 scoped itself
to the OpenAI-compatible family and said so under "Not in this PR".

So this is a **pre-existing gap widened by the native migration**, not a
regression it introduced. Wording in any PR should say that.

## The pattern to copy

PR `#1636` solved the same problem for the OpenAI-compatible stream path. Its shape
is the template, and its four hard-won corrections are the specification for
what "done" means here:

1. **Build a V3 base model whose `doStream` starts the real native loop**,
   wrap it with the middleware chain, then drive the _wrapped_ model. Convert
   the prompt to the wire format **after** `transformParams`, or a rewrite
   never reaches the wire.
2. **Emit a terminal `finish` part** carrying usage and finish reason, from
   the loop's deferred promises. Without it a middleware observing the stream
   sees neither.
3. **Tolerate a middleware that never calls `doStream`.** Guardrails' precall
   path returns its own stream; the loop never starts, so every reader of the
   loop promise must survive its absence or analytics hang forever.
4. **Forward cancellation.** Breaking out of a wrapped stream must abort the
   upstream request, or the HTTP connection leaks.

Honour on the way back in: `prompt`, `maxOutputTokens`, `temperature`, `topP`.
`tools` is read-only — a rewrite gets a WARN, never a silent drop.

## Order

Count the native loops before choosing, because two of these providers branch
inside their entry points:

| provider  | native loops behind generate + stream                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI Studio | `executeNativeGemini3Stream`, plus `executeAudioStreamViaGeminiLive` when `options.input?.audio` (`executeStream:780`) — **not** a single SSE loop |
| Vertex    | four — `executeNativeGemini3Stream` / `executeNativeAnthropicStream` (`executeStream:1254` / `:1244`), and the matching pair on `generate:6635`    |
| Bedrock   | one `generate` and one `executeStream`, over the AWS SDK rather than fetch                                                                         |

Still **AI Studio first** — two loops against Vertex's four — but not for the
reason an earlier draft gave. Its audio branch is a decision, not a detail:
Gemini Live is not SSE, so either middleware applies there too, and
`transformParams` has to mean something for an audio turn, or the branch is
explicitly excluded and says so in code. Settle that before writing it.

Then Vertex, where the Anthropic-on-Vertex loops are the larger half of the
file and need covering alongside the Gemini-3 ones. Then Bedrock, whose
AWS-SDK transport means cancellation (point 4) needs its own answer.

One PR per provider. They are independent, and a single PR touching all three
cannot be reviewed against a live matrix cell by cell.

## Proving it — red first

The existing `test/continuous-test-suite-stream-middleware.ts` is the right
home; it already drives the shipped `dist` against local HTTP stand-ins on
both modes. Add, per provider, and **watch each fail before implementing**:

- `transformParams` rewrites the prompt → assert the **rewritten** text on the
  wire, read from the stand-in's recorded request body. Not the reply.
- `wrapGenerate` / `wrapStream` observed → assert the hook ran **and** that a
  V3 `finish` part carried usage.
- guardrails precall **blocking** → assert the stand-in received **zero**
  requests and the caller still got a settled result. This is the case that
  fails loudest today.
- cancellation → break out mid-stream, assert the stand-in saw the request
  closed.

A precondition assertion comes before each claim, per the repo's rule: prove
the stand-in was actually exercised before asserting on what it saw.

**Answer the transport question first — the existing cases do not.** Today's
stand-ins work because the OpenAI-compatible family takes a caller-supplied
`baseURL`, so an `http.createServer` is trivial to aim it at. These three do
not: AI Studio and Vertex resolve a client from Google credentials or ADC, and
Bedrock goes through the AWS SDK. Each PR has to say how its provider is
pointed at a local server — an env base-URL override, Vertex's Express/API-key
route, an injected fetch, or the SDK's own endpoint option — and where no such
seam exists, adding one is part of the work, not a footnote.

Start from the precedent already in the repo rather than inventing one: the
per-provider characterization suites (`test:vertex-loop-characterization`,
`test:aistudio-loop-characterization`, `test:bedrock-loop-characterization`)
already drive these three deterministically, and `providers-mocked` reaches
them through `installMockFetch`, which intercepts at the fetch layer and so
does not need a caller-supplied `baseURL` at all. That interception is the
most likely answer for AI Studio and Vertex; Bedrock's AWS SDK client may
need its own endpoint option instead.

### Two traps this repo has already paid for

- **Keep payloads out of assertion messages.** `defineSuite`'s `test()`
  downgrades a thrown error to SKIP when the message matches
  `isExpectedProviderError()`. An assertion that quotes a provider-ish payload
  turns a real failure into `⊘` and CI stays green. Describe the discrepancy,
  never quote the value.
- **One module graph per suite.** Take `NeuroLink` and everything else from
  `dist/`. Mixing `src/` and `dist/` breaks stubs, spies and `instanceof`
  silently, with a clean typecheck.

Sanity-check each new case by breaking one assertion on purpose and confirming
it reports `✗` and exits non-zero rather than `⊘`.

## Gates

Per PR: `pnpm run check`, `pnpm run lint`, `pnpm run build`,
`pnpm run test:stream-middleware`, `pnpm run test:providers-mocked` (95/95 —
this is the gate that catches a changed wire), plus that provider's
characterization suite (`test:vertex-loop-characterization`,
`test:aistudio-loop-characterization`, `test:bedrock-loop-characterization`)
and a live `test:matrix --provider=<name>`.

`test:providers-mocked` is not optional. The live matrix passed a change that
broke ten of its cells once, because every provider reachable from a dev
machine supports streaming and only the mocked gate serves a non-streaming
body.

## Out of scope

- A mutable `tools` in `transformParams`.
- The other native providers' generate paths, which already wrap correctly.
- **AI Studio's Gemini Live audio branch** (`executeAudioStreamViaGeminiLive`,
  reached from `executeStream:780` when `options.input?.audio` is set). The
  loop-count comparison above is between the **text SSE** branches only. Audio
  is excluded from the first PR deliberately — it is not an SSE transport, so
  `transformParams` and cancellation would both need their own meaning there —
  and excluding it must be explicit in code, not implied by the tests never
  sending audio.
