[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolContext

# Type Alias: ExternalMCPToolContext

> **ExternalMCPToolContext** = `object`

Defined in: [types/externalMcp.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L283)

External MCP tool execution context

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/externalMcp.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L285)

Execution session ID

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/externalMcp.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L288)

User ID if available

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L291)

Server ID executing the tool

---

### toolName

> **toolName**: `string`

Defined in: [types/externalMcp.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L294)

Tool name being executed

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/externalMcp.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L297)

Execution timeout in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L300)

Additional context data
