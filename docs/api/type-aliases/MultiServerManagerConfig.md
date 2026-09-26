[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManagerConfig

# Type Alias: MultiServerManagerConfig

> **MultiServerManagerConfig** = `object`

Multi-server manager configuration

## Properties

### defaultStrategy?

> `optional` **defaultStrategy?**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Default load balancing strategy

---

### healthAwareRouting?

> `optional` **healthAwareRouting?**: `boolean`

Enable health-aware routing by default

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Health check interval in milliseconds

---

### maxFailoverRetries?

> `optional` **maxFailoverRetries?**: `number`

Maximum retries on failover

---

### namespaceSeparator?

> `optional` **namespaceSeparator?**: `string`

Tool namespace separator

---

### autoNamespace?

> `optional` **autoNamespace?**: `boolean`

Enable automatic tool namespace prefixing

---

### conflictResolution?

> `optional` **conflictResolution?**: `"first-wins"` \| `"last-wins"` \| `"namespace"` \| `"explicit"`

Conflict resolution strategy.
Reserved for future conflict resolution strategy — currently stored but not
consumed by any routing or tool-merge logic.
