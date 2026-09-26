[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopAdapterConfig

# Type Alias: AnthropicLoopAdapterConfig\<TMessage\>

> **AnthropicLoopAdapterConfig**\<`TMessage`\> = `object`

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

---

### buildParams

> **buildParams**: (`conversation`, `step`) => `Anthropic.Messages.MessageCreateParamsNonStreaming`

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

> **toolsRecord**: `Record`\<`string`, [`Tool`](Tool.md)\>

The turn's live tool record, used for deferred-catalog resolution.

---

### finalResultToolName?

> `optional` **finalResultToolName?**: `string`

Name of the terminal structured-output tool when one is in play. A call
to it ends the turn: its arguments ARE the answer, so it is reported as
text and omitted from `toolCalls`, which routes it through the engine's
ordinary zero-tool-calls exit.

---

### onTerminalResult?

> `optional` **onTerminalResult?**: (`text`) => `void`

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

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Hard deadline for ONE `messages.create` request (ms). Composed with the
engine's signal for the duration of that step only, so it bounds a stalled
upstream even when the turn itself has no lifetime ceiling — and is armed
fresh per step, which is why a step boundary can never extend a deadline
already running.

When the deadline fires, the step throws the timer's own TimeoutError
rather than returning what it had: the Anthropic SDK's stream iterator
exits WITHOUT throwing on an aborted read, so a truncated step would
otherwise be reported as a model turn that simply said less.

---

### requireTerminalEvent?

> `optional` **requireTerminalEvent?**: `boolean`

Require the upstream terminal event (`message_stop`) before a step counts
as complete.

A response that ends early carries syntactically complete content blocks —
including tool_use blocks — so without this the loop dispatches tools the
model never finished asking for and reports the turn as a normal stop.
Off by default: turning it on unconditionally would change what every
existing caller sees from a flaky connection.

---

### toolFailureBreaker?

> `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

---

### planReclaim?

> `optional` **planReclaim?**: (`conversation`, `step`) => [`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<`TMessage`[]\> \| `undefined`

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
