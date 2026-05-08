[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderConstructor

# Type Alias: ProviderConstructor

> **ProviderConstructor** = ((`modelName?`, `providerName?`, `sdk?`, `region?`) => [`AIProvider`](AIProvider.md)) \| ((`modelName?`, `providerName?`, `sdk?`, `region?`) => `Promise`\<[`AIProvider`](AIProvider.md)\>)

Defined in: [types/providers.ts:1807](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1807)

Provider constructor interface - supports both sync constructors and async
factory functions.
