[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckParams

# Type Alias: BudgetCheckParams

> **BudgetCheckParams** = `object`

Defined in: [types/context.ts:661](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L661)

Parameters for budget checking.

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:662](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L662)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:663](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L663)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:664](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L664)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/context.ts:665](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L665)

---

### conversationMessages?

> `optional` **conversationMessages?**: `object`[]

Defined in: [types/context.ts:666](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L666)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### currentPrompt?

> `optional` **currentPrompt?**: `string`

Defined in: [types/context.ts:667](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L667)

---

### toolDefinitions?

> `optional` **toolDefinitions?**: `unknown`[]

Defined in: [types/context.ts:668](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L668)

---

### fileAttachments?

> `optional` **fileAttachments?**: `object`[]

Defined in: [types/context.ts:669](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L669)

#### content

> **content**: `string`

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/context.ts:671](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L671)

Compaction trigger threshold (0.0-1.0). Default: 0.80
