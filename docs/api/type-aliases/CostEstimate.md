[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1817)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1819)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1823)

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

Defined in: [types/providers.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1832)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
