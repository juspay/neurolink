[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopAdapterConfig

# Type Alias: AnthropicLoopAdapterConfig

> **AnthropicLoopAdapterConfig** = `object`

Defined in: [types/loopEngine.ts:169](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L169)

Construction input for `createAnthropicLoopAdapter`, shared by direct
Anthropic and Vertex+Claude.

`toolFailureBreaker` is the one field the two call sites must differ on:
Vertex+Claude ports the Gemini loops' failure-strike breaker, native
Anthropic has never had one, and setting it for both would change native
Anthropic's behaviour under the guise of a shared refactor.

## Properties

### client

> **client**: `Pick`\<`Anthropic`, `"messages"`\>

Defined in: [types/loopEngine.ts:170](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L170)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/loopEngine.ts:171](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L171)

---

### buildParams

> **buildParams**: (`conversation`, `step`) => `Anthropic.Messages.MessageCreateParams`

Defined in: [types/loopEngine.ts:177](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L177)

Build one step's request. A closure so the per-turn work the caller
already does — system prompt, tool declarations, sampling, thinking
config, cache breakpoints — stays where it is rather than moving here.

#### Parameters

##### conversation

`Anthropic.Messages.MessageParam`[]

##### step

`number`

#### Returns

`Anthropic.Messages.MessageCreateParams`

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `Tool`\>

Defined in: [types/loopEngine.ts:182](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L182)

The turn's live tool record, used for deferred-catalog resolution.

---

### finalResultToolName?

> `optional` **finalResultToolName?**: `string`

Defined in: [types/loopEngine.ts:189](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L189)

Name of the terminal structured-output tool when one is in play. A call
to it ends the turn: its arguments ARE the answer, so it is reported as
text and omitted from `toolCalls`, which routes it through the engine's
ordinary zero-tool-calls exit.

---

### onTerminalResult?

> `optional` **onTerminalResult?**: (`text`) => `void`

Defined in: [types/loopEngine.ts:201](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L201)

Called with the terminal tool's payload when one was actually detected.

The caller cannot infer this from the turn's result. A structured turn
ends with the payload in `text` when the model called the terminal tool,
and with ordinary prose in `text` when it ignored the instruction and
answered directly — the two are indistinguishable downstream, yet they
are handled differently: the payload is delivered as the answer, while
prose is delivered from the caller's own buffer. Comparing strings to
tell them apart would be guesswork, so the adapter says which happened.

#### Parameters

##### text

`string`

#### Returns

`void`

---

### toolFailureBreaker?

> `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

Defined in: [types/loopEngine.ts:202](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L202)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => `Anthropic.Messages.MessageParam`[] \| `undefined`

Defined in: [types/loopEngine.ts:215](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L215)

In-turn context reclaim, run once per step before the request is built.
Returns the rebuilt conversation when it reclaimed, undefined while the
request still fits — leaving history byte-identical in the common case so
the rolling prompt-cache prefix stays valid.

Provider-supplied because the guard decides and the caller mutates in its
own concrete types: dropping an assistant tool_use message together with
its paired user tool_result is what keeps blocks paired. The loop appends
both every step with nothing else bounding growth, so a migration that
drops this overflows the window mid-turn.

#### Parameters

##### conversation

`Anthropic.Messages.MessageParam`[]

##### step

`number`

#### Returns

`Anthropic.Messages.MessageParam`[] \| `undefined`

---

### noteObservedPromptTokens?

> `optional` **noteObservedPromptTokens?**: (`promptTokens`) => `void`

Defined in: [types/loopEngine.ts:225](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L225)

Calibration feedback for the provider's reclaim guard: the FULL prompt
size for the step just made — uncached input plus both cache tiers.
Passing input_tokens alone reads a cache-hit step as tiny and lets the
guard drift far under the real cost.

#### Parameters

##### promptTokens

`number`

#### Returns

`void`

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/loopEngine.ts:226](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L226)
