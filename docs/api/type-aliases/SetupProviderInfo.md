[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupProviderInfo

# Type Alias: SetupProviderInfo

> **SetupProviderInfo** = [`ProviderInfo`](ProviderInfo.md) & `Required`\<`Pick`\<[`ProviderInfo`](ProviderInfo.md), `"bestFor"` \| `"models"` \| `"strengths"` \| `"pricing"` \| `"setupCommand"`\>\>

Defined in: [types/cli.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L686)

Narrowed ProviderInfo used by the main `neurolink setup` command,
where the descriptive fields are always populated.
