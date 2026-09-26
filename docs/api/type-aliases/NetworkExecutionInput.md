[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionInput

# Type Alias: NetworkExecutionInput

> **NetworkExecutionInput** = `object`

Input for network execution

## Properties

### message

> **message**: `string` \| [`CoreMessage`](CoreMessage.md)[]

The task or message to process

---

### threadId?

> `optional` **threadId?**: `string`

Thread ID for conversation context

---

### resourceId?

> `optional` **resourceId?**: `string`

User/resource identifier

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Additional context
