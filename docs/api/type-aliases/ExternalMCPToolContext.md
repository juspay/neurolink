[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolContext

# Type Alias: ExternalMCPToolContext

> **ExternalMCPToolContext** = `object`

Defined in: [types/externalMcp.ts:257](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L257)

External MCP tool execution context

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/externalMcp.ts:259](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L259)

Execution session ID

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/externalMcp.ts:262](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L262)

User ID if available

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:265](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L265)

Server ID executing the tool

---

### toolName

> **toolName**: `string`

Defined in: [types/externalMcp.ts:268](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L268)

Tool name being executed

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/externalMcp.ts:271](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L271)

Execution timeout in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:274](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L274)

Additional context data
