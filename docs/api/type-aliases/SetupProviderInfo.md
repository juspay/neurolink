[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupProviderInfo

# Type Alias: SetupProviderInfo

> **SetupProviderInfo** = [`ProviderInfo`](ProviderInfo.md) & `Required`\<`Pick`\<[`ProviderInfo`](ProviderInfo.md), `"bestFor"` \| `"models"` \| `"strengths"` \| `"pricing"` \| `"setupCommand"`\>\>

Narrowed ProviderInfo used by the main `neurolink setup` command,
where the descriptive fields are always populated.
