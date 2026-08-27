[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateCost

# Function: calculateCost()

> **calculateCost**(`provider`, `model`, `usage`): `number`

Defined in: [utils/pricing.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/utils/pricing.ts#L964)

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
