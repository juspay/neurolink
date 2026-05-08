[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupProviderInfo

# Type Alias: SetupProviderInfo

> **SetupProviderInfo** = [`ProviderInfo`](ProviderInfo.md) & `Required`\<`Pick`\<[`ProviderInfo`](ProviderInfo.md), `"bestFor"` \| `"models"` \| `"strengths"` \| `"pricing"` \| `"setupCommand"`\>\>

Defined in: [types/cli.ts:666](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L666)

Narrowed ProviderInfo used by the main `neurolink setup` command,
where the descriptive fields are always populated.
