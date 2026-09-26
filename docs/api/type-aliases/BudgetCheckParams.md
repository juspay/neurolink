[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BudgetCheckParams

# Type Alias: BudgetCheckParams

> **BudgetCheckParams** = `object`

Parameters for budget checking.

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### conversationMessages?

> `optional` **conversationMessages?**: `object`[]

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### currentPrompt?

> `optional` **currentPrompt?**: `string`

---

### toolDefinitions?

> `optional` **toolDefinitions?**: `unknown`[]

---

### fileAttachments?

> `optional` **fileAttachments?**: `object`[]

#### content

> **content**: `string`

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Compaction trigger threshold (0.0-1.0). Default: 0.80
