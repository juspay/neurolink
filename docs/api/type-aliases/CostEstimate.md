[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1839](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1839)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1841)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1843)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1845](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1845)

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

Defined in: [types/providers.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1854)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
