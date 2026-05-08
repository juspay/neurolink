[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / hasPricing

# Function: hasPricing()

> **hasPricing**(`provider`, `model`): `boolean`

Defined in: [utils/pricing.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/pricing.ts#L466)

Check if pricing is available for a provider/model combination.
Checks the rate table directly instead of computing a cost,
so even very cheap models (e.g. gemini-1.5-flash) are detected correctly.

Zero-rate entries (the local-provider `_default` for lm-studio / llamacpp)
count as "no pricing" — those providers explicitly don't have an upstream
USD price, and any caller gated by `hasPricing()` should treat them as
non-billable rather than zero-cost-billable.

## Parameters

### provider

`string`

### model

`string`

## Returns

`boolean`
