[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1830)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1832)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1839](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1839)

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

Defined in: [types/generate.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1842)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1846)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1848)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1850)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1851)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1852)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1853)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1854)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1855)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1856)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1857)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1859)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1861)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
