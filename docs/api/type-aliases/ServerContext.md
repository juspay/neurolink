[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerContext

# Type Alias: ServerContext

> **ServerContext** = `object`

Server request context
Passed to all route handlers and middleware

## Properties

### requestId

> **requestId**: `string`

Unique request ID

---

### method

> **method**: `string`

HTTP method

---

### path

> **path**: `string`

Request path

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Request headers

---

### query

> **query**: `Record`\<`string`, `string`\>

Query parameters

---

### params

> **params**: `Record`\<`string`, `string`\>

Path parameters

---

### body?

> `optional` **body?**: `unknown`

Request body (parsed)

---

### neurolink

> **neurolink**: [`NeuroLink`](../classes/NeuroLink.md)

NeuroLink SDK instance

---

### toolRegistry

> **toolRegistry**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

Tool registry instance

---

### externalServerManager?

> `optional` **externalServerManager?**: [`ExternalServerManager`](../classes/ExternalServerManager.md)

External server manager (optional)

---

### timestamp

> **timestamp**: `number`

Request timestamp

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Additional metadata

---

### user?

> `optional` **user?**: [`AuthenticatedUser`](AuthenticatedUser.md)

User information (if authenticated)

---

### session?

> `optional` **session?**: `object`

Session information

#### id

> **id**: `string`

#### data?

> `optional` **data?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Abort signal for cancellation (set by abort signal middleware)

---

### abortController?

> `optional` **abortController?**: `AbortController`

Abort controller for manual cancellation (set by abort signal middleware)

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Raw framework response object (for framework-specific operations)

---

### rawRequest?

> `optional` **rawRequest?**: `unknown`

Raw framework request object (for framework-specific operations)

---

### responseHeaders?

> `optional` **responseHeaders?**: `Record`\<`string`, `string`\>

Response headers to be set (used by middleware to add headers)

---

### redaction?

> `optional` **redaction?**: [`RedactionConfig`](RedactionConfig.md)

Redaction configuration (for stream redaction support)
