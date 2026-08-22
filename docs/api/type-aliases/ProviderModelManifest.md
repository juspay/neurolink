[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelManifest

# Type Alias: ProviderModelManifest

> **ProviderModelManifest** = `object`

Defined in: [types/model.ts:343](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L343)

One provider's complete model manifest: every model NeuroLink knows about
for that provider, plus the provider-wide fallback used when a caller
passes a model id the manifest has never seen (a symbolic/local provider
model, or a brand-new release the manifest hasn't been updated for yet).

## Properties

### defaultContextWindow

> **defaultContextWindow**: `number`

Defined in: [types/model.ts:345](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L345)

Used for `_default`-key lookups and providers with no named-model list.

---

### familyRules?

> `optional` **familyRules?**: [`ManifestFamilyRule`](ManifestFamilyRule.md)[]

Defined in: [types/model.ts:347](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L347)

Applied, in order, to the resolved entry (see manifestRegistry.ts).

---

### models

> **models**: `Record`\<`string`, [`ProviderModelManifestEntry`](ProviderModelManifestEntry.md)\>

Defined in: [types/model.ts:349](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L349)

Keyed by canonical model id (the same id `ModelInfo.id` / AIProvider calls use).
