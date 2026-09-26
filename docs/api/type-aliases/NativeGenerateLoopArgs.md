[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1866)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1868)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1875)

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

Defined in: [types/generate.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1878)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1882)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1884)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1886)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1887)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1888)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1889)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1890)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1891)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1892)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1893)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1895)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1897)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
