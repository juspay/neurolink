[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogSetup

# Type Alias: CatalogSetup

> **CatalogSetup** = `object`

## Properties

### url

> **url**: `string`

---

### apiKeyFormat

> **apiKeyFormat**: `string` \| `null`

---

### billingPolicy

> **billingPolicy**: [`CatalogBillingPolicy`](CatalogBillingPolicy.md)

---

### instructions

> **instructions**: `string`[]

---

### description?

> `optional` **description?**: `string`

Config-options description shown to callers for this credential.
Default: "API key". Set explicitly where the legacy entry's
description carries real information a generic "API key" loses
(e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
