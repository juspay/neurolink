[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogTimeouts

# Type Alias: CatalogTimeouts

> **CatalogTimeouts** = `object`

Defined in: [types/providerCatalog.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L24)

Descriptor-only per-provider turn-budget override — mirrors
ProviderDescriptor.timeouts field-for-field (src/lib/types/providers.ts).
Consumed only by buildCatalogDescriptor() (providerDescriptors.ts), never
by the OpenAI-compat runtime path (loader.ts's buildCatalogEntries()).
Optional and absent for every catalog provider except mistral, whose
value preserves its pre-migration hand-typed descriptor exactly.

## Properties

### generateMs?

> `optional` **generateMs?**: `number`

Defined in: [types/providerCatalog.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L25)

---

### streamMs?

> `optional` **streamMs?**: `number`

Defined in: [types/providerCatalog.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L26)
