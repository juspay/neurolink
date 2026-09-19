[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1840)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1842)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1844)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1846)

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

Defined in: [types/providers.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1855)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
