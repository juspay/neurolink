[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerConfig

# Type Alias: ScorerConfig

> **ScorerConfig** = `object`

Scorer configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Whether the scorer is enabled

---

### threshold?

> `optional` **threshold?**: `number`

Pass/fail threshold (0-1 normalized)

---

### weight?

> `optional` **weight?**: `number`

Weight for weighted aggregation

---

### options?

> `optional` **options?**: [`JsonObject`](JsonObject.md)

Custom scorer-specific configuration

---

### timeout?

> `optional` **timeout?**: `number`

Timeout for scorer execution (ms)

---

### retries?

> `optional` **retries?**: `number`

Number of retry attempts
