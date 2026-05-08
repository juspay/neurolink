[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIProviderOptions

# Type Alias: OpenAIProviderOptions

> **OpenAIProviderOptions** = [`UniversalProviderOptions`](UniversalProviderOptions.md) & `object`

Defined in: [types/universalProviderOptions.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L45)

Provider-specific configuration extensions
Discriminated union pattern for type-safe provider configs

## Type Declaration

### providerType

> **providerType**: `"openai"`

### organization?

> `optional` **organization?**: `string`

### seed?

> `optional` **seed?**: `number`

### topP?

> `optional` **topP?**: `number`
