[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatConfigInput

# Type Alias: OpenAICompatConfigInput

> **OpenAICompatConfigInput** = `Pick`\<[`OpenAICompatCatalogEntry`](OpenAICompatCatalogEntry.md), `"providerName"` \| `"apiKeyEnvVar"` \| `"baseURLEnvVar"` \| `"defaultBaseURL"` \| `"computedBaseURL"` \| `"configOptions"`\>

Defined in: [types/providers.ts:813](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L813)

The subset of OpenAICompatCatalogEntry that resolveOpenAICompatConfig()
needs — lets call sites pass a minimal object without the full catalog
entry (e.g. in tests, or a future non-catalog caller).
