[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PROVIDER_ALIAS_INDEX

# Variable: PROVIDER_ALIAS_INDEX

> `const` **PROVIDER_ALIAS_INDEX**: `ReadonlyMap`\<`string`, [`AIProviderName`](../enumerations/AIProviderName.md)\>

Defined in: [factories/providerDescriptors.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerDescriptors.ts#L607)

O(1) alias → canonical-name lookup, covering both `aliases` and each
descriptor's own lowercased `name`. Replaces the O(n) linear scan in
ProviderFactory.normalizeProviderName().
