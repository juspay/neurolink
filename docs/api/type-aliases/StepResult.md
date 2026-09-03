[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepResult

# Type Alias: StepResult\<TOOLS\>

> **StepResult**\<`TOOLS`\> = `object`

Defined in: [types/aiCompat.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L536)

## Type Parameters

### TOOLS

`TOOLS` _extends_ [`ToolSet`](ToolSet.md) = [`ToolSet`](ToolSet.md)

## Properties

### stepNumber?

> `readonly` `optional` **stepNumber?**: `number`

Defined in: [types/aiCompat.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L537)

---

### content

> `readonly` **content**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L538)

---

### text

> `readonly` **text**: `string`

Defined in: [types/aiCompat.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L539)

---

### reasoning?

> `readonly` `optional` **reasoning?**: `unknown`

Defined in: [types/aiCompat.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L540)

---

### reasoningText?

> `readonly` `optional` **reasoningText?**: `string`

Defined in: [types/aiCompat.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L541)

---

### files?

> `readonly` `optional` **files?**: `unknown`[]

Defined in: [types/aiCompat.ts:542](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L542)

---

### sources?

> `readonly` `optional` **sources?**: `unknown`[]

Defined in: [types/aiCompat.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L543)

---

### toolCalls

> `readonly` **toolCalls**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L544)

---

### toolResults

> `readonly` **toolResults**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L550)

---

### stepType?

> `readonly` `optional` **stepType?**: `string`

Defined in: [types/aiCompat.ts:556](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L556)

---

### finishReason

> `readonly` **finishReason**: [`FinishReason`](FinishReason.md)

Defined in: [types/aiCompat.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L557)

---

### rawFinishReason?

> `readonly` `optional` **rawFinishReason?**: `string`

Defined in: [types/aiCompat.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L558)

---

### usage

> `readonly` **usage**: [`LanguageModelUsage`](LanguageModelUsage.md)

Defined in: [types/aiCompat.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L559)

---

### warnings?

> `readonly` `optional` **warnings?**: `unknown`[]

Defined in: [types/aiCompat.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L560)

---

### request?

> `readonly` `optional` **request?**: [`LanguageModelRequestMetadata`](LanguageModelRequestMetadata.md)

Defined in: [types/aiCompat.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L561)

---

### response?

> `readonly` `optional` **response?**: [`LanguageModelResponseMetadata`](LanguageModelResponseMetadata.md) & `object`

Defined in: [types/aiCompat.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L562)

#### Type Declaration

##### messages

> **messages**: [`ModelMessage`](ModelMessage.md)[]

##### body?

> `optional` **body?**: `unknown`

---

### providerMetadata?

> `readonly` `optional` **providerMetadata?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/aiCompat.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L566)

---

### tools?

> `readonly` `optional` **tools?**: `TOOLS`

Defined in: [types/aiCompat.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L567)
