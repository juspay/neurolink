[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateCost

# Function: calculateCost()

> **calculateCost**(`provider`, `model`, `usage`): `number`

Defined in: [utils/pricing.ts:875](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/pricing.ts#L875)

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
