[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrepareStepResult

# Type Alias: PrepareStepResult\<TOOLS\>

> **PrepareStepResult**\<`TOOLS`\> = `object`

Defined in: [types/aiCompat.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L589)

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, [`Tool`](Tool.md)\> = `Record`\<`string`, [`Tool`](Tool.md)\>

## Properties

### model?

> `optional` **model?**: [`LanguageModel`](LanguageModel.md)

Defined in: [types/aiCompat.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L592)

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`TOOLS`\>

Defined in: [types/aiCompat.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L593)

---

### activeTools?

> `optional` **activeTools?**: keyof `TOOLS`[]

Defined in: [types/aiCompat.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L594)

---

### system?

> `optional` **system?**: `string`

Defined in: [types/aiCompat.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L595)

---

### messages?

> `optional` **messages?**: [`ModelMessage`](ModelMessage.md)[]

Defined in: [types/aiCompat.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L596)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/aiCompat.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L597)

---

### tools?

> `optional` **tools?**: `TOOLS`

Defined in: [types/aiCompat.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L598)
