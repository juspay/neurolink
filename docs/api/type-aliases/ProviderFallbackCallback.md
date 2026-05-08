[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFallbackCallback

# Type Alias: ProviderFallbackCallback

> **ProviderFallbackCallback** = (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/config.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L48)

Curator P2-3: callback signature for centralized fallback policy. Invoked
when a generate/stream call fails with what looks like a model-access-denied
error. Return `{ provider, model }` (either / both optional) to drive a
retry; return `null` to bubble the original error untouched.

## Parameters

### error

`unknown`

## Returns

`Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>
