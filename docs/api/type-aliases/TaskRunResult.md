[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskRunResult

# Type Alias: TaskRunResult

> **TaskRunResult** = `object`

## Properties

### taskId

> **taskId**: `string`

---

### runId

> **runId**: `string`

---

### status

> **status**: `"success"` \| `"error"`

---

### output?

> `optional` **output?**: `string`

AI response text

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

#### name

> **name**: `string`

#### input

> **input**: `unknown`

#### output

> **output**: `unknown`

---

### tokensUsed?

> `optional` **tokensUsed?**: `object`

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### durationMs

> **durationMs**: `number`

---

### timestamp

> **timestamp**: `string`

ISO 8601

---

### error?

> `optional` **error?**: `string`
