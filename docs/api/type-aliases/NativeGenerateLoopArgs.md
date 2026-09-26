[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1887)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1889)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1896)

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

Defined in: [types/generate.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1899)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1903)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1905)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1907)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1908)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1909)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1910)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1911)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1912)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1913)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1914)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1916)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1918)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
