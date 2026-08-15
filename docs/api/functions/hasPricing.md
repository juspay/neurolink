[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / hasPricing

# Function: hasPricing()

> **hasPricing**(`provider`, `model`): `boolean`

Defined in: [utils/pricing.ts:791](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/pricing.ts#L791)

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
