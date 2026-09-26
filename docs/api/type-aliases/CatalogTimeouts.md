[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogTimeouts

# Type Alias: CatalogTimeouts

> **CatalogTimeouts** = `object`

Descriptor-only per-provider turn-budget override — mirrors
ProviderDescriptor.timeouts field-for-field (src/lib/types/providers.ts).
Consumed only by buildCatalogDescriptor() (providerDescriptors.ts), never
by the OpenAI-compat runtime path (loader.ts's buildCatalogEntries()).
Optional and absent for every catalog provider except mistral, whose
value preserves its pre-migration hand-typed descriptor exactly.

## Properties

### generateMs?

> `optional` **generateMs?**: `number`

---

### streamMs?

> `optional` **streamMs?**: `number`
