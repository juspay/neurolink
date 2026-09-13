[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1812)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1814)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1816)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1818)

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

Defined in: [types/providers.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1827)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
