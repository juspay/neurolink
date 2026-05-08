[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatusResponse

# Type Alias: MCPServerStatusResponse

> **MCPServerStatusResponse** = `object`

Defined in: [types/server.ts:733](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L733)

MCP server status response

## Properties

### serverId

> **serverId**: `string`

Defined in: [types/server.ts:735](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L735)

Server ID

---

### name

> **name**: `string`

Defined in: [types/server.ts:738](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L738)

Server name

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/server.ts:741](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L741)

Connection status

---

### toolCount

> **toolCount**: `number`

Defined in: [types/server.ts:744](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L744)

Available tools count

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `string`

Defined in: [types/server.ts:747](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L747)

Last health check time

---

### error?

> `optional` **error?**: `string`

Defined in: [types/server.ts:750](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L750)

Error message if failed
