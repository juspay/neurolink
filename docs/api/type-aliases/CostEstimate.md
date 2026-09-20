[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1870)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1872)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1874)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1876)

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

Defined in: [types/providers.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1885)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
