[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerHealth

# Type Alias: ExternalMCPServerHealth

> **ExternalMCPServerHealth** = `object`

Defined in: [types/externalMcp.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L189)

External MCP server health status

## Properties

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L191)

Server ID

---

### isHealthy

> **isHealthy**: `boolean`

Defined in: [types/externalMcp.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L194)

Whether the server is healthy

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L197)

Current status

---

### checkedAt

> **checkedAt**: `Date`

Defined in: [types/externalMcp.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L200)

When the health check was performed

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/externalMcp.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L203)

Response time for health check

---

### toolCount

> **toolCount**: `number`

Defined in: [types/externalMcp.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L206)

Number of available tools

---

### issues

> **issues**: `string`[]

Defined in: [types/externalMcp.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L209)

Any health issues detected

---

### performance

> **performance**: `object`

Defined in: [types/externalMcp.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L212)

Performance metrics

#### uptime

> **uptime**: `number`

#### memoryUsage?

> `optional` **memoryUsage?**: `number`

#### cpuUsage?

> `optional` **cpuUsage?**: `number`

#### averageResponseTime

> **averageResponseTime**: `number`
