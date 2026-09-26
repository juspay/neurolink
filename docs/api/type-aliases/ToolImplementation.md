[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolImplementation

# Type Alias: ToolImplementation

> **ToolImplementation** = `object`

Tool Implementation type for MCP tool registry
Extracted from toolRegistry.ts for centralized type management

## Properties

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

#### Parameters

##### params

`unknown`

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<`unknown`\> \| `unknown`

---

### description?

> `optional` **description?**: `string`

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

---

### category?

> `optional` **category?**: `string`

---

### permissions?

> `optional` **permissions?**: `string`[]

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Ceiling on the WHOLE execution — every attempt plus the delays between
them — in milliseconds. `timeoutMs` bounds one attempt; without this, a
tool that reliably hangs burns `timeoutMs * (maxRetries + 1)`.
Defaults to exactly that product, so behaviour is unchanged unless set.
