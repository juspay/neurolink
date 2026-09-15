[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1783)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1785](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1785)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1792)

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

Defined in: [types/generate.ts:1795](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1795)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1799)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1801)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1803)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1804)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1805)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1806)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1807)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1808)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1809)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1810)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1812)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1814)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
