[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopAdapterConfig

# Type Alias: AnthropicLoopAdapterConfig\<TMessage\>

> **AnthropicLoopAdapterConfig**\<`TMessage`\> = `object`

Defined in: [types/loopEngine.ts:275](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L275)

Construction input for `createAnthropicLoopAdapter`, shared by direct
Anthropic and Claude-on-Vertex.

Parameterized on the message shape because the two do NOT agree on it.
Direct Anthropic uses the SDK's `MessageParam`; Claude-on-Vertex carries its
own `VertexAnthropicMessage`, whose role union is narrower
("user" | "assistant", no "system") and whose image `media_type` is a plain
string rather than the SDK's four-way union. Neither is assignable to the
other, so pinning the adapter to one of them locked the other out entirely.
The engine has been generic over its conversation type all along; this makes
the adapter config match.

## Type Parameters

### TMessage

`TMessage` = `Anthropic.Messages.MessageParam`

## Properties

### client

> **client**: `object`

Defined in: [types/loopEngine.ts:287](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L287)

Only `messages.create` is ever called, so only that is required.

`Pick<Anthropic, "messages">` looked equivalent and is not: it demands the
FULL `Messages` resource, including `batches` and the private `_client`.
That excludes `AnthropicVertex`, whose `MessagesResource` is structurally
smaller but has the one method this adapter uses — a client the adapter
can drive perfectly, rejected for members it never touches.

#### messages

> **messages**: `Pick`\<`Anthropic`\[`"messages"`\], `"create"`\>

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/loopEngine.ts:290](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L290)

---

### buildParams

> **buildParams**: (`conversation`, `step`) => `Anthropic.Messages.MessageCreateParamsNonStreaming`

Defined in: [types/loopEngine.ts:303](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L303)

Returns the NON-streaming params. The adapter adds `stream: true` itself,
so requiring the streaming variant here would force every caller to
declare a literal `true` it does not control — and a caller whose params
type carries `stream?: boolean` fails to match `stream: true` for a field
the adapter is about to overwrite.

#### Parameters

##### conversation

`TMessage`[]

##### step

`number`

#### Returns

`Anthropic.Messages.MessageCreateParamsNonStreaming`

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `Tool`\>

Defined in: [types/loopEngine.ts:308](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L308)

The turn's live tool record, used for deferred-catalog resolution.

---

### finalResultToolName?

> `optional` **finalResultToolName?**: `string`

Defined in: [types/loopEngine.ts:315](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L315)

Name of the terminal structured-output tool when one is in play. A call
to it ends the turn: its arguments ARE the answer, so it is reported as
text and omitted from `toolCalls`, which routes it through the engine's
ordinary zero-tool-calls exit.

---

### onTerminalResult?

> `optional` **onTerminalResult?**: (`text`) => `void`

Defined in: [types/loopEngine.ts:327](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L327)

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

Defined in: [types/loopEngine.ts:328](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L328)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => [`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<`TMessage`[]\> \| `undefined`

Defined in: [types/loopEngine.ts:341](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L341)

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

`TMessage`[]

##### step

`number`

#### Returns

[`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<`TMessage`[]\> \| `undefined`

---

### noteObservedPromptTokens?

> `optional` **noteObservedPromptTokens?**: (`promptTokens`) => `void`

Defined in: [types/loopEngine.ts:351](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L351)

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

Defined in: [types/loopEngine.ts:352](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L352)
