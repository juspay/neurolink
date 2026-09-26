[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkMemoryConfig

# Type Alias: NetworkMemoryConfig

> **NetworkMemoryConfig** = `object`

Memory configuration for the network

## Properties

### shared?

> `optional` **shared?**: `boolean`

Enable shared memory across agents

---

### provider?

> `optional` **provider?**: `"in-memory"` \| `"redis"`

Memory provider

---

### ttl?

> `optional` **ttl?**: `number`

Memory TTL in seconds

---

### maxMessages?

> `optional` **maxMessages?**: `number`

Maximum messages to retain
