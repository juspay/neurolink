[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RunWorkflowOptions

# Type Alias: RunWorkflowOptions

> **RunWorkflowOptions** = `object`

Options for workflow execution

## Properties

### prompt

> **prompt**: `string`

The user's prompt/query to send to models

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Optional conversation history for context

#### role

> **role**: `"user"` \| `"assistant"`

#### content

> **content**: `string`

---

### timeout?

> `optional` **timeout?**: `number`

Override default timeout (ms) for this execution

---

### parallelism?

> `optional` **parallelism?**: `number`

Override default parallelism for this execution

---

### verbose?

> `optional` **verbose?**: `boolean`

Enable verbose logging for debugging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Optional context/metadata to pass through

---

### streaming?

> `optional` **streaming?**: `boolean`

Enable progressive streaming (yield preliminary response)
