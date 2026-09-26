[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerRule

# Type Alias: ScorerRule

> **ScorerRule** = `object`

Individual rule for rule-based scorers

## Properties

### id

> **id**: `string`

Rule identifier

---

### description

> **description**: `string`

Rule description

---

### type

> **type**: `"regex"` \| `"keyword"` \| `"length"` \| `"custom"`

Rule type

---

### params

> **params**: [`JsonObject`](JsonObject.md)

Rule parameters

---

### weight?

> `optional` **weight?**: `number`

Weight for this rule
