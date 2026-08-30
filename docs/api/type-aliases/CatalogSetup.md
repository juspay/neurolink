[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogSetup

# Type Alias: CatalogSetup

> **CatalogSetup** = `object`

Defined in: [types/providerCatalog.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L69)

## Properties

### url

> **url**: `string`

Defined in: [types/providerCatalog.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L70)

---

### apiKeyFormat

> **apiKeyFormat**: `string` \| `null`

Defined in: [types/providerCatalog.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L71)

---

### billingPolicy

> **billingPolicy**: [`CatalogBillingPolicy`](CatalogBillingPolicy.md)

Defined in: [types/providerCatalog.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L72)

---

### instructions

> **instructions**: `string`[]

Defined in: [types/providerCatalog.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L73)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providerCatalog.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L80)

Config-options description shown to callers for this credential.
Default: "API key". Set explicitly where the legacy entry's
description carries real information a generic "API key" loses
(e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
