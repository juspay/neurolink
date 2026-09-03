[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1827)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1829)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1831)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1833)

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

Defined in: [types/providers.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1842)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
