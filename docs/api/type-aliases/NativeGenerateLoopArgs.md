[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Per-step context reclaim, called before every model call with the
conversation as it now stands. Return a replacement to have the loop adopt
it, or undefined to leave it untouched. The provider owns this because the
reclaim has to understand its wire shape.

#### Parameters

##### conversation

`Record`\<`string`, `unknown`\>[]

#### Returns

`Record`\<`string`, `unknown`\>[] \| `undefined`

---

### doGenerate

> **doGenerate**: (`options`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, [`Tool`](Tool.md)\>

Registered tools, used to execute a call the model asks for. Typed
`Record<string, Tool>`; it was `Record<string, unknown>` before discovery
learned to declare tools that join it mid-turn, so a caller that builds
this record from loosely typed tools now needs a cast to `Tool`.

---

### declareTool?

> `optional` **declareTool?**: (`name`, `tool`) => `Record`\<`string`, `unknown`\>

Builds the declaration for a tool that joined `toolsRecord` mid-turn
(discovery's search_tools loads tools into it). Optional: by default the
loop declares such a tool in the provider-neutral shape every provider's
`doGenerate` converts (`toNativeToolDeclaration`), for every provider that
runs this loop. Set it only to declare in another shape. The loop appends
the declarations to `tools` in place.

#### Parameters

##### name

`string`

##### tool

[`Tool`](Tool.md)

#### Returns

`Record`\<`string`, `unknown`\>

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

The turn's resolved tool choice, applied per step via `resolveStepToolChoice`.

---

### toolChoiceSteps?

> `optional` **toolChoiceSteps?**: `number`

Leading steps a forced `toolChoice` stays in force (default 1).

---

### prepareStep?

> `optional` **prepareStep?**: [`NativeLoopPrepareStep`](NativeLoopPrepareStep.md)

Caller's per-step hook; only its `toolChoice` is honoured.

---

### modelId

> **modelId**: `string`

Resolved model id, handed to `prepareStep` as its `model` argument.

---

### provider

> **provider**: `string`

Provider name recorded on each step's generation and used to price it.

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

---

### maxSteps

> **maxSteps**: `number`

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### onRejectedToolCall?

> `optional` **onRejectedToolCall?**: (`toolName`, `error`, `toolCallId`) => `void`

Called for a tool call the loop rejects before any execute runs (unknown
tool, arguments the schema rejected), so the provider can emit the
`tool:start` / `tool:end` pair no executor will.

#### Parameters

##### toolName

`string`

##### error

`string`

##### toolCallId

`string`

#### Returns

`void`
