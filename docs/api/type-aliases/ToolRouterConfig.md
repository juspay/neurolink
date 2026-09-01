[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterConfig

# Type Alias: ToolRouterConfig

> **ToolRouterConfig** = `object`

Defined in: [types/mcp.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2489)

Tool Router configuration

## Properties

### strategy

> **strategy**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2493)

Primary routing strategy

---

### enableAffinity?

> `optional` **enableAffinity?**: `boolean`

Defined in: [types/mcp.ts:2498](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2498)

Enable session/user affinity for consistent routing

---

### categoryMapping?

> `optional` **categoryMapping?**: `Record`\<`string`, `string`[]\>

Defined in: [types/mcp.ts:2503](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2503)

Category to server mapping for capability-based routing

---

### serverWeights?

> `optional` **serverWeights?**: [`McpServerWeight`](McpServerWeight.md)[]

Defined in: [types/mcp.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2508)

Server weights for priority-based routing

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2513](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2513)

Fallback strategy if primary fails

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/mcp.ts:2518](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2518)

Maximum retries for failed routes

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:2523](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2523)

Health check interval in milliseconds

---

### affinityTtl?

> `optional` **affinityTtl?**: `number`

Defined in: [types/mcp.ts:2528](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2528)

Affinity TTL in milliseconds (default: 30 minutes)
