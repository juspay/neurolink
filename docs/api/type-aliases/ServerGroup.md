[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerGroup

# Type Alias: ServerGroup

> **ServerGroup** = `object`

Server group definition

## Properties

### id

> **id**: `string`

Group identifier

---

### name

> **name**: `string`

Human-readable name

---

### description?

> `optional` **description?**: `string`

Description of the group

---

### servers

> **servers**: `string`[]

Server IDs in this group

---

### strategy

> **strategy**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Load balancing strategy for this group

---

### weights?

> `optional` **weights?**: [`ServerWeight`](ServerWeight.md)[]

Weights for weighted strategy

---

### healthAware?

> `optional` **healthAware?**: `boolean`

Whether to enable health-aware routing

---

### minHealthyServers?

> `optional` **minHealthyServers?**: `number`

Minimum healthy servers before alerting
