[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterConfig

# Type Alias: ToolRouterConfig

> **ToolRouterConfig** = `object`

Defined in: [types/mcp.ts:2451](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2451)

Tool Router configuration

## Properties

### strategy

> **strategy**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2455](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2455)

Primary routing strategy

---

### enableAffinity?

> `optional` **enableAffinity?**: `boolean`

Defined in: [types/mcp.ts:2460](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2460)

Enable session/user affinity for consistent routing

---

### categoryMapping?

> `optional` **categoryMapping?**: `Record`\<`string`, `string`[]\>

Defined in: [types/mcp.ts:2465](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2465)

Category to server mapping for capability-based routing

---

### serverWeights?

> `optional` **serverWeights?**: [`McpServerWeight`](McpServerWeight.md)[]

Defined in: [types/mcp.ts:2470](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2470)

Server weights for priority-based routing

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: [`RoutingStrategy`](RoutingStrategy.md)

Defined in: [types/mcp.ts:2475](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2475)

Fallback strategy if primary fails

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/mcp.ts:2480](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2480)

Maximum retries for failed routes

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:2485](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2485)

Health check interval in milliseconds

---

### affinityTtl?

> `optional` **affinityTtl?**: `number`

Defined in: [types/mcp.ts:2490](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2490)

Affinity TTL in milliseconds (default: 30 minutes)
