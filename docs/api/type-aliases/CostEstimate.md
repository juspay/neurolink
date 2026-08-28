[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1799)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1801)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1803)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1805)

Cost breakdown

#### instanceCost

> **instanceCost**: `number`

Instance hours cost

#### requestCost

> **requestCost**: `number`

Request-based cost

#### totalHours

> **totalHours**: `number`

Total processing hours

---

### period?

> `optional` **period?**: `object`

Defined in: [types/providers.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1814)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
