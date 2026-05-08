[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateCost

# Function: calculateCost()

> **calculateCost**(`provider`, `model`, `usage`): `number`

Defined in: [utils/pricing.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/pricing.ts#L433)

Calculate the dollar cost of a generate/stream call based on token usage.
Returns 0 if the provider/model combination is not in the pricing table.

## Parameters

### provider

`string`

### model

`string`

### usage

[`TokenUsage`](../type-aliases/TokenUsage.md)

## Returns

`number`
