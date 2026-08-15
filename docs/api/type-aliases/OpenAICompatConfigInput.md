[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatConfigInput

# Type Alias: OpenAICompatConfigInput

> **OpenAICompatConfigInput** = `Pick`\<[`OpenAICompatCatalogEntry`](OpenAICompatCatalogEntry.md), `"providerName"` \| `"apiKeyEnvVar"` \| `"baseURLEnvVar"` \| `"defaultBaseURL"` \| `"computedBaseURL"` \| `"configOptions"`\>

Defined in: [types/providers.ts:813](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L813)

The subset of OpenAICompatCatalogEntry that resolveOpenAICompatConfig()
needs — lets call sites pass a minimal object without the full catalog
entry (e.g. in tests, or a future non-catalog caller).
