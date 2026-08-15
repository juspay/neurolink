[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatusResponse

# Type Alias: MCPServerStatusResponse

> **MCPServerStatusResponse** = `object`

Defined in: [types/server.ts:733](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L733)

MCP server status response

## Properties

### serverId

> **serverId**: `string`

Defined in: [types/server.ts:735](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L735)

Server ID

---

### name

> **name**: `string`

Defined in: [types/server.ts:738](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L738)

Server name

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/server.ts:741](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L741)

Connection status

---

### toolCount

> **toolCount**: `number`

Defined in: [types/server.ts:744](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L744)

Available tools count

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `string`

Defined in: [types/server.ts:747](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L747)

Last health check time

---

### error?

> `optional` **error?**: `string`

Defined in: [types/server.ts:750](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L750)

Error message if failed
