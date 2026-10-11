[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseContext

# Type Alias: LangfuseContext

> **LangfuseContext** = `object`

## Properties

### userId?

> `optional` **userId?**: `string` \| `null`

---

### sessionId?

> `optional` **sessionId?**: `string` \| `null`

---

### conversationId?

> `optional` **conversationId?**: `string` \| `null`

Conversation/thread identifier for grouping related traces

---

### requestId?

> `optional` **requestId?**: `string` \| `null`

Request identifier for correlating with application logs

---

### traceName?

> `optional` **traceName?**: `string` \| `null`

Custom trace name for better organization in Langfuse UI

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\> \| `null`

Custom metadata to attach to spans

---

### tags?

> `optional` **tags?**: `string`[] \| `null`

Langfuse trace tags, set on the trace's root span (e.g. to label what a trace is for)

---

### operationName?

> `optional` **operationName?**: `string` \| `null`

Explicit operation name (e.g., "ai.streamText", "chat", "embeddings").
If set, overrides auto-detection from the span name.

---

### autoDetectOperationName?

> `optional` **autoDetectOperationName?**: `boolean`

Override global autoDetectOperationName setting for this context.
When undefined, uses the global setting (defaults to true).

---

### customAttributes?

> `optional` **customAttributes?**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Custom attributes to set on all spans within this context.
These attributes are propagated to every span created within the
AsyncLocalStorage context.
