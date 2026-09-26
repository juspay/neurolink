[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRoutingOptions

# Type Alias: ModelRoutingOptions

> **ModelRoutingOptions** = `object`

## Properties

### forceTaskType?

> `optional` **forceTaskType?**: [`TaskType`](TaskType.md)

Override the task classification

---

### requireFast?

> `optional` **requireFast?**: `boolean`

Require specific performance characteristics

---

### requireCapability?

> `optional` **requireCapability?**: `string`

Require specific capability (reasoning, creativity, etc.)

---

### fallbackStrategy?

> `optional` **fallbackStrategy?**: `"fast"` \| `"reasoning"` \| `"auto"`

Fallback strategy if primary choice fails
