# Model middleware on Vertex, AI Studio and Bedrock

> **Status:** done. AI Studio (`301e4e18a`), Vertex and Bedrock are all
> implemented — each via its own synthetic V3 model bridge (`generate()` and
> `stream()`), so `transformParams` / `wrapGenerate` / `wrapStream` now run on
> every provider this plan covers. The rest of this document, including the
> "still reach none of the five" language below, describes the gap as it
> stood before any of the three landed; it is kept for the record, not as a
> current description.
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

At the time this plan was written, `googleVertex`, `googleAiStudio` and
`amazonBedrock` reached none of the five: each overrode `generate()` and
`executeStream()` with a native path that never wrapped its model. All three
have since closed that gap, each through its own synthetic V3 model bridge
rather than through one of the five call sites above — the bridge builds a
`LanguageModelV3` whose `doGenerate`/`doStream` drives the native loop, wraps
it with `applyMiddlewareToModel`, and reads the middleware-transformed params
back onto the native request. The symptoms below describe the gap as it
stood before any of the three landed:

- `transformParams` never fired — a middleware that rewrote the prompt,
  `maxOutputTokens`, `temperature` or `topP` was silently ignored
- `wrapGenerate` and `wrapStream` never fired — guardrails did not filter,
  and a **guardrail that blocked a prompt did not block it**
- on **Vertex** `onFinish` still fired, special-cased separately via
  `fireGenerateOnFinish` — which was invoked from `googleVertex/client.ts`
  and nowhere else
- on **AI Studio and Bedrock**, not even that: both files contained zero
  references to `onFinish`, so a caller's `onFinish` was dropped on the
  **generate** path

That last point was about generate only. `stream()` lifecycle callbacks were
unaffected on all three: `BaseProvider.wrapStreamWithLifecycleCallbacks`
reads `onChunk` / `onFinish` / `onError` and is applied on the generic stream
path, so a streaming caller still got them. What no provider here got was
**model** middleware.

The last point was the sharp one: a caller who configured blocking
guardrails and pointed at any of these three providers got no error and no
filtering. It looked configured and did nothing.

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
already drive these three deterministically, each through its own seam.
`providers-mocked` is not that precedent: it has no AI Studio section, and
its Vertex and Bedrock sections are construction-only because their SDKs
bypass `globalThis.fetch`, so `installMockFetch` cannot reach them. The seams
the characterization suites use are:

- **AI Studio:** `credentials.googleAiStudio.baseURL`, which the provider
  threads into the SDK's `httpOptions.baseUrl`.
- **Vertex:** Express Mode (`credentials.vertex.apiKey` with no
  project/location, plus `credentials.vertex.baseURL`). ADC authentication
  ignores an endpoint override, so Express Mode is the only route to a local
  server.
- **Bedrock:** the AWS SDK's own `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` variable
  with fake AWS credentials. The stand-in has to speak cleartext HTTP/2,
  because the SDK defaults to `NodeHttp2Handler` for its event-stream
  operations.

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
