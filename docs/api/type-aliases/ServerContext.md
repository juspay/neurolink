[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerContext

# Type Alias: ServerContext

> **ServerContext** = `object`

Defined in: [types/server.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L256)

Server request context
Passed to all route handlers and middleware

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/server.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L258)

Unique request ID

---

### method

> **method**: `string`

Defined in: [types/server.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L261)

HTTP method

---

### path

> **path**: `string`

Defined in: [types/server.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L264)

Request path

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/server.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L267)

Request headers

---

### query

> **query**: `Record`\<`string`, `string`\>

Defined in: [types/server.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L270)

Query parameters

---

### params

> **params**: `Record`\<`string`, `string`\>

Defined in: [types/server.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L273)

Path parameters

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/server.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L276)

Request body (parsed)

---

### neurolink

> **neurolink**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/server.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L279)

NeuroLink SDK instance

---

### toolRegistry

> **toolRegistry**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

Defined in: [types/server.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L282)

Tool registry instance

---

### externalServerManager?

> `optional` **externalServerManager?**: [`ExternalServerManager`](../classes/ExternalServerManager.md)

Defined in: [types/server.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L285)

External server manager (optional)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/server.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L288)

Request timestamp

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/server.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L291)

Additional metadata

---

### user?

> `optional` **user?**: [`AuthenticatedUser`](AuthenticatedUser.md)

Defined in: [types/server.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L294)

User information (if authenticated)

---

### session?

> `optional` **session?**: `object`

Defined in: [types/server.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L297)

Session information

#### id

> **id**: `string`

#### data?

> `optional` **data?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/server.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L303)

Abort signal for cancellation (set by abort signal middleware)

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/server.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L306)

Abort controller for manual cancellation (set by abort signal middleware)

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Defined in: [types/server.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L309)

Raw framework response object (for framework-specific operations)

---

### rawRequest?

> `optional` **rawRequest?**: `unknown`

Defined in: [types/server.ts:312](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L312)

Raw framework request object (for framework-specific operations)

---

### responseHeaders?

> `optional` **responseHeaders?**: `Record`\<`string`, `string`\>

Defined in: [types/server.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L315)

Response headers to be set (used by middleware to add headers)

---

### redaction?

> `optional` **redaction?**: [`RedactionConfig`](RedactionConfig.md)

Defined in: [types/server.ts:318](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L318)

Redaction configuration (for stream redaction support)
