[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolResult

# Type Alias: ExternalMCPToolResult

> **ExternalMCPToolResult** = `object`

Defined in: [types/externalMcp.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L280)

External MCP tool execution result

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L282)

Whether the execution was successful

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/externalMcp.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L285)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L288)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/externalMcp.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L291)

Execution duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L294)

Tool execution metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### toolName

> **toolName**: `string`

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `number`
