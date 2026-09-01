[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManagerConfig

# Type Alias: MultiServerManagerConfig

> **MultiServerManagerConfig** = `object`

Defined in: [types/mcp.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1874)

Multi-server manager configuration

## Properties

### defaultStrategy?

> `optional` **defaultStrategy?**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1878)

Default load balancing strategy

---

### healthAwareRouting?

> `optional` **healthAwareRouting?**: `boolean`

Defined in: [types/mcp.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1883)

Enable health-aware routing by default

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1888)

Health check interval in milliseconds

---

### maxFailoverRetries?

> `optional` **maxFailoverRetries?**: `number`

Defined in: [types/mcp.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1893)

Maximum retries on failover

---

### namespaceSeparator?

> `optional` **namespaceSeparator?**: `string`

Defined in: [types/mcp.ts:1898](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1898)

Tool namespace separator

---

### autoNamespace?

> `optional` **autoNamespace?**: `boolean`

Defined in: [types/mcp.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1903)

Enable automatic tool namespace prefixing

---

### conflictResolution?

> `optional` **conflictResolution?**: `"first-wins"` \| `"last-wins"` \| `"namespace"` \| `"explicit"`

Defined in: [types/mcp.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1910)

Conflict resolution strategy.
Reserved for future conflict resolution strategy — currently stored but not
consumed by any routing or tool-merge logic.
