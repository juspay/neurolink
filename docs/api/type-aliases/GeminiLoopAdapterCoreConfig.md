[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiLoopAdapterCoreConfig

# Type Alias: GeminiLoopAdapterCoreConfig

> **GeminiLoopAdapterCoreConfig** = `object`

Defined in: [types/loopEngine.ts:413](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L413)

Construction input for `createGeminiLoopAdapter`, shared by Google AI Studio
and Vertex Gemini. Both issue `models.generateContentStream` and consume the
same response shape, so one adapter serves four hand-rolled loops.

## Properties

### providerLabel

> **providerLabel**: `string`

Defined in: [types/loopEngine.ts:415](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L415)

Used in log lines and generated tool-call ids.

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/loopEngine.ts:416](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L416)

---

### buildRequest

> **buildRequest**: (`conversation`, `step`) => `unknown`

Defined in: [types/loopEngine.ts:418](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L418)

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

Defined in: [types/loopEngine.ts:420](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L420)

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

> **liveTools**: `Record`\<`string`, `Tool`\>

Defined in: [types/loopEngine.ts:434](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L434)

The turn's live tool record. Mid-turn `search_tools` discovery hydrates
into this, which is what both the declaration refresh and
`resolveToolOnMiss` read.

---

### declarations?

> `optional` **declarations?**: [`NativeToolDeclarationsResult`](NativeToolDeclarationsResult.md)

Defined in: [types/loopEngine.ts:440](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L440)

Declarations built for this turn. Carries `originalNameMap`, which keeps
Google's function-name sanitization on the adapter side of the engine
boundary.

---

### toolFailureBreaker?

> `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

Defined in: [types/loopEngine.ts:441](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L441)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => [`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<[`GeminiTurnContent`](GeminiTurnContent.md)[]\> \| `undefined`

Defined in: [types/loopEngine.ts:454](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L454)

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

Defined in: [types/loopEngine.ts:462](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L462)

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

> `optional` **toolGuards?**: [`GeminiToolExecutionGuards`](GeminiToolExecutionGuards.md)

Defined in: [types/loopEngine.ts:472](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L472)

The same guards `buildDedupedEngineTools` wraps declared tools in, applied
to one hydrated mid-turn.

Without this a tool discovered during a turn is the ONE executor that runs
raw: no per-turn dedup, no execution timeout, no stall-clock ping. That is
the opposite of what discovery is for — the tool the model just found is
the one most likely to be called repeatedly with the same arguments.

---

### finalResultToolName?

> `optional` **finalResultToolName?**: `string`

Defined in: [types/loopEngine.ts:480](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L480)

Name of the terminal structured-output tool when one is in play. A call
to it ends the turn: its arguments ARE the answer, so it is reported as
text and omitted from `toolCalls`, which routes it through the engine's
ordinary zero-tool-calls exit — never dispatched, never counted against
the breaker, never recorded as a tool execution.

---

### onTerminalResult?

> `optional` **onTerminalResult?**: (`text`) => `void`

Defined in: [types/loopEngine.ts:490](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L490)

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

Defined in: [types/loopEngine.ts:504](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L504)

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
