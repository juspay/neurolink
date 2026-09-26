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

### isErrorResult?

> `optional` **isErrorResult?**: `boolean`

Defined in: [types/externalMcp.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L322)

True when the call completed at the transport level but the MCP result
itself is `{ isError: true }`. `success` stays true for such results so
the resolved MCP error payload still reaches the caller unchanged; this
flag is what lets stats and telemetry count the call as a failure.

---

### duration

> **duration**: `number`

Defined in: [types/externalMcp.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L325)

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L328)

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
