[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopArgs

# Type Alias: NativeGenerateLoopArgs

> **NativeGenerateLoopArgs** = `object`

Defined in: [types/generate.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1759)

Inputs to the shared native generate loop (`core/nativeGenerateLoop.ts`).
One loop serves every provider whose delegating model exposes a v3-shaped
`doGenerate`; the provider supplies the wire details.

## Properties

### doGenerate

> **doGenerate**: (`options`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1760)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

---

### conversation

> **conversation**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1764)

Conversation in the message-builder shape each doGenerate converts itself.

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `unknown`\>[]

Defined in: [types/generate.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1766)

Tool declarations in the v3 shape doGenerate already knows how to convert.

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1768)

Registered tools, used to execute a call the model asks for.

---

### toolChoice?

> `optional` **toolChoice?**: `unknown`

Defined in: [types/generate.ts:1769](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1769)

---

### responseFormat?

> `optional` **responseFormat?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1770)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1771](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1771)

---

### maxSteps

> **maxSteps**: `number`

Defined in: [types/generate.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1772)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/generate.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1773)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1774)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1775)

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/generate.ts:1777](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1777)

Per-tool-execution cap, forwarded into `guardToolExecutor`.

---

### runStep

> **runStep**: (`call`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [types/generate.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1779)

Wraps one step: retry ladder plus provider error classification.

#### Parameters

##### call

() => `Promise`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>
