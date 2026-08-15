[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiLoopAdapterCoreConfig

# Type Alias: GeminiLoopAdapterCoreConfig

> **GeminiLoopAdapterCoreConfig** = `object`

Defined in: [types/loopEngine.ts:246](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L246)

Construction input for `createGeminiLoopAdapter`, shared by Google AI Studio
and Vertex Gemini. Both issue `models.generateContentStream` and consume the
same response shape, so one adapter serves four hand-rolled loops.

## Properties

### providerLabel

> **providerLabel**: `string`

Defined in: [types/loopEngine.ts:248](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L248)

Used in log lines and generated tool-call ids.

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/loopEngine.ts:249](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L249)

---

### buildRequest

> **buildRequest**: (`conversation`, `step`) => `unknown`

Defined in: [types/loopEngine.ts:251](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L251)

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

Defined in: [types/loopEngine.ts:253](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L253)

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

Defined in: [types/loopEngine.ts:267](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L267)

The turn's live tool record. Mid-turn `search_tools` discovery hydrates
into this, which is what both the declaration refresh and
`resolveToolOnMiss` read.

---

### declarations?

> `optional` **declarations?**: [`NativeToolDeclarationsResult`](NativeToolDeclarationsResult.md)

Defined in: [types/loopEngine.ts:273](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L273)

Declarations built for this turn. Carries `originalNameMap`, which keeps
Google's function-name sanitization on the adapter side of the engine
boundary.

---

### toolFailureBreaker?

> `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

Defined in: [types/loopEngine.ts:274](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L274)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => [`GeminiTurnContent`](GeminiTurnContent.md)[] \| `undefined`

Defined in: [types/loopEngine.ts:287](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L287)

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

[`GeminiTurnContent`](GeminiTurnContent.md)[] \| `undefined`

---

### noteUsage?

> `optional` **noteUsage?**: (`inputTokens`, `outputTokens`) => `void`

Defined in: [types/loopEngine.ts:295](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L295)

Usage feedback for the provider's own context guard, called after each
step with that step's real token counts.

#### Parameters

##### inputTokens

`number`

##### outputTokens

`number`

#### Returns

`void`
