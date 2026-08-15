[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateCost

# Function: calculateCost()

> **calculateCost**(`provider`, `model`, `usage`): `number`

Defined in: [utils/pricing.ts:750](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/pricing.ts#L750)

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
