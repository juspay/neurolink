[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1959](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1959)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### observeUsage?

> `optional` **observeUsage?**: (`usage`) => `void`

Defined in: [types/generate.ts:1961](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1961)

Observed usage for calibrating the next step against the last request.

#### Parameters

##### usage

`unknown`

#### Returns

`void`

---

### guardConversation?

> `optional` **guardConversation?**: (`conversation`) => `Record`\<`string`, `unknown`\>[] \| `undefined`

Defined in: [types/generate.ts:1968](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1968)

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

Defined in: [types/generate.ts:1971](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1971)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1975](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1975)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1977)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1979)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1980)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1981)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1982)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1983](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1983)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1984)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1985](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1985)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1986)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1988](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1988)

Per-tool-execution cap, forwarded into `guardToolExecutor`. `null` for no bound.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1990)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
