[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolResult

# Type Alias: ExternalMCPToolResult

> **ExternalMCPToolResult** = `object`

Defined in: [types/externalMcp.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L306)

External MCP tool execution result

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L308)

Whether the execution was successful

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/externalMcp.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L311)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L314)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/externalMcp.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L317)

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L320)

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
