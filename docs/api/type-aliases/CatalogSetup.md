[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogSetup

# Type Alias: CatalogSetup

> **CatalogSetup** = `object`

Defined in: [types/providerCatalog.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L97)

## Properties

### url

> **url**: `string`

Defined in: [types/providerCatalog.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L98)

---

### apiKeyFormat

> **apiKeyFormat**: `string` \| `null`

Defined in: [types/providerCatalog.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L99)

---

### billingPolicy

> **billingPolicy**: [`CatalogBillingPolicy`](CatalogBillingPolicy.md)

Defined in: [types/providerCatalog.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L100)

---

### instructions

> **instructions**: `string`[]

Defined in: [types/providerCatalog.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L101)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providerCatalog.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L108)

Config-options description shown to callers for this credential.
Default: "API key". Set explicitly where the legacy entry's
description carries real information a generic "API key" loses
(e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
