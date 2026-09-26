[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CostEstimate

# Type Alias: CostEstimate

> **CostEstimate** = `object`

Cost estimation data

## Properties

### estimatedCost

> **estimatedCost**: `number`

Estimated cost in USD

---

### currency

> **currency**: `string`

Currency code

---

### breakdown

> **breakdown**: `object`

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

Time period for estimate

#### start

> **start**: `string`

#### end

> **end**: `string`
