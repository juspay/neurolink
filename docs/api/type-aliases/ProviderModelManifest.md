[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelManifest

# Type Alias: ProviderModelManifest

> **ProviderModelManifest** = `object`

One provider's complete model manifest: every model NeuroLink knows about
for that provider, plus the provider-wide fallback used when a caller
passes a model id the manifest has never seen (a symbolic/local provider
model, or a brand-new release the manifest hasn't been updated for yet).

## Properties

### defaultContextWindow

> **defaultContextWindow**: `number`

Used for `_default`-key lookups and providers with no named-model list.

---

### familyRules?

> `optional` **familyRules?**: [`ManifestFamilyRule`](ManifestFamilyRule.md)[]

Applied, in order, to the resolved entry (see manifestRegistry.ts).

---

### models

> **models**: `Record`\<`string`, [`ProviderModelManifestEntry`](ProviderModelManifestEntry.md)\>

Keyed by canonical model id (the same id `ModelInfo.id` / AIProvider calls use).
