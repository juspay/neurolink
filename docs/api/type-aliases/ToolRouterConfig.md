[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterConfig

# Type Alias: ToolRouterConfig

> **ToolRouterConfig** = `object`

Defined in: [types/mcp.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2470)

Tool Router configuration

## Properties

### strategy

> **strategy**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2474)

Primary routing strategy

---

### enableAffinity?

> `optional` **enableAffinity?**: `boolean`

Defined in: [types/mcp.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2479)

Enable session/user affinity for consistent routing

---

### categoryMapping?

> `optional` **categoryMapping?**: `Record`\<`string`, `string`[]\>

Defined in: [types/mcp.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2484)

Category to server mapping for capability-based routing

---

### serverWeights?

> `optional` **serverWeights?**: [`McpServerWeight`](McpServerWeight.md)[]

Defined in: [types/mcp.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2489)

Server weights for priority-based routing

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2494](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2494)

Fallback strategy if primary fails

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/mcp.ts:2499](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2499)

Maximum retries for failed routes

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2504)

Health check interval in milliseconds

---

### affinityTtl?

> `optional` **affinityTtl?**: `number`

Defined in: [types/mcp.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2509)

Affinity TTL in milliseconds (default: 30 minutes)
