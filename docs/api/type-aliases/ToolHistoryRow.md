[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolHistoryRow

# Type Alias: ToolHistoryRow

> **ToolHistoryRow** = `object`

The fields the tool-step replay reads off a stored history row. Structural
rather than `ChatMessage` because the multimodal builder's history is typed
as `{ role: string; content: string }` while carrying the same rows.

## Properties

### id?

> `optional` **id?**: `string`

Row id; a `repair-*` prefix marks a placeholder `repairToolPairs` invented.

---

### role

> **role**: `string`

---

### content?

> `optional` **content?**: `unknown`

---

### tool?

> `optional` **tool?**: `string`

---

### toolCallId?

> `optional` **toolCallId?**: `string`

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

---

### result?

> `optional` **result?**: `object`

#### success?

> `optional` **success?**: `boolean`

#### error?

> `optional` **error?**: `string`

---

### metadata?

> `optional` **metadata?**: `object`

#### stepIndex?

> `optional` **stepIndex?**: `number`

#### isSummary?

> `optional` **isSummary?**: `boolean`

#### isSkill?

> `optional` **isSkill?**: `boolean`
