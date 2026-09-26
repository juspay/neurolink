[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1903)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1905)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1912)

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

Defined in: [types/generate.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1915)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1919)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1921)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1923)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1924)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1925)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1926)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1927)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1928)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1929)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1930)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1932)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1934)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
