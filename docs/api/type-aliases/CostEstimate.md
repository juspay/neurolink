[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1875)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1877)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1879)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1881)

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

Defined in: [types/providers.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1890)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
