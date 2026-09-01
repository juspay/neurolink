[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManagerConfig

# Type Alias: MultiServerManagerConfig

> **MultiServerManagerConfig** = `object`

Defined in: [types/mcp.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1893)

Multi-server manager configuration

## Properties

### defaultStrategy?

> `optional` **defaultStrategy?**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1897)

Default load balancing strategy

---

### healthAwareRouting?

> `optional` **healthAwareRouting?**: `boolean`

Defined in: [types/mcp.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1902)

Enable health-aware routing by default

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1907)

Health check interval in milliseconds

---

### maxFailoverRetries?

> `optional` **maxFailoverRetries?**: `number`

Defined in: [types/mcp.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1912)

Maximum retries on failover

---

### namespaceSeparator?

> `optional` **namespaceSeparator?**: `string`

Defined in: [types/mcp.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1917)

Tool namespace separator

---

### autoNamespace?

> `optional` **autoNamespace?**: `boolean`

Defined in: [types/mcp.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1922)

Enable automatic tool namespace prefixing

---

### conflictResolution?

> `optional` **conflictResolution?**: `"first-wins"` \| `"last-wins"` \| `"namespace"` \| `"explicit"`

Defined in: [types/mcp.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1929)

Conflict resolution strategy.
Reserved for future conflict resolution strategy — currently stored but not
consumed by any routing or tool-merge logic.
