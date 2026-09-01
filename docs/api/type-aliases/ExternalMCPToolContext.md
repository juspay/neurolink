[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolContext

# Type Alias: ExternalMCPToolContext

> **ExternalMCPToolContext** = `object`

Defined in: [types/externalMcp.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L263)

External MCP tool execution context

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/externalMcp.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L265)

Execution session ID

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/externalMcp.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L268)

User ID if available

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L271)

Server ID executing the tool

---

### toolName

> **toolName**: `string`

Defined in: [types/externalMcp.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L274)

Tool name being executed

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/externalMcp.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L277)

Execution timeout in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L280)

Additional context data
