[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManagerConfig

# Type Alias: MultiServerManagerConfig

> **MultiServerManagerConfig** = `object`

Defined in: [types/mcp.ts:1855](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1855)

Multi-server manager configuration

## Properties

### defaultStrategy?

> `optional` **defaultStrategy?**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1859](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1859)

Default load balancing strategy

---

### healthAwareRouting?

> `optional` **healthAwareRouting?**: `boolean`

Defined in: [types/mcp.ts:1864](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1864)

Enable health-aware routing by default

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:1869](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1869)

Health check interval in milliseconds

---

### maxFailoverRetries?

> `optional` **maxFailoverRetries?**: `number`

Defined in: [types/mcp.ts:1874](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1874)

Maximum retries on failover

---

### namespaceSeparator?

> `optional` **namespaceSeparator?**: `string`

Defined in: [types/mcp.ts:1879](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1879)

Tool namespace separator

---

### autoNamespace?

> `optional` **autoNamespace?**: `boolean`

Defined in: [types/mcp.ts:1884](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1884)

Enable automatic tool namespace prefixing

---

### conflictResolution?

> `optional` **conflictResolution?**: `"first-wins"` \| `"last-wins"` \| `"namespace"` \| `"explicit"`

Defined in: [types/mcp.ts:1891](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1891)

Conflict resolution strategy.
Reserved for future conflict resolution strategy — currently stored but not
consumed by any routing or tool-merge logic.
