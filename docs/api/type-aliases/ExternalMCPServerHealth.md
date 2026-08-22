[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerHealth

# Type Alias: ExternalMCPServerHealth

> **ExternalMCPServerHealth** = `object`

Defined in: [types/externalMcp.ts:179](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L179)

External MCP server health status

## Properties

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:181](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L181)

Server ID

---

### isHealthy

> **isHealthy**: `boolean`

Defined in: [types/externalMcp.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L184)

Whether the server is healthy

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:187](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L187)

Current status

---

### checkedAt

> **checkedAt**: `Date`

Defined in: [types/externalMcp.ts:190](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L190)

When the health check was performed

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/externalMcp.ts:193](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L193)

Response time for health check

---

### toolCount

> **toolCount**: `number`

Defined in: [types/externalMcp.ts:196](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L196)

Number of available tools

---

### issues

> **issues**: `string`[]

Defined in: [types/externalMcp.ts:199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L199)

Any health issues detected

---

### performance

> **performance**: `object`

Defined in: [types/externalMcp.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/externalMcp.ts#L202)

Performance metrics

#### uptime

> **uptime**: `number`

#### memoryUsage?

> `optional` **memoryUsage?**: `number`

#### cpuUsage?

> `optional` **cpuUsage?**: `number`

#### averageResponseTime

> **averageResponseTime**: `number`
