[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStructuredOutput

# Type Alias: SageMakerStructuredOutput

> **SageMakerStructuredOutput** = `object`

Structured output streaming information (Phase 2.3)

## Properties

### partialObject?

> `optional` **partialObject?**: `Record`\<`string`, `unknown`\>

Partial JSON object being built

---

### jsonDelta?

> `optional` **jsonDelta?**: `string`

JSON delta text

---

### currentPath?

> `optional` **currentPath?**: `string`

Current parsing path (e.g., "user.name")

---

### validationErrors?

> `optional` **validationErrors?**: `string`[]

Schema validation errors

---

### complete?

> `optional` **complete?**: `boolean`

Indicates if JSON is complete and valid

---

### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

JSON schema being validated against
