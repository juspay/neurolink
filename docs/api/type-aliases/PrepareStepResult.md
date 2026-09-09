[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrepareStepResult

# Type Alias: PrepareStepResult\<TOOLS\>

> **PrepareStepResult**\<`TOOLS`\> = `object`

Defined in: [types/aiCompat.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L593)

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, [`Tool`](Tool.md)\> = `Record`\<`string`, [`Tool`](Tool.md)\>

## Properties

### model?

> `optional` **model?**: [`LanguageModel`](LanguageModel.md)

Defined in: [types/aiCompat.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L596)

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`TOOLS`\>

Defined in: [types/aiCompat.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L597)

---

### activeTools?

> `optional` **activeTools?**: keyof `TOOLS`[]

Defined in: [types/aiCompat.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L598)

---

### system?

> `optional` **system?**: `string`

Defined in: [types/aiCompat.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L599)

---

### messages?

> `optional` **messages?**: [`ModelMessage`](ModelMessage.md)[]

Defined in: [types/aiCompat.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L600)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/aiCompat.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L601)

---

### tools?

> `optional` **tools?**: `TOOLS`

Defined in: [types/aiCompat.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L602)
