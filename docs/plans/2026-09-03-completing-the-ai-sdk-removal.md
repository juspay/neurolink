# Completing the ai-sdk removal

What is left, how each piece is solved, and the order forced by their
dependencies. Every claim here was checked against the source or the installed
package, not inferred.

## The rule that governs all of it

Run `test:providers-mocked` on every step, not just the live matrix. The live
matrix has 40 cells across six providers and it passed a change that broke ten
of them, because every provider reachable from this machine supports streaming
and the mocked gate is the only thing that serves a non-streaming body. The
live matrix proves behaviour; the mocked gate proves the wire.

## 1. Anthropic native generate

`createAnthropicLoopAdapter` hardcodes `stream: true` when it calls
`messages.create` (`loopAdapter.ts:120`), which is why routing generate through
it changed the wire.

Solution is the shape already proven for the OpenAI-compatible family: loop over
the provider's own delegating-model `doGenerate`, which issues a non-streaming
`messages.create`. Wrap each step in `withProviderRetry`, funnel failures
through `handleProviderError`, run the turn inside
`runGenerateWithModelFallback` (now protected), and call `fireGenerateOnFinish`.

Carry over the two fixes found the first time. A schema arriving with no tools
must declare `final_result` as the turn's only tool and pin `tool_choice` to it,
because `appendFinalResultTool` declines an empty tool list. And `onFinish` must
be fired explicitly.

## 2. SageMaker

`SageMakerLanguageModel.doGenerate` makes one `invokeEndpoint` call and already
returns `toolCalls`; no streaming is involved, so the wire hazard does not
apply. Same loop shape as above.

This machine has no SageMaker endpoint or credentials. Its single-step
behaviour is identical by construction because it is the same `doGenerate`
call; the multi-step branch is the new code and needs a live endpoint before it
is trusted. Say so in the commit rather than implying coverage.

## 3. Guardrails filter and video-analysis formatting

Both want a single no-tool turn. `generateOnceNative` did this cleanly before
the revert took it with everything else: it calls `doGenerate` directly and
reads the text out of the v3 content array. Re-apply unchanged.

## 4. wrapLanguageModel

Upstream is about fifty lines: reverse the middleware array, reduce it, and
return an object that keeps `specificationVersion`, `provider`, `modelId` and
`supportedUrls` while routing `doGenerate` and `doStream` through
`transformParams` plus the optional `wrapGenerate` / `wrapStream` hooks. One
consumer, `middleware/factory.ts`. Reimplement directly.

Record while doing it that `wrapStream` never runs today, because every
streaming path is native and bypasses the wrapped model.

## 5. The tool and schema type algebra

This is the one that must move as a unit, and the reason the first attempt
failed: `tool()` was replaced while `Tool` still came from `ai`, so the
replacement had to satisfy a type it no longer matched.

The algebra is small and fully specified in the installed package:

- `Schema<T>` is `{ [schemaSymbol]: true; _type: T; validate?; jsonSchema }`.
- `FlexibleSchema<S>` is the union of `Schema`, `LazySchema`, `ZodSchema` and
  `StandardSchema`.
- `InferSchema<S>` is a conditional chain over those four.
- `Tool<INPUT, OUTPUT>` carries `inputSchema: FlexibleSchema<INPUT>`, which is
  what ties `execute`'s first parameter to the schema.

Declare all of it in `src/lib/types/`, repoint `types/tools.ts` at the local
declarations, and only then implement `tool`, `jsonSchema` and `stepCountIs` in
`utils/tool.ts`. `tool()` is identity upstream and `stepCountIs(n)` is
`({steps}) => steps.length === n`; the work is entirely in the types.

`jsonSchema()` should keep stamping `Symbol.for("vercel.ai.schema")`. Nothing in
this repo reads it — `convertZodToJsonSchema` looks for the plain `jsonSchema`
property — but keeping it costs nothing and preserves recognition by anything
that does.

## 6. The rest of the public type surface

Three files hand-declare structurally: `conversation.ts` (the message and part
types), `providers.ts` (the model, usage and finish-reason types) and
`middleware.ts` (the middleware contract plus the `LanguageModelV3` protocol
types from `@ai-sdk/provider`).

The non-obvious one is `dist/files/fileTools.d.ts`, which embeds inferred
`import("ai").Tool<...>` references. No source edit removes those; they
disappear only once `Tool` itself is local. Verify by hiding the package and
re-running a consumer typecheck, which is how the leak was confirmed in the
first place.

## 7. GenerationHandler

1409 lines, and its `executeGeneration` is unreachable once Anthropic and
SageMaker are native. Four result-formatting helpers on it are still called from
`BaseProvider`, but they take the `generateText` result shape, so they die with
it. Confirm by trapping the seam and running the full matrix plus the mocked
gate, then delete. `Output` and `stepCountIs` lose their last consumers here.

## 8. Browser bundle

`src/browser/entry.ts` still re-exports `generateText`, `streamText`,
`generateObject` and `streamObject` through the seam. No consumer was found for
them. Either drop them or map them onto NeuroLink's own equivalents; this is a
public-subpath decision, not a technical one.

## Order

Type algebra last among the type work but before the package drop; everything
else is independent.

1. Anthropic, SageMaker, guardrails and video-analysis — the last runtime
   callers of `generateText`.
2. `wrapLanguageModel`.
3. Delete the dead GenerationHandler path.
4. The tool/schema algebra together with `types/tools.ts` and `utils/tool.ts`.
5. The remaining public types.
6. Browser re-exports.
7. Drop `ai` and `@ai-sdk/provider`, extend `BANNED_PACKAGES`, and rewrite the
   documentation snippets that still tell users to import from `ai` directly.
