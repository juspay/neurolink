[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckParams

# Type Alias: BudgetCheckParams

> **BudgetCheckParams** = `object`

Defined in: [types/context.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L663)

Parameters for budget checking.

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L664)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L665)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L666)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/context.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L667)

---

### conversationMessages?

> `optional` **conversationMessages?**: `object`[]

Defined in: [types/context.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L668)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### currentPrompt?

> `optional` **currentPrompt?**: `string`

Defined in: [types/context.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L669)

---

### toolDefinitions?

> `optional` **toolDefinitions?**: `unknown`[]

Defined in: [types/context.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L670)

---

### fileAttachments?

> `optional` **fileAttachments?**: `object`[]

Defined in: [types/context.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L671)

#### content

> **content**: `string`

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/context.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L673)

Compaction trigger threshold (0.0-1.0). Default: 0.80
