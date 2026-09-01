[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolResult

# Type Alias: ExternalMCPToolResult

> **ExternalMCPToolResult** = `object`

Defined in: [types/externalMcp.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L286)

External MCP tool execution result

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L288)

Whether the execution was successful

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/externalMcp.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L291)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L294)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/externalMcp.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L297)

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L300)

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
