[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogSetup

# Type Alias: CatalogSetup

> **CatalogSetup** = `object`

Defined in: [types/providerCatalog.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L63)

## Properties

### url

> **url**: `string`

Defined in: [types/providerCatalog.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L64)

---

### apiKeyFormat

> **apiKeyFormat**: `string` \| `null`

Defined in: [types/providerCatalog.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L65)

---

### billingPolicy

> **billingPolicy**: [`CatalogBillingPolicy`](CatalogBillingPolicy.md)

Defined in: [types/providerCatalog.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L66)

---

### instructions

> **instructions**: `string`[]

Defined in: [types/providerCatalog.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L67)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providerCatalog.ts:74](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L74)

Config-options description shown to callers for this credential.
Default: "API key". Set explicitly where the legacy entry's
description carries real information a generic "API key" loses
(e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
