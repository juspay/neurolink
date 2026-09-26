[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolResult

# Type Alias: ExternalMCPToolResult

> **ExternalMCPToolResult** = `object`

External MCP tool execution result

## Properties

### success

> **success**: `boolean`

Whether the execution was successful

---

### data?

> `optional` **data?**: `unknown`

Result data if successful

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### isErrorResult?

> `optional` **isErrorResult?**: `boolean`

True when the call completed at the transport level but the MCP result
itself is `{ isError: true }`. `success` stays true for such results so
the resolved MCP error payload still reaches the caller unchanged; this
flag is what lets stats and telemetry count the call as a failure.

---

### duration

> **duration**: `number`

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
