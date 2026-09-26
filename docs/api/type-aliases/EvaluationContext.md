[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationContext

# Type Alias: EvaluationContext

> **EvaluationContext** = `object`

Enhanced evaluation context for comprehensive response assessment

## Properties

### userQuery

> **userQuery**: `string`

---

### aiResponse

> **aiResponse**: `string`

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

---

### primaryDomain?

> `optional` **primaryDomain?**: `string`

---

### assistantRole?

> `optional` **assistantRole?**: `string`

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

#### role

> **role**: `"user"` \| `"assistant"`

#### content

> **content**: `string`

#### timestamp?

> `optional` **timestamp?**: `string`

---

### toolUsage?

> `optional` **toolUsage?**: `object`[]

#### toolName

> **toolName**: `string`

#### input

> **input**: `unknown`

#### output

> **output**: `unknown`

#### executionTime

> **executionTime**: `number`

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]
