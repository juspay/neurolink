[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1897)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1899)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1901)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1903)

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

Defined in: [types/providers.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1912)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
