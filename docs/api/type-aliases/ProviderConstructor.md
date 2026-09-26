[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderConstructor

# Type Alias: ProviderConstructor

> **ProviderConstructor** = ((`modelName?`, `providerName?`, `sdk?`, `region?`, `credentials?`) => [`AIProvider`](AIProvider.md)) \| ((`modelName?`, `providerName?`, `sdk?`, `region?`, `credentials?`) => `Promise`\<[`AIProvider`](AIProvider.md)\>)

Provider constructor interface - supports both sync constructors and async
factory functions.
