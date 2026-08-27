[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderConstructor

# Type Alias: ProviderConstructor

> **ProviderConstructor** = ((`modelName?`, `providerName?`, `sdk?`, `region?`, `credentials?`) => [`AIProvider`](AIProvider.md)) \| ((`modelName?`, `providerName?`, `sdk?`, `region?`, `credentials?`) => `Promise`\<[`AIProvider`](AIProvider.md)\>)

Defined in: [types/providers.ts:2121](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2121)

Provider constructor interface - supports both sync constructors and async
factory functions.
