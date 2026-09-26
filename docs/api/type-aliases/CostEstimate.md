[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1878)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1880](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1880)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1882)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1884)

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

Defined in: [types/providers.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1893)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
