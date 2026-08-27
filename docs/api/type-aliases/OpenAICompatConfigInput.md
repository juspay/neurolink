[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatConfigInput

# Type Alias: OpenAICompatConfigInput

> **OpenAICompatConfigInput** = `Pick`\<[`OpenAICompatCatalogEntry`](OpenAICompatCatalogEntry.md), `"providerName"` \| `"apiKeyEnvVar"` \| `"baseURLEnvVar"` \| `"defaultBaseURL"` \| `"computedBaseURL"` \| `"configOptions"`\>

Defined in: [types/providers.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L815)

The subset of OpenAICompatCatalogEntry that resolveOpenAICompatConfig()
needs — lets call sites pass a minimal object without the full catalog
entry (e.g. in tests, or a future non-catalog caller).
