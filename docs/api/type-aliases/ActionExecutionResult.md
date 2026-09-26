[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ActionExecutionResult

# Type Alias: ActionExecutionResult

> **ActionExecutionResult** = `object`

CLI execution result (normalized)

## Properties

### success

> **success**: `boolean`

---

### response

> **response**: `string`

---

### responseJson?

> `optional` **responseJson?**: `Record`\<`string`, `unknown`\>

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### usage?

> `optional` **usage?**: [`ActionTokenUsage`](ActionTokenUsage.md)

---

### cost?

> `optional` **cost?**: `number`

---

### executionTime?

> `optional` **executionTime?**: `number`

---

### evaluation?

> `optional` **evaluation?**: [`ActionEvaluation`](ActionEvaluation.md)

---

### error?

> `optional` **error?**: `string`
