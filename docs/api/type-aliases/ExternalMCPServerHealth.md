[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerHealth

# Type Alias: ExternalMCPServerHealth

> **ExternalMCPServerHealth** = `object`

Defined in: [types/externalMcp.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L185)

External MCP server health status

## Properties

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L187)

Server ID

---

### isHealthy

> **isHealthy**: `boolean`

Defined in: [types/externalMcp.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L190)

Whether the server is healthy

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L193)

Current status

---

### checkedAt

> **checkedAt**: `Date`

Defined in: [types/externalMcp.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L196)

When the health check was performed

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/externalMcp.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L199)

Response time for health check

---

### toolCount

> **toolCount**: `number`

Defined in: [types/externalMcp.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L202)

Number of available tools

---

### issues

> **issues**: `string`[]

Defined in: [types/externalMcp.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L205)

Any health issues detected

---

### performance

> **performance**: `object`

Defined in: [types/externalMcp.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L208)

Performance metrics

#### uptime

> **uptime**: `number`

#### memoryUsage?

> `optional` **memoryUsage?**: `number`

#### cpuUsage?

> `optional` **cpuUsage?**: `number`

#### averageResponseTime

> **averageResponseTime**: `number`
