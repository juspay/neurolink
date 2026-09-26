[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1897)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1899)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1906)

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

Defined in: [types/generate.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1909)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1913)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1915)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1917)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1918)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1919)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1920)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1921)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1922)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1923)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1924)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1926)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1928)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
