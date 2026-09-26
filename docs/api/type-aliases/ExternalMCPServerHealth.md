[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerHealth

# Type Alias: ExternalMCPServerHealth

> **ExternalMCPServerHealth** = `object`

External MCP server health status

## Properties

### serverId

> **serverId**: `string`

Server ID

---

### isHealthy

> **isHealthy**: `boolean`

Whether the server is healthy

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Current status

---

### checkedAt

> **checkedAt**: `Date`

When the health check was performed

---

### responseTime?

> `optional` **responseTime?**: `number`

Response time for health check

---

### toolCount

> **toolCount**: `number`

Number of available tools

---

### issues

> **issues**: `string`[]

Any health issues detected

---

### performance

> **performance**: `object`

Performance metrics

#### uptime

> **uptime**: `number`

#### memoryUsage?

> `optional` **memoryUsage?**: `number`

#### cpuUsage?

> `optional` **cpuUsage?**: `number`

#### averageResponseTime

> **averageResponseTime**: `number`
