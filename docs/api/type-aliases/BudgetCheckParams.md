[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckParams

# Type Alias: BudgetCheckParams

> **BudgetCheckParams** = `object`

Defined in: [types/context.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L684)

Parameters for budget checking.

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L685)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L686)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L687)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/context.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L688)

---

### conversationMessages?

> `optional` **conversationMessages?**: `object`[]

Defined in: [types/context.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L689)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### currentPrompt?

> `optional` **currentPrompt?**: `string`

Defined in: [types/context.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L690)

---

### toolDefinitions?

> `optional` **toolDefinitions?**: `unknown`[]

Defined in: [types/context.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L691)

---

### fileAttachments?

> `optional` **fileAttachments?**: `object`[]

Defined in: [types/context.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L692)

#### content

> **content**: `string`

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/context.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L694)

Compaction trigger threshold (0.0-1.0). Default: 0.80
