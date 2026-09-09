[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepResult

# Type Alias: StepResult\<TOOLS\>

> **StepResult**\<`TOOLS`\> = `object`

Defined in: [types/aiCompat.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L540)

## Type Parameters

### TOOLS

`TOOLS` _extends_ [`ToolSet`](ToolSet.md) = [`ToolSet`](ToolSet.md)

## Properties

### stepNumber?

> `readonly` `optional` **stepNumber?**: `number`

Defined in: [types/aiCompat.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L541)

---

### content

> `readonly` **content**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:542](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L542)

---

### text

> `readonly` **text**: `string`

Defined in: [types/aiCompat.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L543)

---

### reasoning?

> `readonly` `optional` **reasoning?**: `unknown`

Defined in: [types/aiCompat.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L544)

---

### reasoningText?

> `readonly` `optional` **reasoningText?**: `string`

Defined in: [types/aiCompat.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L545)

---

### files?

> `readonly` `optional` **files?**: `unknown`[]

Defined in: [types/aiCompat.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L546)

---

### sources?

> `readonly` `optional` **sources?**: `unknown`[]

Defined in: [types/aiCompat.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L547)

---

### toolCalls

> `readonly` **toolCalls**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L548)

---

### toolResults

> `readonly` **toolResults**: `object` & `Record`\<`string`, `unknown`\>[]

Defined in: [types/aiCompat.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L554)

---

### stepType?

> `readonly` `optional` **stepType?**: `string`

Defined in: [types/aiCompat.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L560)

---

### finishReason

> `readonly` **finishReason**: [`FinishReason`](FinishReason.md)

Defined in: [types/aiCompat.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L561)

---

### rawFinishReason?

> `readonly` `optional` **rawFinishReason?**: `string`

Defined in: [types/aiCompat.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L562)

---

### usage

> `readonly` **usage**: [`LanguageModelUsage`](LanguageModelUsage.md)

Defined in: [types/aiCompat.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L563)

---

### warnings?

> `readonly` `optional` **warnings?**: `unknown`[]

Defined in: [types/aiCompat.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L564)

---

### request?

> `readonly` `optional` **request?**: [`LanguageModelRequestMetadata`](LanguageModelRequestMetadata.md)

Defined in: [types/aiCompat.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L565)

---

### response?

> `readonly` `optional` **response?**: [`LanguageModelResponseMetadata`](LanguageModelResponseMetadata.md) & `object`

Defined in: [types/aiCompat.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L566)

#### Type Declaration

##### messages

> **messages**: [`ModelMessage`](ModelMessage.md)[]

##### body?

> `optional` **body?**: `unknown`

---

### providerMetadata?

> `readonly` `optional` **providerMetadata?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/aiCompat.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L570)

---

### tools?

> `readonly` `optional` **tools?**: `TOOLS`

Defined in: [types/aiCompat.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L571)
