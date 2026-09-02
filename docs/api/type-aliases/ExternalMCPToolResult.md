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

### isErrorResult?

> `optional` **isErrorResult?**: `boolean`

Defined in: [types/externalMcp.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L302)

True when the call completed at the transport level but the MCP result
itself is `{ isError: true }`. `success` stays true for such results so
the resolved MCP error payload still reaches the caller unchanged; this
flag is what lets stats and telemetry count the call as a failure.

---

### duration

> **duration**: `number`

Defined in: [types/externalMcp.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L305)

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L308)

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
