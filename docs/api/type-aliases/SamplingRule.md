[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingRule

# Type Alias: SamplingRule

> **SamplingRule** = `object`

Sampling rule definition

## Properties

### name

> **name**: `string`

Rule name for identification

---

### conditions

> **conditions**: `Record`\<`string`, `unknown`\>

Conditions that must match (AND logic)

---

### sample

> **sample**: `boolean`

Whether to sample if conditions match

---

### priority?

> `optional` **priority?**: `number`

Optional priority (higher = evaluated first)
