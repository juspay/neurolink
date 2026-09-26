[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterConfig

# Type Alias: ToolRouterConfig

> **ToolRouterConfig** = `object`

Tool Router configuration

## Properties

### strategy

> **strategy**: [`RoutingStrategy`](RoutingStrategy.md)

Primary routing strategy

---

### enableAffinity?

> `optional` **enableAffinity?**: `boolean`

Enable session/user affinity for consistent routing

---

### categoryMapping?

> `optional` **categoryMapping?**: `Record`\<`string`, `string`[]\>

Category to server mapping for capability-based routing

---

### serverWeights?

> `optional` **serverWeights?**: [`McpServerWeight`](McpServerWeight.md)[]

Server weights for priority-based routing

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: [`RoutingStrategy`](RoutingStrategy.md)

Fallback strategy if primary fails

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Maximum retries for failed routes

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Health check interval in milliseconds

---

### affinityTtl?

> `optional` **affinityTtl?**: `number`

Affinity TTL in milliseconds (default: 30 minutes)
