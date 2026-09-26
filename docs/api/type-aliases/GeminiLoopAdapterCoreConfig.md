[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiLoopAdapterCoreConfig

# Type Alias: GeminiLoopAdapterCoreConfig

> **GeminiLoopAdapterCoreConfig** = `object`

Construction input for `createGeminiLoopAdapter`, shared by Google AI Studio
and Vertex Gemini. Both issue `models.generateContentStream` and consume the
same response shape, so one adapter serves four hand-rolled loops.

## Properties

### providerLabel

> **providerLabel**: `string`

Used in log lines and generated tool-call ids.

---

### maxSteps

> **maxSteps**: `number`

---

### buildRequest

> **buildRequest**: (`conversation`, `step`) => `unknown`

Build one step's request object (model, contents, config).

#### Parameters

##### conversation

[`GeminiTurnContent`](GeminiTurnContent.md)[]

##### step

`number`

#### Returns

`unknown`

---

### sendStep

> **sendStep**: (`request`, `signal`) => `Promise`\<`AsyncIterable`\<\{\[`key`: `string`\]: `unknown`; `functionCalls?`: [`NativeFunctionCall`](NativeFunctionCall.md)[]; \}\>\>

Issue the request. Kept injectable so each provider keeps its own client.

#### Parameters

##### request

`unknown`

##### signal

`AbortSignal`

#### Returns

`Promise`\<`AsyncIterable`\<\{\[`key`: `string`\]: `unknown`; `functionCalls?`: [`NativeFunctionCall`](NativeFunctionCall.md)[]; \}\>\>

---

### liveTools

> **liveTools**: `Record`\<`string`, [`Tool`](Tool.md)\>

The turn's live tool record. Mid-turn `search_tools` discovery hydrates
into this, which is what both the declaration refresh and
`resolveToolOnMiss` read.

---

### declarations?

> `optional` **declarations?**: [`NativeToolDeclarationsResult`](NativeToolDeclarationsResult.md)

Declarations built for this turn. Carries `originalNameMap`, which keeps
Google's function-name sanitization on the adapter side of the engine
boundary.

---

### toolFailureBreaker?

> `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => [`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<[`GeminiTurnContent`](GeminiTurnContent.md)[]\> \| `undefined`

In-turn context reclaim, run once per step before the request is built.
Returns the rebuilt conversation when it reclaimed, undefined when the
request still fits.

Provider-supplied rather than engine-owned because the two Gemini
providers reclaim differently (reclaimAiStudioContext vs
reclaimVertexLoopContext) while the engine only decides WHEN to ask. The
loops append a model turn plus a tool turn every step with nothing else
bounding growth, so a migration that drops this overflows the context
window mid-turn and loses every completed step.

#### Parameters

##### conversation

[`GeminiTurnContent`](GeminiTurnContent.md)[]

##### step

`number`

#### Returns

[`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<[`GeminiTurnContent`](GeminiTurnContent.md)[]\> \| `undefined`

---

### noteUsage?

> `optional` **noteUsage?**: (`inputTokens`, `outputTokens`) => `void`

Usage feedback for the provider's own context guard, called after each
step with that step's real token counts.

#### Parameters

##### inputTokens

`number`

##### outputTokens

`number`

#### Returns

`void`

---

### toolGuards?

> `optional` **toolGuards?**: [`ToolExecutionGuards`](ToolExecutionGuards.md)

The same guards `buildDedupedEngineTools` wraps declared tools in, applied
to one hydrated mid-turn.

Without this a tool discovered during a turn is the ONE executor that runs
raw: no per-turn dedup, no execution timeout, no stall-clock ping. That is
the opposite of what discovery is for — the tool the model just found is
the one most likely to be called repeatedly with the same arguments.

---

### finalResultToolName?

> `optional` **finalResultToolName?**: `string`

Name of the terminal structured-output tool when one is in play. A call
to it ends the turn: its arguments ARE the answer, so it is reported as
text and omitted from `toolCalls`, which routes it through the engine's
ordinary zero-tool-calls exit — never dispatched, never counted against
the breaker, never recorded as a tool execution.

---

### onTerminalResult?

> `optional` **onTerminalResult?**: (`text`) => `void`

Called with the terminal tool's payload when one was actually detected.

The caller cannot infer this from the turn's result: a structured turn
ends with the payload in `text` when the model called the terminal tool,
and with ordinary prose in `text` when it answered directly instead, and
those two are indistinguishable downstream while being handled
differently. Comparing strings to tell them apart would be guesswork.

#### Parameters

##### text

`string`

#### Returns

`void`

---

### collectStep?

> `optional` **collectStep?**: (`stream`, `channel`) => `Promise`\<[`CollectedChunkResult`](CollectedChunkResult.md)\>

Fold one step's raw stream into the shape the adapter reports.

Defaults to `collectStreamChunksIncremental`, which is what AI Studio and
any provider sharing the googleNativeGemini3 helpers want. Vertex does
NOT share them: its loop drains the stream itself, folding cumulative
usage counts as deltas and capturing thought signatures in its own way,
and that behaviour is characterized rather than incidental.

So the collector is a hook rather than a hard-coded call. A provider
whose drain differs supplies its own and keeps its measured behaviour;
one that matches the shared helper passes nothing.

#### Parameters

##### stream

`unknown`

##### channel

###### push

#### Returns

`Promise`\<[`CollectedChunkResult`](CollectedChunkResult.md)\>
