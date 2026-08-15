[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PROVIDER_ALIAS_INDEX

# Variable: PROVIDER_ALIAS_INDEX

> `const` **PROVIDER_ALIAS_INDEX**: `ReadonlyMap`\<`string`, [`AIProviderName`](../enumerations/AIProviderName.md)\>

Defined in: [factories/providerDescriptors.ts:575](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/factories/providerDescriptors.ts#L575)

O(1) alias → canonical-name lookup, covering both `aliases` and each
descriptor's own lowercased `name`. Replaces the O(n) linear scan in
ProviderFactory.normalizeProviderName().
