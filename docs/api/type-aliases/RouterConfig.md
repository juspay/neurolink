[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouterConfig

# Type Alias: RouterConfig

> **RouterConfig** = `object`

Router configuration

## Properties

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Provider for the routing agent

---

### model?

> `optional` **model?**: `string`

Model for the routing agent

---

### instructions?

> `optional` **instructions?**: `string`

Custom routing instructions

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Maximum routing attempts before fallback

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Confidence threshold for routing (0-1)
