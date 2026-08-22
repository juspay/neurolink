[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingRule

# Type Alias: SamplingRule

> **SamplingRule** = `object`

Defined in: [types/exporter.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L250)

Sampling rule definition

## Properties

### name

> **name**: `string`

Defined in: [types/exporter.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L252)

Rule name for identification

---

### conditions

> **conditions**: `Record`\<`string`, `unknown`\>

Defined in: [types/exporter.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L254)

Conditions that must match (AND logic)

---

### sample

> **sample**: `boolean`

Defined in: [types/exporter.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L256)

Whether to sample if conditions match

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/exporter.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L258)

Optional priority (higher = evaluated first)
