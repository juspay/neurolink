[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogSetup

# Type Alias: CatalogSetup

> **CatalogSetup** = `object`

Defined in: [types/providerCatalog.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L92)

## Properties

### url

> **url**: `string`

Defined in: [types/providerCatalog.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L93)

---

### apiKeyFormat

> **apiKeyFormat**: `string` \| `null`

Defined in: [types/providerCatalog.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L94)

---

### billingPolicy

> **billingPolicy**: [`CatalogBillingPolicy`](CatalogBillingPolicy.md)

Defined in: [types/providerCatalog.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L95)

---

### instructions

> **instructions**: `string`[]

Defined in: [types/providerCatalog.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L96)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providerCatalog.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L103)

Config-options description shown to callers for this credential.
Default: "API key". Set explicitly where the legacy entry's
description carries real information a generic "API key" loses
(e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
