[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Defined in: [types/providers.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1796)

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

Estimated cost in USD

---

### currency

> **currency**: `string`

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

Currency code

---

### breakdown

> **breakdown**: `object`

Defined in: [types/providers.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1802)

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

Defined in: [types/providers.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1811)

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
